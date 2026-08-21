// @vitest-environment node
/**
 * E2E: Zahlungs-Flow (Stripe) — Checkout → Webhook → Refund.
 *
 * Stripe selbst ist ersetzt (siehe _harness/stripe-harness.ts): geprüft wird,
 * was ChairMatch mit den Stripe-Antworten macht — Buchung bestätigen,
 * Provision buchen, doppelt Gezahltes zurückerstatten.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createDb,
  sessionFor,
  postRequest,
  brokenJsonRequest,
  rawRequest,
  IDS,
} from './_harness/fixtures'
import {
  createStripeHarness,
  stripeEvent,
  rentalCheckoutSession,
  bookingCheckoutSession,
  WEBHOOK_SECRET,
} from './_harness/stripe-harness'
import type { FakeSupabase, Row } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as import('./_harness/fixtures').TestSession | null,
  stripe: undefined as unknown as ReturnType<
    typeof import('./_harness/stripe-harness').createStripeHarness
  >,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({ getServerSession: async () => state.session }))
vi.mock('@/modules/auth/auth.config', () => ({ auth: async () => state.session }))
vi.mock('@/modules/marketplace/commission.service', () => ({
  calculateNewCustomerCommission: vi.fn(async () => null),
  calculateRentalCommission: vi.fn(async () => null),
}))
vi.mock('@/lib/stripe', () => ({
  isStripeConfigured: () => true,
  get stripe() {
    return state.stripe.stripe
  },
  STRIPE_WEBHOOK_SECRET: 'whsec_test_chairmatch',
  STRIPE_PUBLISHABLE_KEY: 'pk_test',
  createBookingCheckout: (...a: unknown[]) => state.stripe.createBookingCheckout(...a),
  createSubscriptionCheckout: (...a: unknown[]) => state.stripe.createSubscriptionCheckout(...a),
  createProductOrderCheckout: (...a: unknown[]) => state.stripe.createProductOrderCheckout(...a),
  createRentalCheckout: (...a: unknown[]) => state.stripe.createRentalCheckout(...a),
  createRefund: (...a: unknown[]) => state.stripe.createRefund(...a),
}))

import { POST as checkoutRoute } from '@/app/api/stripe/checkout/route'
import { POST as webhookRoute } from '@/app/api/stripe/webhook/route'
import { POST as adminRefundRoute } from '@/app/api/admin/refund/route'

const PENDING_RENTAL = '88888888-8888-4888-8888-888888888889'

function db(): FakeSupabase {
  return state.db
}

/** Miet-Buchung im Zustand „angelegt, Checkout offen, noch nicht bezahlt". */
function seedPendingRental(overrides: Row = {}): Row {
  const row: Row = {
    id: PENDING_RENTAL,
    equipment_id: IDS.equipment,
    renter_id: IDS.customer,
    start_date: '2026-12-01',
    end_date: '2026-12-05',
    total_cents: 25000,
    status: 'pending',
    payment_status: 'pending',
    stripe_session_id: 'cs_test_rental',
    stripe_payment_intent: null,
    created_at: '2026-09-01T09:00:00.000Z',
    ...overrides,
  }
  db().rows('rental_bookings').push(row)
  return row
}

/** Webhook-Request: der Handler liest den Rohtext, die Signatur prüft der Mock. */
function webhookRequest(event: unknown, signature: string | null = 't=1,v1=testsig') {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (signature) headers['stripe-signature'] = signature
  state.stripe.constructEvent.mockReturnValueOnce(event)
  return rawRequest('https://www.chairmatch.de/api/stripe/webhook', {
    method: 'POST',
    headers,
    body: JSON.stringify(event),
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))
  state.db = createDb()
  state.session = sessionFor('customer')
  state.stripe = createStripeHarness()
})

afterEach(() => {
  vi.useRealTimers()
})

