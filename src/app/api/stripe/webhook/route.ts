import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_WEBHOOK_SECRET, createRefund } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { calculateNewCustomerCommission, calculateRentalCommission } from '@/modules/marketplace/commission.service'
import { calculateCommission } from '@/lib/marketplace-rules'
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

  // (1) Idempotenz / Doppelzahlungs-Guard
  if (rental.payment_status === 'paid') {
    if (paymentIntent && rental.stripe_payment_intent && rental.stripe_payment_intent !== paymentIntent) {
      // Zweite Zahlung für dieselbe Buchung → automatisch zurückerstatten
      console.error(`rental ${rentalId}: Doppelzahlung erkannt (PI ${paymentIntent}) — auto-refund`)
      await createRefund(paymentIntent).catch(console.error)
      await supabase.from('audit_logs').insert({
        user_id: meta.user_id || null,
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
      user_id: meta.user_id || null,
      action: 'rental_conflict_refunded',
      entity: 'rental_booking',
      entity_id: rentalId,
      details: { conflict_booking_id: conflicts[0].id, payment_intent: paymentIntent },
    })
    return
  }

  // --- Regulärer Abschluss ---
  await supabase
    .from('rental_bookings')
    .update({
      payment_status: 'paid',
      stripe_payment_intent: paymentIntent,
      status: 'confirmed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', rentalId)

  const { error: payError } = await supabase.from('payments').insert({
    source_type: 'rental_booking',
    source_id: rentalId,
    user_id: meta.user_id || null,
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
    user_id: meta.user_id || null,
    action: 'rental_payment_completed',
    entity: 'rental_booking',
    entity_id: rentalId,
    details: { amount: session.amount_total, currency: session.currency },
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

      if (meta.type === 'booking_payment' && meta.booking_id) {
        // Mark booking as paid
        await supabase
          .from('bookings')
          .update({
            payment_status: 'paid',
            stripe_payment_intent: session.payment_intent as string,
            status: 'confirmed',
          })
          .eq('id', meta.booking_id)

        // Create payment record
        await supabase.from('payments').insert({
          source_type: 'booking',
          source_id: meta.booking_id,
          user_id: meta.user_id || null,
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent as string,
          amount_cents: session.amount_total || 0,
          currency: session.currency || 'eur',
          status: 'succeeded',
          payment_method: session.payment_method_types?.[0] || 'card',
        })

        // Audit log
        await supabase.from('audit_logs').insert({
          user_id: meta.user_id || null,
          action: 'payment_completed',
          entity: 'booking',
          entity_id: meta.booking_id,
          details: { amount: session.amount_total, currency: session.currency },
        })
      }

      if (meta.type === 'product_order' && meta.order_id) {
        // Mark order as confirmed + paid
        await supabase
          .from('orders')
          .update({
            status: 'confirmed',
            payment_status: 'paid',
          })
          .eq('id', meta.order_id)

        // Create payment record
        await supabase.from('payments').insert({
          source_type: 'order',
          source_id: meta.order_id,
          user_id: meta.user_id || null,
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent as string,
          amount_cents: session.amount_total || 0,
          currency: session.currency || 'eur',
          status: 'succeeded',
          payment_method: session.payment_method_types?.[0] || 'card',
        })

        await supabase.from('audit_logs').insert({
          user_id: meta.user_id || null,
          action: 'product_order_paid',
          entity: 'order',
          entity_id: meta.order_id,
          details: { amount: session.amount_total, order_number: meta.order_number },
        })
      }

      // Trigger new customer commission after booking payment
      if (meta.type === 'booking_payment' && meta.booking_id) {
        calculateNewCustomerCommission(meta.booking_id).catch(console.error)
      }

      if (meta.type === 'rental_payment' && meta.rental_booking_id) {
        // SEPA & Co. zahlen asynchron: completed kann mit payment_status
        // 'unpaid' feuern — dann erst bei async_payment_succeeded erfüllen.
        if (session.payment_status === 'paid') {
          await fulfillRentalPayment(supabase, session)
        }
      }

      if (meta.type === 'provider_subscription' && meta.user_id) {
        // Update salon subscription tier (subscription_tier lives on salons, not profiles)
        const tier = meta.tier || 'starter'
        await supabase
          .from('salons')
          .update({ subscription_tier: tier })
          .eq('owner_id', meta.user_id)

        await supabase.from('audit_logs').insert({
          user_id: meta.user_id,
          action: 'subscription_activated',
          entity: 'profile',
          entity_id: meta.user_id,
          details: { tier, subscription_id: session.subscription },
        })
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      // Find user by Stripe customer ID and downgrade
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .limit(1)

      if (profiles?.[0]) {
        await supabase.from('audit_logs').insert({
          user_id: profiles[0].id,
          action: 'payment_failed',
          entity: 'profile',
          entity_id: profiles[0].id,
          details: { invoice_id: invoice.id },
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .limit(1)

      if (profiles?.[0]) {
        // Downgrade salon subscription (subscription_tier lives on salons, not profiles)
        await supabase
          .from('salons')
          .update({ subscription_tier: 'starter' })
          .eq('owner_id', profiles[0].id)
      }
      break
    }

    case 'checkout.session.async_payment_succeeded': {
      // SEPA-Zahlung ist (Tage später) durch → jetzt erst erfüllen
      const session = event.data.object as Stripe.Checkout.Session
      const meta = session.metadata || {}
      if (meta.type === 'rental_payment' && meta.rental_booking_id) {
        await fulfillRentalPayment(supabase, session)
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
      }
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
