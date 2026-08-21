// @vitest-environment node
/**
 * E2E: Buchungs-Flow — Suchen → Buchen → Bestätigen → Stornieren.
 *
 * Getestet wird der echte Pfad Route-Handler → Action → Service; ersetzt sind
 * nur die Außenkanten (Supabase, Stripe, E-Mail). Siehe _harness/fake-supabase.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createDb,
  enableOverlapConstraint,
  sessionFor,
  postRequest,
  brokenJsonRequest,
  rawRequest,
  ctx,
  IDS,
  BUSY_DAY,
  FREE_DAY,
} from './_harness/fixtures'
import { createStripeHarness } from './_harness/stripe-harness'
import type { FakeSupabase, Row } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as import('./_harness/fixtures').TestSession | null,
  stripe: undefined as unknown as ReturnType<
    typeof import('./_harness/stripe-harness').createStripeHarness
  >,
  emails: {
    confirmation: [] as { to: string; details: Record<string, unknown> }[],
    provider: [] as { to: string; type: string; details: Record<string, unknown> }[],
  },
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => state.session,
  requireAuth: async () => state.session,
}))
vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: async (to: string, details: Record<string, unknown>) => {
    state.emails.confirmation.push({ to, details })
    return { ok: true }
  },
  sendProviderNotification: async (to: string, type: string, details: Record<string, unknown>) => {
    state.emails.provider.push({ to, type, details })
    return { ok: true }
  },
}))
vi.mock('@/lib/stripe', () => ({
  isStripeConfigured: () => true,
  get stripe() {
    return state.stripe.stripe
  },
  createRentalCheckout: (...args: unknown[]) => state.stripe.createRentalCheckout(...args),
  createBookingCheckout: (...args: unknown[]) => state.stripe.createBookingCheckout(...args),
  createRefund: (...args: unknown[]) => state.stripe.createRefund(...args),
  STRIPE_WEBHOOK_SECRET: 'whsec_test_chairmatch',
}))

import { POST as createBookingRoute, GET as listBookingsRoute } from '@/app/api/bookings/route'
import { PATCH as patchBookingRoute, GET as getBookingRoute } from '@/app/api/bookings/[id]/route'
import { POST as cancelBookingRoute } from '@/app/api/bookings/[id]/cancel/route'
import { POST as matchRoute } from '@/app/api/match/route'
import {
  POST as createRentalRoute,
  GET as listRentalsRoute,
} from '@/app/api/rental-bookings/route'

function db(): FakeSupabase {
  return state.db
}

/** Bequemer Zugriff auf die einzige/erste Buchung eines Kunden. */
function bookingRow(id: unknown): Row {
  const row = db().row('bookings', id)
  if (!row) throw new Error(`Buchung ${String(id)} nicht in der Fake-DB`)
  return row
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))
  state.db = createDb()
  state.session = sessionFor('customer')
  state.stripe = createStripeHarness()
  state.emails.confirmation.length = 0
  state.emails.provider.length = 0
})

afterEach(() => {
  vi.useRealTimers()
})

