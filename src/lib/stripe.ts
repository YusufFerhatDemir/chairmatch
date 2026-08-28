import Stripe from 'stripe'

// Server-side Stripe instance — lazy init to prevent build-time crash
let _stripe: Stripe | null = null

// Für Routen, die ohne Stripe sinnvoll degradieren können (z.B. Cron-Jobs):
// vorab prüfen statt getStripe() werfen zu lassen.
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}
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
  /**
   * Wer zahlt. Bis Track 16 stand das NICHT in den Metadaten der Termin- und
   * der Shop-Session — nur die Miet-Session trug es. Der Webhook liest
   * `metadata.user_id` an einem Dutzend Stellen: er schreibt damit
   * `payments.user_id`, die `user_id` der Audit-Eintraege und entscheidet mit
   * `if (meta.user_id)`, ob die Kundin ueberhaupt eine Benachrichtigung
   * bekommt. Fuer Termin und Bestellung war der Wert immer `undefined` —
   * also: Zahlungen ohne Zahler, Audit-Eintraege ohne Konto, und die
   * Nachricht „Zahlung bestaetigt" wurde fuer Termine nie verschickt.
   */
  userId: string
  customerEmail: string
  salonName: string
  serviceName: string
  amountCents: number
  successUrl: string
  cancelUrl: string
}) {
  const session = await stripe.checkout.sessions.create({
    // giropay bewusst NICHT dabei — von Stripe zum 30.06.2024 eingestellt.
    // Der Miet-Checkout hatte den Wert laengst entfernt (siehe unten), Termin-
    // und Shop-Checkout schleppten ihn weiter: dieselbe Session-Erstellung,
    // dasselbe harte Fehlschlagen.
    payment_method_types: ['card', 'sepa_debit'],
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
      user_id: params.userId,
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
  /**
   * Bereits bekannte Stripe-Kundennummer (`profiles.stripe_customer_id`).
   *
   * Ohne sie legt Stripe bei JEDEM Abo-Checkout einen NEUEN Kunden an: ein
   * Anbieter, der zweimal bucht, hat zwei Kundennummern, und der Webhook
   * ueberschreibt `profiles.stripe_customer_id` mit der zuletzt entstandenen.
   * Das aeltere Abo ist ueber den Rueckfallweg
   * (`resolveSubscriptionOwner` ueber `stripe_customer_id`) dann nicht mehr
   * auffindbar — und die Frage „laeuft hier schon ein Abo?" ist gar nicht
   * mehr beantwortbar, weil sie pro Kunde gestellt wird.
   */
  customerId?: string | null
  tier: 'starter' | 'premium' | 'gold'
  successUrl: string
  cancelUrl: string
}) {
  const priceId = SUBSCRIPTION_PRICES[params.tier]
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'sepa_debit'],
    mode: 'subscription',
    // Genau EINES von beiden — Stripe lehnt `customer` + `customer_email`
    // gemeinsam ab.
    ...(params.customerId
      ? { customer: params.customerId }
      : { customer_email: params.email }),
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      user_id: params.userId,
      tier: params.tier,
      type: 'provider_subscription',
    },
    // Dieselben Angaben AM ABO, nicht nur an der Checkout-Session.
    //
    // Die Session-Metadaten sieht ausschliesslich `checkout.session.completed`.
    // Jedes spaetere Ereignis im Leben des Abos — Kuendigung, Stufenwechsel,
    // geplatzte Verlaengerung — kommt als `customer.subscription.*` und traegt
    // die Session gar nicht mehr. Bis 2026-08-27 blieb dort nur
    // `subscription.customer`, und die Zuordnung lief ueber
    // `profiles.stripe_customer_id` — eine Spalte, die im gesamten
    // Produktivcode nie beschrieben wurde. Die Kuendigung fand deshalb
    // garantiert kein Profil und stufte nie zurueck.
    subscription_data: {
      metadata: {
        user_id: params.userId,
        tier: params.tier,
        type: 'provider_subscription',
      },
    },
    client_reference_id: params.userId,
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
  /** Wer zahlt — siehe createBookingCheckout. */
  userId: string
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
    // giropay bewusst NICHT dabei — von Stripe zum 30.06.2024 eingestellt.
    // Der Miet-Checkout hatte den Wert laengst entfernt (siehe unten), Termin-
    // und Shop-Checkout schleppten ihn weiter: dieselbe Session-Erstellung,
    // dasselbe harte Fehlschlagen.
    payment_method_types: ['card', 'sepa_debit'],
    mode: 'payment',
    customer_email: params.customerEmail,
    line_items: items,
    metadata: {
      order_id: params.orderId,
      order_number: params.orderNumber,
      user_id: params.userId,
      type: 'product_order',
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    locale: 'de',
  })
  return session
}

// Helper: create checkout session for rental booking (Stuhl-/Liegen-/Raum-Miete)
export async function createRentalCheckout(params: {
  rentalBookingId: string
  renterId: string
  customerEmail: string
  salonName: string
  equipmentName: string
  startDate: string
  endDate: string
  amountCents: number
  successUrl: string
  cancelUrl: string
}) {
  const session = await stripe.checkout.sessions.create({
    // giropay bewusst NICHT dabei — von Stripe zum 30.06.2024 eingestellt,
    // der Wert würde die Session-Erstellung hart fehlschlagen lassen.
    payment_method_types: ['card', 'sepa_debit'],
    mode: 'payment',
    customer_email: params.customerEmail,
    // 30 Min (Stripe-Minimum) statt Default 24h: eine nicht bezahlte Session
    // soll den Mietzeitraum nicht lange blockieren — checkout.session.expired
    // im Webhook gibt die pending-Buchung dann wieder frei.
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: params.equipmentName,
            description: `Miete bei ${params.salonName} · ${params.startDate} bis ${params.endDate}`,
          },
          unit_amount: params.amountCents,
        },
        quantity: 1,
      },
    ],
    // transfer_group verknuepft Payment + spaeteren Connect-Transfer (Payout-Cron)
    payment_intent_data: {
      transfer_group: `rental_${params.rentalBookingId}`,
    },
    metadata: {
      rental_booking_id: params.rentalBookingId,
      user_id: params.renterId,
      type: 'rental_payment',
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    locale: 'de',
  })
  return session
}

// Helper: Stripe Connect Express-Account für Anbieter anlegen
export async function createConnectAccount(params: { email: string; userId: string }) {
  return stripe.accounts.create({
    type: 'express',
    country: 'DE',
    email: params.email,
    default_currency: 'eur',
    metadata: { user_id: params.userId },
    capabilities: {
      transfers: { requested: true },
    },
    business_profile: {
      product_description: 'Vermietung von Salon-Arbeitsplätzen über ChairMatch',
    },
  })
}

// Helper: Onboarding-Link für Express-Account (Stripe-hosted)
export async function createConnectAccountLink(params: {
  accountId: string
  refreshUrl: string
  returnUrl: string
}) {
  return stripe.accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: 'account_onboarding',
  })
}

// Helper: create refund
export async function createRefund(paymentIntentId: string, amountCents?: number) {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents, // partial refund if specified
  })
}
