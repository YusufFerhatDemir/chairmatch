import Stripe from 'stripe'

// Server-side Stripe instance — lazy init to prevent build-time crash
let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY ist nicht konfiguriert')
    _stripe = new Stripe(key, {
      apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
      typescript: true,
    })
  }
  return _stripe
}

// Backwards compat — lazy getter (Proxy delegates all property access to real instance)
export const stripe = new Proxy({} as Stripe, {
  get(_, prop: string | symbol) {
    const instance = getStripe()
    return Reflect.get(instance, prop, instance)
  },
})

// Public key for client-side
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''

// Webhook secret
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

// Price IDs for subscription tiers
export const SUBSCRIPTION_PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER || 'price_starter',
  premium: process.env.STRIPE_PRICE_PREMIUM || 'price_premium',
  gold: process.env.STRIPE_PRICE_GOLD || 'price_gold',
} as const

// Helper: create checkout session for booking payment
export async function createBookingCheckout(params: {
  bookingId: string
  customerEmail: string
  salonName: string
  serviceName: string
  amountCents: number
  successUrl: string
  cancelUrl: string
}) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'sepa_debit', 'giropay'],
    mode: 'payment',
    customer_email: params.customerEmail,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: params.serviceName,
            description: `Buchung bei ${params.salonName}`,
          },
          unit_amount: params.amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      booking_id: params.bookingId,
      type: 'booking_payment',
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    locale: 'de',
  })
  return session
}

// Helper: create subscription checkout for providers
export async function createSubscriptionCheckout(params: {
  userId: string
  email: string
  tier: 'starter' | 'premium' | 'gold'
  successUrl: string
  cancelUrl: string
}) {
  const priceId = SUBSCRIPTION_PRICES[params.tier]
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'sepa_debit'],
    mode: 'subscription',
    customer_email: params.email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      user_id: params.userId,
      tier: params.tier,
      type: 'provider_subscription',
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    locale: 'de',
  })
  return session
}

// Helper: create checkout for product order
export async function createProductOrderCheckout(params: {
  orderId: string
  orderNumber: string
  customerEmail: string
  lineItems: { name: string; amountCents: number; quantity: number }[]
  shippingCents: number
  successUrl: string
  cancelUrl: string
}) {
  const items: Stripe.Checkout.SessionCreateParams.LineItem[] = params.lineItems.map(li => ({
    price_data: {
      currency: 'eur',
      product_data: { name: li.name },
      unit_amount: li.amountCents,
    },
    quantity: li.quantity,
  }))

  if (params.shippingCents > 0) {
    items.push({
      price_data: {
        currency: 'eur',
        product_data: { name: 'Versand' },
        unit_amount: params.shippingCents,
      },
      quantity: 1,
    })
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'sepa_debit', 'giropay'],
    mode: 'payment',
    customer_email: params.customerEmail,
    line_items: items,
    metadata: {
      order_id: params.orderId,
      order_number: params.orderNumber,
      type: 'product_order',
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    locale: 'de',
  })
  return session
}

// Helper: create refund
export async function createRefund(paymentIntentId: string, amountCents?: number) {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents, // partial refund if specified
  })
}
