import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { createBookingCheckout, createSubscriptionCheckout } from '@/lib/stripe'
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

      const origin = req.headers.get('origin') || 'https://chairmatch.de'
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

      const origin = req.headers.get('origin') || 'https://chairmatch.de'
      const checkoutSession = await createSubscriptionCheckout({
        userId: session.user.id,
        email: session.user.email || '',
        tier,
        successUrl: `${origin}/provider?subscription=success`,
        cancelUrl: `${origin}/provider?subscription=cancelled`,
      })

      return NextResponse.json({ url: checkoutSession.url })
    }

    return NextResponse.json({ error: 'Ungültiger Typ' }, { status: 400 })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
