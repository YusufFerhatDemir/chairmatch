// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { fakeDb } from '@/test/fake-supabase'
import { applyLiveSchema } from '@/test/live-schema'

/**
 * /api/provider/services — der Bestand, aus dem die Buchungsstrecke Preis
 * und Dauer nimmt.
 *
 * Vier Befunde aus Track 10 stehen hier als Test:
 *
 *  1. Es gab KEIN GET. Die Seite /anbieter/mein-salon/services zeigte
 *     deshalb eine fest verdrahtete "0" mit dem Zusatz "Noch keine
 *     Services" — auch fuer einen Salon mit gepflegten Leistungen.
 *  2. Die Besitzsuche lief ueber `.single()`. Wer zwei Salons hat, bekam
 *     einen PostgREST-Fehler und damit "Kein Salon" 404.
 *  3. POST schrieb `body.name` und `body.price_cents || 0` ungeprueft —
 *     ein negativer Preis landete in der Spalte, die die Buchung spaeter
 *     als Geldbetrag liest.
 *  4. PATCH und DELETE meldeten `success: true`, auch wenn die ID zu einem
 *     fremden Salon gehoerte und gar nichts getroffen wurde.
 *
 * Gemockt ist nur die Session. Datenbank, Besitzpruefung und Validierung
 * laufen echt, gegen das Produktionsschema (`applyLiveSchema`).
 */

const auth = vi.hoisted(() => ({ session: null as { user?: { id?: string } } | null }))

vi.mock('@/modules/auth/auth.config', () => ({
  auth: async () => auth.session,
}))

vi.mock('@/lib/supabase-server', async () => {
  const { fakeDb: db } = await import('@/test/fake-supabase')
  return { getSupabaseAdmin: () => db }
})

const OWNER = '11111111-1111-4111-8111-111111111111'
const FREMDER = '99999999-9999-4999-8999-999999999999'
const SALON_A = '22222222-2222-4222-8222-222222222222'
const SALON_B = '77777777-7777-4777-8777-777777777777'
const SALON_FREMD = '33333333-3333-4333-8333-333333333333'
const SVC_EIGEN = '44444444-4444-4444-8444-444444444444'
const SVC_INAKTIV = '55555555-5555-4555-8555-555555555555'
const SVC_FREMD = '66666666-6666-4666-8666-666666666666'

type Handler = (req: NextRequest) => Promise<Response>
let GET: () => Promise<Response>
let POST: Handler
let PATCH: Handler
let DELETE: Handler

beforeAll(async () => {
  const mod = await import('@/app/api/provider/services/route')
  GET = mod.GET as unknown as () => Promise<Response>
  POST = mod.POST as unknown as Handler
  PATCH = mod.PATCH as unknown as Handler
  DELETE = mod.DELETE as unknown as Handler
})

function req(body: unknown): NextRequest {
  return {
    json: async () => {
      if (body === '__kaputt__') throw new Error('invalid json')
      return body
    },
  } as unknown as NextRequest
}

function seed(salons: Array<Record<string, unknown>> = []) {
  fakeDb.reset()
  applyLiveSchema(fakeDb)

  fakeDb.seed('salons', [
    { id: SALON_A, owner_id: OWNER, name: 'Salon Eins', city: 'Köln', slug: 'salon-eins', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
    { id: SALON_FREMD, owner_id: FREMDER, name: 'Fremder Salon', city: 'Berlin', slug: 'fremd', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
    ...salons,
  ])

  fakeDb.seed('services', [
    { id: SVC_EIGEN, salon_id: SALON_A, name: 'Herrenschnitt', description: null, category: null, duration_minutes: 30, price_cents: 3200, currency: 'eur', is_active: true, sort_order: 0, created_at: '2026-02-01T00:00:00.000Z', risk_level: null, slug: null },
    { id: SVC_INAKTIV, salon_id: SALON_A, name: 'Alte Leistung', description: null, category: null, duration_minutes: 45, price_cents: 5000, currency: 'eur', is_active: false, sort_order: 1, created_at: '2026-02-02T00:00:00.000Z', risk_level: null, slug: null },
    { id: SVC_FREMD, salon_id: SALON_FREMD, name: 'Bartpflege', description: null, category: null, duration_minutes: 20, price_cents: 1800, currency: 'eur', is_active: true, sort_order: 0, created_at: '2026-02-03T00:00:00.000Z', risk_level: null, slug: null },
  ])

  auth.session = { user: { id: OWNER } }
}

beforeEach(() => seed())

describe('GET /api/provider/services', () => {
  it('liefert den eigenen Bestand — die Seite muss ihn nicht mehr erfinden', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.services.map((s: { id: string }) => s.id)).toEqual([SVC_EIGEN, SVC_INAKTIV])
    // Die grosse Zahl auf der Seite: aktive Leistungen, nicht alle.
    expect(body.activeCount).toBe(1)
  })

  it('liefert keine Leistung eines fremden Salons', async () => {
    const body = await (await GET()).json()
    expect(body.services.some((s: { id: string }) => s.id === SVC_FREMD)).toBe(false)
  })

  it('funktioniert auch, wenn der Anbieter ZWEI Salons hat', async () => {
    // Der alte `.single()`-Pfad antwortete hier "Kein Salon" 404.
    seed([{ id: SALON_B, owner_id: OWNER, name: 'Salon Zwei', city: 'Bonn', slug: 'salon-zwei', is_active: true, created_at: '2026-06-01T00:00:00.000Z' }])

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    // Deterministisch der aelteste Salon — dieselbe Auswahl wie /api/me/salon.
    expect(body.services.map((s: { id: string }) => s.id)).toEqual([SVC_EIGEN, SVC_INAKTIV])
  })

  it('verlangt eine Anmeldung', async () => {
    auth.session = null
    expect((await GET()).status).toBe(401)
  })

  it('sagt es, wenn noch kein Salon hinterlegt ist — statt einer leeren Liste', async () => {
    auth.session = { user: { id: FREMDER } }
    fakeDb.reset()
    applyLiveSchema(fakeDb)
    fakeDb.seed('salons', [])

    const res = await GET()
    expect(res.status).toBe(404)
    expect((await res.json()).error).toMatch(/Onboarding/)
  })
})

