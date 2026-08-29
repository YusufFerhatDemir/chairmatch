// @vitest-environment node
/**
 * E2E: Provisions-Uebersicht des Admin (Track 25).
 *
 * `GET /api/admin/commissions` gab es seit dem Marketplace-Commit — ohne
 * Oberflaeche, ohne Aufrufer und ohne einen einzigen Test. Beim Bau der Seite
 * /admin/provisionen fielen zwei Defekte auf, die beide in dieselbe Richtung
 * zeigen: die Route meldet zu WENIG, und zwar lautlos.
 *
 *  1. Beide Abfragen destrukturierten nur `data`. Ein Lesefehler ergab
 *     `{ commissions: [], summary: { total: 0 } }` mit Status 200 — auf dem
 *     Bildschirm des Admins „0 €". Das ist die Aussage „die Plattform hat
 *     nichts verdient", wo „wir konnten es nicht lesen" gemeint war.
 *  2. Die Summenabfrage las ungedeckelt. PostgREST liefert ohne `range()`
 *     hoechstens `db-max-rows` Zeilen (Supabase: 1000) — ab der 1001.
 *     Provision war die Gesamtsumme zu klein, ohne Hinweis.
 *
 * Warum das ungetestet blieb: der E2E-Nachbau kannte `.range()` gar nicht.
 * Dieselbe Mechanik wie beim fehlenden `upsert()` in Track 23 — wer die
 * seitenweise lesende Fassung testen wollte, bekam „range is not a function".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDb, sessionFor, enableLiveSchema, IDS } from './_harness/fixtures'
import type { FakeSupabase, Row } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as import('./_harness/fixtures').TestSession | null,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({ getServerSession: async () => state.session }))
vi.mock('@/modules/auth/auth.config', () => ({ auth: async () => state.session }))

import { GET as commissionsGet } from '@/app/api/admin/commissions/route'

function db(): FakeSupabase {
  return state.db
}

function abrufen() {
  return commissionsGet()
}

function provision(over: Partial<Row> = {}): Row {
  return {
    id: `c-${Math.abs(Math.round(Number(over.commission_cents) || 0))}-${db().rows('commissions').length}`,
    type: 'booking',
    source_type: 'booking',
    source_id: IDS.bookingConfirmed,
    beneficiary_type: 'platform',
    beneficiary_id: null,
    rate_percent: 10,
    base_amount_cents: 5000,
    commission_cents: 500,
    currency: 'eur',
    status: 'pending',
    paid_out_at: null,
    created_at: '2026-08-20T10:00:00.000Z',
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))
  state.db = createDb()
  enableLiveSchema(state.db)
  state.session = sessionFor('admin')
})

// ────────────────────────────────────────────────────────────────
describe('Zugang', () => {
  it('weist einen anonymen Aufruf mit 401 ab', async () => {
    state.session = null
    expect((await abrufen()).status).toBe(401)
  })

  it('weist eine Kundin mit 403 ab', async () => {
    state.session = sessionFor('customer')
    expect((await abrufen()).status).toBe(403)
  })

  it('weist einen Anbieter mit 403 ab', async () => {
    state.session = sessionFor('owner')
    expect((await abrufen()).status).toBe(403)
  })

  it('laesst super_admin durch', async () => {
    state.session = sessionFor('superAdmin')
    expect((await abrufen()).status).toBe(200)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Summenbildung', () => {
  it('summiert je Art und insgesamt', async () => {
    db().rows('commissions').push(
      provision({ type: 'booking', commission_cents: 500 }),
      provision({ type: 'booking', commission_cents: 250 }),
      provision({ type: 'chair_rental', commission_cents: 1000 }),
    )

    const body = await (await abrufen()).json()

    expect(body.summary.total).toBe(1750)
    expect(body.summary.count).toBe(3)
    expect(body.summary.byType.booking).toEqual({ count: 2, totalCents: 750 })
    expect(body.summary.byType.chair_rental).toEqual({ count: 1, totalCents: 1000 })
    expect(body.truncated).toBe(false)
  })

  it('meldet ehrlich 0, wenn es wirklich keine Provision gibt', async () => {
    const body = await (await abrufen()).json()

    expect(body.summary.total).toBe(0)
    expect(body.summary.count).toBe(0)
    expect(body.commissions).toEqual([])
  })

  it('summiert ueber die Seitengrenze hinweg (1001 Zeilen)', async () => {
    // Der eigentliche Punkt: eine EINZELNE Abfrage haette hier bei 1000
    // aufgehoert und 500 Cent zu wenig gemeldet — ohne Hinweis.
    for (let i = 0; i < 1001; i++) {
      db().rows('commissions').push(provision({ id: `c-${i}`, commission_cents: 500 }))
    }

    const body = await (await abrufen()).json()

    expect(body.summary.count).toBe(1001)
    expect(body.summary.total).toBe(1001 * 500)
    expect(body.truncated).toBe(false)
  })

  it('liefert hoechstens 100 Zeilen in der Liste, aber die volle Summe', async () => {
    for (let i = 0; i < 150; i++) {
      db().rows('commissions').push(provision({ id: `c-${i}`, commission_cents: 100 }))
    }

    const body = await (await abrufen()).json()

    expect(body.commissions.length).toBe(100)
    expect(body.summary.count).toBe(150)
    expect(body.summary.total).toBe(15000)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Ein Lesefehler ist kein Nullumsatz', () => {
  it('antwortet 503, wenn die Liste nicht lesbar ist', async () => {
    db().rows('commissions').push(provision({ commission_cents: 500 }))
    db().failOn('commissions', 'select', {
      code: '42501', message: 'permission denied for table commissions',
      details: null, hint: null,
    })

    const res = await abrufen()

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.summary).toBeUndefined()
    // Die Regression in einer Zeile: vorher stand hier 200 mit total 0.
    expect(body.error).toMatch(/nicht geladen/i)
  })
})
