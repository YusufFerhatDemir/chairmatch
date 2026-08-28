// @vitest-environment node
/**
 * Track 22: der Miet-Marktplatz (Stuhlmiete) — Inserat, Anfrage, Buchung,
 * Zahlung, Umsatz, Bewertung.
 *
 * Sechs Befunde, jeder hier als Gegenprobe:
 *
 * (1) Der Miet-Zweig des Stripe-Webhooks hatte als einziger keinen
 *     Compare-and-Swap auf dem Uebergang unpaid -> paid. Zwei Zustellungen
 *     desselben Events buchten beide.
 * (2) Unbezahlte Reservierungen zaehlten in /api/me/rental-revenue als
 *     Einnahme — kostenlos anlegbar von jedem angemeldeten Konto.
 * (3) /api/rental-requests hatte kein eigenes Limit: ein Zeichen mehr in der
 *     Nachricht ergab eine neue Mail an den Vermieter.
 * (4) Der Faelligkeitsvergleich der Anfrage lief in UTC statt Berlin.
 * (5) `2026-13-45` und `2026-02-30` kamen durch die Datumsregex und liefen
 *     als NaN an beiden Riegeln der Buchung vorbei.
 * (6) Der Bewertungs-Cron rief `publish_review_pair()`, eine Funktion, die
 *     Miet-Buchungen in der falschen Tabelle sucht — die 14-Tage-Regel ist
 *     nie gelaufen. (Die Gegenprobe dazu steht in der angepassten Stelle in
 *     track-20-…; hier steht der Nachweis, dass der Cron die Zeile jetzt
 *     selbst und nur einmal freischaltet.)
 *
 * Was der Test NICHT zeigen kann: ob die Live-Datenbank die Migration
 * 20260828_miet_marktplatz_haertung.sql erhalten hat. Sie ist committet,
 * nicht angewendet — es gibt in diesem Projekt keinen Migrations-Runner.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createDb,
  sessionFor,
  postRequest,
  rawRequest,
  IDS,
  type TestSession,
} from './e2e/_harness/fixtures'
import {
  createStripeHarness,
  stripeEvent,
  rentalCheckoutSession,
} from './e2e/_harness/stripe-harness'
import type { FakeSupabase, Row } from './e2e/_harness/fake-supabase'

const state = vi.hoisted(() => {
  process.env.CRON_SECRET ??= 'cron-test-secret'
  return {
    db: undefined as unknown as import('./e2e/_harness/fake-supabase').FakeSupabase,
    session: null as TestSession | null,
    stripe: undefined as unknown as ReturnType<
      typeof import('./e2e/_harness/stripe-harness').createStripeHarness
    >,
    mails: [] as { recipientId: string | null; requestId: string }[],
  }
})

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => state.session,
  requireAuth: async () => state.session,
}))
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
  createRentalCheckout: (...a: unknown[]) => state.stripe.createRentalCheckout(...a),
  createRefund: (...a: unknown[]) => state.stripe.createRefund(...a),
}))
vi.mock('@/lib/rental-request-email', () => ({
  notifyLandlordOfRentalRequest: vi.fn(
    async (input: { recipientId: string | null; requestId: string }) => {
      state.mails.push({ recipientId: input.recipientId, requestId: input.requestId })
      return { status: 'sent' as const }
    },
  ),
}))
vi.mock('@/lib/error-tracking', () => ({
  logApiError: vi.fn(async () => undefined),
  logError: vi.fn(async () => undefined),
  isSentryConfigured: () => false,
}))

// ── Imports nach den Mocks ──────────────────────────────────────
import { __resetRateLimits } from '@/lib/rate-limit'
import { isCalendarDate, inclusiveDayCount } from '@/lib/iso-date'
import { POST as webhookRoute } from '@/app/api/stripe/webhook/route'
import { GET as rentalRevenue } from '@/app/api/me/rental-revenue/route'
import { POST as rentalRequestPost } from '@/app/api/rental-requests/route'
import { POST as rentalBookingPost } from '@/app/api/rental-bookings/route'
import { GET as publishReviews } from '@/app/api/cron/publish-reviews/route'

const CRON_HEADERS = { authorization: `Bearer ${process.env.CRON_SECRET}` }
const PENDING_RENTAL = '88888888-8888-4888-8888-88888888888a'

function db(): FakeSupabase {
  return state.db
}

function webhookRequest(event: unknown) {
  state.stripe.constructEvent.mockReturnValueOnce(event)
  return rawRequest('https://www.chairmatch.de/api/stripe/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=testsig' },
    body: JSON.stringify(event),
  })
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

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))
  state.db = createDb()
  state.session = sessionFor('customer')
  state.stripe = createStripeHarness()
  state.mails = []
  __resetRateLimits()
})

afterEach(() => {
  vi.useRealTimers()
})

// ═══════════════════════════════════════════════════════════════
// CM22-02: Compare-and-Swap im Miet-Zweig des Webhooks
// ═══════════════════════════════════════════════════════════════

describe('Track 22 — der Miet-Webhook verbucht eine Zahlung genau einmal', () => {
  function paidEvent(sessionId = 'cs_test_rental') {
    return stripeEvent(
      'checkout.session.completed',
      rentalCheckoutSession({
        rentalBookingId: PENDING_RENTAL,
        userId: IDS.customer,
        amountCents: 25000,
        paymentIntent: 'pi_test_neu',
        sessionId,
      }),
    )
  }

  it('bucht die Zahlung beim ersten Mal vollstaendig', async () => {
    seedPendingRental()

    const res = await webhookRoute(webhookRequest(paidEvent()))
    expect(res.status).toBe(200)

    const rental = db().rows('rental_bookings')[0]
    expect(rental.payment_status).toBe('paid')
    expect(rental.status).toBe('confirmed')
    expect(db().rows('payments')).toHaveLength(1)
    expect(db().rows('platform_transactions').filter((t) => t.rental_id === PENDING_RENTAL)).toHaveLength(1)
  })

  it('legt bei einer zweiten Zustellung desselben Events KEINE zweite Zahlungszeile an', async () => {
    seedPendingRental()

    await webhookRoute(webhookRequest(paidEvent()))
    await webhookRoute(webhookRequest(paidEvent()))

    // Die Umsatzzahlen in /api/admin/mis, /api/admin/kpi und /api/investor
    // summieren `payments`. Eine zweite Zeile ist dort doppelter Umsatz.
    expect(db().rows('payments')).toHaveLength(1)
    expect(
      db().rows('platform_transactions').filter((t) => t.rental_id === PENDING_RENTAL),
    ).toHaveLength(1)
    expect(
      db().rows('audit_logs').filter((a) => a.action === 'rental_payment_completed'),
    ).toHaveLength(1)
  })

  it('verliert das Rennen, wenn die Zahlung zwischen Lesen und Schreiben schon verbucht wurde', async () => {
    const rental = seedPendingRental()

    // Genau das Fenster, das der Lesecheck oben nicht abdeckt: die Zeile ist
    // beim SELECT noch offen und beim UPDATE bereits bezahlt. Der CAS-Claim
    // ist die einzige Stelle, die das noch merkt.
    db().raceBefore('rental_bookings', 'update', () => {
      rental.payment_status = 'paid'
      rental.status = 'confirmed'
    })

    const res = await webhookRoute(webhookRequest(paidEvent()))
    expect(res.status).toBe(200)
    expect(db().rows('payments')).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// CM22-04: unbezahlte Reservierungen sind kein Umsatz
// ═══════════════════════════════════════════════════════════════

describe('Track 22 — /api/me/rental-revenue zaehlt nur bezahlte Buchungen', () => {
  beforeEach(() => {
    state.session = sessionFor('owner')
    // Bestandszeile der Fixtures: bezahlt und bestaetigt.
    db().rows('rental_bookings').push({
      id: '88888888-8888-4888-8888-88888888888b',
      equipment_id: IDS.equipment,
      renter_id: IDS.customer,
      start_date: '2026-11-01',
      end_date: '2026-11-03',
      total_cents: 15000,
      status: 'pending',
      payment_status: 'unpaid',
      created_at: '2026-09-01T08:00:00.000Z',
    })
  })

  it('markiert eine bezahlte Buchung als Umsatz', async () => {
    const body = await (await rentalRevenue()).json()
    const bezahlt = body.bookings.find((b: Row) => b.id === IDS.rentalConfirmed)
    expect(bezahlt.countsAsRevenue).toBe(true)
  })

  it('markiert eine unbezahlte Reservierung NICHT als Umsatz', async () => {
    const body = await (await rentalRevenue()).json()
    const offen = body.bookings.find((b: Row) => b.id === '88888888-8888-4888-8888-88888888888b')

    // Die Zeile bleibt sichtbar — der Vermieter soll seine Reservierungen
    // sehen. Sie zaehlt nur nicht als Geld, das angekommen ist.
    expect(offen).toBeDefined()
    expect(offen.totalCents).toBe(15000)
    expect(offen.countsAsRevenue).toBe(false)
  })

  it('zaehlt auch einen Storno mit fehlendem Zahlungsstatus nicht mit', async () => {
    db().rows('rental_bookings').push({
      id: '88888888-8888-4888-8888-88888888888c',
      equipment_id: IDS.equipment,
      renter_id: IDS.customer,
      start_date: '2026-11-10',
      end_date: '2026-11-11',
      total_cents: 9000,
      status: 'cancelled',
      payment_status: null,
    })
    const body = await (await rentalRevenue()).json()
    const storno = body.bookings.find((b: Row) => b.id === '88888888-8888-4888-8888-88888888888c')
    expect(storno.countsAsRevenue).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// CM22-05 + CM22-06: Anfrage-Flut und Berliner Kalendertag
// ═══════════════════════════════════════════════════════════════

describe('Track 22 — /api/rental-requests hat ein eigenes Limit', () => {
  function anfrage(message: string) {
    return postRequest('https://www.chairmatch.de/api/rental-requests', {
      equipmentId: IDS.equipment,
      requestType: 'miete',
      preferredDate: '2026-09-20',
      durationUnit: 'day',
      units: 1,
      message,
    })
  }

  it('nimmt eine einzelne Anfrage an und stellt sie dem Vermieter zu', async () => {
    const res = await rentalRequestPost(anfrage('Hallo, ist der Platz frei?'))
    expect(res.status).toBe(201)
    expect(state.mails).toHaveLength(1)
  })

  it('stoppt die Flut, obwohl jede Nachricht einen neuen Fingerprint hat', async () => {
    // Der Doppel-Submit-Riegel greift hier bewusst nicht: jede Nachricht ist
    // anders, also ist jede Anfrage fuer ihn eine neue. Genau so liess sich
    // das Postfach des Vermieters bisher unbegrenzt fuellen.
    let letzterStatus = 0
    for (let i = 0; i < 15; i++) {
      const res = await rentalRequestPost(anfrage(`Anfrage Nummer ${i}`))
      letzterStatus = res.status
      if (res.status === 429) break
    }

    expect(letzterStatus).toBe(429)
    expect(state.mails.length).toBeLessThan(15)
  })

  it('weist ein Datum ab, das in Berlin bereits vergangen ist', async () => {
    // 2026-09-01, 00:30 Berliner Sommerzeit = 2026-08-31T22:30Z. In UTC ist
    // „heute" damit noch der 31.08. — der Vergleich liess den 31.08. durch.
    vi.setSystemTime(new Date('2026-08-31T22:30:00.000Z'))

    const res = await rentalRequestPost(
      postRequest('https://www.chairmatch.de/api/rental-requests', {
        equipmentId: IDS.equipment,
        requestType: 'besichtigung',
        preferredDate: '2026-08-31',
      }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Vergangenheit')
  })
})

// ═══════════════════════════════════════════════════════════════
// CM22-07: Datumsangaben, die es nicht gibt
// ═══════════════════════════════════════════════════════════════

describe('Track 22 — Kalendertage werden geprueft, nicht nur ihre Form', () => {
  it('erkennt einen Tag, den es nicht gibt', () => {
    expect(isCalendarDate('2026-09-15')).toBe(true)
    expect(isCalendarDate('2026-02-28')).toBe(true)
    expect(isCalendarDate('2028-02-29')).toBe(true) // Schaltjahr
    expect(isCalendarDate('2026-02-29')).toBe(false)
    expect(isCalendarDate('2026-02-30')).toBe(false)
    expect(isCalendarDate('2026-13-45')).toBe(false)
    expect(isCalendarDate('2026-00-01')).toBe(false)
    expect(isCalendarDate('0000-01-01')).toBe(false)
    expect(isCalendarDate('15.09.2026')).toBe(false)
    expect(isCalendarDate(null)).toBe(false)
  })

  it('rechnet Miettage einschliesslich Start- und Endtag', () => {
    expect(inclusiveDayCount('2026-09-01', '2026-09-01')).toBe(1)
    expect(inclusiveDayCount('2026-09-01', '2026-09-03')).toBe(3)
    // Ueber die Sommerzeit-Umstellung hinweg (25.10.2026) — die Rechnung
    // laeuft in UTC-Mittag und darf davon nicht beruehrt werden.
    expect(inclusiveDayCount('2026-10-24', '2026-10-26')).toBe(3)
  })

  it('wirft, statt NaN zurueckzugeben', () => {
    expect(() => inclusiveDayCount('2026-13-45', '2026-13-46')).toThrow(RangeError)
  })

  it('weist eine Buchung mit unmoeglichem Datum mit 400 ab, nicht mit 500', async () => {
    const res = await rentalBookingPost(
      postRequest('https://www.chairmatch.de/api/rental-bookings', {
        equipmentId: IDS.equipment,
        startDate: '2026-13-45',
        endDate: '2026-13-46',
      }),
    )

    expect(res.status).toBe(400)
    // Und vor allem: es wurde nichts geschrieben. Vorher lief NaN an
    // `days > 366` und `totalCents <= 0` vorbei bis in den Insert.
    expect(db().rows('rental_bookings').some((r) => r.id === PENDING_RENTAL)).toBe(false)
    expect(state.stripe.createRentalCheckout).not.toHaveBeenCalled()
  })

  it('weist den 30. Februar ab, statt still auf den 2. Maerz zu rollen', async () => {
    const res = await rentalBookingPost(
      postRequest('https://www.chairmatch.de/api/rental-bookings', {
        equipmentId: IDS.equipment,
        startDate: '2026-02-30',
        endDate: '2026-03-02',
      }),
    )
    expect(res.status).toBe(400)
    expect(state.stripe.createRentalCheckout).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════
// CM22-01: die 14-Tage-Freischaltung laeuft wirklich
// ═══════════════════════════════════════════════════════════════

describe('Track 22 — der Bewertungs-Cron schaltet Miet-Bewertungen selbst frei', () => {
  const REVIEW_ID = '31313131-3131-4313-8313-313131313132'

  function seedFaelligeMietbewertung(): void {
    db().rows('reviews').push({
      id: REVIEW_ID,
      // Eine rental_bookings-ID, keine bookings-ID. Genau daran ist
      // publish_review_pair() gescheitert: die Funktion sucht in `bookings`.
      booking_id: IDS.rentalConfirmed,
      salon_id: IDS.salon,
      rating: 4,
      review_type: 'tenant_to_provider',
      published: false,
      visible_at: null,
      created_at: '2026-08-01T00:00:00.000Z',
    })
  }

  it('schaltet eine ueberfaellige einseitige Miet-Bewertung frei', async () => {
    seedFaelligeMietbewertung()

    const res = await publishReviews(
      rawRequest('https://www.chairmatch.de/api/cron/publish-reviews', { headers: CRON_HEADERS }),
    )
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.published).toBe(1)

    const review = db().rows('reviews').find((r) => r.id === REVIEW_ID)!
    expect(review.published).toBe(true)
    expect(review.visible_at).not.toBeNull()
  })

  it('ruft publish_review_pair() nicht mehr — die Funktion sucht in der falschen Tabelle', async () => {
    seedFaelligeMietbewertung()
    await publishReviews(
      rawRequest('https://www.chairmatch.de/api/cron/publish-reviews', { headers: CRON_HEADERS }),
    )
    expect(db().rpcCalls).toHaveLength(0)
  })

  it('schaltet dieselbe Bewertung beim zweiten Lauf nicht noch einmal frei', async () => {
    seedFaelligeMietbewertung()

    await publishReviews(
      rawRequest('https://www.chairmatch.de/api/cron/publish-reviews', { headers: CRON_HEADERS }),
    )
    const zweiter = await publishReviews(
      rawRequest('https://www.chairmatch.de/api/cron/publish-reviews', { headers: CRON_HEADERS }),
    )
    const body = await zweiter.json()

    // Beim zweiten Lauf ist sie nicht mehr faellig (published = true), die
    // Abfrage findet sie also gar nicht mehr.
    expect(body.published).toBe(0)
  })

  it('laesst eine noch nicht faellige Bewertung in Ruhe', async () => {
    db().rows('reviews').push({
      id: '31313131-3131-4313-8313-313131313133',
      booking_id: IDS.rentalConfirmed,
      salon_id: IDS.salon,
      rating: 5,
      review_type: 'provider_to_tenant',
      published: false,
      visible_at: null,
      created_at: '2026-08-30T00:00:00.000Z',
    })

    const res = await publishReviews(
      rawRequest('https://www.chairmatch.de/api/cron/publish-reviews', { headers: CRON_HEADERS }),
    )
    expect((await res.json()).published).toBe(0)
    expect(db().rows('reviews')[0].published).toBe(false)
  })
})
