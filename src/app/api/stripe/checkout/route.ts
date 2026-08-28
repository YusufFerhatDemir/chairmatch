import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { stripe, createBookingCheckout, createSubscriptionCheckout, createProductOrderCheckout, createRentalCheckout } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { appOriginFromRequest } from '@/lib/app-origin'
import { SALON_SUSPENDED_MESSAGE, checkSalonAcceptsBusiness, salonAcceptsBusiness } from '@/lib/salon-status'
import { entitlementForStatus } from '@/lib/subscription-tier'
import { stripeUnavailable } from '@/lib/stripe-availability'

/**
 * Ein Betrag, den Stripe gar nicht einziehen kann, darf nicht als
 * Stripe-Aufruf enden.
 *
 * `createBookingCheckout` & Co. reichen `unit_amount` unveraendert durch. Steht
 * dort 0 — moeglich ueber einen Rabattcode mit 100 %, `calculatePrice` deckelt
 * ausdruecklich bei 0 —, wirft die Session-Erstellung, der catch am Ende
 * dieser Datei macht daraus „Interner Fehler" (500), und die Kundin liest
 * einen Serverfehler, wo eine Erklaerung hingehoert. Erfunden wird hier kein
 * Mindestbetrag: geprueft wird nur, was zweifelsfrei nicht zahlbar ist.
 */
const NICHT_ZAHLBAR = 'Dieser Betrag kann nicht online bezahlt werden. Bitte wende dich an den Salon.'

function istZahlbar(amountCents: unknown): boolean {
  return typeof amountCents === 'number' && Number.isFinite(amountCents) && amountCents > 0
}

