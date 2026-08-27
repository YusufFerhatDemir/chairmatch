// @vitest-environment node
/**
 * E2E: Buchungs-Integritaet.
 *
 * Drei Klassen von Defekten, die alle im selben Pfad (createBooking) lagen:
 *
 *  1. Stiller Erfolg — ohne salonId meldete die Action `success: true` mit
 *     einer erfundenen `demo-…`-ID und schrieb nichts. Die Route macht daraus
 *     201: der Kunde sah "gebucht", der Salon nie einen Termin.
 *  2. Fehlende Bezugspruefungen — die Leistung musste weder zum gebuchten
 *     Salon gehoeren noch aktiv sein.
 *  3. Races — Rabatt-Kontingent als read-then-write, Slot-Pruefung als
 *     SELECT vor INSERT.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDb, sessionFor, postRequest, IDS, FREE_DAY, BUSY_DAY } from './_harness/fixtures'
import type { FakeSupabase, Row } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as import('./_harness/fixtures').TestSession | null,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({ getServerSession: async () => state.session }))
vi.mock('@/modules/auth/auth.config', () => ({ auth: async () => state.session }))
vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: vi.fn(async () => ({ ok: true })),
  sendProviderNotification: vi.fn(async () => ({ ok: true })),
}))

import { POST as bookingsPost } from '@/app/api/bookings/route'

function db(): FakeSupabase {
  return state.db
}

const URL_BOOKINGS = 'https://www.chairmatch.de/api/bookings'

function book(body: Record<string, unknown>) {
  // withApi() reicht den Next-Route-Kontext als zweites Argument durch; die
  // Buchungs-Route liest ihn nicht, der Typ verlangt ihn aber.
  return bookingsPost(postRequest(URL_BOOKINGS, body), undefined)
}

/** Gueltige Buchung auf einen freien Tag. */
function gueltig(over: Record<string, unknown> = {}) {
  return {
    salonId: IDS.salon,
    serviceId: IDS.service,
    date: FREE_DAY,
    startTime: '14:00',
    ...over,
  }
}

/** Zaehlt nur die im Test neu entstandenen Buchungen. */
function neueBuchungen(vorher: number): Row[] {
  return db().rows('bookings').slice(vorher)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))
  state.db = createDb()
  state.session = sessionFor('customer')
})