describe('POST /api/provider/services', () => {
  it('legt eine Leistung am eigenen Salon an', async () => {
    const res = await POST(req({ name: 'Färben', price_cents: 8900, duration_minutes: 90 }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toMatchObject({ salon_id: SALON_A, name: 'Färben', price_cents: 8900, duration_minutes: 90, is_active: true })
  })

  it('weist einen negativen Preis ab', async () => {
    // Vorher: `body.price_cents || 0` — die -5000 landeten unveraendert in
    // der Spalte, aus der die Buchung ihren Betrag nimmt.
    const res = await POST(req({ name: 'Färben', price_cents: -5000 }))
    expect(res.status).toBe(400)
    expect(fakeDb.rows('services')).toHaveLength(3)
  })

  it('weist einen leeren Namen ab', async () => {
    expect((await POST(req({ name: ' ', price_cents: 1000 }))).status).toBe(400)
    expect(fakeDb.rows('services')).toHaveLength(3)
  })

  it('weist eine unmoegliche Dauer ab', async () => {
    expect((await POST(req({ name: 'Kur', price_cents: 1000, duration_minutes: 0 }))).status).toBe(400)
    expect((await POST(req({ name: 'Kur', price_cents: 1000, duration_minutes: 5000 }))).status).toBe(400)
  })

  it('weist unbekannte Felder ab, statt sie stillschweigend zu ignorieren', async () => {
    // `salon_id` im Body waere der Versuch, am fremden Salon anzulegen.
    const res = await POST(req({ name: 'Färben', price_cents: 1000, salon_id: SALON_FREMD }))
    expect(res.status).toBe(400)
    expect(fakeDb.rows('services')).toHaveLength(3)
  })

  it('beantwortet kaputtes JSON mit 400, nicht mit 500', async () => {
    expect((await POST(req('__kaputt__'))).status).toBe(400)
  })
})

describe('PATCH /api/provider/services', () => {
  it('aendert die eigene Leistung', async () => {
    const res = await PATCH(req({ id: SVC_EIGEN, price_cents: 3500 }))
    expect(res.status).toBe(200)
    expect(fakeDb.rows('services').find(r => r.id === SVC_EIGEN)?.price_cents).toBe(3500)
  })

  it('trifft eine fremde Leistung nicht — und meldet das auch', async () => {
    // Vorher: 200 mit `success: true`, obwohl nichts geaendert wurde.
    const res = await PATCH(req({ id: SVC_FREMD, price_cents: 1 }))
    expect(res.status).toBe(404)
    expect(fakeDb.rows('services').find(r => r.id === SVC_FREMD)?.price_cents).toBe(1800)
  })

  it('weist einen negativen Preis ab', async () => {
    expect((await PATCH(req({ id: SVC_EIGEN, price_cents: -1 }))).status).toBe(400)
    expect(fakeDb.rows('services').find(r => r.id === SVC_EIGEN)?.price_cents).toBe(3200)
  })

  it('verlangt eine gueltige ID', async () => {
    expect((await PATCH(req({ id: 'nicht-uuid', price_cents: 100 }))).status).toBe(400)
  })
})

describe('DELETE /api/provider/services', () => {
  it('loescht die eigene Leistung', async () => {
    const res = await DELETE(req({ id: SVC_EIGEN }))
    expect(res.status).toBe(200)
    expect(fakeDb.rows('services').some(r => r.id === SVC_EIGEN)).toBe(false)
  })

  it('loescht keine fremde Leistung — und meldet das auch', async () => {
    const res = await DELETE(req({ id: SVC_FREMD }))
    expect(res.status).toBe(404)
    expect(fakeDb.rows('services').some(r => r.id === SVC_FREMD)).toBe(true)
  })
})
