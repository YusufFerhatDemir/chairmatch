// @vitest-environment node
/**
 * GET /api/admin/kpi — was das Cockpit meldet, wenn es nichts messen konnte.
 *
 * Zwei Befunde aus Track 11:
 *
 * 1. JEDER FEHLER WURDE ZU EINER 0.
 *    `safeCount` fing alles ab und gab 0 zurueck — eine fehlende Tabelle, ein
 *    Rechtefehler, ein Timeout. Im Cockpit stand dann "Buchungen 30d: 0", und
 *    das war nicht davon zu unterscheiden, dass wirklich niemand gebucht hat.
 *    Genau diese Verwechslung hatte Track 10 schon einmal im
 *    Anbieter-Dashboard.
 *
 * 2. DAU UND WAU ZAEHLTEN ANMELDEVORGAENGE, NICHT PERSONEN.
 *    `safeCount('login_attempts', success=true)` liefert Zeilen. Wer sich an
 *    einem Tag von Handy und Rechner anmeldet, zaehlte zweimal. Die Kennzahl
 *    hiess trotzdem "Daily Active Users", und `dau_wau_ratio` — die Zahl, an
 *    der Stickiness gemessen wird — entstand aus zwei verschieden stark
 *    ueberzeichneten Werten. `login_attempts` hat live keine `user_id`
 *    (Spaltensonde 2026-08-27), die Person steckt nur in `email`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDb, sessionFor, getRequest, IDS } from './e2e/_harness/fixtures'
import type { FakeSupabase } from './e2e/_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./e2e/_harness/fake-supabase').FakeSupabase,
  session: null as import('./e2e/_harness/fixtures').TestSession | null,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/auth.config', () => ({ auth: async () => state.session }))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => state.session,
  invalidateAccountState: () => {},
}))

import { GET as kpiRoute } from '@/app/api/admin/kpi/route'

const db = () => state.db as FakeSupabase

/** Erfolgreiche Anmeldung — nur die Spalten, die live existieren. */
function login(email: string, createdAt: string, success = true) {
  db().rows('login_attempts').push({
    id: `la_${db().rows('login_attempts').length + 1}`,
    ip: '203.0.113.1',
    email,
    success,
    created_at: createdAt,
  })
}

const HEUTE = new Date()
const vorStunden = (h: number) => new Date(HEUTE.getTime() - h * 60 * 60 * 1000).toISOString()

async function kpi() {
  // Die Route ist in `withApi` gewickelt: (req, ctx). Die Route selbst liest
  // nichts aus ctx, das leere Objekt reicht.
  const res = await kpiRoute(getRequest('https://www.chairmatch.de/api/admin/kpi'), {})
  return { status: res.status, body: await res.json() }
}

beforeEach(() => {
  state.db = createDb()
  state.session = sessionFor('superAdmin')
})

describe('KPI-Cockpit: Zugang', () => {
  it('bleibt fuer alles unterhalb von super_admin zu', async () => {
    for (const rolle of ['customer', 'owner', 'admin'] as const) {
      state.session = sessionFor(rolle)
      expect((await kpi()).status).toBe(403)
    }
  })
})

describe('KPI-Cockpit: unbekannt ist nicht null', () => {
  it('meldet null statt 0, wenn eine Abfrage fehlschlaegt', async () => {
    // `once = false`: die Route fragt `bookings` viermal (1d/7d/30d/prev30d).
    db().failOn('bookings', 'select', {
      code: '42501',
      message: 'permission denied for table bookings',
      details: null,
      hint: null,
    }, false)

    const { body } = await kpi()

    expect(body.funnel.bookings.d30).toBeNull()
    expect(body.funnel.bookings.growth_pct).toBeNull()
    // Eine Quote aus einer unbekannten Zahl ist selbst unbekannt.
    expect(body.funnel.conversion.conv_to_booking_pct).toBeNull()
    expect(body.errors.join(' ')).toContain('permission denied for table bookings')
  })

  it('meldet eine echte Null als 0 und traegt nichts in errors ein', async () => {
    const { body } = await kpi()

    // Eine gemessene Zahl — nicht null, und ohne Eintrag in `errors`.
    expect(typeof body.funnel.bookings.d30).toBe('number')
    expect(body.errors).toEqual([])
  })

  it('faerbt auch den Meilenstein-Fortschritt auf null', async () => {
    db().failOn('services', 'select', {
      code: 'PGRST205',
      message: 'Could not find the table',
      details: null,
      hint: null,
    }, false)

    const { body } = await kpi()

    expect(body.funnel.listings.active).toBeNull()
    expect(body.milestones.phase_2_progress).toBeNull()
    expect(body.milestones.phase_3_progress).toBeNull()
  })
})

describe('KPI-Cockpit: DAU und WAU zaehlen Personen', () => {
  it('zaehlt mehrere Anmeldungen derselben Person einmal', async () => {
    login('lena@example.de', vorStunden(1))
    login('lena@example.de', vorStunden(2))
    login('lena@example.de', vorStunden(3))
    login('sam@example.de', vorStunden(4))

    const { body } = await kpi()

    // Vorher stand hier 4 — die Zahl der Zeilen.
    expect(body.engagement.dau).toBe(2)
  })

  it('behandelt Gross- und Kleinschreibung als dieselbe Person', async () => {
    login('Lena@Example.de', vorStunden(1))
    login('lena@example.de ', vorStunden(2))

    expect((await kpi()).body.engagement.dau).toBe(1)
  })

  it('zaehlt nur erfolgreiche Anmeldungen', async () => {
    login('lena@example.de', vorStunden(1), true)
    login('angreifer@example.de', vorStunden(1), false)
    login('angreifer@example.de', vorStunden(2), false)

    expect((await kpi()).body.engagement.dau).toBe(1)
  })

  it('trennt das 24-Stunden- vom 7-Tage-Fenster', async () => {
    login('lena@example.de', vorStunden(2))
    login('sam@example.de', vorStunden(80))
    login('mara@example.de', vorStunden(100))

    const { body } = await kpi()
    expect(body.engagement.dau).toBe(1)
    expect(body.engagement.wau).toBe(3)
    expect(body.engagement.dau_wau_ratio).toBe(33)
  })

  it('meldet null, wenn login_attempts nicht lesbar ist', async () => {
    db().failOn('login_attempts', 'select', {
      code: '42501',
      message: 'permission denied for table login_attempts',
      details: null,
      hint: null,
    }, false)

    const { body } = await kpi()
    expect(body.engagement.dau).toBeNull()
    expect(body.engagement.wau).toBeNull()
    expect(body.engagement.dau_wau_ratio).toBeNull()
    expect(body.errors.some((e: string) => e.startsWith('dau:'))).toBe(true)
  })

  it('gibt keine Quote aus, wenn WAU null ist', async () => {
    const { body } = await kpi()
    // Ohne Anmeldungen ist die Stickiness nicht definiert — 0 % waere eine
    // Behauptung ueber Nutzer, die es nicht gibt.
    expect(body.engagement.wau).toBe(0)
    expect(body.engagement.dau_wau_ratio).toBeNull()
  })
})

describe('KPI-Cockpit: Grundzahlen bleiben echt', () => {
  it('zaehlt Salons und Profile aus dem Bestand', async () => {
    const { body } = await kpi()
    expect(body.funnel.salons.total).toBe(db().rows('salons').length)
    expect(body.funnel.salons.active).toBe(
      db().rows('salons').filter(s => s.is_active === true).length,
    )
    expect(body.seo.salons_indexable).toBeGreaterThanOrEqual(0)
    expect(IDS.salon).toBeTruthy()
  })
})
