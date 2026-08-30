// @vitest-environment node
/**
 * E2E: Kalender-Ansicht — was als "frei" angeboten wird.
 *
 * `/api/availability` ist die Quelle, aus der der Buchen-Kalender seine Slots
 * bezieht. Bis Track 6 fragte ihn niemand: die oeffentliche Seite
 * `/salon/[slug]/buchen` zeigte eine fest verdrahtete Liste mit erfundenen
 * `free`-Flags — bei jedem Salon, an jedem Tag dieselbe. Wer dort einen als
 * frei angezeigten Slot waehlte, bekam eine Doppelbuchung angeboten.
 *
 * Und die Route selbst hatte zwei eigene Loecher:
 *
 *  1. Sie zerlegte Bestandsbuchungen in Punkte eines 15-Minuten-Rasters. Eine
 *     Buchung, die nicht auf dem Raster liegt (09:10-09:40), belegte damit die
 *     Punkte 9:10 und 9:25 — ein Kandidat um 09:00 prueft 9:00 und 9:15, trifft
 *     keinen davon und galt als frei, obwohl er sich 30 Minuten ueberschneidet.
 *  2. Faellt die Belegungsabfrage aus, war jeder Slot frei.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDb, enableLiveSchema, getRequest, IDS, BUSY_DAY, FREE_DAY } from './_harness/fixtures'
import type { FakeSupabase } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))

import { GET as availabilityGet } from '@/app/api/availability/route'

function db(): FakeSupabase {
  return state.db
}

const BASIS = 'https://www.chairmatch.de/api/availability'

function slotsFuer(date: string, extra = '') {
  return availabilityGet(
    getRequest(`${BASIS}?salonId=${IDS.salon}&serviceId=${IDS.service}&date=${date}${extra}`),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z')) // 11:00 Berlin
  state.db = createDb()
  enableLiveSchema(state.db)
  // Der Salon im Fixture hat keine Oeffnungszeiten — ohne sie liefert die
  // Route grundsaetzlich eine leere Liste, und kein Test wuerde etwas zeigen.
  db().rows('salons').forEach(s => {
    if (s.id === IDS.salon) {
      s.opening_hours = {
        Mo: '09:00 - 18:00', Di: '09:00 - 18:00', Mi: '09:00 - 18:00',
        Do: '09:00 - 18:00', Fr: '09:00 - 18:00', Sa: '09:00 - 18:00',
        So: '09:00 - 18:00',
      }
    }
  })
})

describe('Freie Zeiten kommen aus der echten Belegung', () => {
  it('bietet an einem freien Tag Slots an', async () => {
    const body = await (await slotsFuer(FREE_DAY)).json()
    expect(body.slots.length).toBeGreaterThan(0)
    expect(body.durationMinutes).toBe(60)
  })

  it('bietet einen belegten Zeitraum nicht an', async () => {
    // Bestand: BUSY_DAY 10:00-11:00, Leistung dauert 60 Minuten.
    const body = await (await slotsFuer(BUSY_DAY)).json()

    expect(body.slots).not.toContain('10:00')
    expect(body.slots).not.toContain('09:30') // liefe bis 10:30
    expect(body.slots).not.toContain('10:45') // liefe ab 10:45
  })

  it('bietet die Zeit direkt nach einem Termin wieder an', async () => {
    const body = await (await slotsFuer(BUSY_DAY)).json()
    expect(body.slots).toContain('11:00')
  })

  it('erkennt auch eine Bestandsbuchung, die nicht auf dem Raster liegt', async () => {
    // Der eigentliche Defekt: 09:10-09:40 belegte im Raster nur 9:10 und 9:25.
    db().rows('bookings').push({
      id: '66666666-6666-4666-8666-6666666666aa',
      customer_id: IDS.otherCustomer,
      salon_id: IDS.salon,
      service_id: IDS.service,
      booking_date: FREE_DAY,
      start_time: '09:10:00',
      end_time: '09:40:00',
      status: 'confirmed',
      price_cents: 5000,
      created_at: '2026-08-20T09:00:00.000Z',
    })

    const body = await (await slotsFuer(FREE_DAY)).json()

    // 09:00-10:00 ueberschneidet sich mit 09:10-09:40 und darf nicht kommen.
    expect(body.slots).not.toContain('09:00')
    expect(body.slots).not.toContain('09:15')
    expect(body.slots).not.toContain('09:30')
    // 09:45 beginnt nach dem Ende — das ist frei.
    expect(body.slots).toContain('09:45')
  })

  it('ignoriert stornierte Termine', async () => {
    db().rows('bookings').forEach(b => { if (b.id === IDS.bookingConfirmed) b.status = 'cancelled' })
    const body = await (await slotsFuer(BUSY_DAY)).json()
    expect(body.slots).toContain('10:00')
  })

  it('ignoriert eine Bestandszeile mit unlesbarer Zeit statt den Tag zu sperren', async () => {
    db().rows('bookings').push({
      id: '66666666-6666-4666-8666-6666666666bb',
      customer_id: IDS.otherCustomer,
      salon_id: IDS.salon,
      service_id: IDS.service,
      booking_date: FREE_DAY,
      start_time: null,
      end_time: null,
      status: 'confirmed',
      price_cents: 5000,
      created_at: '2026-08-20T09:00:00.000Z',
    })

    const body = await (await slotsFuer(FREE_DAY)).json()
    expect(body.slots.length).toBeGreaterThan(0)
  })
})

describe('Heute keine Zeiten in der Vergangenheit', () => {
  it('bietet fuer heute nur noch Slots nach der aktuellen Uhrzeit an', async () => {
    // Es ist 11:00 Berliner Zeit.
    const body = await (await slotsFuer('2026-09-01')).json()

    expect(body.slots).not.toContain('09:00')
    expect(body.slots).not.toContain('11:00')
    expect(body.slots).toContain('11:15')
  })

  it('schneidet an kuenftigen Tagen nichts weg', async () => {
    const body = await (await slotsFuer(FREE_DAY)).json()
    expect(body.slots).toContain('09:00')
  })
})

describe('Ausfall der Belegungsabfrage', () => {
  it('antwortet mit 503 statt alle Slots als frei zu melden', async () => {
    db().failOn('bookings', 'select', {
      code: '08006', message: 'connection failure', details: null, hint: null,
    }, false)

    const res = await slotsFuer(BUSY_DAY)

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.slots).toBeUndefined()
  })
})

describe('Geschlossene Tage', () => {
  it('bietet nichts an, wenn der Salon geschlossen hat', async () => {
    db().rows('salons').forEach(s => {
      if (s.id === IDS.salon) s.opening_hours = { ...(s.opening_hours as object), Di: 'Geschlossen' }
    })
    // 15.09.2026 ist ein Dienstag.
    const body = await (await slotsFuer(FREE_DAY)).json()
    expect(body.slots).toEqual([])
  })

  /*
   * Track E. Ein leeres `slots` ohne Grund liess beide Buchungs-Oberflaechen
   * denselben Satz anzeigen — „An diesem Tag ist nichts mehr frei" —, und
   * zwar auch am Ruhetag, am Feiertag und beim gesperrten Salon. Der Kunde
   * suchte dann nach einem freien Slot, den es an keinem Tag geben wird.
   *
   * Die Route WEISS den Unterschied (`hoursForDay` trennt `closed` von
   * `unknown`, siehe lib/salon-open.ts) — sie hat ihn nur nicht gesagt.
   */
  it('nennt den Ruhetag als Grund', async () => {
    db().rows('salons').forEach(s => {
      if (s.id === IDS.salon) s.opening_hours = { ...(s.opening_hours as object), Di: 'Geschlossen' }
    })
    const body = await (await slotsFuer(FREE_DAY)).json()
    expect(body.unavailable).toBe('closed_day')
    expect(body.message).toMatch(/geschlossen/i)
  })

  it('behauptet bei fehlender Angabe NICHTS', async () => {
    // „Keine Angabe" ist nicht „geschlossen" — `createBooking` weist diesen
    // Fall bewusst nicht ab. Ein `closed_day` hier waere eine Aussage, die
    // die Route nicht decken kann.
    db().rows('salons').forEach(s => {
      if (s.id === IDS.salon) s.opening_hours = null
    })
    const body = await (await slotsFuer(FREE_DAY)).json()
    expect(body.slots).toEqual([])
    expect(body.unavailable).toBeUndefined()
    expect(body.message).toBeUndefined()
  })

  it('nennt den Feiertag als Grund', async () => {
    // 03.10.2026 ist der Tag der Deutschen Einheit, bundesweit.
    const body = await (await slotsFuer('2026-10-03')).json()
    expect(body.unavailable).toBe('holiday')
    expect(body.message).toMatch(/Feiertag/i)
  })
})
