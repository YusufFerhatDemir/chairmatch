// @vitest-environment node
/**
 * E2E: Fehlerfälle — Timeouts, Netzwerkausfälle, gleichzeitige Zugriffe.
 *
 * Leitfrage: Was passiert, wenn die Außenwelt nicht mitspielt? Erwartet wird
 * immer eine JSON-Antwort mit passendem Status und einer deutschen Meldung —
 * nie ein hängender Request, nie eine halb geschriebene Buchung.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextResponse } from 'next/server'
import {
  createDb,
  sessionFor,
  postRequest,
  rawRequest,
  ctx,
  IDS,
  FREE_DAY,
} from './_harness/fixtures'
import { createStripeHarness } from './_harness/stripe-harness'
import type { FakeSupabase } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as import('./_harness/fixtures').TestSession | null,
  stripe: undefined as unknown as ReturnType<
    typeof import('./_harness/stripe-harness').createStripeHarness
  >,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({ getServerSession: async () => state.session }))
vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: vi.fn(async () => ({ ok: true })),
  sendProviderNotification: vi.fn(async () => ({ ok: true })),
  // Track C: `cancelBooking` benachrichtigt jetzt die Gegenseite.
  sendBookingCancellation: vi.fn(async () => ({ ok: true })),
}))
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
  createRentalCheckout: (...a: unknown[]) => state.stripe.createRentalCheckout(...a),
  createBookingCheckout: (...a: unknown[]) => state.stripe.createBookingCheckout(...a),
  createRefund: (...a: unknown[]) => state.stripe.createRefund(...a),
}))

import { withApi, apiError, apiOk } from '@/lib/api-wrapper'
import { POST as createBookingRoute, GET as listBookingsRoute } from '@/app/api/bookings/route'
import { POST as cancelBookingRoute } from '@/app/api/bookings/[id]/cancel/route'
import {
  POST as createRentalRoute,
  GET as listRentalsRoute,
} from '@/app/api/rental-bookings/route'
import { POST as webhookRoute } from '@/app/api/stripe/webhook/route'

const NETZWERKFEHLER = {
  code: '08006',
  message: 'connection to server failed',
  details: null,
  hint: null,
}

function db(): FakeSupabase {
  return state.db
}

const warte = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }) // setTimeout bleibt echt — der Timeout-Test braucht ihn
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))
  state.db = createDb()
  state.session = sessionFor('customer')
  state.stripe = createStripeHarness()
})

afterEach(() => {
  vi.useRealTimers()
})

// ────────────────────────────────────────────────────────────────
describe('Netzwerk-Timeouts (lib/api-wrapper)', () => {
  it('bricht einen hängenden Handler mit 504 und deutscher Meldung ab', async () => {
    const handler = withApi(async () => {
      await warte(300)
      return NextResponse.json({ nie: 'erreicht' })
    }, { timeoutMs: 30 })

    const res = await handler(rawRequest('https://www.chairmatch.de/api/langsam'), undefined)
    expect(res.status).toBe(504)
    const json = (await res.json()) as { error: string; timeout: boolean }
    expect(json.timeout).toBe(true)
    expect(json.error).toMatch(/zu lange gedauert/)
  })

  it('liefert bei einem geworfenen Fehler JSON statt einer HTML-Fehlerseite', async () => {
    const handler = withApi(async () => {
      throw new Error('Interner Absturz mit Stacktrace')
    })
    const res = await handler(rawRequest('https://www.chairmatch.de/api/kaputt'), undefined)
    expect(res.status).toBe(500)
    expect(res.headers.get('content-type')).toContain('application/json')
    const json = (await res.json()) as { error: string }
    expect(json.error).toBe('Interner Fehler')
    // Kein Stacktrace nach außen
    expect(JSON.stringify(json)).not.toContain('Stacktrace')
  })

  it('protokolliert den Serverfehler, ohne die Antwort zu verzögern', async () => {
    const handler = withApi(async () => {
      throw new Error('Datenbank weg')
    })
    await handler(rawRequest('https://www.chairmatch.de/api/kaputt'), undefined)
    const logged = db().rows('error_logs')
    expect(logged).toHaveLength(1)
    expect(logged[0].message).toBe('Datenbank weg')
  })

  it('lässt eine erfolgreiche Antwort unverändert durch', async () => {
    const handler = withApi(async () => apiOk({ ok: true }, 201))
    const res = await handler(rawRequest('https://www.chairmatch.de/api/ok'), undefined)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('reicht bewusste Fehlerantworten unverändert weiter (kein 500-Overlay)', async () => {
    const handler = withApi(async () => apiError('Bitte Datum wählen', 422))
    const res = await handler(rawRequest('https://www.chairmatch.de/api/eingabe'), undefined)
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('Bitte Datum wählen')
    expect(db().rows('error_logs')).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Datenbank nicht erreichbar', () => {
  const validBody = {
    salonId: IDS.salon,
    serviceId: IDS.service,
    date: FREE_DAY,
    startTime: '09:00',
  }

  it('Buchung anlegen: meldet den Fehlschlag, statt eine halbe Buchung zu hinterlassen', async () => {
    db().failOn('bookings', 'insert', NETZWERKFEHLER)
    const res = await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', validBody),
      undefined,
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/konnte nicht erstellt werden/)
    expect(db().rows('bookings')).toHaveLength(1)
    expect(db().rows('audit_logs')).toHaveLength(0)
  })

  it('Service-Lookup weg: Buchung wird abgelehnt', async () => {
    db().failOn('services', 'select', NETZWERKFEHLER)
    const res = await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', validBody),
      undefined,
    )
    expect(res.status).toBe(400)
    expect(db().rows('bookings')).toHaveLength(1)
  })

  it('Buchungsliste: leere Liste statt 500', async () => {
    db().failOn('bookings', 'select', NETZWERKFEHLER)
    const res = await listBookingsRoute(
      rawRequest('https://www.chairmatch.de/api/bookings'),
      undefined,
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('Miet-Buchungsliste: klarer 500 mit deutscher Meldung', async () => {
    db().failOn('rental_bookings', 'select', NETZWERKFEHLER)
    const res = await listRentalsRoute()
    expect(res.status).toBe(500)
    expect((await res.json()).error).toMatch(/konnten nicht geladen werden/)
  })

  it('Stornierung bei DB-Ausfall: Buchung bleibt unverändert', async () => {
    db().failOn('bookings', 'select', NETZWERKFEHLER)
    const res = await cancelBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${IDS.bookingConfirmed}/cancel`, {}),
      ctx({ id: IDS.bookingConfirmed }),
    )
    expect(res.status).toBe(400)
    expect(db().row('bookings', IDS.bookingConfirmed)?.status).toBe('confirmed')
  })
})

// ────────────────────────────────────────────────────────────────
describe('Stripe nicht erreichbar', () => {
  it('Miet-Buchung: 502 und vollständiger Rollback bei Timeout', async () => {
    state.stripe.createRentalCheckout.mockImplementationOnce(async () => {
      throw new Error('ETIMEDOUT api.stripe.com')
    })
    const res = await createRentalRoute(
      postRequest('https://www.chairmatch.de/api/rental-bookings', {
        equipmentId: IDS.equipment,
        startDate: '2026-09-20',
        endDate: '2026-09-22',
      }),
    )
    expect(res.status).toBe(502)
    expect((await res.json()).error).toMatch(/später erneut/)
    expect(db().rows('rental_bookings')).toHaveLength(1) // nur der Bestand
  })

  it('Webhook: ein fehlgeschlagener Refund lässt Stripe trotzdem quittieren', async () => {
    // Sonst wiederholt Stripe das Event endlos und die Buchung bleibt hängen.
    db().rows('rental_bookings').push({
      id: '88888888-8888-4888-8888-888888888889',
      equipment_id: IDS.equipment,
      renter_id: IDS.customer,
      start_date: '2026-12-01',
      end_date: '2026-12-05',
      total_cents: 25000,
      status: 'cancelled',
      payment_status: 'pending',
      stripe_payment_intent: null,
    })
    state.stripe.createRefund.mockRejectedValueOnce(new Error('ETIMEDOUT api.stripe.com'))

    const event = {
      id: 'evt_refund_fehler',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_x',
          payment_status: 'paid',
          amount_total: 25000,
          currency: 'eur',
          payment_intent: 'pi_test_x',
          payment_method_types: ['card'],
          metadata: {
            type: 'rental_payment',
            rental_booking_id: '88888888-8888-4888-8888-888888888889',
            user_id: IDS.customer,
          },
        },
      },
    }
    state.stripe.constructEvent.mockReturnValueOnce(event)

    const res = await webhookRoute(
      rawRequest('https://www.chairmatch.de/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 't=1,v1=sig' },
        body: JSON.stringify(event),
      }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true })
  })
})

// ────────────────────────────────────────────────────────────────
describe('Gleichzeitige Zugriffe', () => {
  it('doppelte Stornierung gleichzeitig: die zweite läuft ins Leere, der Status bleibt sauber', async () => {
    const id = IDS.bookingConfirmed
    const [a, b] = await Promise.all([
      cancelBookingRoute(
        postRequest(`https://www.chairmatch.de/api/bookings/${id}/cancel`, { reason: 'A' }),
        ctx({ id }),
      ),
      cancelBookingRoute(
        postRequest(`https://www.chairmatch.de/api/bookings/${id}/cancel`, { reason: 'B' }),
        ctx({ id }),
      ),
    ])
    expect([a.status, b.status]).toEqual([200, 200])
    expect(db().row('bookings', id)?.status).toBe('cancelled')
  })

  it('gleichzeitige Miet-Anfragen auf angrenzende Zeiträume kollidieren nicht', async () => {
    const [a, b] = await Promise.all([
      createRentalRoute(
        postRequest('https://www.chairmatch.de/api/rental-bookings', {
          equipmentId: IDS.equipment,
          startDate: '2026-11-01',
          endDate: '2026-11-05',
        }),
      ),
      createRentalRoute(
        postRequest('https://www.chairmatch.de/api/rental-bookings', {
          equipmentId: IDS.equipment,
          startDate: '2026-11-06',
          endDate: '2026-11-10',
        }),
      ),
    ])
    expect([a.status, b.status]).toEqual([201, 201])
    expect(db().rows('rental_bookings')).toHaveLength(3)
  })

  it('mehrere Buchungen derselben Kundin am selben Tag zu verschiedenen Zeiten', async () => {
    const zeiten = ['08:00', '12:00', '16:00']
    const results = await Promise.all(
      zeiten.map(startTime =>
        createBookingRoute(
          postRequest('https://www.chairmatch.de/api/bookings', {
            salonId: IDS.salon,
            serviceId: IDS.service,
            date: FREE_DAY,
            startTime,
          }),
          undefined,
        ),
      ),
    )
    expect(results.map(r => r.status)).toEqual([201, 201, 201])
    expect(db().rows('bookings')).toHaveLength(4)
  })
})
