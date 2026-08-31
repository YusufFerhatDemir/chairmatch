// @vitest-environment node
/**
 * E2E: Verhalten OHNE Stripe-Konfiguration.
 *
 * Das ist kein hypothetischer Fall, sondern der aktuelle Zustand der
 * Produktion: die Stripe-Variablen sind in Vercel nicht gesetzt. Bis hierhin
 * war ungeprueft, was die Zahlwege dann tun — und die Antwort war in allen
 * vier Faellen die falsche Fehlerklasse.
 *
 * Der `stripe`-Export ist ein Proxy: schon `stripe.checkout` bzw.
 * `stripe.webhooks` ruft `getStripe()`, und das wirft ohne
 * `STRIPE_SECRET_KEY`. Der Wurf landete im allgemeinen `catch` des jeweiligen
 * Handlers:
 *
 *   /api/stripe/checkout   → 500 „Interner Fehler"
 *   /api/stripe/connect    → 500 „Interner Fehler"
 *   /api/stripe/webhook    → 400 „Invalid signature"
 *   /api/rental-bookings   → Buchung anlegen, dann wieder loeschen, 502
 *
 * Die Webhook-Antwort ist die folgenreichste: Stripe wertet 4xx als
 * endgueltige Ablehnung und stellt NICHT erneut zu. Eine Umgebung mit
 * gesetztem `STRIPE_WEBHOOK_SECRET` und fehlendem `STRIPE_SECRET_KEY` haette
 * also jedes Zahlungsereignis unwiederbringlich verworfen — obwohl die
 * Signaturpruefung den API-Schluessel gar nicht braucht.
 *
 * Geprueft wird hier beides: dass ohne Schluessel sauber mit 503 abgelehnt
 * wird UND dass die Ablehnung nicht faelschlich greift, sobald der Schluessel
 * da ist (sonst waere der Riegel ein Totalausfall statt eines Riegels).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDb, sessionFor, postRequest, rawRequest, IDS } from './_harness/fixtures'
import { createStripeHarness, WEBHOOK_SECRET } from './_harness/stripe-harness'
import type { FakeSupabase } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as import('./_harness/fixtures').TestSession | null,
  stripe: undefined as unknown as ReturnType<
    typeof import('./_harness/stripe-harness').createStripeHarness
  >,
  /** Der Schalter, um den es hier geht: ist STRIPE_SECRET_KEY gesetzt? */
  konfiguriert: false,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({ getServerSession: async () => state.session }))
vi.mock('@/modules/auth/auth.config', () => ({ auth: async () => state.session }))
vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: vi.fn(async () => ({ ok: true })),
  sendEmail: vi.fn(async () => ({ ok: true })),
  // Track C: `cancelBooking` benachrichtigt jetzt die Gegenseite.
  sendBookingCancellation: vi.fn(async () => ({ ok: true })),
}))
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn(async () => null) }))
vi.mock('@/modules/marketplace/commission.service', () => ({
  calculateNewCustomerCommission: vi.fn(async () => null),
  calculateRentalCommission: vi.fn(async () => null),
}))

/**
 * Der echte `stripe`-Proxy wird nachgebaut: `isStripeConfigured()` folgt dem
 * Schalter, und JEDER Zugriff auf `stripe.*` wirft, solange nicht
 * konfiguriert ist — genau wie `getStripe()` es in Produktion tut. Ohne
 * dieses Werfen wuerde der Test den Riegel nicht pruefen, sondern nur seine
 * eigene Freundlichkeit.
 */
vi.mock('@/lib/stripe', () => {
  const werfenWennUnkonfiguriert = () => {
    if (!state.konfiguriert) throw new Error('STRIPE_SECRET_KEY ist nicht konfiguriert')
  }
  return {
    isStripeConfigured: () => state.konfiguriert,
    get stripe() {
      return new Proxy(
        {},
        {
          get(_t, prop: string) {
            werfenWennUnkonfiguriert()
            return (state.stripe.stripe as unknown as Record<string, unknown>)[prop]
          },
        },
      )
    },
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    STRIPE_PUBLISHABLE_KEY: '',
    createBookingCheckout: (...a: unknown[]) => {
      werfenWennUnkonfiguriert()
      return state.stripe.createBookingCheckout(...a)
    },
    createSubscriptionCheckout: (...a: unknown[]) => {
      werfenWennUnkonfiguriert()
      return state.stripe.createSubscriptionCheckout(...a)
    },
    createProductOrderCheckout: (...a: unknown[]) => {
      werfenWennUnkonfiguriert()
      return state.stripe.createProductOrderCheckout(...a)
    },
    createRentalCheckout: (...a: unknown[]) => {
      werfenWennUnkonfiguriert()
      return state.stripe.createRentalCheckout(...a)
    },
    createRefund: (...a: unknown[]) => {
      werfenWennUnkonfiguriert()
      return state.stripe.createRefund(...a)
    },
    createConnectAccount: (...a: unknown[]) => {
      werfenWennUnkonfiguriert()
      return state.stripe.createConnectAccount(...a)
    },
    createConnectAccountLink: (...a: unknown[]) => {
      werfenWennUnkonfiguriert()
      return state.stripe.createConnectAccountLink(...a)
    },
  }
})

import { POST as checkoutRoute } from '@/app/api/stripe/checkout/route'
import { POST as connectRoute } from '@/app/api/stripe/connect/route'
import { POST as webhookRoute } from '@/app/api/stripe/webhook/route'
import { POST as rentalBookingRoute } from '@/app/api/rental-bookings/route'

function db(): FakeSupabase {
  return state.db
}

const OFFENE_BUCHUNG = '66666666-6666-4666-8666-66666666667a'

