// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { fakeDb, type Row } from '@/test/fake-supabase'
import { applyLiveSchema } from '@/test/live-schema'
import { berlinToday } from '@/lib/berlin-time'

/**
 * Storno einer Miet-Buchung — die Kette, die es bis Track 12 gar nicht gab.
 *
 * Der Payout-Cron haelt das Geld bis zum Mietbeginn zurueck und begruendet das
 * ausdruecklich damit, dass es „Mieter bei No-Show/Storno vor Mietantritt
 * schuetzt". Das Zurueckhalten gab es. Den Storno nicht: unter
 * /api/rental-bookings lagen nur POST und GET, einen `[id]`-Handler gab es
 * nicht. Wer bezahlt hatte, kam aus der Buchung nicht mehr heraus — und am
 * Starttag zahlte der Cron aus.
 *
 * Gemockt sind nur die Prozessgrenzen: Session und der Stripe-Refund.
 * Datenbank, Berechtigungspruefung, Fristlogik und Audit-Log laufen echt
 * gegen das Produktionsschema (`applyLiveSchema`) — eine Spalte, die es live
 * nicht gibt, faellt damit auf. Genau darauf kommt es hier an:
 * `cancelled_at`, `cancellation_reason` und `refund_cents` existieren an
 * `rental_bookings` NICHT (Spaltensonde 2026-08-28).
 */

const auth = vi.hoisted(() => ({
  session: null as { user?: { id?: string; role?: string } } | null,
}))

const stripe = vi.hoisted(() => ({
  refunds: [] as string[],
  konfiguriert: true,
  /** 'ok' = Erstattung geht durch, 'fehler' = Stripe lehnt ab */
  modus: 'ok' as 'ok' | 'fehler',
}))

vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => auth.session,
}))

vi.mock('@/lib/supabase-server', async () => {
  const { fakeDb: db } = await import('@/test/fake-supabase')
  return { getSupabaseAdmin: () => db }
})

vi.mock('@/lib/stripe', () => ({
  isStripeConfigured: () => stripe.konfiguriert,
  createRefund: async (paymentIntent: string) => {
    if (stripe.modus === 'fehler') throw new Error('Stripe: charge already refunded')
    stripe.refunds.push(paymentIntent)
    return { id: 're_test', payment_intent: paymentIntent }
  },
}))

// ── Fixtures ────────────────────────────────────────────────────────────────

const RENTER_ID = '11111111-1111-4111-8111-111111111111'
const OWNER_ID = '22222222-2222-4222-8222-222222222222'
const STRANGER_ID = '99999999-9999-4999-8999-999999999999'
const ADMIN_ID = '88888888-8888-4888-8888-888888888888'
const SALON_ID = '33333333-3333-4333-8333-333333333333'
const EQUIPMENT_ID = '44444444-4444-4444-8444-444444444444'
const RENTAL_ID = '55555555-5555-4555-8555-555555555555'
const PAYMENT_INTENT = 'pi_miete_bezahlt'

type Handler = (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>
let cancelRental: Handler

beforeAll(async () => {
  const mod = await import('@/app/api/rental-bookings/[id]/cancel/route')
  cancelRental = mod.POST as unknown as Handler
})

/**
 * Tage relativ zu heute, als ISO-Datum — dieselbe Form wie `start_date`.
 *
 * Anker ist bewusst `berlinToday()` und nicht der UTC-Kalender: die Route
 * vergleicht `start_date` gegen den Berliner Kalendertag. Zwischen
 * Mitternacht und 02:00 Berliner Zeit sind beide Kalender einen Tag
 * auseinander — mit `new Date().setUTCDate(...)` schlug „am Tag vor dem
 * Mietbeginn" in diesem Zeitfenster fehl, und zwar nur dort.
 */
function tag(versatz: number): string {
  const [y, m, d] = berlinToday().split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + versatz)).toISOString().slice(0, 10)
}

function seedRental(overrides: Row = {}): Row {
  const row: Row = {
    id: RENTAL_ID,
    equipment_id: EQUIPMENT_ID,
    renter_id: RENTER_ID,
    start_date: tag(7),
    end_date: tag(9),
    total_cents: 12000,
    status: 'confirmed',
    payment_status: 'paid',
    stripe_session_id: 'cs_test',
    stripe_payment_intent: PAYMENT_INTENT,
    created_at: '2026-08-01T10:00:00.000Z',
    updated_at: '2026-08-01T10:00:00.000Z',
    // Eingebettet, weil der Fake keine Joins kann — der Produktivcode liest
    // genau diese Form (`select('…, rental_equipment(name, salons(owner_id))')`).
    rental_equipment: {
      id: EQUIPMENT_ID,
      name: 'Friseur-Stuhl am Fenster',
      salons: { id: SALON_ID, name: 'Salon Nord', owner_id: OWNER_ID },
    },
    ...overrides,
  }
  fakeDb.rows('rental_bookings').push(row)
  return row
}

function request(body?: unknown): NextRequest {
  return {
    url: `https://www.chairmatch.de/api/rental-bookings/${RENTAL_ID}/cancel`,
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => {
      if (body === undefined) throw new Error('no body')
      return body
    },
  } as unknown as NextRequest
}

