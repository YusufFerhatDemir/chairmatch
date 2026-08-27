// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { fakeDb, type Row } from '@/test/fake-supabase'
import { applyLiveSchema } from '@/test/live-schema'
import { __resetRateLimits } from '@/lib/rate-limit'

/**
 * POST /api/reviews/[id]/report — die DSA-Meldung einer Bewertung.
 *
 * Die Route setzte `reported_flag` und meldete "Bewertung wurde gemeldet." —
 * und das war es. Kein Admin-Bildschirm, keine Abfrage und kein Cron hat die
 * Spalte je gelesen; die Meldung verschwand. Gleichzeitig fuehrt
 * /admin/audit-logs seit jeher ein Label `REVIEW_FLAGGED`, dem nie ein
 * Eintrag entsprach. Dazu: keine Existenzpruefung (eine unbekannte ID galt
 * als gemeldet) und kein Limit (jeder Angemeldete konnte in einer Schleife
 * jede Bewertung der Plattform melden).
 */

const auth = vi.hoisted(() => ({ session: null as { user?: { id?: string } } | null }))

vi.mock('@/modules/auth/auth.config', () => ({ auth: async () => auth.session }))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => auth.session,
  invalidateAccountState: () => {},
}))

vi.mock('@/lib/supabase-server', async () => {
  const { fakeDb: db } = await import('@/test/fake-supabase')
  return { getSupabaseAdmin: () => db }
})

const MELDER = '11111111-1111-4111-8111-111111111111'
const REVIEW = '22222222-2222-4222-8222-222222222222'
const UNBEKANNT = '99999999-9999-4999-8999-999999999999'
const SALON = '33333333-3333-4333-8333-333333333333'

type Handler = (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>
let POST: Handler

beforeAll(async () => {
  POST = (await import('@/app/api/reviews/[id]/report/route')).POST as unknown as Handler
})

function melde(id: string) {
  return POST({} as NextRequest, { params: Promise.resolve({ id }) })
}

beforeEach(() => {
  __resetRateLimits()
  fakeDb.reset()
  applyLiveSchema(fakeDb)
  fakeDb.defineSchema('reviews', [
    'id', 'salon_id', 'customer_id', 'booking_id', 'review_type', 'rating', 'comment',
    'reply', 'replied_at', 'reported_flag', 'reported_at', 'reported_by', 'created_at',
  ])
  fakeDb.seed('reviews', [
    {
      id: REVIEW, salon_id: SALON, customer_id: MELDER, booking_id: null,
      review_type: 'customer_to_salon', rating: 1, comment: 'Unwahre Behauptung',
      reply: null, replied_at: null, reported_flag: false, reported_at: null,
      reported_by: null, created_at: '2026-08-01T10:00:00.000Z',
    },
  ])
  auth.session = { user: { id: MELDER } }
})

describe('POST /api/reviews/[id]/report', () => {
  it('markiert die Bewertung', async () => {
    const res = await melde(REVIEW)
    expect(res.status).toBe(200)

    const zeile = fakeDb.rows('reviews').find((r: Row) => r.id === REVIEW)
    expect(zeile?.reported_flag).toBe(true)
    expect(zeile?.reported_by).toBe(MELDER)
  })

  it('schreibt den Audit-Eintrag, den /admin/audit-logs anzeigt', async () => {
    // Ohne diesen Eintrag ist die Meldung fuer niemanden sichtbar — das war
    // der eigentliche Defekt.
    await melde(REVIEW)

    const logs = fakeDb.rows('audit_logs')
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      user_id: MELDER,
      action: 'REVIEW_FLAGGED',
      entity: 'review',
      entity_id: REVIEW,
    })
  })

  it('meldet eine unbekannte ID nicht als gemeldet', async () => {
    const res = await melde(UNBEKANNT)
    expect(res.status).toBe(404)
    expect(fakeDb.rows('audit_logs')).toHaveLength(0)
  })

  it('weist eine ID ab, die keine UUID ist', async () => {
    expect((await melde('kein-uuid')).status).toBe(400)
  })

  it('verlangt eine Anmeldung', async () => {
    auth.session = null
    expect((await melde(REVIEW)).status).toBe(401)
    expect(fakeDb.rows('reviews')[0].reported_flag).toBe(false)
  })

  it('deckelt eine Meldewelle', async () => {
    // Vorher konnte ein Konto jede Bewertung der Plattform in einer Schleife
    // melden — `reported_by` haelt nur die letzte, es blieb also spurlos.
    for (let i = 0; i < 10; i++) {
      expect((await melde(REVIEW)).status).toBe(200)
    }
    const res = await melde(REVIEW)
    expect(res.status).toBe(429)
    expect(fakeDb.rows('audit_logs')).toHaveLength(10)
  })
})
