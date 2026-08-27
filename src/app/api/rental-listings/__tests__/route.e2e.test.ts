// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { fakeDb } from '@/test/fake-supabase'
import { applyLiveSchema } from '@/test/live-schema'
import type { RentalListing } from '@/modules/rentals/rental-listing.types'

/**
 * GET /api/rental-listings — die oeffentliche Inseratssuche.
 *
 * Diese Route ist der Ersatz fuer eine Browser-Abfrage, die live an
 * `salons` scheiterte (42501, permission denied for function
 * is_admin_or_super) und deren `catch`-Zweig sechs erfundene Inserate
 * auslieferte. Getestet wird deshalb vor allem, was NICHT passiert:
 *
 *   1. Es kommt genau das zurueck, was in der Datenbank steht — kein
 *      Ersatzbestand, auch nicht bei einem DB-Fehler.
 *   2. Nicht gepflegte Preise bleiben null (die alte Seite rechnete sich
 *      einen Stundenpreis als Tagespreis/8 aus).
 *   3. Merkmale kommen aus `features`, nicht aus einer festen Liste.
 *   4. Nicht verfuegbare Inserate tauchen nicht auf.
 *
 * Das Spaltenschema ist das echte (applyLiveSchema): jede Spalte, die die
 * Route liest und die es live nicht gibt, laeuft hier in 42703.
 */

vi.mock('@/lib/supabase-server', async () => {
  const { fakeDb: db } = await import('@/test/fake-supabase')
  return { getSupabaseAdmin: () => db }
})

const SALON_KOELN = '11111111-1111-4111-8111-111111111111'
const SALON_BERLIN = '22222222-2222-4222-8222-222222222222'
const EQ_STUHL = '33333333-3333-4333-8333-333333333333'
const EQ_LIEGE = '44444444-4444-4444-8444-444444444444'
const EQ_WEG = '55555555-5555-4555-8555-555555555555'

type Get = (req: NextRequest) => Promise<Response>
let GET: Get

beforeAll(async () => {
  GET = (await import('@/app/api/rental-listings/route')).GET as unknown as Get
})

function seed() {
  fakeDb.reset()
  applyLiveSchema(fakeDb)

  fakeDb.seed('rental_equipment', [
    {
      id: EQ_STUHL,
      salon_id: SALON_KOELN,
      type: 'stuhl',
      name: 'Friseur-Stuhl am Fenster',
      description: 'Heller Platz mit eigenem Spiegel',
      features: ['Spiegel', 'Föhn'],
      images: [],
      price_per_day_cents: 3800,
      // Kein Stundenpreis gepflegt — das MUSS null bleiben.
      price_per_hour_cents: null,
      price_per_week_cents: null,
      price_per_month_cents: null,
      available_days: ['mon', 'tue'],
      available_from: '09:00',
      available_to: '18:00',
      is_available: true,
      created_at: '2026-08-01T10:00:00.000Z',
      salons: { id: SALON_KOELN, name: 'Salon Nord', city: 'Köln', slug: 'salon-nord' },
    },
    {
      id: EQ_LIEGE,
      salon_id: SALON_BERLIN,
      type: 'liege',
      name: 'Kosmetik-Liege Privatraum',
      description: null,
      features: [],
      images: ['https://cdn.example/liege.jpg'],
      price_per_day_cents: 5500,
      price_per_hour_cents: 900,
      price_per_week_cents: null,
      price_per_month_cents: null,
      available_days: null,
      available_from: null,
      available_to: null,
      is_available: true,
      created_at: '2026-08-02T10:00:00.000Z',
      salons: { id: SALON_BERLIN, name: 'Beauty Mitte', city: 'Berlin', slug: 'beauty-mitte' },
    },
    {
      id: EQ_WEG,
      salon_id: SALON_KOELN,
      type: 'stuhl',
      name: 'Stuhl gerade vermietet',
      description: null,
      features: [],
      images: [],
      price_per_day_cents: 2000,
      price_per_hour_cents: null,
      price_per_week_cents: null,
      price_per_month_cents: null,
      available_days: null,
      available_from: null,
      available_to: null,
      is_available: false,
      created_at: '2026-08-03T10:00:00.000Z',
      salons: { id: SALON_KOELN, name: 'Salon Nord', city: 'Köln', slug: 'salon-nord' },
    },
  ])
}

