// @vitest-environment node
/**
 * E2E: Hat der Salon ueberhaupt offen? (Track 25)
 *
 * Der Befund hat zwei Haelften, und die zweite ist die teurere:
 *
 *  1. `/api/availability` kannte keine Feiertage. `opening_hours` ist nach
 *     WOCHENTAGEN gepflegt, und der 25.12.2026 ist ein Freitag — ein Salon
 *     mit Freitagszeiten bekam an Weihnachten das volle Raster angeboten.
 *     Die passende Pruefung stand die ganze Zeit in `lib/scheduling.ts`, in
 *     einem Modul, das im gesamten Repository keinen Aufrufer hat.
 *
 *  2. `createBooking` sah `opening_hours` NIE an — weder Wochentag noch
 *     Uhrzeit noch Feiertag. Die Slot-Route war damit reine Anzeige: ein
 *     direkter POST auf `/api/bookings` legte einen Termin um 22:00 Uhr an
 *     einem Sonntag mit „Geschlossen" an, verschickte beide
 *     Bestaetigungsmails und belegte den Slot.
 *
 * Die Gegenprobe steht ueberall daneben: was heute buchbar ist, muss buchbar
 * bleiben. Insbesondere darf ein Salon OHNE gepflegte Zeiten nicht stillgelegt
 * werden — „ich weiss es nicht" ist keine Absage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createDb,
  sessionFor,
  postRequest,
  getRequest,
  enableLiveSchema,
  IDS,
  FREE_DAY,
} from './_harness/fixtures'
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
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn(async () => ({ ok: true })) }))

import { GET as availabilityGet } from '@/app/api/availability/route'
import { POST as bookingsPost } from '@/app/api/bookings/route'

function db(): FakeSupabase {
  return state.db
}

/** 1. Weihnachtstag 2026 — ein FREITAG. Genau darum geht es. */
const WEIHNACHTEN = '2026-12-25'
/** Tag der Deutschen Einheit 2026 — ein Samstag. */
const EINHEIT = '2026-10-03'
/** Fronleichnam 2027 (Do) — gilt in BY, nicht in BE. */
const FRONLEICHNAM = '2027-05-27'

const GANZE_WOCHE = {
  Mo: '09:00 - 18:00', Di: '09:00 - 18:00', Mi: '09:00 - 18:00',
  Do: '09:00 - 18:00', Fr: '09:00 - 18:00', Sa: '09:00 - 18:00',
  So: '09:00 - 18:00',
}

function setzeSalon(patch: Record<string, unknown>) {
  db().rows('salons').forEach(s => {
    if (s.id === IDS.salon) Object.assign(s, patch)
  })
}

function slotsFuer(date: string) {
  return availabilityGet(
    getRequest(
      `https://www.chairmatch.de/api/availability?salonId=${IDS.salon}&serviceId=${IDS.service}&date=${date}`,
    ),
  )
}

function book(over: Record<string, unknown> = {}) {
  return bookingsPost(
    postRequest('https://www.chairmatch.de/api/bookings', {
      salonId: IDS.salon,
      serviceId: IDS.service,
      date: FREE_DAY,
      startTime: '14:00',
      ...over,
    }),
    undefined,
  )
}

function buchungen(): Row[] {
  return db().rows('bookings')
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z')) // 11:00 Berlin
  state.db = createDb()
  enableLiveSchema(state.db)
  state.session = sessionFor('customer')
  setzeSalon({ opening_hours: GANZE_WOCHE })
})

