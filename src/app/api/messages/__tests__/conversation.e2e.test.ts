// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { fakeDb } from '@/test/fake-supabase'
import { applyLiveSchema } from '@/test/live-schema'

/**
 * Nachrichten — Kette Route → Datenbank, gegen das Produktionsschema.
 *
 * Anlass (Delta-Check 2026-08-24): `conversations` fuehrt live
 * `last_message_at`, der Code sprach die Spalte als `updated_at` an. Das war
 * kein Schoenheitsfehler:
 *
 *   GET  /api/messages  sortierte per `.order('updated_at')` → 42703 →
 *                       `convError` → 500 fuer JEDEN eingeloggten Nutzer.
 *   POST /api/messages  legte eine neue Konversation mit `updated_at` an →
 *                       42703 → "Konversation konnte nicht erstellt werden".
 *
 * Das Postfach war damit vollstaendig tot, und keiner der 463 Tests hat es
 * bemerkt: es gab fuer diese Route keinen. Deshalb steht hier die POST-Kette
 * (die GET-Kette braucht einen Join, den die Fake-DB bewusst nicht kann).
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

const SENDER = '11111111-1111-4111-8111-111111111111'
const RECEIVER = '22222222-2222-4222-8222-222222222222'
const SALON = '33333333-3333-4333-8333-333333333333'

type Post = (req: NextRequest) => Promise<Response>
let POST: Post

beforeAll(async () => {
  POST = (await import('@/app/api/messages/route')).POST as unknown as Post
})

beforeEach(() => {
  fakeDb.reset()
  // Ohne das nimmt die Fake-DB jede erfundene Spalte an — genau so blieb
  // `conversations.updated_at` unentdeckt.
  applyLiveSchema(fakeDb)
  auth.session = { user: { id: SENDER } }
})

function send(body: unknown): NextRequest {
  return new Request('http://localhost:3000/api/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

describe('POST /api/messages', () => {
  it('legt Konversation, Teilnehmer und Nachricht an', async () => {
    const res = await POST(send({ receiverId: RECEIVER, content: 'Hallo!', salonId: SALON }))

    expect(res.status).toBe(201)

    const convs = fakeDb.rows('conversations')
    expect(convs).toHaveLength(1)
    // Der eigentliche Regressionsanker: der Zeitstempel steht in
    // `last_message_at`. Mit `updated_at` waere der Insert in 42703 gelaufen.
    expect(convs[0].last_message_at).toBeTruthy()
    expect(convs[0]).not.toHaveProperty('updated_at')

    expect(fakeDb.rows('conversation_participants')).toHaveLength(2)

    const msgs = fakeDb.rows('messages')
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toMatchObject({
      conversation_id: convs[0].id,
      sender_id: SENDER,
      content: 'Hallo!',
      is_read: false,
    })
  })

  it('zieht den Zeitstempel der Konversation bei jeder Nachricht nach', async () => {
    await POST(send({ receiverId: RECEIVER, content: 'Erste', salonId: SALON }))
    await POST(send({ receiverId: RECEIVER, content: 'Zweite', salonId: SALON }))

    const convs = fakeDb.rows('conversations')
    // Keine zweite Konversation — die bestehende wird wiederverwendet.
    expect(convs).toHaveLength(1)
    expect(fakeDb.rows('messages')).toHaveLength(2)

    // Auf den Wert selbst laesst sich nicht pruefen: beide Aufrufe liegen in
    // derselben Millisekunde. Belegt wird, DASS beide Nachrichten den
    // Zeitstempel schreiben — und dass er `last_message_at` heisst.
    const touches = fakeDb.access.filter(
      a => a.table === 'conversations' && a.op === 'update',
    )
    expect(touches).toHaveLength(2)
    for (const t of touches) {
      expect(Object.keys(t.payload?.[0] ?? {})).toEqual(['last_message_at'])
    }
  })

  it('weist nicht authentifizierte Anfragen ab, ohne etwas zu schreiben', async () => {
    auth.session = null

    const res = await POST(send({ receiverId: RECEIVER, content: 'Hallo!' }))

    expect(res.status).toBe(401)
    expect(fakeDb.rows('conversations')).toHaveLength(0)
    expect(fakeDb.rows('messages')).toHaveLength(0)
  })

  it('legt keine Nachricht an, wenn die Konversation nicht angelegt werden kann', async () => {
    fakeDb.failOn('conversations.insert', { code: '42703', message: 'column does not exist' })

    const res = await POST(send({ receiverId: RECEIVER, content: 'Hallo!', salonId: SALON }))

    expect(res.status).toBe(500)
    expect(fakeDb.rows('messages')).toHaveLength(0)
  })
})
