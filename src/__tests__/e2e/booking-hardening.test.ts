// @vitest-environment node
/**
 * E2E: Buchungssystem gehaertet (Track 6).
 *
 * Die Kette laeuft echt — Route → Action → Service → Fake-Datenbank — und
 * zwar mit eingeschaltetem Produktionsschema. Das ist der Punkt: bis Track 6
 * konnte diese Harness gar nicht pruefen, ob eine Spalte existiert. Genau
 * diese Luecke hat im Nachrichten-System dazu gefuehrt, dass eine gruene Suite
 * einen live komplett toten Pfad gedeckt hat.
 *
 * Geprueft wird, was vorher niemand geprueft hat:
 *   - Termine in der Vergangenheit
 *   - Termine ueber Mitternacht
 *   - eine ausgefallene Belegungsabfrage (fail-closed statt fail-open)
 *   - der EXCLUDE-Constraint, sobald er eingespielt ist (23P01)
 *   - die Stornofrist, die beim Stornieren nie abgefragt wurde
 *   - die Anbieter-Sicht auf die eigenen Termine
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createDb,
  sessionFor,
  postRequest,
  getRequest,
  ctx,
  enableLiveSchema,
  enableBookingOverlapConstraint,
  IDS,
  FREE_DAY,
  BUSY_DAY,
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

import { POST as bookingsPost, GET as bookingsGet } from '@/app/api/bookings/route'
import { POST as cancelPost } from '@/app/api/bookings/[id]/cancel/route'

function db(): FakeSupabase {
  return state.db
}

const URL_BOOKINGS = 'https://www.chairmatch.de/api/bookings'

function book(body: Record<string, unknown>) {
  return bookingsPost(postRequest(URL_BOOKINGS, body), undefined)
}

function listBookings(query = '') {
  return bookingsGet(getRequest(`${URL_BOOKINGS}${query}`), undefined)
}

function cancel(id: string, body: Record<string, unknown> = {}) {
  return cancelPost(postRequest(`${URL_BOOKINGS}/${id}/cancel`, body), ctx({ id }))
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

function buchungen(): Row[] {
  return db().rows('bookings')
}

function letzterAuditEintrag(action: string): Row | undefined {
  return [...db().rows('audit_logs')].reverse().find(r => r.action === action)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  // 01.09.2026, 09:00 UTC = 11:00 Berliner Zeit.
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))
  state.db = createDb()
  enableLiveSchema(state.db)
  state.session = sessionFor('customer')
})

// ────────────────────────────────────────────────────────────────
describe('Das Produktionsschema ist in dieser Kette wirklich scharf', () => {
  it('nimmt die Buchung an — der INSERT benutzt nur Spalten, die live existieren', async () => {
    const vorher = buchungen().length
    const res = await book(gueltig())

    expect(res.status).toBe(201)
    expect(buchungen().length).toBe(vorher + 1)
  })

  it('weist eine erfundene Spalte mit 42703 ab (Gegenprobe zur Schaerfe)', async () => {
    const { error } = await db().from('bookings').insert({
      customer_id: IDS.customer,
      salon_id: IDS.salon,
      gibtesnicht: 'x',
    })
    expect(error?.code).toBe('42703')
  })

  it('weist eine vergessene NOT-NULL-Spalte mit 23502 ab (Gegenprobe)', async () => {
    // Die Pruefung, die im Nachrichten-System gefehlt hat: eine Spaltenliste
    // faengt die erfundene Spalte, aber nicht die vergessene.
    db().defineNotNull('bookings', ['customer_id', 'salon_id'])
    const { error } = await db().from('bookings').insert({ customer_id: IDS.customer })
    expect(error?.code).toBe('23502')
  })

  it('faengt eine erfundene Spalte auch beim Lesen (42703)', async () => {
    const { error } = await db().from('bookings').select('id, cancellation_fee_cents')
    expect(error?.code).toBe('42703')
  })
})

// ────────────────────────────────────────────────────────────────
describe('Termine in der Vergangenheit', () => {
  it('lehnt einen Termin von gestern ab und schreibt nichts', async () => {
    const vorher = buchungen().length

    const res = await book(gueltig({ date: '2026-08-31', startTime: '14:00' }))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Vergangenheit/i)
    expect(buchungen().length).toBe(vorher)
  })

  it('lehnt einen Termin von heute Morgen ab (es ist 11:00 Berliner Zeit)', async () => {
    const res = await book(gueltig({ date: '2026-09-01', startTime: '09:00' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Vergangenheit/i)
  })

  it('nimmt einen Termin von heute Nachmittag an', async () => {
    const res = await book(gueltig({ date: '2026-09-01', startTime: '16:00' }))
    expect(res.status).toBe(201)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Termine ueber Mitternacht', () => {
  it('lehnt einen Termin ab, dessen Ende auf den naechsten Tag fiele', async () => {
    // Damenhaarschnitt dauert 60 Minuten; 23:30 + 60 ergaebe '24:30:00'.
    const vorher = buchungen().length

    const res = await book(gueltig({ startTime: '23:30' }))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Mitternacht/i)
    expect(buchungen().length).toBe(vorher)
  })

  it('laesst einen Termin zu, der genau um Mitternacht endet', async () => {
    const res = await book(gueltig({ startTime: '23:00' }))
    expect(res.status).toBe(201)
    expect(buchungen().at(-1)?.end_time).toBe('24:00:00')
  })
})

// ────────────────────────────────────────────────────────────────
describe('Belegungspruefung faellt geschlossen aus', () => {
  it('bucht NICHT, wenn die Belegungsabfrage fehlschlaegt', async () => {
    // Vorher hiess ein Lesefehler "kein Konflikt" — die Ueberschneidungs-
    // pruefung war damit genau dann wirkungslos, wenn die Datenbank hakt.
    const vorher = buchungen().length
    db().failOn('bookings', 'select', {
      code: '08006', message: 'connection failure', details: null, hint: null,
    }, false)

    const res = await book(gueltig())

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/belegt/i)
    expect(buchungen().length).toBe(vorher)
  })

  it('erkennt eine Ueberschneidung mit einer Bestandsbuchung', async () => {
    // Bestand: BUSY_DAY 10:00-11:00.
    const res = await book(gueltig({ date: BUSY_DAY, startTime: '10:30' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/belegt/i)
  })

  it('laesst einen Termin direkt im Anschluss zu', async () => {
    const res = await book(gueltig({ date: BUSY_DAY, startTime: '11:00' }))
    expect(res.status).toBe(201)
  })
})

// ────────────────────────────────────────────────────────────────
describe('EXCLUDE-Constraint bookings_no_overlap', () => {
  it('macht aus 23P01 "Zeitslot belegt" statt "konnte nicht erstellt werden"', async () => {
    enableBookingOverlapConstraint(db())

    // Der SELECT sieht den Bestand nicht (die Zeile entsteht erst zwischen
    // Pruefung und Insert) — genau das Rennen, das der Constraint abfaengt.
    db().failOn('bookings', 'select', { code: 'PGRST116', message: 'no rows', details: null, hint: null }, true)

    const res = await book(gueltig({ date: BUSY_DAY, startTime: '10:30' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/belegt/i)
    expect(body.error).not.toMatch(/konnte nicht erstellt/i)
  })

  it('gibt bei 23P01 den belegten Rabatt-Platz wieder frei', async () => {
    enableBookingOverlapConstraint(db())
    const vorher = Number(db().rows('promo_codes').find(p => p.code === 'SOMMER10')?.used_count)

    await book(gueltig({ date: BUSY_DAY, startTime: '10:30', promoCode: 'SOMMER10' }))

    const nachher = Number(db().rows('promo_codes').find(p => p.code === 'SOMMER10')?.used_count)
    expect(nachher).toBe(vorher)
  })

  it('laesst eine ueberschneidungsfreie Buchung auch mit Constraint durch', async () => {
    enableBookingOverlapConstraint(db())
    const res = await book(gueltig({ date: BUSY_DAY, startTime: '12:00' }))
    expect(res.status).toBe(201)
  })

  it('blockiert eine stornierte Bestandsbuchung nicht', async () => {
    enableBookingOverlapConstraint(db())
    db().rows('bookings').forEach(b => { if (b.id === IDS.bookingConfirmed) b.status = 'cancelled' })

    const res = await book(gueltig({ date: BUSY_DAY, startTime: '10:30' }))
    expect(res.status).toBe(201)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Stornofrist', () => {
  /** Legt eine eigene Buchung zu diesem Zeitpunkt an und gibt ihre id zurueck. */
  async function eigeneBuchung(date: string, startTime: string): Promise<string> {
    const res = await book(gueltig({ date, startTime }))
    expect(res.status).toBe(201)
    return (await res.json()).bookingId as string
  }

  it('meldet eine fristgerechte Absage als kostenfrei', async () => {
    // Salon-Policy im Fixture: 48 Stunden. FREE_DAY ist zwei Wochen entfernt.
    const id = await eigeneBuchung(FREE_DAY, '14:00')

    const res = await cancel(id)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.freeOfCharge).toBe(true)
    expect(body.deadlinePassed).toBe(false)
    expect(body.cancellationHours).toBe(48)
  })

  it('meldet eine verspaetete Absage als Fristueberschreitung', async () => {
    // Termin heute 16:00, jetzt 11:00 -> 5 Stunden, Frist 48.
    const id = await eigeneBuchung('2026-09-01', '16:00')

    const res = await cancel(id, { reason: 'Kurzfristig verhindert' })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.freeOfCharge).toBe(false)
    expect(body.deadlinePassed).toBe(true)
  })

  it('storniert trotz gerissener Frist wirklich — die Frist verbietet nichts', async () => {
    const id = await eigeneBuchung('2026-09-01', '16:00')
    await cancel(id)

    expect(db().rows('bookings').find(b => b.id === id)?.status).toBe('cancelled')
  })

  it('haelt die Fristlage im Audit-Log fest', async () => {
    const id = await eigeneBuchung('2026-09-01', '16:00')
    await cancel(id)

    const eintrag = letzterAuditEintrag('BOOKING_CANCELLED')
    const details = eintrag?.details as Record<string, unknown>
    expect(details.cancellationHours).toBe(48)
    expect(details.deadlinePassed).toBe(true)
    expect(details.freeOfCharge).toBe(false)
    expect(Number(details.hoursBeforeStart)).toBeCloseTo(5, 1)
  })

  it('nennt keinen Gebuehrenbetrag — dafuer gibt es keine Spalte', async () => {
    const id = await eigeneBuchung('2026-09-01', '16:00')
    const body = await (await cancel(id)).json()

    expect(body).not.toHaveProperty('feeCents')
    expect(body).not.toHaveProperty('cancellationFeeCents')
    // Und es wurde auch nichts an die Buchung geschrieben, das es nicht gibt.
    expect(db().rows('bookings').find(b => b.id === id)).not.toHaveProperty('cancellation_fee_cents')
  })

  it('faellt auf 24 Stunden zurueck, wenn der Salon keine Frist hinterlegt hat', async () => {
    db().replace('booking_policies', [])
    const id = await eigeneBuchung(FREE_DAY, '14:00')

    const body = await (await cancel(id)).json()
    expect(body.cancellationHours).toBe(24)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Wer welche Termine sieht', () => {
  it('gibt dem Kunden nur seine eigenen Termine', async () => {
    const res = await listBookings()
    const liste = await res.json()

    expect(res.status).toBe(200)
    expect(liste.length).toBeGreaterThan(0)
    expect(liste.every((b: Row) => b.customer_id === IDS.customer)).toBe(true)
  })

  it('gibt dem Saloninhaber die Termine seines Salons', async () => {
    state.session = sessionFor('owner')

    const res = await listBookings(`?salonId=${IDS.salon}`)
    const liste = await res.json()

    expect(res.status).toBe(200)
    expect(liste.length).toBeGreaterThan(0)
    expect(liste.every((b: Row) => b.salon_id === IDS.salon)).toBe(true)
  })

  it('gibt einem fremden Nutzer die Termine dieses Salons NICHT', async () => {
    state.session = sessionFor('otherCustomer')

    const res = await listBookings(`?salonId=${IDS.salon}`)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('laesst einen Kunden nicht ueber salonId an fremde Termine kommen', async () => {
    // Der Kunde hat selbst eine Buchung in diesem Salon — trotzdem darf die
    // Salon-Sicht ihm nicht die Termine der anderen Kundschaft zeigen.
    const res = await listBookings(`?salonId=${IDS.salon}`)
    expect(await res.json()).toEqual([])
  })

  it('verlangt eine Session', async () => {
    state.session = null
    const res = await listBookings()
    expect(res.status).toBe(401)
  })

  it('liefert dem Anbieter den Kundennamen mit', async () => {
    state.session = sessionFor('owner')
    const liste = await (await listBookings(`?salonId=${IDS.salon}`)).json()
    expect(liste[0]?.customer?.full_name).toBe('Lena Kundin')
  })
})