// ────────────────────────────────────────────────────────────────
describe('Slot-Anzeige: gesetzliche Feiertage', () => {
  it('bietet am 1. Weihnachtstag keine Slots an — obwohl es ein Freitag ist', async () => {
    const res = await slotsFuer(WEIHNACHTEN)
    const body = await res.json()

    expect(body.slots).toEqual([])
    expect(body.unavailable).toBe('holiday')
    expect(body.message).toMatch(/Feiertag/i)
  })

  it('Gegenprobe: derselbe Salon, gewoehnlicher Freitag → Slots', async () => {
    // 2026-12-18 ist der Freitag eine Woche vor Weihnachten.
    const body = await (await slotsFuer('2026-12-18')).json()
    expect(body.slots.length).toBeGreaterThan(0)
    expect(body.unavailable).toBeUndefined()
  })

  it('bietet am Tag der Deutschen Einheit keine Slots an', async () => {
    const body = await (await slotsFuer(EINHEIT)).json()
    expect(body.unavailable).toBe('holiday')
  })

  it('sperrt bundesweite Feiertage auch ohne gepflegtes Bundesland', async () => {
    // `salons.state` wird im gesamten Code an KEINER Stelle geschrieben und
    // steht deshalb im Regelfall auf NULL. Der Rueckfall auf die neun
    // bundesweiten Feiertage muss ohne die Spalte greifen.
    setzeSalon({ state: null })
    const body = await (await slotsFuer(WEIHNACHTEN)).json()
    expect(body.unavailable).toBe('holiday')
  })

  it('beachtet Landesfeiertage: Fronleichnam sperrt in Bayern', async () => {
    setzeSalon({ state: 'BY' })
    const body = await (await slotsFuer(FRONLEICHNAM)).json()
    expect(body.unavailable).toBe('holiday')
  })

  it('… und sperrt denselben Tag in Berlin NICHT', async () => {
    setzeSalon({ state: 'BE' })
    const body = await (await slotsFuer(FRONLEICHNAM)).json()
    expect(body.unavailable).toBeUndefined()
    expect(body.slots.length).toBeGreaterThan(0)
  })

  it('versteht auch den ausgeschriebenen Landesnamen', async () => {
    setzeSalon({ state: 'Bayern' })
    const body = await (await slotsFuer(FRONLEICHNAM)).json()
    expect(body.unavailable).toBe('holiday')
  })

  it('macht aus einem unbekannten state keinen geratenen Feiertag', async () => {
    setzeSalon({ state: 'Wolkenkuckucksheim' })
    const body = await (await slotsFuer(FRONLEICHNAM)).json()
    expect(body.unavailable).toBeUndefined()
  })
})

// ────────────────────────────────────────────────────────────────
describe('Buchung: der Riegel sitzt in der Action, nicht in der Anzeige', () => {
  it('weist eine Buchung am Feiertag ab und schreibt KEINE Zeile', async () => {
    const vorher = buchungen().length
    const res = await book({ date: WEIHNACHTEN, startTime: '10:00' })

    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/Feiertag/i)
    expect(buchungen().length).toBe(vorher)
  })

  it('weist eine Buchung ausserhalb der Oeffnungszeiten ab', async () => {
    // Salon: 09:00–18:00. Der Kalender bietet 22:00 nie an — ein direkter
    // POST kam bis Track 25 trotzdem durch.
    const vorher = buchungen().length
    const res = await book({ startTime: '22:00' })

    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/Öffnungszeiten/i)
    expect(buchungen().length).toBe(vorher)
  })

  it('weist eine Buchung ab, die erst NACH Ladenschluss endet', async () => {
    // 17:30 + 60 Minuten = 18:30, der Salon schliesst um 18:00. Geprueft
    // wird das Ende, nicht nur der Beginn.
    const res = await book({ startTime: '17:30' })
    expect(res.status).toBe(409)
  })

  it('laesst den letzten passenden Slot zu (17:00 + 60 = 18:00)', async () => {
    const res = await book({ startTime: '17:00' })
    expect(res.status).toBe(201)
  })

  it('weist einen Tag mit „Geschlossen" ab', async () => {
    setzeSalon({ opening_hours: { ...GANZE_WOCHE, Di: 'Geschlossen' } })
    // FREE_DAY (2026-09-15) ist ein Dienstag.
    const res = await book({ date: FREE_DAY, startTime: '14:00' })

    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/geschlossen/i)
  })

  it('Gegenprobe: innerhalb der Zeiten an einem gewoehnlichen Tag → 201', async () => {
    const res = await book({ startTime: '14:00' })
    expect(res.status).toBe(201)
  })
})

