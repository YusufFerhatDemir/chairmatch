import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_WEBHOOK_SECRET, createRefund } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { calculateNewCustomerCommission, calculateRentalCommission } from '@/modules/marketplace/commission.service'
import { claimStockForOrder, releaseStockForOrder } from '@/modules/marketplace/marketplace.service'
import { calculateCommission } from '@/lib/marketplace-rules'
import { createNotification } from '@/lib/notifications'
import {
  FREE_TIER,
  entitlementForStatus,
  isTier,
  tierForPriceId,
  type Tier,
} from '@/lib/subscription-tier'
import type Stripe from 'stripe'

// Disable body parsing — Stripe needs raw body
export const runtime = 'nodejs'

/**
 * Rental-Zahlung abschließen (aus checkout.session.completed ODER
 * checkout.session.async_payment_succeeded — SEPA zahlt asynchron).
 *
 * Enthält drei Schutzschichten:
 *  1. Idempotenz: Stripe liefert Events mehrfach; bereits bezahlte Buchungen
 *     werden übersprungen. Eine ZWEITE Zahlung mit anderem Payment-Intent
 *     (Re-Payment-Race: zwei parallele Checkout-Sessions) wird auto-refunded.
 *  2. Storno-Guard: Zahlung auf eine inzwischen stornierte Buchung → Refund.
 *  3. Overlap-Defense: Zeitraum inzwischen anderweitig fest vergeben → Storno + Refund.
 */