beforeEach(() => {
  state.db = createDb()
  state.stripe = createStripeHarness()
  state.session = sessionFor('customer')
  state.konfiguriert = false

  // Eine unbezahlte Buchung, damit der checkout-Zweig bis zum Stripe-Aufruf
  // kaeme — der Riegel muss VOR ihm greifen, nicht erst an ihm scheitern.
  db().rows('bookings').push({
    id: OFFENE_BUCHUNG,
    customer_id: IDS.customer,
    salon_id: IDS.salon,
    service_id: IDS.service,
    booking_date: '2026-12-01',
    start_time: '10:00',
    end_time: '11:00',
    status: 'pending',
    payment_status: 'unpaid',
    price_cents: 4500,
  })
})

describe('Ohne STRIPE_SECRET_KEY antwortet jeder Zahlweg mit 503', () => {
  it('POST /api/stripe/checkout (Termin) — 503 statt 500 „Interner Fehler"', async () => {
    const res = await checkoutRoute(
      postRequest('https://www.chairmatch.de/api/stripe/checkout', {
        type: 'booking',
        bookingId: OFFENE_BUCHUNG,
      }),
    )

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.code).toBe('stripe_not_configured')
    expect(body.error).not.toMatch(/Interner Fehler/)
  })

  it('POST /api/stripe/checkout (Abo) — derselbe Riegel, egal welcher Typ', async () => {
    state.session = sessionFor('owner')
    const res = await checkoutRoute(
      postRequest('https://www.chairmatch.de/api/stripe/checkout', {
        type: 'subscription',
        tier: 'premium',
      }),
    )
    expect(res.status).toBe(503)
  })

  it('POST /api/stripe/connect — 503 statt 500', async () => {
    state.session = sessionFor('owner')
    const vorher = db().rows('provider_stripe_accounts').length
    const res = await connectRoute(rawRequest('https://www.chairmatch.de/api/stripe/connect', {
      method: 'POST',
      headers: { origin: 'https://www.chairmatch.de' },
    }))

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.code).toBe('stripe_not_configured')
    // Kein halber Connect-Account: ohne Schluessel darf nichts angelegt werden.
    expect(state.stripe.createConnectAccount).not.toHaveBeenCalled()
    expect(db().rows('provider_stripe_accounts')).toHaveLength(vorher)
  })

  it('POST /api/stripe/webhook — 503 (wiederholbar), NICHT 400 (endgueltig)', async () => {
    const res = await rawRequest('https://www.chairmatch.de/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 't=1,v1=egal' },
      body: JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' }),
    })
    const antwort = await webhookRoute(res)

    expect(antwort.status).toBe(503)
    // Der eigentliche Befund: 4xx haette Stripe die Zustellung aufgeben
    // lassen und das Zahlungsereignis fuer immer verworfen.
    expect(antwort.status).toBeGreaterThanOrEqual(500)
    const body = await antwort.json()
    expect(body.error).not.toMatch(/signature/i)
  })

  it('POST /api/rental-bookings legt gar keine Buchung an, statt sie wieder zu loeschen', async () => {
    // Die Fixtures bringen bereits Miet-Buchungen mit — gezaehlt wird
    // deshalb der Zuwachs, nicht der Bestand.
    const vorher = db().rows('rental_bookings').length

    const res = await rentalBookingRoute(
      postRequest('https://www.chairmatch.de/api/rental-bookings', {
        equipmentId: IDS.equipment,
        startDate: '2026-12-01',
        endDate: '2026-12-03',
      }),
    )

    expect(res.status).toBe(503)
    // Vorher entstand hier eine Zeile, die der Fehlerpfad gleich wieder
    // entfernte. Sichtbar wurde das nie — aber jeder Insert vergibt eine ID
    // und laesst eine Luecke in der Sequenz.
    expect(db().rows('rental_bookings')).toHaveLength(vorher)
    expect(state.stripe.createRentalCheckout).not.toHaveBeenCalled()
  })
})

describe('Mit Schluessel greift der Riegel nicht', () => {
  beforeEach(() => {
    state.konfiguriert = true
  })

  it('der Termin-Checkout laeuft normal durch und liefert eine Checkout-URL', async () => {
    const res = await checkoutRoute(
      postRequest('https://www.chairmatch.de/api/stripe/checkout', {
        type: 'booking',
        bookingId: OFFENE_BUCHUNG,
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//)
    expect(state.stripe.createBookingCheckout).toHaveBeenCalledTimes(1)
  })

  it('der Webhook prueft wieder die Signatur — 400 bleibt der Signaturfehler', async () => {
    state.stripe.constructEvent.mockImplementationOnce(() => {
      throw new Error('No signatures found matching the expected signature')
    })

    const antwort = await webhookRoute(
      rawRequest('https://www.chairmatch.de/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 't=1,v1=falsch' },
        body: JSON.stringify({ id: 'evt_2', type: 'checkout.session.completed' }),
      }),
    )

    // Eine ECHTE Signaturverletzung ist weiterhin endgueltig: hier ist 400
    // richtig, denn eine Wiederholung wuerde dasselbe Ergebnis liefern.
    expect(antwort.status).toBe(400)
    const body = await antwort.json()
    expect(body.error).toMatch(/signature/i)
  })

  it('eine Miet-Buchung entsteht wieder samt Checkout-URL', async () => {
    const vorher = db().rows('rental_bookings').length

    const res = await rentalBookingRoute(
      postRequest('https://www.chairmatch.de/api/rental-bookings', {
        equipmentId: IDS.equipment,
        startDate: '2026-12-01',
        endDate: '2026-12-03',
      }),
    )

    expect(res.status).toBe(201)
    expect(db().rows('rental_bookings')).toHaveLength(vorher + 1)
  })
})