// ────────────────────────────────────────────────────────────────
describe('„Keine Angabe" ist nicht „geschlossen"', () => {
  it('bucht weiter, wenn der Salon gar keine Zeiten gepflegt hat', async () => {
    // Der wichtigste Test dieser Datei: aus fehlenden Stammdaten eine
    // Absage zu machen haette jeden Salon ohne gepflegte Zeiten ueber Nacht
    // stillgelegt.
    setzeSalon({ opening_hours: null })
    const res = await book({ startTime: '22:00' })
    expect(res.status).toBe(201)
  })

  it('bucht weiter, wenn nur DIESER Wochentag fehlt', async () => {
    setzeSalon({ opening_hours: { Mo: '09:00 - 18:00' } })
    const res = await book({ date: FREE_DAY, startTime: '22:00' })
    expect(res.status).toBe(201)
  })

  it('bucht weiter bei unlesbarer Zeitangabe', async () => {
    setzeSalon({ opening_hours: { ...GANZE_WOCHE, Di: 'nach Vereinbarung' } })
    const res = await book({ date: FREE_DAY, startTime: '22:00' })
    expect(res.status).toBe(201)
  })

  it('der Feiertag sperrt aber AUCH ohne gepflegte Zeiten', async () => {
    setzeSalon({ opening_hours: null })
    const res = await book({ date: WEIHNACHTEN, startTime: '10:00' })
    expect(res.status).toBe(409)
  })
})

// ────────────────────────────────────────────────────────────────
/**
 * Die Datenform, die live wirklich in `salons.opening_hours` steht — und der
 * Serverfehler, den sie ausgeloest hat.
 *
 * Sonde vom 29.08.2026 gegen www.chairmatch.de (Salon „NailLab by Lena",
 * fuenf von fuenf gepruefte Salons in dieser Form):
 *
 *     GET /api/availability?salonId=…&serviceId=…&date=2026-09-15  →  500
 *     GET /api/availability?salonId=…&serviceId=…&date=2026-12-25  →  200
 *
 * Der Unterschied war der Hinweis: die Feiertagspruefung steht VOR der
 * Zeitendeutung und kehrt am 25.12. frueh zurueck. An jedem gewoehnlichen
 * Werktag lief die Route dagegen in `parseHours(objekt)` — `if (!hours)`
 * faellt bei einem Objekt nicht, `.match` gibt es darauf nicht, und um den
 * GET-Rumpf liegt kein try/catch.
 *
 * Das ist nicht ein Randfall, sondern der ganze Buchungskalender dieser
 * Salons.
 */
const LIVE_OEFFNUNGSZEITEN = {
  mo: { open: '09:00', close: '18:00' },
  di: { open: '09:00', close: '18:00' },
  mi: { open: '09:00', close: '18:00' },
  do: { open: '09:00', close: '20:00' },
  fr: { open: '09:00', close: '18:00' },
  sa: { open: '09:00', close: '14:00' },
  so: null,
}

describe('Live-Datenform { open, close } — Regression zum 500er', () => {
  beforeEach(() => {
    setzeSalon({ opening_hours: LIVE_OEFFNUNGSZEITEN })
  })

  it('antwortet an einem gewoehnlichen Dienstag mit 200 und echten Slots', async () => {
    const res = await slotsFuer(FREE_DAY) // 2026-09-15, Dienstag

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.slots.length).toBeGreaterThan(0)
    expect(body.slots).toContain('09:00')
    expect(body.slots).not.toContain('17:30') // 17:30 + 60 laege nach 18:00
  })

  it('beachtet die abweichende Donnerstagszeit (bis 20:00)', async () => {
    const body = await (await slotsFuer('2026-09-17')).json() // Donnerstag
    expect(body.slots).toContain('19:00') // 19:00 + 60 = 20:00
  })

  it('bietet am Sonntag („so": null) nichts an', async () => {
    const body = await (await slotsFuer('2026-09-20')).json()
    expect(body.slots).toEqual([])
  })

  it('sperrt den Feiertag auch in dieser Form', async () => {
    const body = await (await slotsFuer(WEIHNACHTEN)).json()
    expect(body.unavailable).toBe('holiday')
  })

  it('weist eine Buchung ausserhalb dieser Zeiten ab', async () => {
    const res = await book({ date: FREE_DAY, startTime: '19:00' }) // Di bis 18:00
    expect(res.status).toBe(409)
  })

  it('nimmt eine Buchung innerhalb an', async () => {
    const res = await book({ date: FREE_DAY, startTime: '10:00' })
    expect(res.status).toBe(201)
  })
})