// ────────────────────────────────────────────────────────────────
describe('Checkout-Session erstellen (POST /api/stripe/checkout)', () => {
  it('antwortet 401 ohne Session', async () => {
    state.session = null
    const res = await checkoutRoute(
      postRequest('https://www.chairmatch.de/api/stripe/checkout', {
        type: 'booking',
        bookingId: IDS.bookingConfirmed,
      }),
    )
    expect(res.status).toBe(401)
    expect(state.stripe.createBookingCheckout).not.toHaveBeenCalled()
  })

  it('erstellt eine Termin-Zahlung und hinterlegt die Session an der Buchung', async () => {
    const res = await checkoutRoute(
      postRequest('https://www.chairmatch.de/api/stripe/checkout', {
        type: 'booking',
        bookingId: IDS.bookingConfirmed,
      }),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).url).toContain('checkout.stripe.com')

    const call = state.stripe.createBookingCheckout.mock.calls[0][0] as {
      amountCents: number
      customerEmail: string
      successUrl: string
    }
    expect(call.amountCents).toBe(5000)
    expect(call.customerEmail).toBe('kundin@example.de')
    expect(call.successUrl).toContain('/booking/success')

    const booking = db().row('bookings', IDS.bookingConfirmed)
    expect(booking?.payment_status).toBe('pending')
    expect(String(booking?.stripe_session_id)).toMatch(/^cs_test_/)
  })

  it('antwortet 404 für eine unbekannte Buchung', async () => {
    const res = await checkoutRoute(
      postRequest('https://www.chairmatch.de/api/stripe/checkout', {
        type: 'booking',
        bookingId: IDS.unknown,
      }),
    )
    expect(res.status).toBe(404)
  })

  it.each([
    ['fehlender Typ', {}],
    ['unbekannter Typ', { type: 'bitcoin' }],
    ['Buchung ohne ID', { type: 'booking' }],
    ['Abo mit ungültiger Stufe', { type: 'subscription', tier: 'platin' }],
    ['Miete ohne ID', { type: 'rental' }],
  ])('weist ungültige Anfrage ab: %s', async (_label, body) => {
    const res = await checkoutRoute(
      postRequest('https://www.chairmatch.de/api/stripe/checkout', body),
    )
    expect(res.status).toBe(400)
  })

  it('erstellt eine Abo-Zahlung für Anbieter', async () => {
    state.session = sessionFor('owner')
    const res = await checkoutRoute(
      postRequest('https://www.chairmatch.de/api/stripe/checkout', {
        type: 'subscription',
        tier: 'premium',
      }),
    )
    expect(res.status).toBe(200)
    const call = state.stripe.createSubscriptionCheckout.mock.calls[0][0] as { tier: string }
    expect(call.tier).toBe('premium')
  })

  it('Re-Payment einer Miete verfällt die alte offene Session', async () => {
    seedPendingRental({ payment_status: 'unpaid', stripe_session_id: 'cs_test_alt' })
    const res = await checkoutRoute(
      postRequest('https://www.chairmatch.de/api/stripe/checkout', {
        type: 'rental',
        rentalBookingId: PENDING_RENTAL,
      }),
    )
    expect(res.status).toBe(200)
    expect(state.stripe.sessionsExpire).toHaveBeenCalledWith('cs_test_alt')
    expect(db().row('rental_bookings', PENDING_RENTAL)?.payment_status).toBe('pending')
  })

  it('lehnt das Re-Payment einer bereits bezahlten Miete ab (409)', async () => {
    state.session = sessionFor('otherCustomer')
    const res = await checkoutRoute(
      postRequest('https://www.chairmatch.de/api/stripe/checkout', {
        type: 'rental',
        rentalBookingId: IDS.rentalConfirmed,
      }),
    )
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/bereits bezahlt/)
  })

  it('lässt niemanden die Miet-Buchung einer anderen Person bezahlen (404)', async () => {
    seedPendingRental({ renter_id: IDS.otherCustomer })
    const res = await checkoutRoute(
      postRequest('https://www.chairmatch.de/api/stripe/checkout', {
        type: 'rental',
        rentalBookingId: PENDING_RENTAL,
      }),
    )
    expect(res.status).toBe(404)
  })

  it('antwortet 500, wenn Stripe die Session ablehnt (z.B. Karte gesperrt)', async () => {
    state.stripe.createBookingCheckout.mockRejectedValueOnce(
      new Error('Your card was declined.'),
    )
    const res = await checkoutRoute(
      postRequest('https://www.chairmatch.de/api/stripe/checkout', {
        type: 'booking',
        bookingId: IDS.bookingConfirmed,
      }),
    )
    expect(res.status).toBe(500)
    expect(db().row('bookings', IDS.bookingConfirmed)?.payment_status).toBe('unpaid')
  })
})

