// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { fakeDb } from '@/test/fake-supabase'
import { applyLiveSchema } from '@/test/live-schema'
import type { RentalRevenueResponse } from '@/modules/rentals/rental-listing.types'

/**
 * GET /api/me/rental-revenue — echte Miet-Einnahmen des Vermieters.
 *
 * Die Umsatzseite hat bis 2026-08-27 JEDEM Vermieter erfundene Zahlen als
 * seine eigenen gezeigt, weil ihre Ladefunktion `supabase.auth.getSession()`
 * benutzte — und die ist bei NextAuth-Anmeldung immer leer. Diese Route ist
 * der Ersatz; getestet wird, dass sie
 *
 *   1. ohne Session gar nichts herausgibt,
 *   2. NUR die Buchungen der eigenen Mietobjekte liefert,
 *   3. Stornos als "kein Umsatz" markiert statt sie mitzuzaehlen,
 *   4. leere Faelle als leer meldet — und nicht als Beispiel,
 *   5. `rental_bookings` ueber `equipment_id` einschraenkt: die Tabelle hat
 *      live KEINE `salon_id` (42703), ein Filter darauf wuerde die Route
 *      kippen. applyLiveSchema setzt das hier durch.
 */

const auth = vi.hoisted(() => ({
  session: null as { user?: { id?: string } } | null,
}))

vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => auth.session,
}))

vi.mock('@/lib/supabase-server', async () => {
  const { fakeDb: db } = await import('@/test/fake-supabase')
  return { getSupabaseAdmin: () => db }
})

const OWNER = '11111111-1111-4111-8111-111111111111'
const FREMDER = '22222222-2222-4222-8222-222222222222'
const SALON = '33333333-3333-4333-8333-333333333333'
const SALON_FREMD = '44444444-4444-4444-8444-444444444444'
const EQ_EIGEN = '55555555-5555-4555-8555-555555555555'
const EQ_FREMD = '66666666-6666-4666-8666-666666666666'

type Get = () => Promise<Response>
let GET: Get

beforeAll(async () => {
  GET = (await import('@/app/api/me/rental-revenue/route')).GET as unknown as Get
})

function seed() {
  fakeDb.reset()
  applyLiveSchema(fakeDb)
  auth.session = { user: { id: OWNER } }

  fakeDb.seed('salons', [
    { id: SALON, owner_id: OWNER, name: 'Salon Nord', city: 'Köln' },
    { id: SALON_FREMD, owner_id: FREMDER, name: 'Fremder Salon', city: 'Berlin' },
  ])
  fakeDb.seed('rental_equipment', [
    { id: EQ_EIGEN, salon_id: SALON, name: 'Stuhl am Fenster', price_per_day_cents: 9000, is_available: true },
    { id: EQ_FREMD, salon_id: SALON_FREMD, name: 'Fremder Stuhl', price_per_day_cents: 7000, is_available: true },
  ])
  fakeDb.seed('rental_bookings', [
    {
      id: 'b-eigen-1', equipment_id: EQ_EIGEN, renter_id: FREMDER,
      start_date: '2026-08-01', end_date: '2026-08-03',
      total_cents: 27000, status: 'confirmed', payment_status: 'paid',
    },
    {
      id: 'b-eigen-storno', equipment_id: EQ_EIGEN, renter_id: FREMDER,
      start_date: '2026-08-10', end_date: '2026-08-11',
      total_cents: 18000, status: 'cancelled', payment_status: 'refunded',
    },
    {
      id: 'b-fremd', equipment_id: EQ_FREMD, renter_id: OWNER,
      start_date: '2026-08-05', end_date: '2026-08-06',
      total_cents: 14000, status: 'confirmed', payment_status: 'paid',
    },
  ])
}

async function call(): Promise<{ status: number; body: RentalRevenueResponse & { error?: string } }> {
  const res = await GET()
  return { status: res.status, body: (await res.json()) as RentalRevenueResponse & { error?: string } }
}

beforeEach(seed)

describe('GET /api/me/rental-revenue', () => {
  it('antwortet ohne Session mit 401 statt mit Zahlen', async () => {
    auth.session = null
    const { status, body } = await call()
    expect(status).toBe(401)
    expect(body.bookings).toBeUndefined()
  })

  it('liefert nur Buchungen der eigenen Mietobjekte', async () => {
    const { status, body } = await call()
    expect(status).toBe(200)
    expect(body.hasSalon).toBe(true)
    expect(body.equipment.map((e) => e.id)).toEqual([EQ_EIGEN])
    expect(body.bookings.map((b) => b.id).sort()).toEqual(['b-eigen-1', 'b-eigen-storno'])
    expect(body.bookings.some((b) => b.id === 'b-fremd')).toBe(false)
  })

  it('markiert Stornos als „kein Umsatz"', async () => {
    const { body } = await call()
    const bezahlt = body.bookings.find((b) => b.id === 'b-eigen-1')!
    const storno = body.bookings.find((b) => b.id === 'b-eigen-storno')!
    expect(bezahlt.countsAsRevenue).toBe(true)
    expect(storno.countsAsRevenue).toBe(false)
    // Der Betrag bleibt sichtbar — nur eben nicht als Einnahme.
    expect(storno.totalCents).toBe(18000)
  })

  it('gibt Betraege in Cent weiter, ohne sie zu runden', async () => {
    const { body } = await call()
    expect(body.bookings.find((b) => b.id === 'b-eigen-1')!.totalCents).toBe(27000)
  })

  it('meldet „kein Salon" als leer — nicht als Beispieldaten', async () => {
    fakeDb.tables['salons'] = []
    const { status, body } = await call()
    expect(status).toBe(200)
    expect(body.hasSalon).toBe(false)
    expect(body.equipment).toEqual([])
    expect(body.bookings).toEqual([])
  })

  it('meldet „kein Mietobjekt" als leer', async () => {
    fakeDb.tables['rental_equipment'] = []
    const { body } = await call()
    expect(body.hasSalon).toBe(true)
    expect(body.equipment).toEqual([])
    expect(body.bookings).toEqual([])
  })

  it('meldet „keine Buchung" als leere Liste, nicht als Umsatz', async () => {
    fakeDb.tables['rental_bookings'] = []
    const { body } = await call()
    expect(body.equipment).toHaveLength(1)
    expect(body.bookings).toEqual([])
  })

  it('reicht einen DB-Fehler als 500 durch, statt still leer zu antworten', async () => {
    fakeDb.failOn('rental_bookings.select', { code: '42501', message: 'permission denied' })
    const { status, body } = await call()
    expect(status).toBe(500)
    expect(body.bookings).toBeUndefined()
  })

  it('filtert die Buchungen ueber equipment_id — rental_bookings hat live keine salon_id', async () => {
    // Waere im Code `.eq('salon_id', …)` gelandet, liefe die Abfrage unter
    // applyLiveSchema in 42703 und die Route antwortete mit 500.
    const { status, body } = await call()
    expect(status).toBe(200)
    expect(body.bookings.length).toBeGreaterThan(0)
  })
})
