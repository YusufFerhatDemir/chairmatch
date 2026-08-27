/**
 * Stripe-Harness — Ersatz für `@/lib/stripe` in den E2E-Tests.
 *
 * Kein Netzwerk, keine Test-Keys: die Tests prüfen, was ChairMatch mit den
 * Stripe-Antworten MACHT (Buchung bestätigen, Provision buchen, Refund
 * auslösen), nicht ob Stripe funktioniert. Fehlerfälle (abgelehnte Karte,
 * Stripe nicht erreichbar) werden über `mockRejectedValueOnce` gesetzt.
 */

import { vi, type Mock } from 'vitest'

export const WEBHOOK_SECRET = 'whsec_test_chairmatch'

export interface CheckoutSessionStub {
  id: string
  url: string
  status?: string
  payment_status?: string
  amount_total?: number
  currency?: string
  payment_intent?: string | null
  payment_method_types?: string[]
  metadata?: Record<string, string>
}

export interface StripeHarness {
  createBookingCheckout: Mock
  createSubscriptionCheckout: Mock
  createProductOrderCheckout: Mock
  createRentalCheckout: Mock
  createRefund: Mock
  createConnectAccount: Mock
  createConnectAccountLink: Mock
  constructEvent: Mock
  sessionsRetrieve: Mock
  sessionsExpire: Mock
  /** Nachbau des `stripe`-Proxys aus @/lib/stripe */
  stripe: {
    checkout: { sessions: { create: Mock; retrieve: Mock; expire: Mock } }
    refunds: { create: Mock }
    webhooks: { constructEvent: Mock }
  }
  /** Alle ausgelösten Refunds — Reihenfolge und Beträge sind Teil der Prüfung */
  refunds: { paymentIntent: string; amountCents?: number }[]
}

export function createStripeHarness(): StripeHarness {
  const refunds: { paymentIntent: string; amountCents?: number }[] = []
  let counter = 0

  const checkout = (): CheckoutSessionStub => {
    counter += 1
    return {
      id: `cs_test_${counter}`,
      url: `https://checkout.stripe.com/c/pay/cs_test_${counter}`,
      status: 'open',
    }
  }

  const createRefund = vi.fn(async (paymentIntentId: string, amountCents?: number) => {
    refunds.push({ paymentIntent: paymentIntentId, amountCents })
    return { id: `re_test_${refunds.length}`, payment_intent: paymentIntentId, amount: amountCents }
  })

  const sessionsRetrieve = vi.fn(async (id: string) => ({ id, status: 'open' }))
  const sessionsExpire = vi.fn(async (id: string) => ({ id, status: 'expired' }))
  const constructEvent = vi.fn(() => {
    throw new Error('constructEvent wurde im Test nicht vorbereitet')
  })

  return {
    createBookingCheckout: vi.fn(async () => checkout()),
    createSubscriptionCheckout: vi.fn(async () => checkout()),
    createProductOrderCheckout: vi.fn(async () => checkout()),
    createRentalCheckout: vi.fn(async () => checkout()),
    createRefund,
    createConnectAccount: vi.fn(async () => ({ id: 'acct_test_neu' })),
    createConnectAccountLink: vi.fn(async () => ({ url: 'https://connect.stripe.com/setup/x' })),
    constructEvent,
    sessionsRetrieve,
    sessionsExpire,
    refunds,
    stripe: {
      checkout: { sessions: { create: vi.fn(async () => checkout()), retrieve: sessionsRetrieve, expire: sessionsExpire } },
      refunds: { create: createRefund },
      webhooks: { constructEvent },
    },
  }
}

/** Stripe-Event-Hülle für den Webhook-Test. */
export function stripeEvent(type: string, object: unknown) {
  return {
    id: `evt_test_${type}`,
    type,
    api_version: '2025-12-18.acacia',
    created: 1_756_684_800,
    data: { object },
  }
}

/** checkout.session.* für eine Miet-Zahlung. */
export function rentalCheckoutSession(params: {
  rentalBookingId: string
  userId: string
  amountCents: number
  paymentIntent?: string | null
  paymentStatus?: 'paid' | 'unpaid'
  sessionId?: string
}): CheckoutSessionStub {
  return {
    id: params.sessionId ?? 'cs_test_rental',
    url: 'https://checkout.stripe.com/c/pay/cs_test_rental',
    payment_status: params.paymentStatus ?? 'paid',
    amount_total: params.amountCents,
    currency: 'eur',
    payment_intent: params.paymentIntent === undefined ? 'pi_test_neu' : params.paymentIntent,
    payment_method_types: ['card'],
    metadata: {
      rental_booking_id: params.rentalBookingId,
      user_id: params.userId,
      type: 'rental_payment',
    },
  }
}

/** checkout.session.* für eine Termin-Buchung. */
export function bookingCheckoutSession(params: {
  bookingId: string
  userId: string
  amountCents: number
  paymentIntent?: string | null
  paymentStatus?: 'paid' | 'unpaid'
  sessionId?: string
}): CheckoutSessionStub {
  return {
    id: params.sessionId ?? 'cs_test_booking',
    url: 'https://checkout.stripe.com/c/pay/cs_test_booking',
    payment_status: params.paymentStatus ?? 'paid',
    amount_total: params.amountCents,
    currency: 'eur',
    payment_intent: params.paymentIntent === undefined ? 'pi_test_booking' : params.paymentIntent,
    payment_method_types: ['card'],
    metadata: {
      booking_id: params.bookingId,
      user_id: params.userId,
      type: 'booking_payment',
    },
  }
}

/** checkout.session.* für eine Shop-Bestellung. */
export function orderCheckoutSession(params: {
  orderId: string
  userId: string
  amountCents: number
  orderNumber?: string
  paymentIntent?: string | null
  paymentStatus?: 'paid' | 'unpaid'
  sessionId?: string
}): CheckoutSessionStub {
  return {
    id: params.sessionId ?? 'cs_test_order',
    url: 'https://checkout.stripe.com/c/pay/cs_test_order',
    payment_status: params.paymentStatus ?? 'paid',
    amount_total: params.amountCents,
    currency: 'eur',
    payment_intent: params.paymentIntent === undefined ? 'pi_test_order' : params.paymentIntent,
    payment_method_types: ['card'],
    metadata: {
      order_id: params.orderId,
      order_number: params.orderNumber ?? 'CM-20260901-001',
      user_id: params.userId,
      type: 'product_order',
    },
  }
}