// ────────────────────────────────────────────────────────────────
describe('Webhook-Absicherung (POST /api/stripe/webhook)', () => {
  it('lehnt Anfragen ohne Stripe-Signatur ab', async () => {
    const res = await webhookRoute(
      rawRequest('https://www.chairmatch.de/api/stripe/webhook', {
        method: 'POST',
        body: '{}',
      }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/signature/i)
  })

  it('lehnt eine gefälschte Signatur ab', async () => {
    state.stripe.constructEvent.mockImplementationOnce(() => {
      throw new Error('No signatures found matching the expected signature for payload')
    })
    const res = await webhookRoute(
      rawRequest('https://www.chairmatch.de/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'gefaelscht' },
        body: '{}',
      }),
    )
    expect(res.status).toBe(400)
    expect(db().rows('payments')).toHaveLength(0)
  })

  it('prüft die Signatur gegen das konfigurierte Webhook-Secret', async () => {
    seedPendingRental()
    await webhookRoute(
      webhookRequest(
        stripeEvent(
          'checkout.session.completed',
          rentalCheckoutSession({
            rentalBookingId: PENDING_RENTAL,
            userId: IDS.customer,
            amountCents: 25000,
          }),
        ),
      ),
    )
    const args = state.stripe.constructEvent.mock.calls[0]
    expect(args[2]).toBe(WEBHOOK_SECRET)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Termin-Zahlung per Webhook', () => {
  it('markiert die Buchung als bezahlt und bestätigt sie', async () => {
    const res = await webhookRoute(
      webhookRequest(
        stripeEvent(
          'checkout.session.completed',
          bookingCheckoutSession({
            bookingId: IDS.bookingConfirmed,
            userId: IDS.customer,
            amountCents: 5000,
          }),
        ),
      ),
    )
    expect(res.status).toBe(200)

    const booking = db().row('bookings', IDS.bookingConfirmed)
    expect(booking?.payment_status).toBe('paid')
    expect(booking?.status).toBe('confirmed')
    expect(booking?.stripe_payment_intent).toBe('pi_test_booking')

    const payment = db().rows('payments')[0]
    expect(payment).toMatchObject({
      source_type: 'booking',
      source_id: IDS.bookingConfirmed,
      amount_cents: 5000,
      currency: 'eur',
      status: 'succeeded',
    })
    expect(db().rows('audit_logs').some(a => a.action === 'payment_completed')).toBe(true)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Miet-Zahlung per Webhook', () => {
  it('bestätigt die Buchung, bucht Zahlung und 10 % Plattform-Provision', async () => {
    seedPendingRental()
    const res = await webhookRoute(
      webhookRequest(
        stripeEvent(
          'checkout.session.completed',
          rentalCheckoutSession({
            rentalBookingId: PENDING_RENTAL,
            userId: IDS.customer,
            amountCents: 25000,
          }),
        ),
      ),
    )
    expect(res.status).toBe(200)

    const rental = db().row('rental_bookings', PENDING_RENTAL)
    expect(rental).toMatchObject({
      status: 'confirmed',
      payment_status: 'paid',
      stripe_payment_intent: 'pi_test_neu',
    })

    const tx = db()
      .rows('platform_transactions')
      .find(t => t.rental_id === PENDING_RENTAL)
    expect(tx).toMatchObject({
      type: 'chair_rental',
      amount_cents: 25000,
      platform_fee_cents: 2500,
      provider_share_cents: 22500,
      provider_user_id: IDS.owner,
      customer_user_id: IDS.customer,
      status: 'succeeded',
    })
    expect(state.stripe.refunds).toHaveLength(0)
  })

  it('rechnet OP-Räume mit 8 % statt 10 % ab', async () => {
    db().row('rental_equipment', IDS.equipment)!.type = 'opraum'
    seedPendingRental({ total_cents: 100000 })
    await webhookRoute(
      webhookRequest(
        stripeEvent(
          'checkout.session.completed',
          rentalCheckoutSession({
            rentalBookingId: PENDING_RENTAL,
            userId: IDS.customer,
            amountCents: 100000,
          }),
        ),
      ),
    )
    const tx = db()
      .rows('platform_transactions')
      .find(t => t.rental_id === PENDING_RENTAL)
    expect(tx).toMatchObject({ type: 'opraum_rental', platform_fee_cents: 8000 })
  })

  it('erfüllt bei SEPA erst, wenn die Zahlung wirklich durch ist', async () => {
    seedPendingRental()
    // 1. completed, aber payment_status = unpaid → noch nichts tun
    await webhookRoute(
      webhookRequest(
        stripeEvent(
          'checkout.session.completed',
          rentalCheckoutSession({
            rentalBookingId: PENDING_RENTAL,
            userId: IDS.customer,
            amountCents: 25000,
            paymentStatus: 'unpaid',
          }),
        ),
      ),
    )
    expect(db().row('rental_bookings', PENDING_RENTAL)?.status).toBe('pending')
    expect(db().rows('payments')).toHaveLength(0)

    // 2. Tage später: async_payment_succeeded → jetzt erfüllen
    await webhookRoute(
      webhookRequest(
        stripeEvent(
          'checkout.session.async_payment_succeeded',
          rentalCheckoutSession({
            rentalBookingId: PENDING_RENTAL,
            userId: IDS.customer,
            amountCents: 25000,
          }),
        ),
      ),
    )
    expect(db().row('rental_bookings', PENDING_RENTAL)?.status).toBe('confirmed')
    expect(db().rows('payments')).toHaveLength(1)
  })

  it('gibt den Zeitraum frei, wenn die SEPA-Zahlung platzt', async () => {
    seedPendingRental()
    await webhookRoute(
      webhookRequest(
        stripeEvent(
          'checkout.session.async_payment_failed',
          rentalCheckoutSession({
            rentalBookingId: PENDING_RENTAL,
            userId: IDS.customer,
            amountCents: 25000,
          }),
        ),
      ),
    )
    expect(db().row('rental_bookings', PENDING_RENTAL)).toMatchObject({
      status: 'cancelled',
      payment_status: 'failed',
    })
  })

  it('storniert eine abgelaufene Checkout-Session — bezahlte Buchungen bleiben unangetastet', async () => {
    seedPendingRental()
    await webhookRoute(
      webhookRequest(
        stripeEvent(
          'checkout.session.expired',
          rentalCheckoutSession({
            rentalBookingId: PENDING_RENTAL,
            userId: IDS.customer,
            amountCents: 25000,
          }),
        ),
      ),
    )
    expect(db().row('rental_bookings', PENDING_RENTAL)?.status).toBe('cancelled')

    // Bereits bestätigte/bezahlte Buchung darf ein spätes expired NICHT treffen
    await webhookRoute(
      webhookRequest(
        stripeEvent(
          'checkout.session.expired',
          rentalCheckoutSession({
            rentalBookingId: IDS.rentalConfirmed,
            userId: IDS.otherCustomer,
            amountCents: 35000,
          }),
        ),
      ),
    )
    expect(db().row('rental_bookings', IDS.rentalConfirmed)?.status).toBe('confirmed')
  })

  it('ist idempotent: dasselbe Event zweimal erzeugt keine zweite Zahlung', async () => {
    seedPendingRental()
    const session = rentalCheckoutSession({
      rentalBookingId: PENDING_RENTAL,
      userId: IDS.customer,
      amountCents: 25000,
    })
    await webhookRoute(webhookRequest(stripeEvent('checkout.session.completed', session)))
    await webhookRoute(webhookRequest(stripeEvent('checkout.session.completed', session)))

    expect(db().rows('payments')).toHaveLength(1)
    expect(
      db()
        .rows('platform_transactions')
        .filter(t => t.rental_id === PENDING_RENTAL),
    ).toHaveLength(1)
    expect(state.stripe.refunds).toHaveLength(0)
  })

  it('erstattet eine echte Doppelzahlung automatisch zurück', async () => {
    seedPendingRental()
    await webhookRoute(
      webhookRequest(
        stripeEvent(
          'checkout.session.completed',
          rentalCheckoutSession({
            rentalBookingId: PENDING_RENTAL,
            userId: IDS.customer,
            amountCents: 25000,
            paymentIntent: 'pi_erste_zahlung',
          }),
        ),
      ),
    )
    // Zweite Session mit ANDEREM Payment-Intent (Re-Payment-Race)
    await webhookRoute(
      webhookRequest(
        stripeEvent(
          'checkout.session.completed',
          rentalCheckoutSession({
            rentalBookingId: PENDING_RENTAL,
            userId: IDS.customer,
            amountCents: 25000,
            paymentIntent: 'pi_zweite_zahlung',
            sessionId: 'cs_test_rental_2',
          }),
        ),
      ),
    )

    expect(state.stripe.refunds).toEqual([{ paymentIntent: 'pi_zweite_zahlung', amountCents: undefined }])
    expect(db().row('rental_bookings', PENDING_RENTAL)?.stripe_payment_intent).toBe('pi_erste_zahlung')
    expect(
      db()
        .rows('audit_logs')
        .some(a => a.action === 'rental_duplicate_payment_refunded'),
    ).toBe(true)
  })

  it('erstattet eine Zahlung auf eine zwischenzeitlich stornierte Buchung', async () => {
    seedPendingRental({ status: 'cancelled' })
    await webhookRoute(
      webhookRequest(
        stripeEvent(
          'checkout.session.completed',
          rentalCheckoutSession({
            rentalBookingId: PENDING_RENTAL,
            userId: IDS.customer,
            amountCents: 25000,
          }),
        ),
      ),
    )
    expect(state.stripe.refunds).toHaveLength(1)
    expect(db().rows('payments')).toHaveLength(0)
  })

  it('storniert und erstattet, wenn der Zeitraum inzwischen fest vergeben ist', async () => {
    seedPendingRental({ start_date: '2026-10-02', end_date: '2026-10-04' }) // kollidiert mit Bestand
    await webhookRoute(
      webhookRequest(
        stripeEvent(
          'checkout.session.completed',
          rentalCheckoutSession({
            rentalBookingId: PENDING_RENTAL,
            userId: IDS.customer,
            amountCents: 25000,
          }),
        ),
      ),
    )
    expect(db().row('rental_bookings', PENDING_RENTAL)).toMatchObject({
      status: 'cancelled',
      payment_status: 'refunded',
    })
    expect(state.stripe.refunds).toHaveLength(1)
    expect(
      db()
        .rows('audit_logs')
        .some(a => a.action === 'rental_conflict_refunded'),
    ).toBe(true)
  })

  it('ignoriert Events zu unbekannten Buchungen ohne 500', async () => {
    const res = await webhookRoute(
      webhookRequest(
        stripeEvent(
          'checkout.session.completed',
          rentalCheckoutSession({
            rentalBookingId: IDS.unknown,
            userId: IDS.customer,
            amountCents: 25000,
          }),
        ),
      ),
    )
    expect(res.status).toBe(200)
    expect(db().rows('payments')).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Rückerstattung', () => {
  it('charge.refunded zieht Zahlung, Miet-Buchung und Transaktion nach', async () => {
    db().rows('payments').push({
      id: '15151515-1515-4151-8151-151515151515',
      source_type: 'rental_booking',
      source_id: IDS.rentalConfirmed,
      stripe_payment_intent: 'pi_test_bestand',
      amount_cents: 35000,
      status: 'succeeded',
    })

    const res = await webhookRoute(
      webhookRequest(
        stripeEvent('charge.refunded', {
          id: 'ch_test',
          payment_intent: 'pi_test_bestand',
          amount_refunded: 35000,
        }),
      ),
    )
    expect(res.status).toBe(200)
    expect(db().rows('payments')[0].status).toBe('refunded')
    expect(db().row('rental_bookings', IDS.rentalConfirmed)).toMatchObject({
      status: 'cancelled',
      payment_status: 'refunded',
    })
    expect(db().row('platform_transactions', IDS.transaction)?.status).toBe('refunded')
  })

  it('Admin-Refund: nur Admins dürfen (403)', async () => {
    for (const who of ['customer', 'owner'] as const) {
      state.session = sessionFor(who)
      const res = await adminRefundRoute(
        postRequest('https://www.chairmatch.de/api/admin/refund', {
          transaction_id: IDS.transaction,
        }),
      )
      expect(res.status, `Rolle ${who}`).toBe(403)
    }
    state.session = null
    const anon = await adminRefundRoute(
      postRequest('https://www.chairmatch.de/api/admin/refund', {
        transaction_id: IDS.transaction,
      }),
    )
    expect(anon.status).toBe(403)
    expect(state.stripe.refunds).toHaveLength(0)
  })

  it('Admin-Refund: löst Stripe-Refund aus, storniert Miete und schreibt Audit-Log', async () => {
    state.session = sessionFor('admin')
    const res = await adminRefundRoute(
      postRequest('https://www.chairmatch.de/api/admin/refund', {
        transaction_id: IDS.transaction,
      }),
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { new_status: string; stripe_refund_id: string }
    expect(json.new_status).toBe('refunded')
    expect(json.stripe_refund_id).toMatch(/^re_test_/)

    expect(state.stripe.refunds).toEqual([
      { paymentIntent: 'pi_test_bestand', amountCents: undefined },
    ])
    expect(db().row('platform_transactions', IDS.transaction)?.status).toBe('refunded')
    expect(db().row('rental_bookings', IDS.rentalConfirmed)).toMatchObject({
      status: 'cancelled',
      payment_status: 'refunded',
    })
    const audit = db()
      .rows('audit_logs')
      .find(a => a.action === 'refund.created')
    expect(audit).toBeTruthy()
    expect((audit?.details as { stripe_refund_id: string }).stripe_refund_id).toMatch(/^re_test_/)
  })

  it('Admin-Refund: 502 wenn Stripe den Refund ablehnt — Status bleibt unverändert', async () => {
    state.session = sessionFor('admin')
    state.stripe.createRefund.mockRejectedValueOnce(
      new Error('Charge has already been refunded.'),
    )
    const res = await adminRefundRoute(
      postRequest('https://www.chairmatch.de/api/admin/refund', {
        transaction_id: IDS.transaction,
      }),
    )
    expect(res.status).toBe(502)
    expect((await res.json()).error).toMatch(/Stripe-Refund fehlgeschlagen/)
    expect(db().row('platform_transactions', IDS.transaction)?.status).toBe('succeeded')
  })

  it('Admin-Refund: lehnt doppelte Rückerstattung ab (409)', async () => {
    state.session = sessionFor('admin')
    db().row('platform_transactions', IDS.transaction)!.status = 'refunded'
    const res = await adminRefundRoute(
      postRequest('https://www.chairmatch.de/api/admin/refund', {
        transaction_id: IDS.transaction,
      }),
    )
    expect(res.status).toBe(409)
    expect(state.stripe.refunds).toHaveLength(0)
  })

  it('Admin-Refund: blockiert, wenn bereits an den Anbieter ausgezahlt wurde (409)', async () => {
    state.session = sessionFor('admin')
    db().row('platform_transactions', IDS.transaction)!.stripe_transfer_id = 'tr_test_1'
    const res = await adminRefundRoute(
      postRequest('https://www.chairmatch.de/api/admin/refund', {
        transaction_id: IDS.transaction,
      }),
    )
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/Auszahlung an Anbieter/)
    expect(state.stripe.refunds).toHaveLength(0)
  })

  it.each([
    ['ohne transaction_id', {}, 400],
    ['mit unbekannter ID', { transaction_id: IDS.unknown }, 404],
  ])('Admin-Refund: %s', async (_label, body, expected) => {
    state.session = sessionFor('admin')
    const res = await adminRefundRoute(
      postRequest('https://www.chairmatch.de/api/admin/refund', body),
    )
    expect(res.status).toBe(expected)
  })

  it('Admin-Refund: kaputter JSON-Body → 400', async () => {
    state.session = sessionFor('admin')
    const res = await adminRefundRoute(
      brokenJsonRequest('https://www.chairmatch.de/api/admin/refund'),
    )
    expect(res.status).toBe(400)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Abo- und Connect-Events', () => {
  it('schaltet die Abo-Stufe des Salons frei', async () => {
    await webhookRoute(
      webhookRequest(
        stripeEvent('checkout.session.completed', {
          id: 'cs_test_sub',
          amount_total: 4900,
          currency: 'eur',
          subscription: 'sub_test_1',
          metadata: { type: 'provider_subscription', user_id: IDS.owner, tier: 'premium' },
        }),
      ),
    )
    expect(db().row('salons', IDS.salon)?.subscription_tier).toBe('premium')
    expect(db().rows('audit_logs').some(a => a.action === 'subscription_activated')).toBe(true)
  })

  it('stuft bei gekündigtem Abo auf starter zurück', async () => {
    db().row('profiles', IDS.owner)!.stripe_customer_id = 'cus_test_owner'
    db().row('salons', IDS.salon)!.subscription_tier = 'gold'
    await webhookRoute(
      webhookRequest(
        stripeEvent('customer.subscription.deleted', {
          id: 'sub_test_1',
          customer: 'cus_test_owner',
        }),
      ),
    )
    expect(db().row('salons', IDS.salon)?.subscription_tier).toBe('starter')
  })

  it('synchronisiert den Connect-Onboarding-Status des Anbieters', async () => {
    await webhookRoute(
      webhookRequest(
        stripeEvent('account.updated', {
          id: 'acct_test_owner',
          charges_enabled: true,
          payouts_enabled: true,
          details_submitted: true,
        }),
      ),
    )
    const acct = db()
      .rows('provider_stripe_accounts')
      .find(a => a.stripe_account_id === 'acct_test_owner')
    expect(acct).toMatchObject({
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    })
    expect(acct?.onboarding_completed_at).toBeTruthy()
  })
})
