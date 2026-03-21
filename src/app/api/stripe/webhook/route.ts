import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { calculateNewCustomerCommission } from '@/modules/marketplace/commission.service'
import type Stripe from 'stripe'

// Disable body parsing — Stripe needs raw body
export const runtime = 'nodejs'

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
          booking_id: meta.booking_id,
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent as string,
          amount_cents: session.amount_total || 0,
          currency: session.currency || 'eur',
          status: 'succeeded',
          payment_method: session.payment_method_types?.[0] || 'card',
        })

        // Audit log
        await supabase.from('audit_logs').insert({
          actor_id: meta.booking_id,
          action: 'payment_completed',
          entity_type: 'booking',
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
          booking_id: meta.order_id, // reuse field for order reference
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent as string,
          amount_cents: session.amount_total || 0,
          currency: session.currency || 'eur',
          status: 'succeeded',
          payment_method: session.payment_method_types?.[0] || 'card',
        })

        await supabase.from('audit_logs').insert({
          actor_id: meta.order_id,
          action: 'product_order_paid',
          entity_type: 'order',
          entity_id: meta.order_id,
          details: { amount: session.amount_total, order_number: meta.order_number },
        })
      }

      // Trigger new customer commission after booking payment
      if (meta.type === 'booking_payment' && meta.booking_id) {
        calculateNewCustomerCommission(meta.booking_id).catch(console.error)
      }

      if (meta.type === 'provider_subscription' && meta.user_id) {
        // Update provider subscription tier
        const tier = meta.tier || 'starter'
        await supabase
          .from('profiles')
          .update({ subscription_tier: tier })
          .eq('id', meta.user_id)

        // Update salon subscription tier
        await supabase
          .from('salons')
          .update({ subscription_tier: tier })
          .eq('owner_id', meta.user_id)

        await supabase.from('audit_logs').insert({
          actor_id: meta.user_id,
          action: 'subscription_activated',
          entity_type: 'profile',
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
          actor_id: profiles[0].id,
          action: 'payment_failed',
          entity_type: 'profile',
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
        await supabase
          .from('profiles')
          .update({ subscription_tier: 'starter' })
          .eq('id', profiles[0].id)

        await supabase
          .from('salons')
          .update({ subscription_tier: 'starter' })
          .eq('owner_id', profiles[0].id)
      }
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const paymentIntent = charge.payment_intent as string

      if (paymentIntent) {
        await supabase
          .from('payments')
          .update({ status: 'refunded', refunded_at: new Date().toISOString() })
          .eq('stripe_payment_intent', paymentIntent)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