// ────────────────────────────────────────────────────────────────
describe('Stuhl suchen und filtern (POST /api/match)', () => {
  beforeEach(() => {
    // Zweiter Salon in einer anderen Stadt + günstigeres Inserat zum Vergleich
    db().rows('salons').push({
      id: '44444444-4444-4444-8444-44444444444a',
      name: 'Salon Hamburg',
      slug: 'salon-hamburg',
      category: 'friseur',
      city: 'Hamburg',
      owner_id: IDS.owner,
      is_active: true,
      is_verified: false,
      avg_rating: 4.0,
      review_count: 5,
    })
    db().rows('rental_equipment').push({
      id: '77777777-7777-4777-8777-77777777777a',
      salon_id: '44444444-4444-4444-8444-44444444444a',
      type: 'stuhl',
      name: 'Stuhl Hamburg',
      description: null,
      price_per_day_cents: 3000,
      price_per_month_cents: null,
      is_available: true,
      images: [],
    })
  })

  it('liefert passende Inserate, bestbewertetes Match zuerst', async () => {
    const res = await matchRoute(
      postRequest('https://www.chairmatch.de/api/match', {
        beruf: 'friseur',
        stadt: 'Berlin',
        budgetProTagCents: 6000,
        arbeitstageProWoche: 4,
        mietdauer: 'tageweise',
      }),
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { results: { id: string; score: number; city: string }[] }

    expect(json.results.length).toBeGreaterThan(0)
    // Das Berliner Inserat schlägt das Hamburger, obwohl Hamburg billiger ist
    expect(json.results[0].id).toBe(IDS.equipment)
    expect(json.results[0].city).toBe('Berlin')
    // Ergebnisse sind absteigend nach Score sortiert
    const scores = json.results.map(r => r.score)
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)
  })

  it('blendet pausierte Inserate aus (is_available = false)', async () => {
    const res = await matchRoute(
      postRequest('https://www.chairmatch.de/api/match', {
        beruf: 'kosmetik',
        stadt: 'Berlin',
        budgetProTagCents: 9000,
        arbeitstageProWoche: 3,
        mietdauer: 'tageweise',
      }),
    )
    const json = (await res.json()) as { results: { id: string }[] }
    expect(json.results.map(r => r.id)).not.toContain(IDS.equipmentUnavailable)
  })

  it('weist unvollständige Suchkriterien mit 400 ab', async () => {
    const res = await matchRoute(
      postRequest('https://www.chairmatch.de/api/match', { beruf: 'friseur', stadt: 'B' }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Felder/)
  })

  it('antwortet bei DB-Ausfall mit leerer Trefferliste statt 500', async () => {
    db().failOn('rental_equipment', 'select', {
      code: '08006',
      message: 'connection failure',
      details: null,
      hint: null,
    })
    const res = await matchRoute(
      postRequest('https://www.chairmatch.de/api/match', {
        beruf: 'friseur',
        stadt: 'Berlin',
        budgetProTagCents: 5000,
        arbeitstageProWoche: 5,
        mietdauer: 'tageweise',
      }),
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { results: unknown[]; hinweis?: string }
    expect(json.results).toEqual([])
    expect(json.hinweis).toBeTruthy()
  })
})

// ────────────────────────────────────────────────────────────────
describe('Buchung erstellen (POST /api/bookings)', () => {
  const validBody = {
    salonId: IDS.salon,
    serviceId: IDS.service,
    date: FREE_DAY,
    startTime: '09:00',
  }

  it('lehnt ohne Session mit 401 ab', async () => {
    state.session = null
    const res = await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', validBody),
      undefined,
    )
    expect(res.status).toBe(401)
    expect(db().rows('bookings')).toHaveLength(1) // nur die Bestandsbuchung
  })

  it('legt Buchung mit korrekter Endzeit, Preis und Status pending an', async () => {
    const res = await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', validBody),
      undefined,
    )
    expect(res.status).toBe(201)
    const json = (await res.json()) as { success: boolean; bookingId: string }
    expect(json.success).toBe(true)

    const created = bookingRow(json.bookingId)
    expect(created.customer_id).toBe(IDS.customer)
    expect(created.status).toBe('pending')
    expect(created.start_time).toBe('09:00:00')
    expect(created.end_time).toBe('10:00:00') // 60 Minuten Dienstleistung
    expect(created.price_cents).toBe(5000)
  })

  it('schreibt einen Audit-Log-Eintrag mit Policy-Snapshot', async () => {
    const res = await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', validBody),
      undefined,
    )
    const { bookingId } = (await res.json()) as { bookingId: string }

    const audit = db()
      .rows('audit_logs')
      .find(a => a.action === 'BOOKING_CREATED' && a.entity_id === bookingId)
    expect(audit).toBeTruthy()
    expect((audit?.details as { policySnapshot: unknown }).policySnapshot).toEqual({
      depositPercent: 20,
      cancellationHours: 48,
      noShowFeeCents: 1500,
    })
  })

  it('benachrichtigt Kundin und Saloninhaber per E-Mail', async () => {
    await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', validBody),
      undefined,
    )
    expect(state.emails.confirmation).toHaveLength(1)
    expect(state.emails.confirmation[0].to).toBe('kundin@example.de')
    expect(state.emails.provider).toHaveLength(1)
    expect(state.emails.provider[0].to).toBe('inhaber@example.de')
    expect(state.emails.provider[0].type).toBe('new_booking')
  })

  it('bucht auch dann, wenn der Mailversand scheitert (best effort)', async () => {
    db().failOn('profiles', 'select', {
      code: '08006',
      message: 'connection failure',
      details: null,
      hint: null,
    })
    const res = await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', validBody),
      undefined,
    )
    expect(res.status).toBe(201)
    expect(db().rows('bookings')).toHaveLength(2)
  })

  it('rechnet einen gültigen Promo-Code auf den Preis an und zählt ihn hoch', async () => {
    const res = await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', {
        ...validBody,
        promoCode: 'sommer10',
      }),
      undefined,
    )
    const { bookingId } = (await res.json()) as { bookingId: string }
    expect(bookingRow(bookingId).price_cents).toBe(4500) // 10 % auf 50,00 €

    const promo = db()
      .rows('promo_codes')
      .find(p => p.code === 'SOMMER10')
    expect(promo?.used_count).toBe(4)
  })

  it('ignoriert abgelaufene und ausgeschöpfte Promo-Codes', async () => {
    for (const code of ['ABGELAUFEN', 'AUSGESCHOEPFT', 'GIBTESNICHT']) {
      state.db = createDb()
      const res = await createBookingRoute(
        postRequest('https://www.chairmatch.de/api/bookings', { ...validBody, promoCode: code }),
        undefined,
      )
      const { bookingId } = (await res.json()) as { bookingId: string }
      expect(bookingRow(bookingId).price_cents).toBe(5000)
    }
  })

  it('verlangt bei Hochrisiko-Behandlungen eine Einwilligung', async () => {
    const res = await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', {
        ...validBody,
        serviceId: IDS.serviceHighRisk,
      }),
      undefined,
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Einwilligung/)
    expect(db().rows('bookings')).toHaveLength(1)
  })

  it('dokumentiert die Einwilligung bei Hochrisiko-Behandlungen', async () => {
    const res = await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', {
        ...validBody,
        serviceId: IDS.serviceHighRisk,
        consentGiven: true,
      }),
      undefined,
    )
    expect(res.status).toBe(201)
    const { bookingId } = (await res.json()) as { bookingId: string }
    const consent = db()
      .rows('consents')
      .find(c => c.booking_id === bookingId)
    expect(consent).toMatchObject({ user_id: IDS.customer, type: 'HIGH', given: true })
  })

  it('weist unbekannte Dienstleistungen ab', async () => {
    const res = await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', {
        ...validBody,
        serviceId: IDS.unknown,
      }),
      undefined,
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Dienstleistung/)
  })

  it.each([
    ['Datum im falschen Format', { ...validBody, date: '15.09.2026' }],
    ['Uhrzeit im falschen Format', { ...validBody, startTime: '9 Uhr' }],
    ['Service-ID ist keine UUID', { ...validBody, serviceId: 'service-1' }],
    ['Notiz zu lang', { ...validBody, notes: 'x'.repeat(501) }],
  ])('weist ungültige Eingabe ab: %s', async (_label, body) => {
    const res = await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', body),
      undefined,
    )
    expect(res.status).toBe(400)
    expect(db().rows('bookings')).toHaveLength(1)
  })

  it('weist einen kaputten JSON-Body mit 400 ab', async () => {
    const res = await createBookingRoute(
      brokenJsonRequest('https://www.chairmatch.de/api/bookings'),
      undefined,
    )
    expect(res.status).toBe(400)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Doppelbuchung verhindern', () => {
  it('lehnt einen überlappenden Zeitslot ab', async () => {
    const res = await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', {
        salonId: IDS.salon,
        serviceId: IDS.service,
        date: BUSY_DAY,
        startTime: '10:30', // Bestand: 10:00–11:00
      }),
      undefined,
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/bereits belegt/)
    expect(db().rows('bookings')).toHaveLength(1)
  })

  it('erlaubt den direkt anschließenden Zeitslot', async () => {
    const res = await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', {
        salonId: IDS.salon,
        serviceId: IDS.service,
        date: BUSY_DAY,
        startTime: '11:00',
      }),
      undefined,
    )
    expect(res.status).toBe(201)
  })

  it('gibt den Slot nach einer Stornierung wieder frei', async () => {
    bookingRow(IDS.bookingConfirmed).status = 'cancelled'
    const res = await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', {
        salonId: IDS.salon,
        serviceId: IDS.service,
        date: BUSY_DAY,
        startTime: '10:00',
      }),
      undefined,
    )
    expect(res.status).toBe(201)
  })

  it('blockiert den Slot auch bei noch unbestätigten (pending) Buchungen', async () => {
    bookingRow(IDS.bookingConfirmed).status = 'pending'
    const res = await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', {
        salonId: IDS.salon,
        serviceId: IDS.service,
        date: BUSY_DAY,
        startTime: '10:00',
      }),
      undefined,
    )
    expect(res.status).toBe(400)
  })

  it('zwei gleichzeitige Anfragen auf denselben Slot: genau eine gewinnt nicht — Race dokumentiert', async () => {
    // Der Konflikt-Check ist SELECT-dann-INSERT und damit nicht atomar.
    // Anders als bei rental_bookings (EXCLUDE-Constraint) gibt es auf
    // `bookings` KEINEN DB-seitigen Schutz — beide Requests kommen durch.
    const body = {
      salonId: IDS.salon,
      serviceId: IDS.service,
      date: FREE_DAY,
      startTime: '14:00',
    }
    const [a, b] = await Promise.all([
      createBookingRoute(postRequest('https://www.chairmatch.de/api/bookings', body), undefined),
      createBookingRoute(postRequest('https://www.chairmatch.de/api/bookings', body), undefined),
    ])
    expect([a.status, b.status]).toEqual([201, 201])
    const sameSlot = db()
      .rows('bookings')
      .filter(x => x.booking_date === FREE_DAY && x.start_time === '14:00:00')
    // FINDING: 2 statt 1 — dokumentiert die fehlende DB-Constraint auf bookings.
    expect(sameSlot).toHaveLength(2)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Buchungsbestätigung (PATCH /api/bookings/[id])', () => {
  async function createPending(): Promise<string> {
    const res = await createBookingRoute(
      postRequest('https://www.chairmatch.de/api/bookings', {
        salonId: IDS.salon,
        serviceId: IDS.service,
        date: FREE_DAY,
        startTime: '09:00',
      }),
      undefined,
    )
    const { bookingId } = (await res.json()) as { bookingId: string }
    return bookingId
  }

  it('Saloninhaber bestätigt eine offene Buchung', async () => {
    const id = await createPending()
    state.session = sessionFor('owner')

    const res = await patchBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${id}`, { newStatus: 'confirmed' }),
      ctx({ id }),
    )
    expect(res.status).toBe(200)
    expect(bookingRow(id).status).toBe('confirmed')
    expect(db().rows('audit_logs').some(a => a.action === 'BOOKING_CONFIRMED')).toBe(true)
  })

  it('Kundin darf den Status NICHT selbst ändern (403)', async () => {
    const id = await createPending()
    const res = await patchBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${id}`, { newStatus: 'confirmed' }),
      ctx({ id }),
    )
    expect(res.status).toBe(403)
    expect(bookingRow(id).status).toBe('pending')
  })

  it('Admin darf den Status ändern', async () => {
    const id = await createPending()
    state.session = sessionFor('admin')
    const res = await patchBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${id}`, { newStatus: 'confirmed' }),
      ctx({ id }),
    )
    expect(res.status).toBe(200)
  })

  it('lehnt einen unmöglichen Statuswechsel ab (pending → completed)', async () => {
    const id = await createPending()
    state.session = sessionFor('owner')
    const res = await patchBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${id}`, { newStatus: 'completed' }),
      ctx({ id }),
    )
    expect(res.status).toBe(400)
    expect(bookingRow(id).status).toBe('pending')
  })

  it('führt bestätigt → abgeschlossen und bestätigt → no_show aus', async () => {
    state.session = sessionFor('owner')
    const id = IDS.bookingConfirmed

    const completed = await patchBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${id}`, { newStatus: 'completed' }),
      ctx({ id }),
    )
    expect(completed.status).toBe(200)
    expect(bookingRow(id).status).toBe('completed')

    bookingRow(id).status = 'confirmed'
    const noShow = await patchBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${id}`, { newStatus: 'no_show' }),
      ctx({ id }),
    )
    expect(noShow.status).toBe(200)
    expect(bookingRow(id).status).toBe('no_show')
  })

  it('weist unbekannte Statuswerte ab', async () => {
    state.session = sessionFor('owner')
    const res = await patchBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${IDS.bookingConfirmed}`, {
        newStatus: 'geloescht',
      }),
      ctx({ id: IDS.bookingConfirmed }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Status/)
  })

  it('antwortet 404 für eine unbekannte Buchung', async () => {
    state.session = sessionFor('owner')
    const res = await patchBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${IDS.unknown}`, {
        newStatus: 'confirmed',
      }),
      ctx({ id: IDS.unknown }),
    )
    expect(res.status).toBe(404)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Buchung stornieren (POST /api/bookings/[id]/cancel)', () => {
  it('Kundin storniert ihre bestätigte Buchung inkl. Grund und Audit-Log', async () => {
    const id = IDS.bookingConfirmed
    const res = await cancelBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${id}/cancel`, {
        reason: 'Terminkollision',
      }),
      ctx({ id }),
    )
    expect(res.status).toBe(200)
    expect(bookingRow(id).status).toBe('cancelled')
    expect(bookingRow(id).cancellation_reason).toBe('Terminkollision')

    const audit = db()
      .rows('audit_logs')
      .find(a => a.action === 'BOOKING_CANCELLED')
    expect(audit).toBeTruthy()
    expect((audit?.details as { actor: string }).actor).toBe('customer')
  })

  it('Saloninhaber storniert eine bestätigte Buchung', async () => {
    state.session = sessionFor('owner')
    const id = IDS.bookingConfirmed
    const res = await cancelBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${id}/cancel`, {}),
      ctx({ id }),
    )
    expect(res.status).toBe(200)
    expect(bookingRow(id).status).toBe('cancelled')
  })

  it('lehnt die zweite Stornierung derselben Buchung ab', async () => {
    const id = IDS.bookingConfirmed
    await cancelBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${id}/cancel`, {}),
      ctx({ id }),
    )
    const res = await cancelBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${id}/cancel`, {}),
      ctx({ id }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/nicht möglich/)
  })

  it('antwortet 401 ohne Session', async () => {
    state.session = null
    const res = await cancelBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${IDS.bookingConfirmed}/cancel`, {}),
      ctx({ id: IDS.bookingConfirmed }),
    )
    expect(res.status).toBe(401)
    expect(bookingRow(IDS.bookingConfirmed).status).toBe('confirmed')
  })

  it('antwortet 400 für eine unbekannte Buchung', async () => {
    const res = await cancelBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${IDS.unknown}/cancel`, {}),
      ctx({ id: IDS.unknown }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/nicht gefunden/)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Miet-Buchung anlegen (POST /api/rental-bookings)', () => {
  const body = { equipmentId: IDS.equipment, startDate: '2026-09-20', endDate: '2026-09-24' }

  it('berechnet den Preis serverseitig und liefert die Checkout-URL', async () => {
    const res = await createRentalRoute(
      postRequest('https://www.chairmatch.de/api/rental-bookings', body),
    )
    expect(res.status).toBe(201)
    const json = (await res.json()) as {
      booking: Row
      checkoutUrl: string
      totalCents: number
      days: number
    }
    expect(json.days).toBe(5) // inklusive Start- und Endtag
    expect(json.totalCents).toBe(25000) // 5 × 50,00 €
    expect(json.checkoutUrl).toContain('checkout.stripe.com')

    const stored = db().row('rental_bookings', json.booking.id)
    expect(stored).toMatchObject({
      renter_id: IDS.customer,
      status: 'pending',
      payment_status: 'pending',
      total_cents: 25000,
    })
    expect(String(stored?.stripe_session_id)).toMatch(/^cs_test_/)
  })

  it('ignoriert einen vom Client mitgeschickten Preis', async () => {
    const res = await createRentalRoute(
      postRequest('https://www.chairmatch.de/api/rental-bookings', {
        ...body,
        totalCents: 1,
        total_cents: 1,
      }),
    )
    const json = (await res.json()) as { totalCents: number }
    expect(json.totalCents).toBe(25000)
  })

  it('nutzt den Monatspreis für volle 30-Tage-Blöcke', async () => {
    const res = await createRentalRoute(
      postRequest('https://www.chairmatch.de/api/rental-bookings', {
        equipmentId: IDS.equipment,
        startDate: '2026-11-01',
        endDate: '2026-11-30', // 30 Tage
      }),
    )
    const json = (await res.json()) as { days: number; totalCents: number }
    expect(json.days).toBe(30)
    expect(json.totalCents).toBe(90000) // Monatspreis statt 30 × 50,00 €
  })

  it('lehnt einen bereits belegten Zeitraum mit 409 ab', async () => {
    const res = await createRentalRoute(
      postRequest('https://www.chairmatch.de/api/rental-bookings', {
        equipmentId: IDS.equipment,
        startDate: '2026-10-05', // Bestand: 01.–07.10.
        endDate: '2026-10-10',
      }),
    )
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/belegt/)
  })

  it('fängt den Doppelbuchungs-Race über den EXCLUDE-Constraint ab (23P01 → 409)', async () => {
    enableOverlapConstraint(db())
    const parallel = {
      equipmentId: IDS.equipment,
      startDate: '2026-11-01',
      endDate: '2026-11-05',
    }
    const [a, b] = await Promise.all([
      createRentalRoute(
        postRequest('https://www.chairmatch.de/api/rental-bookings', parallel),
      ),
      createRentalRoute(
        postRequest('https://www.chairmatch.de/api/rental-bookings', parallel),
      ),
    ])
    const codes = [a.status, b.status].sort()
    expect(codes).toEqual([201, 409])
    expect(
      db()
        .rows('rental_bookings')
        .filter(r => r.start_date === '2026-11-01'),
    ).toHaveLength(1)
  })

  it('verhindert die Buchung des eigenen Mietobjekts', async () => {
    db().rows('salons').push({
      id: '44444444-4444-4444-8444-444444444445',
      name: 'Eigener Salon',
      slug: 'eigener-salon',
      category: 'friseur',
      city: 'Berlin',
      owner_id: IDS.customer,
      is_active: true,
    })
    const res = await createRentalRoute(
      postRequest('https://www.chairmatch.de/api/rental-bookings', {
        equipmentId: IDS.equipmentOwnSalon,
        startDate: '2026-09-20',
        endDate: '2026-09-21',
      }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Eigenes Mietobjekt/)
  })

  it.each([
    ['pausiertes Mietobjekt', { equipmentId: IDS.equipmentUnavailable, startDate: '2026-09-20', endDate: '2026-09-21' }, 409],
    ['unbekanntes Mietobjekt', { equipmentId: IDS.unknown, startDate: '2026-09-20', endDate: '2026-09-21' }, 404],
    ['Startdatum in der Vergangenheit', { equipmentId: IDS.equipment, startDate: '2026-08-01', endDate: '2026-09-20' }, 400],
    ['Ende vor Beginn', { equipmentId: IDS.equipment, startDate: '2026-09-20', endDate: '2026-09-10' }, 400],
    ['länger als 12 Monate', { equipmentId: IDS.equipment, startDate: '2026-09-02', endDate: '2027-12-31' }, 400],
    ['Datum im falschen Format', { equipmentId: IDS.equipment, startDate: '20.09.2026', endDate: '2026-09-21' }, 400],
  ])('lehnt ab: %s', async (_label, payload, expected) => {
    const res = await createRentalRoute(
      postRequest('https://www.chairmatch.de/api/rental-bookings', payload),
    )
    expect(res.status).toBe(expected)
    expect(db().rows('rental_bookings')).toHaveLength(1) // nur der Bestand
  })

  it('rollt die Buchung zurück, wenn Stripe nicht erreichbar ist (kein Zombie-Pending)', async () => {
    state.stripe.createRentalCheckout.mockRejectedValueOnce(new Error('Stripe down'))
    const res = await createRentalRoute(
      postRequest('https://www.chairmatch.de/api/rental-bookings', body),
    )
    expect(res.status).toBe(502)
    expect(db().rows('rental_bookings')).toHaveLength(1)
  })

  it('antwortet 401 ohne Session', async () => {
    state.session = null
    const res = await createRentalRoute(
      postRequest('https://www.chairmatch.de/api/rental-bookings', body),
    )
    expect(res.status).toBe(401)
  })

  it('antwortet 400 bei kaputtem JSON-Body', async () => {
    const res = await createRentalRoute(
      brokenJsonRequest('https://www.chairmatch.de/api/rental-bookings'),
    )
    expect(res.status).toBe(400)
  })

  it('meldet 500, wenn die Verfügbarkeitsprüfung selbst scheitert (fail-closed)', async () => {
    db().failOn('rental_bookings', 'select', {
      code: '08006',
      message: 'connection failure',
      details: null,
      hint: null,
    })
    const res = await createRentalRoute(
      postRequest('https://www.chairmatch.de/api/rental-bookings', body),
    )
    expect(res.status).toBe(500)
    expect(db().rows('rental_bookings')).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Eigene Buchungen abrufen', () => {
  it('GET /api/bookings liefert nur die Buchungen der angemeldeten Person', async () => {
    db().rows('bookings').push({
      id: '66666666-6666-4666-8666-666666666667',
      customer_id: IDS.otherCustomer,
      salon_id: IDS.salon,
      service_id: IDS.service,
      booking_date: FREE_DAY,
      start_time: '15:00:00',
      end_time: '16:00:00',
      status: 'confirmed',
      price_cents: 5000,
      created_at: '2026-08-26T10:00:00.000Z',
    })

    const res = await listBookingsRoute(
      rawRequest('https://www.chairmatch.de/api/bookings'),
      undefined,
    )
    const rows = (await res.json()) as Row[]
    expect(rows).toHaveLength(1)
    expect(rows[0].customer_id).toBe(IDS.customer)
  })

  it('GET /api/rental-bookings liefert nur eigene Miet-Buchungen', async () => {
    const res = await listRentalsRoute()
    const json = (await res.json()) as { bookings: Row[] }
    // Der Bestand gehört otherCustomer
    expect(json.bookings).toHaveLength(0)

    state.session = sessionFor('otherCustomer')
    const own = await listRentalsRoute()
    const ownJson = (await own.json()) as { bookings: Row[] }
    expect(ownJson.bookings).toHaveLength(1)
    expect(ownJson.bookings[0].id).toBe(IDS.rentalConfirmed)
  })

  it('GET /api/bookings/[id] erlaubt Zugriff nur Beteiligten', async () => {
    const id = IDS.bookingConfirmed

    for (const who of ['customer', 'owner', 'admin'] as const) {
      state.session = sessionFor(who)
      const res = await getBookingRoute(
        rawRequest(`https://www.chairmatch.de/api/bookings/${id}`),
        ctx({ id }),
      )
      expect(res.status, `Rolle ${who}`).toBe(200)
    }

    state.session = sessionFor('otherCustomer')
    const forbidden = await getBookingRoute(
      rawRequest(`https://www.chairmatch.de/api/bookings/${id}`),
      ctx({ id }),
    )
    expect(forbidden.status).toBe(403)
  })
})