const ctx = (id: string = RENTAL_ID) => ({ params: Promise.resolve({ id }) })

async function ruf(body?: unknown, id?: string) {
  const res = await cancelRental(request(body), ctx(id))
  return { status: res.status, json: (await res.json()) as Record<string, unknown> }
}

const buchung = () => fakeDb.rows('rental_bookings')[0]
const logs = () => fakeDb.rows('audit_logs')

beforeEach(() => {
  fakeDb.reset()
  applyLiveSchema(fakeDb)
  stripe.refunds.length = 0
  stripe.konfiguriert = true
  stripe.modus = 'ok'
  auth.session = { user: { id: RENTER_ID } }
})

// ── 1. Berechtigung ─────────────────────────────────────────────────────────

describe('Berechtigung', () => {
  it('weist ohne Session 401 zurueck', async () => {
    seedRental()
    auth.session = null
    expect((await ruf()).status).toBe(401)
    expect(buchung().status).toBe('confirmed')
  })

  it('weist Fremde 403 zurueck — die Buchung bleibt unangetastet', async () => {
    seedRental()
    auth.session = { user: { id: STRANGER_ID } }
    const { status } = await ruf()
    expect(status).toBe(403)
    expect(buchung().status).toBe('confirmed')
    expect(stripe.refunds).toEqual([])
  })

  it('meldet 404 fuer eine unbekannte Buchung', async () => {
    seedRental()
    expect((await ruf(undefined, '66666666-6666-4666-8666-666666666666')).status).toBe(404)
  })

  it.each([
    ['Mieter', () => RENTER_ID, 'renter'],
    ['Vermieter', () => OWNER_ID, 'owner'],
  ])('laesst %s stornieren', async (_name, id, actor) => {
    seedRental()
    auth.session = { user: { id: id() } }
    const { status, json } = await ruf()
    expect(status).toBe(200)
    expect(json.actor).toBe(actor)
    expect(buchung().status).toBe('cancelled')
  })

  it('laesst Admins stornieren, auch ohne Beziehung zur Buchung', async () => {
    seedRental()
    auth.session = { user: { id: ADMIN_ID, role: 'admin' } }
    const { status, json } = await ruf()
    expect(status).toBe(200)
    expect(json.actor).toBe('admin')
  })
})

// ── 2. Zustand und Frist ────────────────────────────────────────────────────

describe('Zustand und Frist', () => {
  it('lehnt eine bereits stornierte Buchung ab', async () => {
    seedRental({ status: 'cancelled' })
    const { status, json } = await ruf()
    expect(status).toBe(409)
    expect(String(json.error)).toContain('bereits storniert')
    expect(stripe.refunds).toEqual([])
  })

  it.each(['active', 'completed'])('verweist bei Status %s auf den Support', async (status) => {
    seedRental({ status })
    const res = await ruf()
    expect(res.status).toBe(409)
    expect(String(res.json.error)).toContain('Support')
    expect(stripe.refunds).toEqual([])
  })

  it.each([
    ['heute', 0],
    ['gestern', -1],
    ['vor einer Woche', -7],
  ])('storniert nicht mehr, wenn der Zeitraum %s begonnen hat', async (_name, versatz) => {
    seedRental({ start_date: tag(versatz), end_date: tag(versatz + 3) })
    const { status, json } = await ruf()
    expect(status).toBe(409)
    expect(String(json.error)).toContain('begonnen')
    expect(buchung().status).toBe('confirmed')
    expect(stripe.refunds).toEqual([])
  })

  it('storniert am Tag vor dem Mietbeginn noch', async () => {
    seedRental({ start_date: tag(1), end_date: tag(3) })
    expect((await ruf()).status).toBe(200)
  })
})

// ── 3. Erstattung ───────────────────────────────────────────────────────────