// ────────────────────────────────────────────────────────────────
describe('Kein Erfolg ohne Buchung', () => {
  it('meldet einen Fehler statt einer erfundenen demo-Buchung, wenn salonId fehlt', async () => {
    const vorher = db().rows('bookings').length

    const res = await book({ serviceId: IDS.service, date: FREE_DAY, startTime: '14:00' })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(String(body.bookingId ?? '')).not.toMatch(/^demo-/)
    expect(body.success).toBeUndefined()
    expect(neueBuchungen(vorher)).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Leistung muss zum Salon gehoeren', () => {
  it('lehnt eine Leistung ab, die zu einem anderen Salon gehoert', async () => {
    const vorher = db().rows('bookings').length
    db().rows('salons').push({
      id: IDS.salonZwei,
      name: 'Salon Zweitplatz',
      slug: 'salon-zweitplatz',
      owner_id: IDS.otherCustomer,
      is_active: true,
    })

    // Leistung gehoert zu IDS.salon, gebucht wird auf salonZwei
    const res = await book(gueltig({ salonId: IDS.salonZwei }))

    expect(res.status).toBe(400)
    expect(neueBuchungen(vorher)).toHaveLength(0)
  })

  it('lehnt eine deaktivierte Leistung ab', async () => {
    const vorher = db().rows('bookings').length
    db().row('services', IDS.service)!.is_active = false

    const res = await book(gueltig())

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/nicht angeboten/i)
    expect(neueBuchungen(vorher)).toHaveLength(0)
  })

  it('bucht die eigene, aktive Leistung des Salons normal', async () => {
    const vorher = db().rows('bookings').length
    const res = await book(gueltig())
    expect(res.status).toBe(201)
    expect(neueBuchungen(vorher)).toHaveLength(1)
    expect(neueBuchungen(vorher)[0]).toMatchObject({
      salon_id: IDS.salon,
      service_id: IDS.service,
      price_cents: 5000,
      status: 'pending',
    })
  })
})

// ────────────────────────────────────────────────────────────────
describe('Rabatt-Kontingent', () => {
  const AUSGESCHOEPFT = 'AUSGESCHOEPFT'
  const SOMMER = 'SOMMER10'

  function promo(code: string): Row {
    return db().rows('promo_codes').find(p => p.code === code)!
  }

  it('zieht den Rabatt ab und belegt genau einen Platz', async () => {
    const vorher = db().rows('bookings').length
    const used = promo(SOMMER).used_count as number

    const res = await book(gueltig({ promoCode: SOMMER }))

    expect(res.status).toBe(201)
    expect(neueBuchungen(vorher)[0].price_cents).toBe(4500)
    expect(promo(SOMMER).used_count).toBe(used + 1)
  })

  it('bucht zum vollen Preis, wenn das Kontingent erschoepft ist', async () => {
    const vorher = db().rows('bookings').length

    const res = await book(gueltig({ promoCode: AUSGESCHOEPFT }))

    expect(res.status).toBe(201)
    expect(neueBuchungen(vorher)[0].price_cents).toBe(5000)
    // Der Zaehler darf den Deckel nicht ueberschreiten
    expect(promo(AUSGESCHOEPFT).used_count).toBe(5)
  })

  it('haelt den Deckel auch bei gleichzeitigen Buchungen ein', async () => {
    const vorher = db().rows('bookings').length
    // Noch genau ein Platz frei (used 4 von 5)
    Object.assign(promo(SOMMER), { used_count: 4, max_uses: 5 })

    const [a, b] = await Promise.all([
      book(gueltig({ startTime: '14:00', promoCode: SOMMER })),
      book(gueltig({ startTime: '16:00', promoCode: SOMMER })),
    ])

    expect([a.status, b.status]).toEqual([201, 201])
    expect(promo(SOMMER).used_count).toBe(5)

    // Genau eine der beiden darf rabattiert sein
    const preise = neueBuchungen(vorher).map(b => b.price_cents).sort()
    expect(preise).toEqual([4500, 5000])
  })

  it('gibt den belegten Platz zurueck, wenn die Buchung nicht zustande kommt', async () => {
    const used = promo(SOMMER).used_count as number
    db().failOn('bookings', 'insert', {
      code: '08006',
      message: 'connection failure',
      details: null,
      hint: null,
    })

    const res = await book(gueltig({ promoCode: SOMMER }))

    expect(res.status).toBe(400)
    expect(promo(SOMMER).used_count).toBe(used)
  })

  it('ignoriert einen unbekannten Code, statt die Buchung zu verweigern', async () => {
    const vorher = db().rows('bookings').length
    const res = await book(gueltig({ promoCode: 'GIBTESNICHT' }))
    expect(res.status).toBe(201)
    expect(neueBuchungen(vorher)[0].price_cents).toBe(5000)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Slot-Rennen', () => {
  it('lehnt einen bereits belegten Slot weiterhin vorab ab', async () => {
    const vorher = db().rows('bookings').length
    const res = await book(gueltig({ date: BUSY_DAY, startTime: '10:00' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/belegt/i)
    expect(neueBuchungen(vorher)).toHaveLength(0)
  })

  it('laesst bei zwei gleichzeitigen Buchungen desselben Slots nur eine bestehen', async () => {
    const vorher = db().rows('bookings').length

    const [a, b] = await Promise.all([
      book(gueltig({ startTime: '14:00' })),
      book(gueltig({ startTime: '14:00' })),
    ])

    const codes = [a.status, b.status].sort()
    expect(codes).toEqual([201, 400])
    expect(neueBuchungen(vorher)).toHaveLength(1)
  })

  it('laesst benachbarte, nicht ueberlappende Slots beide zu', async () => {
    const vorher = db().rows('bookings').length

    const [a, b] = await Promise.all([
      book(gueltig({ startTime: '14:00' })), // 14:00–15:00
      book(gueltig({ startTime: '15:00' })), // 15:00–16:00
    ])

    expect([a.status, b.status]).toEqual([201, 201])
    expect(neueBuchungen(vorher)).toHaveLength(2)
  })

  /**
   * Das echte Fenster: die konkurrierende Buchung entsteht ZWISCHEN
   * checkConflict und dem eigenen INSERT. Der Insert-Hook der Fake-DB feuert
   * genau dort — anders liesse sich der Pfad nicht deterministisch treffen,
   * weil der Vorab-Check sonst schon greift.
   */
  function konkurrenzBeimInsert(createdAt: string): void {
    let gefeuert = false
    db().onInsert((table, row) => {
      if (table !== 'bookings' || gefeuert) return null
      gefeuert = true
      db().rows('bookings').push({
        id: '66660000-0000-4000-8000-000000000099',
        customer_id: IDS.otherCustomer,
        salon_id: row.salon_id,
        service_id: IDS.service,
        booking_date: row.booking_date,
        start_time: row.start_time,
        end_time: row.end_time,
        status: 'pending',
        payment_status: 'unpaid',
        price_cents: 5000,
        created_at: createdAt,
      })
      return null
    })
  }

  it('nimmt die eigene Buchung zurueck, wenn im Insert-Fenster eine aeltere entstand', async () => {
    const vorher = db().rows('bookings').length
    konkurrenzBeimInsert('2026-09-01T08:59:59.000Z') // aelter als unsere

    const res = await book(gueltig({ startTime: '14:00' }))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/belegt/i)
    // Nur die fremde Buchung bleibt stehen
    const neu = neueBuchungen(vorher)
    expect(neu).toHaveLength(1)
    expect(neu[0].customer_id).toBe(IDS.otherCustomer)
  })

  it('behaelt die eigene Buchung, wenn die konkurrierende juenger ist', async () => {
    const vorher = db().rows('bookings').length
    konkurrenzBeimInsert('2026-09-01T09:00:01.000Z') // juenger als unsere

    const res = await book(gueltig({ startTime: '14:00' }))

    expect(res.status).toBe(201)
    expect(
      neueBuchungen(vorher).some(b => b.customer_id === IDS.customer),
    ).toBe(true)
  })

  it('gibt den Rabatt-Platz zurueck, wenn die Buchung das Rennen verliert', async () => {
    const sommer = db().rows('promo_codes').find(p => p.code === 'SOMMER10')!
    Object.assign(sommer, { used_count: 0, max_uses: 10 })

    await Promise.all([
      book(gueltig({ startTime: '14:00', promoCode: 'SOMMER10' })),
      book(gueltig({ startTime: '14:00', promoCode: 'SOMMER10' })),
    ])

    // Nur die ueberlebende Buchung darf einen Platz halten
    expect(sommer.used_count).toBe(1)
  })
})
