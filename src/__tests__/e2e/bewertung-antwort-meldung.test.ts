// @vitest-environment node
/**
 * E2E: Antworten und Melden — zwei fertige Backends ohne Bedienung (Track 25).
 *
 * Beide Routen waren vollstaendig gebaut und gehaertet, und beide hatten im
 * gesamten Repository KEINEN Aufrufer:
 *
 *   POST /api/reviews/[id]/reply    Antwort des Saloninhabers (Track 10)
 *   POST /api/reviews/[id]/report   DSA-Meldung mit Audit-Eintrag (Track 10)
 *
 * `reviews.reply` konnte damit nie einen Wert bekommen — und die
 * Anbieter-Seite rendert eine Antwort seit jeher (`{r.reply && …}`), die
 * oeffentliche Salonseite bekam `reply` sogar als Feld hergereicht und hat es
 * nie angezeigt. Getestet wurde keiner der beiden Wege je.
 *
 * Diese Datei prueft nicht die Knoepfe, sondern das, was hinter ihnen haengt:
 * dass die Kette Route → Action → Datenbank haelt und die Autorisierung
 * wirklich greift.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDb, sessionFor, postRequest, ctx, enableLiveSchema, IDS } from './_harness/fixtures'
import type { FakeSupabase, Row } from './_harness/fake-supabase'
import { __resetRateLimits } from '@/lib/rate-limit'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as import('./_harness/fixtures').TestSession | null,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({ getServerSession: async () => state.session }))
vi.mock('@/modules/auth/auth.config', () => ({ auth: async () => state.session }))

import { POST as replyPost } from '@/app/api/reviews/[id]/reply/route'
import { POST as reportPost } from '@/app/api/reviews/[id]/report/route'

function db(): FakeSupabase {
  return state.db
}

const REVIEW_SALON = '20202020-2020-4202-8202-202020202020'
const REVIEW_MIETE = '20202020-2020-4202-8202-202020202021'
const REVIEW_FREMD = '20202020-2020-4202-8202-202020202022'

function reply(id: string, body: Record<string, unknown>) {
  return replyPost(postRequest(`https://www.chairmatch.de/api/reviews/${id}/reply`, body), ctx({ id }))
}

function report(id: string) {
  return reportPost(postRequest(`https://www.chairmatch.de/api/reviews/${id}/report`, {}), ctx({ id }))
}

function review(id: string): Row | undefined {
  return db().rows('reviews').find(r => r.id === id)
}

beforeEach(() => {
  vi.clearAllMocks()
  __resetRateLimits()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))
  state.db = createDb()
  enableLiveSchema(state.db)

  // Ein ZWEITER Salon mit einem anderen Inhaber. Er muss wirklich existieren:
  // `salons!inner(owner_id)` schliesst eine Bewertung ohne Salon aus (404) —
  // die 403 der Eigentuemer-Pruefung waere sonst gar nicht erreichbar.
  db().rows('salons').push({
    id: IDS.salonZwei,
    name: 'Salon Nebenan',
    slug: 'salon-nebenan',
    category: 'friseur',
    city: 'Berlin',
    owner_id: IDS.otherCustomer,
    is_active: true,
    is_verified: true,
  })

  db().rows('reviews').push(
    {
      id: REVIEW_SALON,
      salon_id: IDS.salon,
      customer_id: IDS.customer,
      rating: 2,
      comment: 'War leider nicht mein Tag.',
      review_type: null,
      reply: null,
      replied_at: null,
      created_at: '2026-08-20T10:00:00.000Z',
    },
    {
      // Miet-Bewertung: traegt dieselbe salon_id, ist aber double-blind.
      id: REVIEW_MIETE,
      salon_id: IDS.salon,
      customer_id: IDS.otherCustomer,
      rating: 5,
      comment: 'Guter Vermieter.',
      review_type: 'tenant_to_provider',
      reply: null,
      replied_at: null,
      created_at: '2026-08-21T10:00:00.000Z',
    },
    {
      id: REVIEW_FREMD,
      salon_id: IDS.salonZwei,
      customer_id: IDS.customer,
      rating: 4,
      comment: 'Anderer Salon.',
      review_type: null,
      reply: null,
      replied_at: null,
      created_at: '2026-08-22T10:00:00.000Z',
    },
  )

  state.session = sessionFor('owner')
})

// ────────────────────────────────────────────────────────────────
describe('Antwort des Saloninhabers', () => {
  it('schreibt reply UND replied_at', async () => {
    const res = await reply(REVIEW_SALON, { reply: 'Danke für die Rückmeldung — wir melden uns.' })

    expect(res.status).toBe(200)
    expect(review(REVIEW_SALON)?.reply).toBe('Danke für die Rückmeldung — wir melden uns.')
    expect(review(REVIEW_SALON)?.replied_at).toBeTruthy()
  })

  it('erlaubt das Ueberschreiben einer bestehenden Antwort', async () => {
    await reply(REVIEW_SALON, { reply: 'Erste Fassung.' })
    const res = await reply(REVIEW_SALON, { reply: 'Zweite Fassung.' })

    expect(res.status).toBe(200)
    expect(review(REVIEW_SALON)?.reply).toBe('Zweite Fassung.')
  })

  it('weist einen anonymen Aufruf mit 401 ab — nicht mit 400', async () => {
    // Bis Track 10 machte die Route aus JEDEM Fehlschlag eine 400; ein
    // fehlendes Cookie las sich damit wie ein Eingabefehler.
    state.session = null
    const res = await reply(REVIEW_SALON, { reply: 'Hallo.' })

    expect(res.status).toBe(401)
    expect(review(REVIEW_SALON)?.reply).toBeNull()
  })

  it('laesst einen fremden Salon nicht antworten (403)', async () => {
    const res = await reply(REVIEW_FREMD, { reply: 'Gehört mir nicht.' })

    expect(res.status).toBe(403)
    expect(review(REVIEW_FREMD)?.reply).toBeNull()
  })

  it('schliesst eine Bewertung ohne Salon aus (404, !inner)', async () => {
    // `salons!inner(owner_id)` ist ein INNER JOIN: ohne Salon gibt es die
    // Zeile nicht. Der Nachbau hat das bis Track 25 als LEFT JOIN gebaut und
    // `salon: null` angehaengt — der Zugriff auf `review.salon.owner_id`
    // warf dann, und die Route antwortete 500 statt 404.
    const verwaist = '20202020-2020-4202-8202-202020202023'
    db().rows('reviews').push({
      id: verwaist,
      salon_id: IDS.unknown,
      customer_id: IDS.customer,
      rating: 3,
      comment: 'Salon gibt es nicht.',
      review_type: null,
      reply: null,
      replied_at: null,
      created_at: '2026-08-23T10:00:00.000Z',
    })

    const res = await reply(verwaist, { reply: 'Hallo?' })
    expect(res.status).toBe(404)
  })

  it('behandelt eine Miet-Bewertung als nicht vorhanden (404)', async () => {
    // Sie traegt dieselbe salon_id, ist aber double-blind: eine Antwort
    // waere nirgends sichtbar und wuerde reply/replied_at ueberschreiben.
    const res = await reply(REVIEW_MIETE, { reply: 'Danke!' })

    expect(res.status).toBe(404)
    expect(review(REVIEW_MIETE)?.reply).toBeNull()
  })

  it('weist eine leere Antwort ab', async () => {
    const res = await reply(REVIEW_SALON, { reply: '' })
    expect(res.status).toBe(400)
    expect(review(REVIEW_SALON)?.reply).toBeNull()
  })

  it('weist mehr als 1000 Zeichen ab', async () => {
    const res = await reply(REVIEW_SALON, { reply: 'x'.repeat(1001) })
    expect(res.status).toBe(400)
    expect(review(REVIEW_SALON)?.reply).toBeNull()
  })

  it('weist einen kaputten JSON-Koerper ab', async () => {
    const res = await replyPost(
      new Request(`https://www.chairmatch.de/api/reviews/${REVIEW_SALON}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{kaputt',
      }) as unknown as Parameters<typeof replyPost>[0],
      ctx({ id: REVIEW_SALON }),
    )
    expect(res.status).toBe(400)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Bewertung melden (DSA)', () => {
  beforeEach(() => {
    state.session = sessionFor('customer')
  })

  it('setzt das Kennzeichen und haelt fest, WER gemeldet hat', async () => {
    const res = await report(REVIEW_SALON)

    expect(res.status).toBe(200)
    expect(review(REVIEW_SALON)?.reported_flag).toBe(true)
    expect(review(REVIEW_SALON)?.reported_by).toBe(IDS.customer)
    expect(review(REVIEW_SALON)?.reported_at).toBeTruthy()
  })

  it('schreibt den Audit-Eintrag, den /admin/audit-logs bereits anzeigt', async () => {
    // `reported_flag` allein hat nie jemand gelesen — REVIEW_FLAGGED schon.
    await report(REVIEW_SALON)

    const eintrag = db().rows('audit_logs').find(r => r.action === 'REVIEW_FLAGGED')
    expect(eintrag).toBeDefined()
    expect(eintrag?.entity_id).toBe(REVIEW_SALON)
    expect(eintrag?.user_id).toBe(IDS.customer)
  })

  it('verlangt eine Anmeldung (401)', async () => {
    state.session = null
    const res = await report(REVIEW_SALON)

    expect(res.status).toBe(401)
    expect(review(REVIEW_SALON)?.reported_flag).toBeUndefined()
  })

  it('meldet 404 fuer eine Bewertung, die es nicht gibt', async () => {
    const res = await report(IDS.unknown)
    expect(res.status).toBe(404)
  })

  it('weist eine unsinnige ID mit 400 ab', async () => {
    const res = await report('nicht-uuid')
    expect(res.status).toBe(400)
  })

  it('deckelt bei 10 Meldungen je Stunde und Konto', async () => {
    for (let i = 0; i < 10; i++) {
      expect((await report(REVIEW_SALON)).status).toBe(200)
    }
    const elfte = await report(REVIEW_SALON)
    expect(elfte.status).toBe(429)
  })
})
