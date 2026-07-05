import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { stripe, createBookingCheckout, createSubscriptionCheckout, createProductOrderCheckout, createRentalCheckout } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
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
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('*, services(name), salons(name)')
        .eq('id', bookingId)
        .single()

      if (error || !booking) {
        return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 })
      }

      const origin = req.headers.get('origin') || 'https://www.chairmatch.de'
      const checkoutSession = await createBookingCheckout({
        bookingId,
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

      const origin = req.headers.get('origin') || 'https://www.chairmatch.de'
      const checkoutSession = await createSubscriptionCheckout({
        userId: session.user.id,
        email: session.user.email || '',
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

      const items = ((order as Record<string, unknown>).order_items as { quantity: number; unit_price_cents: number; products: { name: string } | null }[]) || []
      const lineItems = items.map(i => ({
        name: i.products?.name || 'Produkt',
        amountCents: i.unit_price_cents,
        quantity: i.quantity,
      }))

      const origin = req.headers.get('origin') || 'https://www.chairmatch.de'
      const checkoutSession = await createProductOrderCheckout({
        orderId,
        orderNumber: order.order_number,
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
        .select('*, rental_equipment(name, salons(name))')
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

      const equipment = (rental as Record<string, unknown>).rental_equipment as
        | { name?: string; salons?: { name?: string } | null }
        | null

      const origin = req.headers.get('origin') || 'https://www.chairmatch.de'
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