describe('Erstattung', () => {
  it('erstattet den vollen Betrag und setzt payment_status auf refunded', async () => {
    seedRental()
    const { status, json } = await ruf({ reason: 'Termin verschoben' })

    expect(status).toBe(200)
    expect(json.refunded).toBe(true)
    expect(stripe.refunds).toEqual([PAYMENT_INTENT])
    expect(buchung().status).toBe('cancelled')
    expect(buchung().payment_status).toBe('refunded')
  })

  it('erfindet keine Stornogebuehr — es gibt nur voll oder gar nicht', async () => {
    seedRental()
    await ruf()
    // `createRefund(paymentIntent)` OHNE Betrag = vollstaendige Erstattung.
    // Ein Teilbetrag waere eine Zahl, die in keiner Tabelle steht:
    // `rental_bookings` fuehrt live weder `refund_cents` noch eine
    // Gebuehrenspalte (Spaltensonde 2026-08-28).
    expect(stripe.refunds).toEqual([PAYMENT_INTENT])
    const log = logs().find((l) => l.action === 'rental_booking_cancelled')
    expect((log?.details as Record<string, unknown>).total_cents).toBe(12000)
  })

  it('erstattet nichts bei einer unbezahlten Buchung — storniert aber trotzdem', async () => {
    seedRental({ status: 'pending', payment_status: 'unpaid', stripe_payment_intent: null })
    const { status, json } = await ruf()
    expect(status).toBe(200)
    expect(json.refunded).toBe(false)
    expect(stripe.refunds).toEqual([])
    expect(buchung().status).toBe('cancelled')
    expect(buchung().payment_status).toBe('unpaid')
  })

  it('storniert NICHT, wenn die Erstattung scheitert', async () => {
    // Der schlechteste aller Zustaende waere eine stornierte Buchung ohne Geld
    // zurueck — dann haette der Mieter weder Termin noch Betrag.
    seedRental()
    stripe.modus = 'fehler'
    const { status, json } = await ruf()

    expect(status).toBe(502)
    expect(String(json.error)).toContain('NICHT storniert')
    expect(buchung().status).toBe('confirmed')
    expect(buchung().payment_status).toBe('paid')
  })

  it('erstattet nichts, was der Anbieter schon hat', async () => {
    seedRental()
    fakeDb.seed('platform_transactions', [
      {
        id: 'tx-1',
        rental_id: RENTAL_ID,
        type: 'chair_rental',
        status: 'succeeded',
        stripe_transfer_id: 'tr_bereits_ausgezahlt',
        stripe_payment_intent_id: PAYMENT_INTENT,
        provider_share_cents: 10800,
      },
    ])

    const { status, json } = await ruf()
    expect(status).toBe(409)
    expect(String(json.error)).toContain('Auszahlung')
    expect(stripe.refunds).toEqual([])
    expect(buchung().status).toBe('confirmed')
  })

  it('zieht die offene Plattform-Transaktion auf refunded nach', async () => {
    seedRental()
    fakeDb.seed('platform_transactions', [
      {
        id: 'tx-1',
        rental_id: RENTAL_ID,
        type: 'chair_rental',
        status: 'succeeded',
        stripe_transfer_id: null,
        stripe_payment_intent_id: PAYMENT_INTENT,
        provider_share_cents: 10800,
      },
    ])

    expect((await ruf()).status).toBe(200)
    // Ohne dieses Nachziehen bliebe die Zeile ein auszahlungsfaehiger
    // Kandidat im Payout-Cron: der filtert auf status 'succeeded' und
    // `stripe_transfer_id is null`.
    expect(fakeDb.rows('platform_transactions')[0].status).toBe('refunded')
  })

  it('storniert ohne Zahlungsreferenz und sagt, dass von Hand erstattet werden muss', async () => {
    seedRental({ stripe_payment_intent: null })
    const { status, json } = await ruf()

    expect(status).toBe(200)
    expect(json.refunded).toBe(false)
    expect(String(json.refundNote)).toContain('von Hand')
    expect(buchung().status).toBe('cancelled')
    // Der Zahlungsstatus bleibt 'paid' — er waere sonst gelogen.
    expect(buchung().payment_status).toBe('paid')
  })

  it('loest ohne konfiguriertes Stripe keine Erstattung aus', async () => {
    seedRental()
    stripe.konfiguriert = false
    const { status, json } = await ruf()
    expect(status).toBe(200)
    expect(json.refunded).toBe(false)
    expect(String(json.refundNote)).toContain('Stripe')
    expect(stripe.refunds).toEqual([])
  })
})

// ── 4. Protokoll und Benachrichtigung ───────────────────────────────────────

describe('Protokoll', () => {
  it('haelt Grund und Rolle im Audit-Log fest — nicht an der Buchung', async () => {
    seedRental()
    await ruf({ reason: 'Krankheit' })

    const log = logs().find((l) => l.action === 'rental_booking_cancelled')
    expect(log).toBeTruthy()
    const details = log?.details as Record<string, unknown>
    expect(details.reason).toBe('Krankheit')
    expect(details.actor).toBe('renter')
    expect(details.refunded).toBe(true)

    // `cancellation_reason` gibt es an `rental_bookings` live NICHT — ein
    // Schreibversuch waere unter `applyLiveSchema` ein 42703 und haette den
    // Storno oben scheitern lassen.
    expect(buchung().cancellation_reason).toBeUndefined()
  })

  it('kuerzt einen ueberlangen Grund, statt ihn abzuweisen', async () => {
    seedRental()
    await ruf({ reason: 'x'.repeat(2000) })
    const log = logs().find((l) => l.action === 'rental_booking_cancelled')
    expect(String((log?.details as Record<string, unknown>).reason)).toHaveLength(500)
  })

  it('kommt ohne Body aus', async () => {
    seedRental()
    const { status } = await ruf()
    expect(status).toBe(200)
    const log = logs().find((l) => l.action === 'rental_booking_cancelled')
    expect((log?.details as Record<string, unknown>).reason).toBeNull()
  })

  it('benachrichtigt beide Seiten', async () => {
    seedRental()
    await ruf()
    const empfaenger = fakeDb.rows('notification_log').map((n) => n.user_id).sort()
    expect(empfaenger).toEqual([RENTER_ID, OWNER_ID].sort())
  })
})