export async function POST(req: NextRequest) {
  try {
    // Ohne Stripe-Schluessel wirft der erste Zugriff auf den `stripe`-Proxy,
    // und der catch unten macht daraus 500 „Interner Fehler". Vorne gefragt
    // ist es das, was es ist: ein nicht eingerichteter Zahlweg (503).
    const nichtVerfuegbar = stripeUnavailable()
    if (nichtVerfuegbar) return nichtVerfuegbar

    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await req.json()
    const { type } = body

    if (type === 'booking') {
      const { bookingId } = body
      if (!bookingId) {
        return NextResponse.json({ error: 'bookingId fehlt' }, { status: 400 })
      }

      const supabase = getSupabaseAdmin()
      // Auf den eigenen Termin eingegrenzt — wie im product_order- und
      // rental-Zweig. Ohne `customer_id` konnte jede eingeloggte Person eine
      // Checkout-Session zu einer FREMDEN Buchung erzeugen. Der Schaden lag
      // nicht in der Zahlung selbst, sondern im Update darunter: es setzte
      // `payment_status` der fremden Buchung auf 'pending' (auch wenn sie
      // bereits bezahlt war) und ueberschrieb deren `stripe_session_id`, womit
      // die echte offene Zahlung des Kunden ins Leere lief. Die Stripe-Seite
      // zeigte ausserdem Salon, Leistung und Betrag eines Dritten.
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('*, services(name), salons(name)')
        .eq('id', bookingId)
        .eq('customer_id', session.user.id)
        .single()

      if (error || !booking) {
        return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 })
      }

      if (booking.payment_status === 'paid') {
        return NextResponse.json({ error: 'Buchung ist bereits bezahlt' }, { status: 409 })
      }
      if (['cancelled', 'no_show'].includes(String(booking.status))) {
        return NextResponse.json({ error: 'Buchung ist nicht mehr zahlbar' }, { status: 409 })
      }

      // Track 15 hat den Salon-Riegel auf die Strecken gelegt, auf denen eine
      // Verpflichtung ENTSTEHT (createBooking, /api/rental-bookings). Die
      // Nachzahlung einer schon bestehenden Buchung lief daran vorbei: ein
      // Termin, der vor der Sperre angelegt wurde, liess sich danach weiter
      // bezahlen. Beim Termin bleibt das Geld zwar auf dem Plattformkonto —
      // bei der Miete unten aber nicht, dort ueberweist der Payout-Cron den
      // Anbieteranteil an genau den gesperrten Anbieter.
      const salonGuard = await checkSalonAcceptsBusiness(supabase, String(booking.salon_id))
      if (!salonGuard.ok) {
        return NextResponse.json({ error: salonGuard.error }, { status: salonGuard.status })
      }

      if (!istZahlbar(booking.price_cents)) {
        return NextResponse.json({ error: NICHT_ZAHLBAR }, { status: 409 })
      }

      const origin = appOriginFromRequest(req)
      const checkoutSession = await createBookingCheckout({
        bookingId,
        userId: session.user.id,
        customerEmail: session.user.email || '',
        salonName: (booking as Record<string, unknown>).salons
          ? ((booking as Record<string, unknown>).salons as { name: string }).name
          : 'Salon',
        serviceName: (booking as Record<string, unknown>).services
          ? ((booking as Record<string, unknown>).services as { name: string }).name
          : 'Service',
        amountCents: booking.price_cents,
        successUrl: `${origin}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
        cancelUrl: `${origin}/booking/${booking.salon_id}?cancelled=true`,
      })

      // Store checkout session reference
      await supabase
        .from('bookings')
        .update({
          payment_status: 'pending',
          stripe_session_id: checkoutSession.id,
        })
        .eq('id', bookingId)

      return NextResponse.json({ url: checkoutSession.url })
    }

    if (type === 'subscription') {
      const { tier } = body
      if (!tier || !['starter', 'premium', 'gold'].includes(tier)) {
        return NextResponse.json({ error: 'Ungültiger Tier' }, { status: 400 })
      }

      // Ein zweites Abo auf dasselbe Konto war bis Track 16 nichts, was
      // irgendetwas verhindert haette.
      //
      // Die Stufe steht in `salons.subscription_tier` — EIN Wert, egal wie
      // viele Abos dahinter laufen. `provider_subscriptions` existiert als
      // Tabelle, wird vom Produktivcode aber nirgends beschrieben; es gab
      // also gar keinen Ort, an dem „hier laeuft schon ein Abo" haette
      // stehen koennen. Zwei Tabs, zweimal geklickt, und der Anbieter zahlt
      // ab sofort zweimal im Monat. Kuendigt er eines davon, meldet Stripe
      // `customer.subscription.deleted`, und `handleSubscriptionChange`
      // stuft ihn auf die kostenlose Stufe zurueck — waehrend das zweite Abo
      // weiterlaeuft und weiter abgebucht wird.
      //
      // Gefragt wird deshalb Stripe selbst, nicht unsere Datenbank: dort
      // stehen die Abos, und dort stehen sie vollstaendig. Fehlt die
      // Kundennummer, hat dieses Konto noch nie ueber uns gebucht.
      const supabase = getSupabaseAdmin()
      const { data: profil, error: profilError } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profilError) {
        // Fail closed: ohne Kundennummer koennten wir ein zweites Abo weder
        // erkennen noch am selben Kunden anlegen.
        console.error('subscription checkout: Profil nicht lesbar:', profilError.message)
        return NextResponse.json(
          { error: 'Abo konnte nicht geprüft werden. Bitte später erneut versuchen.' },
          { status: 503 },
        )
      }

      const customerId = (profil?.stripe_customer_id as string | null) || null

      if (customerId) {
        const vorhandene = await stripe.subscriptions.list({
          customer: customerId,
          status: 'all',
          limit: 100,
        })
        // `entitlementForStatus` kennt die Stripe-Status bereits: 'entitled'
        // ist bezahlt/Testphase, 'grace' ist die laufende Mahnkette. Beides
        // wird weiter abgerechnet — nur 'revoked' ist wirklich vorbei.
        const laufend = (vorhandene?.data ?? []).find(
          sub => entitlementForStatus(sub.status) !== 'revoked',
        )
        if (laufend) {
          return NextResponse.json(
            {
              error:
                'Für dieses Konto läuft bereits ein Abo. Eine Änderung der Stufe erfolgt über die Abo-Verwaltung, nicht über einen zweiten Kauf.',
              subscriptionId: laufend.id,
            },
            { status: 409 },
          )
        }
      }

      const origin = appOriginFromRequest(req)
      const checkoutSession = await createSubscriptionCheckout({
        userId: session.user.id,
        email: session.user.email || '',
        customerId,
        tier,
        successUrl: `${origin}/provider?subscription=success`,
        cancelUrl: `${origin}/provider?subscription=cancelled`,
      })

      return NextResponse.json({ url: checkoutSession.url })
    }

    if (type === 'product_order') {
      const { orderId } = body
      if (!orderId) {
        return NextResponse.json({ error: 'orderId fehlt' }, { status: 400 })
      }

      const supabase = getSupabaseAdmin()
      const { data: order, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name))')
        .eq('id', orderId)
        .eq('customer_id', session.user.id)
        .single()

      if (error || !order) {
        return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 })
      }

      // Gleiche Riegel wie im booking-Zweig. Ohne sie liess sich eine bereits
      // bezahlte Bestellung ein zweites Mal in den Checkout schicken — das
      // Update darunter setzte `payment_status` zurueck auf 'pending' und
      // ueberschrieb die `stripe_session_id` der echten Zahlung.
      if (order.payment_status === 'paid') {
        return NextResponse.json({ error: 'Bestellung ist bereits bezahlt' }, { status: 409 })
      }
      if (order.status === 'cancelled') {
        return NextResponse.json({ error: 'Bestellung ist nicht mehr zahlbar' }, { status: 409 })
      }

      const items = ((order as Record<string, unknown>).order_items as { quantity: number; unit_price_cents: number; products: { name: string } | null }[]) || []
      const lineItems = items.map(i => ({
        name: i.products?.name || 'Produkt',
        amountCents: i.unit_price_cents,
        quantity: i.quantity,
      }))

      const summe =
        lineItems.reduce((acc, li) => acc + li.amountCents * li.quantity, 0) +
        (order.shipping_cents || 0)
      if (!istZahlbar(summe)) {
        return NextResponse.json({ error: NICHT_ZAHLBAR }, { status: 409 })
      }

      const origin = appOriginFromRequest(req)
      const checkoutSession = await createProductOrderCheckout({
        orderId,
        orderNumber: order.order_number,
        userId: session.user.id,
        customerEmail: session.user.email || '',
        lineItems,
        shippingCents: order.shipping_cents || 0,
        successUrl: `${origin}/shop?order=success&order_id=${orderId}`,
        cancelUrl: `${origin}/shop?order=cancelled`,
      })

      await supabase
        .from('orders')
        .update({ payment_status: 'pending', stripe_session_id: checkoutSession.id })
        .eq('id', orderId)

      return NextResponse.json({ url: checkoutSession.url })
    }

    if (type === 'rental') {
      // Re-Payment für eine bestehende, noch unbezahlte Miet-Buchung
      // (Erstanlage + Checkout läuft über POST /api/rental-bookings)
      const { rentalBookingId } = body
      if (!rentalBookingId) {
        return NextResponse.json({ error: 'rentalBookingId fehlt' }, { status: 400 })
      }

      const supabase = getSupabaseAdmin()
      const { data: rental, error } = await supabase
        .from('rental_bookings')
        .select('*, rental_equipment(name, salons(name, is_active))')
        .eq('id', rentalBookingId)
        .eq('renter_id', session.user.id)
        .single()

      if (error || !rental) {
        return NextResponse.json({ error: 'Miet-Buchung nicht gefunden' }, { status: 404 })
      }
      if (rental.payment_status === 'paid') {
        return NextResponse.json({ error: 'Buchung ist bereits bezahlt' }, { status: 409 })
      }
      if (!['pending', 'confirmed'].includes(rental.status)) {
        return NextResponse.json({ error: 'Buchung ist nicht mehr zahlbar' }, { status: 409 })
      }

      const equipment = (rental as Record<string, unknown>).rental_equipment as
        | { name?: string; salons?: { name?: string; is_active?: boolean | null } | null }
        | null

      // Der Riegel aus Track 15 sitzt auf `POST /api/rental-bookings`, also
      // auf der ERSTanlage. Diese Route ist die Nachzahlung — eine Buchung,
      // die vor der Sperre entstanden ist, liess sich danach unveraendert
      // bezahlen. Und anders als beim Termin bleibt das Geld hier nicht auf
      // dem Plattformkonto: `cron/rental-payouts` ueberweist den
      // Anbieteranteil am Mietbeginn an genau den Anbieter, den die
      // Plattform angehalten hat. `salons` ist hier schon eingebettet, also
      // ohne zweite Abfrage.
      if (!salonAcceptsBusiness(equipment?.salons ?? null)) {
        return NextResponse.json({ error: SALON_SUSPENDED_MESSAGE }, { status: 409 })
      }

      if (!istZahlbar(rental.total_cents)) {
        return NextResponse.json({ error: NICHT_ZAHLBAR }, { status: 409 })
      }

      // Alte, noch offene Checkout-Session invalidieren — sonst existieren zwei
      // parallel zahlbare Sessions mit unterschiedlichen Payment-Intents
      // (Doppelzahlung + doppelter Provider-Payout). Der Webhook hat zwar einen
      // Doppelzahlungs-Guard mit Auto-Refund, aber gar nicht erst zahlbar ist besser.
      if (rental.stripe_session_id) {
        try {
          const old = await stripe.checkout.sessions.retrieve(rental.stripe_session_id)
          if (old.status === 'open') {
            await stripe.checkout.sessions.expire(old.id)
          }
        } catch {
          // Session existiert nicht mehr / bereits abgelaufen — egal
        }
      }

      const origin = appOriginFromRequest(req)
      const checkoutSession = await createRentalCheckout({
        rentalBookingId,
        renterId: session.user.id,
        customerEmail: session.user.email || '',
        salonName: equipment?.salons?.name || 'Salon',
        equipmentName: equipment?.name || 'Mietobjekt',
        startDate: rental.start_date,
        endDate: rental.end_date,
        amountCents: rental.total_cents,
        successUrl: `${origin}/rentals?payment=success&rental_id=${rentalBookingId}`,
        cancelUrl: `${origin}/rentals?payment=cancelled&rental_id=${rentalBookingId}`,
      })

      await supabase
        .from('rental_bookings')
        .update({ payment_status: 'pending', stripe_session_id: checkoutSession.id })
        .eq('id', rentalBookingId)

      return NextResponse.json({ url: checkoutSession.url })
    }

    return NextResponse.json({ error: 'Ungültiger Typ' }, { status: 400 })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