async function fulfillRentalPayment(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  session: Stripe.Checkout.Session,
) {
  const meta = session.metadata || {}
  const rentalId = meta.rental_booking_id as string
  const paymentIntent = (session.payment_intent as string | null) || null

  const { data: rental } = await supabase
    .from('rental_bookings')
    .select('id, total_cents, renter_id, equipment_id, start_date, end_date, status, payment_status, stripe_payment_intent, rental_equipment(type, salons(owner_id))')
    .eq('id', rentalId)
    .single()

  if (!rental) {
    console.error(`rental_payment webhook: Buchung ${rentalId} nicht gefunden`)
    return
  }

  // Die Miet-Session setzt `user_id` seit jeher — anders als Termin und
  // Bestellung, siehe dort. Der Rueckfall auf die Buchung steht trotzdem:
  // die Zeile in `payments` soll ihren Zahler nicht daran verlieren, dass
  // jemand spaeter an den Metadaten schraubt.
  const payerId = (meta.user_id as string | undefined) || (rental.renter_id as string | null) || null

  // (1) Idempotenz / Doppelzahlungs-Guard
  if (rental.payment_status === 'paid') {
    if (paymentIntent && rental.stripe_payment_intent && rental.stripe_payment_intent !== paymentIntent) {
      // Zweite Zahlung für dieselbe Buchung → automatisch zurückerstatten
      console.error(`rental ${rentalId}: Doppelzahlung erkannt (PI ${paymentIntent}) — auto-refund`)
      await createRefund(paymentIntent).catch(console.error)
      await supabase.from('audit_logs').insert({
        user_id: payerId,
        action: 'rental_duplicate_payment_refunded',
        entity: 'rental_booking',
        entity_id: rentalId,
        details: { payment_intent: paymentIntent, kept_payment_intent: rental.stripe_payment_intent },
      })
    }
    return
  }

  // (2) Buchung wurde zwischenzeitlich storniert (Expiry/Admin) → Zahlung zurück
  if (rental.status === 'cancelled') {
    if (paymentIntent) await createRefund(paymentIntent).catch(console.error)
    return
  }

  // (3) Overlap-Defense: hat ein anderer den Zeitraum inzwischen fest gebucht?
  const { data: conflicts } = await supabase
    .from('rental_bookings')
    .select('id')
    .eq('equipment_id', rental.equipment_id)
    .neq('id', rentalId)
    .in('status', ['confirmed', 'active'])
    .lte('start_date', rental.end_date)
    .gte('end_date', rental.start_date)
    .limit(1)

  if (conflicts && conflicts.length > 0) {
    console.error(`rental ${rentalId}: Zeitraum inzwischen vergeben — Storno + Refund`)
    if (paymentIntent) await createRefund(paymentIntent).catch(console.error)
    await supabase
      .from('rental_bookings')
      .update({
        status: 'cancelled',
        payment_status: 'refunded',
        stripe_payment_intent: paymentIntent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rentalId)
    await supabase.from('audit_logs').insert({
      user_id: payerId,
      action: 'rental_conflict_refunded',
      entity: 'rental_booking',
      entity_id: rentalId,
      details: { conflict_booking_id: conflicts[0].id, payment_intent: paymentIntent },
    })
    return
  }

  // --- Regulärer Abschluss ---
  //
  // CAS-Claim statt blossem Update (Track 22). Der Lesecheck oben
  // (`rental.payment_status === 'paid'`) ist eine Momentaufnahme: zwischen
  // dem SELECT und diesem UPDATE passt eine zweite Zustellung desselben
  // Events. Stripe stellt Webhooks ausdruecklich mehr als einmal zu und
  // wiederholt nach einem Timeout — und was hinter diesem Update noch kommt
  // (Payment-Zeile, Plattform-Transaktion, Provision, Audit-Log, zwei
  // Benachrichtigungen), braucht genug Zeit, damit dieser Timeout eintritt.
  //
  // Ohne Claim gewinnen beide Zustellungen: zwei Zeilen in `payments` fuer
  // EINE Miete (und `payments` ist die Quelle jeder Umsatzzahl in
  // /api/admin/mis, /api/admin/kpi und /api/investor), zwei Audit-Eintraege,
  // zwei Benachrichtigungen an beide Seiten. Der Termin-Zweig
  // (fulfillBookingPayment) und der Bestell-Zweig (fulfillProductOrder)
  // machen genau deshalb seit Track 16 einen Claim — der Miet-Zweig war der
  // einzige ohne.
  const { data: claimed, error: claimError } = await supabase
    .from('rental_bookings')
    .update({
      payment_status: 'paid',
      stripe_payment_intent: paymentIntent,
      status: 'confirmed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', rentalId)
    .neq('payment_status', 'paid')
    .select('id')

  if (claimError) {
    console.error(`rental ${rentalId}: Zahlungs-Claim fehlgeschlagen`, claimError.message)
    return
  }
  if (!claimed || claimed.length === 0) {
    // Eine parallele Zustellung war schneller und hat gebucht. Hier ist
    // nichts mehr zu tun — insbesondere KEINE zweite Payment-Zeile.
    console.warn(`rental ${rentalId}: Zahlung bereits verbucht (parallele Zustellung) — uebersprungen`)
    return
  }

  const { error: payError } = await supabase.from('payments').insert({
    source_type: 'rental_booking',
    source_id: rentalId,
    user_id: payerId,
    stripe_session_id: session.id,
    stripe_payment_intent: paymentIntent,
    amount_cents: session.amount_total || 0,
    currency: session.currency || 'eur',
    status: 'succeeded',
    payment_method: session.payment_method_types?.[0] || 'card',
  })
  if (payError) console.error('rental payments insert failed:', payError.message)

  // Plattform-Transaktion: 10% Stuhl/Liege/Raum, 8% OP-Raum (Modell C).
  // provider_share bleibt hier liegen (Escrow) — der Payout-Cron transferiert
  // nach Mietbeginn an den Connect-Account des Anbieters.
  const equipment = (rental as Record<string, unknown>).rental_equipment as
    | { type?: string; salons?: { owner_id?: string } | null }
    | null
  const commissionType = equipment?.type === 'opraum' ? 'opraum_rental' : 'chair_rental'
  const { platformFee, providerShare } = calculateCommission(commissionType, rental.total_cents)

  const { error: txError } = await supabase.from('platform_transactions').insert({
    type: commissionType,
    amount_cents: rental.total_cents,
    platform_fee_cents: platformFee,
    provider_share_cents: providerShare,
    currency: session.currency || 'eur',
    stripe_payment_intent_id: paymentIntent,
    provider_user_id: equipment?.salons?.owner_id || null,
    customer_user_id: rental.renter_id,
    rental_id: rentalId,
    status: 'succeeded',
    metadata: { checkout_session_id: session.id },
  })
  // Unique-Index uq_pltx_rental_succeeded blockt Duplikate — Fehler nur loggen
  if (txError) console.error('platform_transactions insert failed:', txError.message)

  // Commission-Record (commissions-Tabelle, Reporting)
  calculateRentalCommission(rentalId).catch(console.error)

  await supabase.from('audit_logs').insert({
    user_id: payerId,
    action: 'rental_payment_completed',
    entity: 'rental_booking',
    entity_id: rentalId,
    details: { amount: session.amount_total, currency: session.currency },
  })

  // In-App-Benachrichtigung für beide Seiten. Bewusst nach dem Audit-Log:
  // schlägt sie fehl, ist die Zahlung trotzdem vollständig verbucht.
  const period = `${rental.start_date} – ${rental.end_date}`
  const amountEur = ((session.amount_total ?? rental.total_cents) / 100).toFixed(2)
  await createNotification(
    rental.renter_id,
    'Miete bezahlt',
    `Deine Buchung für ${period} ist bestätigt. Betrag: ${amountEur} €.`,
    'payment',
    rentalId,
    'rental_booking',
  )
  const rentalOwnerId = equipment?.salons?.owner_id
  if (rentalOwnerId) {
    await createNotification(
      rentalOwnerId,
      'Neue bezahlte Mietbuchung',
      `Dein Mietobjekt ist für ${period} gebucht und bezahlt (${amountEur} €).`,
      'booking',
      rentalId,
      'rental_booking',
    )
  }
}

/**
 * Termin-Zahlung abschliessen (checkout.session.completed).
 *
 * Bis 2026-08-27 lief dieser Zweig ohne jeden Schutz: Stripe stellt Events
 * mindestens einmal zu (bei einem 5xx oder Timeout auf unserer Seite auch
 * mehrfach), und jede Zustellung schrieb erneut eine `payments`-Zeile, ein
 * Audit-Log, zwei Benachrichtigungen und eine Neukunden-Provision. Der
 * Miet-Zweig hat diese Schutzschichten laengst — hier fehlten sie.
 *
 *  1. Idempotenz: bereits bezahlte Buchungen werden uebersprungen. Eine
 *     ZWEITE Zahlung mit anderem Payment-Intent wird auto-refunded.
 *  2. Storno-Guard: Zahlung auf eine inzwischen stornierte Buchung → Refund.
 *     Vorher setzte der Handler `status: 'confirmed'` bedingungslos und hat
 *     damit stornierte Termine wiederbelebt.
 *  3. CAS-Claim: der Statuswechsel unpaid→paid ist der Anspruch auf die
 *     Buchhaltung. `.neq('payment_status', 'paid')` laesst nur eine von zwei
 *     parallelen Zustellungen gewinnen; nur der Gewinner bucht.
 */
async function fulfillBookingPayment(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  session: Stripe.Checkout.Session,
) {
  const meta = session.metadata || {}
  const bookingId = meta.booking_id as string
  const paymentIntent = (session.payment_intent as string | null) || null

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, payment_status, stripe_payment_intent, customer_id, booking_date, start_time, salons(owner_id)')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    console.error(`booking_payment webhook: Buchung ${bookingId} nicht gefunden`)
    return
  }

  // Wer hat bezahlt?
  //
  // Bis Track 16 stand hier ueberall `meta.user_id` — und die Termin-Session
  // hat dieses Feld nie gesetzt (`createBookingCheckout` schrieb nur
  // `booking_id` und `type`). Der Wert war in JEDEM Termin-Webhook
  // `undefined`. Folge: `payments.user_id` blieb null, die Audit-Eintraege
  // waren kontenlos, und `if (meta.user_id)` weiter unten war immer falsch —
  // die Nachricht „Zahlung bestaetigt" ist fuer Termine nie verschickt
  // worden. Die Metadaten tragen es jetzt; der Rueckfall auf die Buchung
  // deckt die Sessions ab, die beim Deploy schon offen waren.
  const payerId = (meta.user_id as string | undefined) || (booking.customer_id as string | null) || null

  // (1) Idempotenz / Doppelzahlungs-Guard
  if (booking.payment_status === 'paid') {
    if (paymentIntent && booking.stripe_payment_intent && booking.stripe_payment_intent !== paymentIntent) {
      console.error(`booking ${bookingId}: Doppelzahlung erkannt (PI ${paymentIntent}) — auto-refund`)
      await createRefund(paymentIntent).catch(console.error)
      await supabase.from('audit_logs').insert({
        user_id: payerId,
        action: 'booking_duplicate_payment_refunded',
        entity: 'booking',
        entity_id: bookingId,
        details: { payment_intent: paymentIntent, kept_payment_intent: booking.stripe_payment_intent },
      })
    }
    return
  }

  // (2) Buchung wurde zwischenzeitlich storniert → Zahlung zurueck
  if (['cancelled', 'no_show'].includes(String(booking.status))) {
    console.error(`booking ${bookingId}: Zahlung auf ${booking.status}-Buchung — Refund`)
    if (paymentIntent) await createRefund(paymentIntent).catch(console.error)
    await supabase.from('audit_logs').insert({
      user_id: payerId,
      action: 'booking_cancelled_payment_refunded',
      entity: 'booking',
      entity_id: bookingId,
      details: { payment_intent: paymentIntent, booking_status: booking.status },
    })
    return
  }

  // (3) CAS-Claim — nur eine Zustellung darf buchen
  const { data: claimed } = await supabase
    .from('bookings')
    .update({
      payment_status: 'paid',
      status: 'confirmed',
      stripe_payment_intent: paymentIntent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .neq('payment_status', 'paid')
    .select('id')

  if (!claimed || claimed.length === 0) {
    // Parallele Zustellung war schneller — sie bucht, wir sind fertig.
    return
  }

  const { error: payError } = await supabase.from('payments').insert({
    source_type: 'booking',
    source_id: bookingId,
    user_id: payerId,
    stripe_session_id: session.id,
    stripe_payment_intent: paymentIntent,
    amount_cents: session.amount_total || 0,
    currency: session.currency || 'eur',
    status: 'succeeded',
    payment_method: session.payment_method_types?.[0] || 'card',
  })
  if (payError) console.error('booking payments insert failed:', payError.message)

  await supabase.from('audit_logs').insert({
    user_id: payerId,
    action: 'payment_completed',
    entity: 'booking',
    entity_id: bookingId,
    details: { amount: session.amount_total, currency: session.currency },
  })

  // Neukunden-Provision: haengt am CAS-Gewinner, sonst wird sie bei jeder
  // Wiederzustellung erneut in `commissions` geschrieben.
  calculateNewCustomerCommission(bookingId).catch(console.error)

  // Kunde und Saloninhaber informieren.
  const amountEur = ((session.amount_total ?? 0) / 100).toFixed(2)
  if (payerId) {
    await createNotification(
      payerId,
      'Zahlung bestätigt',
      `Deine Buchung ist bezahlt und bestätigt. Betrag: ${amountEur} €.`,
      'payment',
      bookingId,
      'booking',
    )
  }
  const bookingOwnerId = (booking.salons as { owner_id?: string } | null)?.owner_id
  if (bookingOwnerId) {
    await createNotification(
      bookingOwnerId,
      'Neue bezahlte Buchung',
      `Neuer Termin am ${booking.booking_date ?? ''} ${booking.start_time ?? ''} (${amountEur} €).`,
      'booking',
      bookingId,
      'booking',
    )
  }
}

/**
 * Shop-Bestellung abschliessen (checkout.session.completed).
 *
 * Gleiche drei Schichten wie bei Termin und Miete. Zusaetzlich wird der
 * Payment-Intent jetzt an der Bestellung hinterlegt — vorher stand er nur in
 * `payments`, womit weder die Doppelzahlungs-Erkennung noch der
 * `charge.refunded`-Abgleich eine Bestellung finden konnten.
 */
async function fulfillProductOrder(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  session: Stripe.Checkout.Session,
) {
  const meta = session.metadata || {}
  const orderId = meta.order_id as string
  const paymentIntent = (session.payment_intent as string | null) || null

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, payment_status, stripe_payment_intent, customer_id')
    .eq('id', orderId)
    .single()

  if (!order) {
    console.error(`product_order webhook: Bestellung ${orderId} nicht gefunden`)
    return
  }

  // Wer hat bezahlt — dieselbe Luecke wie beim Termin: die Shop-Session hat
  // `user_id` nie mitgegeben, also blieb `payments.user_id` fuer JEDE
  // Bestellung leer. Die Benachrichtigung hat es nur deshalb ueberlebt, weil
  // sie zusaetzlich auf `order.customer_id` zurueckfaellt.
  const payerId = (meta.user_id as string | undefined) || (order.customer_id as string | null) || null

  // (1) Idempotenz / Doppelzahlungs-Guard
  if (order.payment_status === 'paid') {
    if (paymentIntent && order.stripe_payment_intent && order.stripe_payment_intent !== paymentIntent) {
      console.error(`order ${orderId}: Doppelzahlung erkannt (PI ${paymentIntent}) — auto-refund`)
      await createRefund(paymentIntent).catch(console.error)
      await supabase.from('audit_logs').insert({
        user_id: payerId,
        action: 'order_duplicate_payment_refunded',
        entity: 'order',
        entity_id: orderId,
        details: { payment_intent: paymentIntent, kept_payment_intent: order.stripe_payment_intent },
      })
    }
    return
  }

  // (2) Bestellung storniert → Zahlung zurueck
  if (order.status === 'cancelled') {
    console.error(`order ${orderId}: Zahlung auf stornierte Bestellung — Refund`)
    if (paymentIntent) await createRefund(paymentIntent).catch(console.error)
    await supabase.from('audit_logs').insert({
      user_id: payerId,
      action: 'order_cancelled_payment_refunded',
      entity: 'order',
      entity_id: orderId,
      details: { payment_intent: paymentIntent },
    })
    return
  }

  // (3) Bestands-Defense: zwischen Bestellung und Zahlung ausverkauft?
  //
  // Der Bestand wird erst hier gebucht — an der Stelle, an der das Geld
  // tatsaechlich angekommen ist — und atomar je Position (Compare-and-Swap in
  // claimStockForOrder). Reicht er nicht, geht die Zahlung zurueck und die
  // Bestellung wird storniert; dieselbe Linie wie die Overlap-Defense der
  // Miete. Vorher wurde `stock_quantity` NIRGENDS geprueft und NIRGENDS
  // abgezogen: ein Produkt mit 0 Stueck war unbegrenzt verkaeuflich.
  const stock = await claimStockForOrder(orderId)
  if (!stock.ok) {
    console.error(`order ${orderId}: Bestand nicht buchbar (${stock.reason}) — Storno + Refund`)
    if (paymentIntent) await createRefund(paymentIntent).catch(console.error)
    await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: 'refunded',
        stripe_payment_intent: paymentIntent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
    await supabase.from('audit_logs').insert({
      user_id: payerId,
      action: 'order_out_of_stock_refunded',
      entity: 'order',
      entity_id: orderId,
      details: { reason: stock.reason, payment_intent: paymentIntent },
    })
    return
  }

  // (4) CAS-Claim
  const { data: claimed } = await supabase
    .from('orders')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      stripe_payment_intent: paymentIntent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .neq('payment_status', 'paid')
    .select('id')

  // Parallele Zustellung desselben Events hat die Bestellung schon bezahlt
  // gesetzt — der eben gebuchte Bestand gehoert dann nicht uns.
  if (!claimed || claimed.length === 0) {
    await releaseStockForOrder(orderId).catch(console.error)
    return
  }

  const { error: payError } = await supabase.from('payments').insert({
    source_type: 'order',
    source_id: orderId,
    user_id: payerId,
    stripe_session_id: session.id,
    stripe_payment_intent: paymentIntent,
    amount_cents: session.amount_total || 0,
    currency: session.currency || 'eur',
    status: 'succeeded',
    payment_method: session.payment_method_types?.[0] || 'card',
  })
  if (payError) console.error('order payments insert failed:', payError.message)

  await supabase.from('audit_logs').insert({
    user_id: payerId,
    action: 'product_order_paid',
    entity: 'order',
    entity_id: orderId,
    details: { amount: session.amount_total, order_number: meta.order_number },
  })

  const buyerId = payerId
  if (buyerId) {
    const amountEur = ((session.amount_total ?? 0) / 100).toFixed(2)
    await createNotification(
      buyerId,
      'Bestellung bezahlt',
      `Deine Bestellung ${meta.order_number || ''} ist bezahlt (${amountEur} €).`.replace('  ', ' '),
      'payment',
      orderId,
      'order',
    )
  }
}

// ---------------------------------------------------------------------------
// Abo-Lebenszyklus
// ---------------------------------------------------------------------------

/** Stripe liefert `customer` je nach Expansion als ID oder als Objekt. */
function stripeId(ref: string | { id?: string } | null | undefined): string | null {
  if (!ref) return null
  return typeof ref === 'string' ? ref : ref.id ?? null
}

/**
 * Wem gehoert dieses Abo?
 *
 * Zwei Wege, in dieser Reihenfolge:
 *  1. `subscription.metadata.user_id` — seit 2026-08-27 von
 *     `createSubscriptionCheckout` ueber `subscription_data.metadata` gesetzt.
 *  2. `profiles.stripe_customer_id` — fuer Abos, die vor dieser Aenderung
 *     entstanden sind. Die Spalte wird jetzt beim Checkout beschrieben; fuer
 *     Altbestand bleibt sie leer, deshalb ist das der Rueckfall und nicht der
 *     Hauptweg.
 */
async function resolveSubscriptionOwner(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  subscription: { metadata?: Stripe.Metadata | null; customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null },
): Promise<string | null> {
  const fromMetadata = subscription.metadata?.user_id
  if (typeof fromMetadata === 'string' && fromMetadata) return fromMetadata

  const customerId = stripeId(subscription.customer as string | { id?: string } | null)
  if (!customerId) return null

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .limit(1)

  return (data?.[0]?.id as string | undefined) ?? null
}

/**
 * Kundennummer am Profil festhalten.
 *
 * Ohne sie ist jedes Abo, das nicht ueber unseren eigenen Checkout entstanden
 * ist (Stripe-Dashboard, Kundenportal, Migration), fuer uns anonym.
 */
async function rememberStripeCustomer(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  customerId: string | null,
) {
  if (!customerId) return
  const { error } = await supabase
    .from('profiles')
    .update({ stripe_customer_id: customerId })
    .eq('id', userId)
  if (error) console.error('stripe_customer_id konnte nicht gespeichert werden:', error.message)
}

/**
 * Stufe des Salons setzen, protokollieren, den Anbieter informieren.
 *
 * `salons.subscription_tier` haengt am `owner_id` — ein Konto mit mehreren
 * Salons stuft also alle gemeinsam um. Das ist der Bestand, nicht neu: das
 * Abo wird pro Konto gebucht, nicht pro Salon.
 */
async function applyTier(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  params: {
    userId: string
    tier: Tier
    action: string
    details: Record<string, unknown>
    notify?: { title: string; body: string }
  },
) {
  const { error } = await supabase
    .from('salons')
    .update({ subscription_tier: params.tier })
    .eq('owner_id', params.userId)

  if (error) {
    console.error(`Abo-Stufe ${params.tier} fuer ${params.userId} fehlgeschlagen:`, error.message)
    return
  }

  await supabase.from('audit_logs').insert({
    user_id: params.userId,
    action: params.action,
    entity: 'profile',
    entity_id: params.userId,
    details: { tier: params.tier, ...params.details },
  })

  if (params.notify) {
    await createNotification(
      params.userId,
      params.notify.title,
      params.notify.body,
      'system',
      params.userId,
      'profile',
    )
  }
}

/**
 * `customer.subscription.created` / `.updated` / `.deleted`.
 *
 * Bis 2026-08-27 gab es nur `.deleted`, und dort nur den Rueckfall ueber
 * `stripe_customer_id`. Was damit alles nicht durchschlug:
 *
 *  - Ein Stufenwechsel im Stripe-Kundenportal (Gold → Premium) — die App zeigte
 *    weiter Gold.
 *  - Ein Abo, das Stripe nach erfolgloser Mahnkette auf `unpaid` setzt oder
 *    kuendigt — die Stufe blieb bezahlt-Niveau, unbegrenzt.
 *  - Die Kuendigung selbst, weil das Profil ueber eine nie beschriebene
 *    Spalte gesucht wurde.
 */
async function handleSubscriptionChange(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  subscription: Stripe.Subscription,
  eventType: string,
) {
  const userId = await resolveSubscriptionOwner(supabase, subscription)
  if (!userId) {
    console.error(
      `${eventType}: kein Profil zu Abo ${subscription.id} (customer ${stripeId(subscription.customer as string | { id?: string } | null) ?? '—'}) — Stufe unveraendert`,
    )
    return
  }

  await rememberStripeCustomer(
    supabase,
    userId,
    stripeId(subscription.customer as string | { id?: string } | null),
  )

  // Gekuendigt ist gekuendigt — unabhaengig vom zuletzt gemeldeten Status.
  const entitlement =
    eventType === 'customer.subscription.deleted'
      ? 'revoked'
      : entitlementForStatus(subscription.status)

  if (entitlement === 'grace') {
    // Zahlung haengt, Stripe mahnt noch. Nichts umstellen, aber sichtbar machen.
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'subscription_grace',
      entity: 'profile',
      entity_id: userId,
      details: { subscription_id: subscription.id, status: subscription.status },
    })
    return
  }

  if (entitlement === 'revoked') {
    await applyTier(supabase, {
      userId,
      tier: FREE_TIER,
      action: 'subscription_downgraded',
      details: { subscription_id: subscription.id, status: subscription.status, event: eventType },
      notify: {
        title: 'Abo beendet',
        body: `Dein ChairMatch-Abo ist beendet. Dein Profil laeuft ab sofort auf der Stufe ${FREE_TIER}.`,
      },
    })
    return
  }

  // entitled: die Stufe kommt aus dem tatsaechlich gebuchten Preis. Sie aus
  // `metadata.tier` zu nehmen waere falsch — bei einem Wechsel im
  // Kundenportal steht dort noch die Stufe der urspruenglichen Buchung.
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null
  const tier = tierForPriceId(priceId)

  if (!tier) {
    // Preis gehoert zu keiner konfigurierten Stufe (unbekannter Preis, oder
    // STRIPE_PRICE_* fehlt in dieser Umgebung). Lieber gar nichts umstellen
    // als eine Stufe raten.
    console.error(
      `${eventType}: Preis ${priceId ?? '—'} gehoert zu keiner konfigurierten Stufe — Stufe unveraendert`,
    )
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'subscription_price_unknown',
      entity: 'profile',
      entity_id: userId,
      details: { subscription_id: subscription.id, price_id: priceId, status: subscription.status },
    })
    return
  }

  await applyTier(supabase, {
    userId,
    tier,
    action: 'subscription_synced',
    details: { subscription_id: subscription.id, status: subscription.status, price_id: priceId, event: eventType },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const meta = session.metadata || {}

      // SEPA-Lastschrift zahlt asynchron: `completed` kann mit payment_status
      // 'unpaid' feuern. Termin und Bestellung haben das bis 2026-08-27
      // ignoriert und die Zahlung sofort als eingegangen verbucht — bei einer
      // spaeter platzenden Lastschrift blieb der Termin bezahlt und bestaetigt.
      // Erfuellt wird jetzt, wie beim Miet-Zweig, erst bei echtem Geldeingang.
      if (meta.type === 'booking_payment' && meta.booking_id) {
        if (session.payment_status === 'paid') {
          await fulfillBookingPayment(supabase, session)
        }
      }

      if (meta.type === 'product_order' && meta.order_id) {
        if (session.payment_status === 'paid') {
          await fulfillProductOrder(supabase, session)
        }
      }

      if (meta.type === 'rental_payment' && meta.rental_booking_id) {
        // SEPA & Co. zahlen asynchron: completed kann mit payment_status
        // 'unpaid' feuern — dann erst bei async_payment_succeeded erfüllen.
        if (session.payment_status === 'paid') {
          await fulfillRentalPayment(supabase, session)
        }
      }

      if (meta.type === 'provider_subscription' && meta.user_id) {
        // Die Kundennummer wird IMMER festgehalten — auch wenn die Zahlung
        // noch aussteht. Sie ist der einzige Rueckfall, ueber den spaetere
        // `customer.subscription.*`-Ereignisse dieses Konto wiederfinden.
        await rememberStripeCustomer(
          supabase,
          meta.user_id,
          stripeId(session.customer as string | { id?: string } | null),
        )

        // SEPA-Lastschrift zahlt asynchron: `completed` kann mit
        // payment_status 'unpaid' feuern. Termin, Bestellung und Miete pruefen
        // das laengst; der Abo-Zweig hat bis 2026-08-27 bedingungslos
        // freigeschaltet und die Stufe auch dann behalten, wenn die
        // Lastschrift nie durchging. Freigeschaltet wird jetzt erst, wenn das
        // Abo laut Stripe wirklich laeuft — das meldet
        // `customer.subscription.created/updated` mit Status `active`.
        if (session.payment_status === 'unpaid') {
          await supabase.from('audit_logs').insert({
            user_id: meta.user_id,
            action: 'subscription_awaiting_payment',
            entity: 'profile',
            entity_id: meta.user_id,
            details: { tier: meta.tier ?? null, subscription_id: session.subscription },
          })
          break
        }

        // `meta.tier` stammt aus unserem eigenen Checkout und ist dort gegen
        // die Liste geprueft — trotzdem nicht blind uebernehmen: ein Wert
        // ausserhalb der drei Stufen wuerde sonst als Stufe in der Datenbank
        // landen und jede spaetere Auswertung verderben.
        const tier: Tier = isTier(meta.tier) ? meta.tier : FREE_TIER
        await applyTier(supabase, {
          userId: meta.user_id,
          tier,
          action: 'subscription_activated',
          details: { subscription_id: session.subscription, checkout_session_id: session.id },
          notify: {
            title: 'Abo aktiv',
            body: `Dein ChairMatch-Abo (${tier}) ist aktiv.`,
          },
        })
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice

      // Der Kommentar hier sagte "and downgrade" — heruntergestuft wurde nie.
      // Das ist auch richtig so: Stripe mahnt nach einem Fehlversuch mehrfach
      // nach. Die Rueckstufung gehoert an das Ende der Mahnkette, und die
      // meldet Stripe als `customer.subscription.updated` mit `unpaid` oder
      // als `.deleted`. Hier wird protokolliert und der Anbieter gewarnt.
      const userId = await resolveSubscriptionOwner(supabase, {
        metadata: (invoice as unknown as { subscription_details?: { metadata?: Stripe.Metadata | null } })
          .subscription_details?.metadata,
        customer: invoice.customer,
      })

      if (!userId) {
        console.error(
          `invoice.payment_failed: kein Profil zu customer ${stripeId(invoice.customer as string | { id?: string } | null) ?? '—'} (Rechnung ${invoice.id})`,
        )
        break
      }

      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'payment_failed',
        entity: 'profile',
        entity_id: userId,
        details: { invoice_id: invoice.id, amount_due: invoice.amount_due ?? null },
      })

      await createNotification(
        userId,
        'Abo-Zahlung fehlgeschlagen',
        'Deine letzte Abo-Zahlung konnte nicht eingezogen werden. Bitte pruefe deine Zahlungsdaten — sonst endet das Abo nach den Wiederholversuchen.',
        'payment',
        userId,
        'profile',
      )
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await handleSubscriptionChange(
        supabase,
        event.data.object as Stripe.Subscription,
        event.type,
      )
      break
    }

    case 'checkout.session.async_payment_succeeded': {
      // SEPA-Zahlung ist (Tage später) durch → jetzt erst erfüllen
      const session = event.data.object as Stripe.Checkout.Session
      const meta = session.metadata || {}
      if (meta.type === 'rental_payment' && meta.rental_booking_id) {
        await fulfillRentalPayment(supabase, session)
      }
      if (meta.type === 'booking_payment' && meta.booking_id) {
        await fulfillBookingPayment(supabase, session)
      }
      if (meta.type === 'product_order' && meta.order_id) {
        await fulfillProductOrder(supabase, session)
      }
      break
    }

    case 'checkout.session.async_payment_failed': {
      // Asynchrone Zahlung (SEPA) geplatzt → Buchung freigeben
      const session = event.data.object as Stripe.Checkout.Session
      const meta = session.metadata || {}
      if (meta.type === 'rental_payment' && meta.rental_booking_id) {
        await supabase
          .from('rental_bookings')
          .update({ status: 'cancelled', payment_status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', meta.rental_booking_id)
          .eq('status', 'pending')
          // Wie im expired-Zweig darunter: eine bereits verbuchte Zahlung
          // darf ein spaeter eintreffendes Fehlschlag-Event nicht mehr
          // umwerfen. Der Statusguard allein traegt das nur, solange der
          // Erfolgspfad `status` und `payment_status` gemeinsam setzt.
          .neq('payment_status', 'paid')
      }
      // Termin: der Zahlungsversuch ist gescheitert, der Termin selbst bleibt
      // bestehen (der Kunde kann erneut zahlen) — nur der Zahlungsstatus faellt
      // zurueck. `.neq('payment_status', 'paid')` schuetzt vor dem Race mit
      // einer bereits erfolgreichen Zweitzahlung.
      if (meta.type === 'booking_payment' && meta.booking_id) {
        await supabase
          .from('bookings')
          .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', meta.booking_id)
          .neq('payment_status', 'paid')
      }
      if (meta.type === 'product_order' && meta.order_id) {
        await supabase
          .from('orders')
          .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', meta.order_id)
          .neq('payment_status', 'paid')
      }
      break
    }

    case 'checkout.session.expired': {
      // Checkout nicht abgeschlossen (30-Min-Expiry) → pending-Buchung
      // stornieren, damit sie den Mietzeitraum nicht weiter blockiert.
      // Guard .eq(status,'pending') verhindert Race mit completed-Event.
      const session = event.data.object as Stripe.Checkout.Session
      const meta = session.metadata || {}
      if (meta.type === 'rental_payment' && meta.rental_booking_id) {
        await supabase
          .from('rental_bookings')
          .update({ status: 'cancelled', payment_status: 'unpaid', updated_at: new Date().toISOString() })
          .eq('id', meta.rental_booking_id)
          .eq('status', 'pending')
          .neq('payment_status', 'paid')
      }
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const paymentIntent = charge.payment_intent as string

      // TEIL-Erstattung ist etwas anderes als vollstaendige Erstattung.
      //
      // Stripe schickt `charge.refunded` bei JEDER Erstattung, auch bei einer
      // Teilerstattung — die Unterscheidung steht in der Charge selbst
      // (`amount_refunded` gegen `amount`, dazu das Flag `refunded`). Beide
      // Felder hat dieser Zweig bis Track 16 nicht angesehen und JEDE
      // Erstattung als vollstaendige behandelt: eine Kulanz-Rueckzahlung von
      // 5 € auf eine Miete von 500 € stornierte die Buchung, setzte
      // `payment_status` auf 'refunded', markierte die Plattform-Transaktion
      // als erstattet — und nahm damit dem Anbieter die komplette
      // Auszahlung, weil `cron/rental-payouts` genau diese Felder als
      // Ausschluss liest. Beim Termin verlor die Kundin ihren bestaetigten
      // Termin, bei der Bestellung ging die gesamte Ware zurueck ins Regal.
      //
      // Die anteilige Rueckabwicklung ist eine kaufmaennische Entscheidung
      // mit einer Zahl darin (welcher Teil trifft die Provision, welcher den
      // Anbieteranteil?). Die trifft dieser Handler NICHT. Er haelt den Fall
      // fest und ruehrt den Zustand nicht an; der Payout-Cron haelt die
      // Auszahlung derselben Miete danach zurueck, statt den vollen
      // Anbieteranteil auszuzahlen (siehe dort).
      const betrag = typeof charge.amount === 'number' ? charge.amount : 0
      const erstattet = typeof charge.amount_refunded === 'number' ? charge.amount_refunded : 0
      const vollstaendig = charge.refunded === true || (betrag > 0 && erstattet >= betrag)

      if (paymentIntent && !vollstaendig) {
        console.error(
          `charge ${charge.id}: Teilerstattung ${erstattet} von ${betrag} — Zustand bleibt, manuelle Klaerung`,
        )
        await supabase.from('audit_logs').insert({
          user_id: null,
          action: 'charge_partially_refunded',
          entity: 'payment',
          entity_id: paymentIntent,
          details: {
            charge_id: charge.id,
            amount_cents: betrag,
            amount_refunded_cents: erstattet,
            currency: charge.currency ?? null,
          },
        })
        break
      }

      if (paymentIntent) {
        await supabase
          .from('payments')
          .update({ status: 'refunded' })
          .eq('stripe_payment_intent', paymentIntent)

        // Miet-Buchung (falls es eine war) stornieren + Plattform-Transaktion markieren
        await supabase
          .from('rental_bookings')
          .update({
            payment_status: 'refunded',
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent', paymentIntent)

        await supabase
          .from('platform_transactions')
          .update({ status: 'refunded' })
          .eq('stripe_payment_intent_id', paymentIntent)

        // Termin und Shop-Bestellung wurden bisher nicht nachgezogen: nach
        // einem Refund stand die Buchung weiter auf 'paid'/'confirmed', der
        // Kunde behielt den Termin und das Geld. Beide tragen den
        // Payment-Intent seit 2026-08-27 selbst, sind also adressierbar.
        await supabase
          .from('bookings')
          .update({
            payment_status: 'refunded',
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent', paymentIntent)

        // Bei der Bestellung haengt am Storno noch der Bestand: die bezahlte
        // Ware wurde beim Zahlungseingang abgezogen und gehoert nach der
        // Erstattung zurueck ins Regal. `.neq('payment_status', 'refunded')`
        // ist der Idempotenz-Riegel — Stripe stellt `charge.refunded`
        // mehrfach zu, und ohne ihn wuerde jede Zustellung den Bestand
        // erneut hochzaehlen.
        const { data: refundedOrders } = await supabase
          .from('orders')
          .update({
            payment_status: 'refunded',
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent', paymentIntent)
          .neq('payment_status', 'refunded')
          .select('id')

        for (const refunded of refundedOrders ?? []) {
          await releaseStockForOrder(refunded.id as string).catch(console.error)
        }
      }
      break
    }

    case 'charge.dispute.created':
    case 'charge.dispute.closed': {
      // Rueckbuchung (Chargeback). Bis Track 16 kam dieses Ereignis hier gar
      // nicht vor: die Miete blieb 'confirmed'/'paid', die
      // Plattform-Transaktion blieb 'succeeded' — und genau diese beiden
      // Felder sind die einzige Bedingung, unter der `cron/rental-payouts`
      // am Mietbeginn den Anbieteranteil ueberweist. Die Plattform haette
      // das Geld also zurueckgegeben UND ausgezahlt.
      //
      // Der Zustand wird hier bewusst NICHT umgeschrieben: `payments.status`
      // und `platform_transactions.status` kennen live kein Wort fuer
      // „angefochten" (CHECK: pending|succeeded|failed|refunded), und eines
      // zu erfinden hiesse, eine Rueckbuchung als Erstattung auszugeben.
      // Festgehalten wird sie im Audit-Log; die Auszahlung haelt der
      // Payout-Cron ab jetzt selbst zurueck, weil er den Zustand der Charge
      // direkt bei Stripe erfragt.
      const dispute = event.data.object as Stripe.Dispute
      const disputedIntent =
        typeof dispute.payment_intent === 'string'
          ? dispute.payment_intent
          : (dispute.payment_intent as { id?: string } | null)?.id ?? null

      console.error(
        `${event.type}: Zahlung ${disputedIntent ?? '—'} angefochten (${dispute.status ?? '—'}, ${dispute.amount ?? 0})`,
      )
      await supabase.from('audit_logs').insert({
        user_id: null,
        action: event.type === 'charge.dispute.closed' ? 'charge_dispute_closed' : 'charge_dispute_created',
        entity: 'payment',
        entity_id: disputedIntent,
        details: {
          dispute_id: dispute.id,
          charge_id: typeof dispute.charge === 'string' ? dispute.charge : (dispute.charge as { id?: string } | null)?.id ?? null,
          amount_cents: dispute.amount ?? null,
          currency: dispute.currency ?? null,
          reason: dispute.reason ?? null,
          status: dispute.status ?? null,
        },
      })
      break
    }

    case 'account.updated': {
      // Stripe Connect: Onboarding-/Fähigkeits-Status des Anbieter-Accounts syncen
      const account = event.data.object as Stripe.Account

      const update: Record<string, unknown> = {
        charges_enabled: !!account.charges_enabled,
        payouts_enabled: !!account.payouts_enabled,
        details_submitted: !!account.details_submitted,
        updated_at: new Date().toISOString(),
      }
      if (account.details_submitted && account.payouts_enabled) {
        update.onboarding_completed_at = new Date().toISOString()
      }

      await supabase
        .from('provider_stripe_accounts')
        .update(update)
        .eq('stripe_account_id', account.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