async function call(query = ''): Promise<{ status: number; listings: RentalListing[]; body: Record<string, unknown> }> {
  const req = new Request(`http://localhost:3000/api/rental-listings${query}`) as unknown as NextRequest
  const res = await GET(req)
  const body = (await res.json()) as Record<string, unknown>
  return { status: res.status, listings: (body.listings as RentalListing[]) ?? [], body }
}

beforeEach(seed)

describe('GET /api/rental-listings', () => {
  it('liefert nur verfuegbare Inserate — und alle davon', async () => {
    const { status, listings } = await call()
    expect(status).toBe(200)
    expect(listings.map((l) => l.id).sort()).toEqual([EQ_STUHL, EQ_LIEGE].sort())
  })

  it('erfindet keinen Stundenpreis, wo keiner gepflegt ist', async () => {
    const { listings } = await call()
    const stuhl = listings.find((l) => l.id === EQ_STUHL)!
    // Die alte Seite hat hier 3800/8 = 475 Cent hingeschrieben.
    expect(stuhl.pricePerHourCents).toBeNull()
    expect(stuhl.pricePerDayCents).toBe(3800)

    const liege = listings.find((l) => l.id === EQ_LIEGE)!
    expect(liege.pricePerHourCents).toBe(900)
  })

  it('liefert die gepflegten Merkmale, nicht drei erfundene', async () => {
    const { listings } = await call()
    expect(listings.find((l) => l.id === EQ_STUHL)!.features).toEqual(['Spiegel', 'Föhn'])
    // Leere Ausstattung bleibt leer — die alte Seite setzte hier
    // ['Spiegel','WLAN','Wasser'] fuer JEDES Inserat.
    expect(listings.find((l) => l.id === EQ_LIEGE)!.features).toEqual([])
  })

  it('haengt den Salon an — Name, Stadt und Slug', async () => {
    const { listings } = await call()
    expect(listings.find((l) => l.id === EQ_STUHL)!.salon).toEqual({
      id: SALON_KOELN,
      name: 'Salon Nord',
      city: 'Köln',
      slug: 'salon-nord',
    })
  })

  it('filtert nach Stadt', async () => {
    const { listings } = await call('?city=berlin')
    expect(listings.map((l) => l.id)).toEqual([EQ_LIEGE])
  })

  it('filtert nach Suchbegriff ueber Objekt, Beschreibung und Salon', async () => {
    expect((await call('?q=fenster')).listings.map((l) => l.id)).toEqual([EQ_STUHL])
    expect((await call('?q=spiegel')).listings.map((l) => l.id)).toEqual([EQ_STUHL])
    expect((await call('?q=beauty%20mitte')).listings.map((l) => l.id)).toEqual([EQ_LIEGE])
  })

  it('filtert nach Tagesbudget und nach Typ', async () => {
    expect((await call('?maxDayCents=4000')).listings.map((l) => l.id)).toEqual([EQ_STUHL])
    expect((await call('?type=liege')).listings.map((l) => l.id)).toEqual([EQ_LIEGE])
  })

  it('loest eine Merkliste ueber ?ids auf', async () => {
    const { listings } = await call(`?ids=${EQ_LIEGE}`)
    expect(listings.map((l) => l.id)).toEqual([EQ_LIEGE])
  })

  it('antwortet auf ausschliesslich unbrauchbare ids mit einer leeren Liste, nicht mit allem', async () => {
    // Ohne die Pruefung liefe eine Nicht-UUID in 22P02 — oder, schlimmer, der
    // ids-Filter fiele weg und die Merkliste zeigte plotzlich den ganzen Markt.
    const { status, listings } = await call('?ids=nicht-uuid,auch-nicht')
    expect(status).toBe(200)
    expect(listings).toEqual([])
  })

  it('meldet einen DB-Fehler als 500 — und liefert keinen Ersatzbestand', async () => {
    fakeDb.failOn('rental_equipment.select', { code: '42501', message: 'permission denied' })
    const { status, body } = await call()
    expect(status).toBe(500)
    expect(body.listings).toBeUndefined()
    expect(String(body.error)).toMatch(/nicht geladen/i)
  })

  it('spricht keine Spalte an, die es live nicht gibt', async () => {
    // applyLiveSchema laesst jeden Zugriff auf eine unbekannte Spalte in
    // 42703 laufen. Kommt hier eine Liste zurueck, passt die Auswahl zum
    // Produktionsschema.
    const { status, listings } = await call()
    expect(status).toBe(200)
    expect(listings.length).toBeGreaterThan(0)
  })
})
