// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { fakeDb } from '@/test/fake-supabase'
import { applyLiveSchema } from '@/test/live-schema'

/**
 * Nachrichten — Kette Route → Datenbank, gegen das Produktionsschema.
 *
 * Zwei Ausfaelle, die diese Datei festnagelt:
 *
 *   1. Spaltenname (2026-08-24): `conversations` fuehrt live
 *      `last_message_at`, der Code sprach `updated_at` an → 42703 → GET
 *      lieferte jedem eingeloggten Nutzer 500, POST konnte keine
 *      Konversation anlegen.
 *
 *   2. Fehlende Pflichtspalten (2026-08-27): `messages.receiver_id`,
 *      `conversations.customer_id` und `.provider_id` sind live NOT NULL,
 *      der Code schrieb keine davon → jeder INSERT lief in 23502, POST
 *      antwortete 500, und das ChatWidget verschluckte den Fehlschlag
 *      wortlos. Diese Klasse konnte die Suite vorher gar nicht sehen: die
 *      Spaltenliste faengt die ERFUNDENE Spalte, nicht die VERGESSENE.
 *      Deshalb kennt die Fake-DB jetzt NOT NULL (siehe LIVE_NOT_NULL).
 *
 * Und die stille Halbwahrheit im Postfach: GET lud den Gespraechspartner
 * ueber `conversation_participants!inner` mit einem Filter auf `user_id`.
 * PostgREST filtert damit auch die eingebetteten Zeilen — in der Liste stand
 * immer nur der Anfragende selbst, jede Konversation hiess "Unbekannt".
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

const RECEIVER = '22222222-2222-4222-8222-222222222222'
const SALON = '33333333-3333-4333-8333-333333333333'
const STRANGER = '44444444-4444-4444-8444-444444444444'

/**
 * Frische Absender-ID je Test. Das Rate-Limit in der Route liegt im
 * Modulspeicher und zaehlt pro User — mit einer festen ID wuerden sich die
 * Tests gegenseitig ins Limit schieben.
 */
let senderSeq = 0
let SENDER = ''

type Post = (req: NextRequest) => Promise<Response>
type Get = () => Promise<Response>
type GetOne = (
  req: NextRequest,
  ctx: { params: Promise<{ conversationId: string }> },
) => Promise<Response>

let POST: Post
let GET: Get
let GET_ONE: GetOne

beforeAll(async () => {
  const mod = await import('@/app/api/messages/route')
  POST = mod.POST as unknown as Post
  GET = mod.GET as unknown as Get
  GET_ONE = (await import('@/app/api/messages/[conversationId]/route'))
    .GET as unknown as GetOne
})

beforeEach(() => {
  fakeDb.reset()
  // Ohne das nimmt die Fake-DB jede erfundene Spalte an — genau so blieb
  // `conversations.updated_at` unentdeckt. Und ohne die NOT-NULL-Liste
  // darin blieb der fehlende `receiver_id` unentdeckt.
  applyLiveSchema(fakeDb)
  senderSeq += 1
  SENDER = `11111111-1111-4111-8111-${String(senderSeq).padStart(12, '0')}`
  auth.session = { user: { id: SENDER } }
  seedProfile(RECEIVER, 'Salon Anna')
  seedProfile(STRANGER, 'Fremde Person')
  fakeDb.seed('salons', [{ id: SALON, name: 'Salon Anna' }])
})

function seedProfile(id: string, name: string) {
  fakeDb.seed('profiles', [
    { id, email: `${id}@example.test`, full_name: name, avatar_url: null, deleted_at: null, delete_requested_at: null },
  ])
}

function send(body: unknown): NextRequest {
  return new Request('http://localhost:3000/api/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

function detailReq(): NextRequest {
  return new Request('http://localhost:3000/api/messages/x') as unknown as NextRequest
}

// ---------------------------------------------------------------------------
// POST — Faden starten
// ---------------------------------------------------------------------------

describe('POST /api/messages — neuer Faden', () => {
  it('legt Konversation, Teilnehmer und Nachricht an', async () => {
    const res = await POST(send({ receiverId: RECEIVER, content: 'Hallo!', salonId: SALON }))

    expect(res.status).toBe(201)

    const convs = fakeDb.rows('conversations')
    expect(convs).toHaveLength(1)
    // Der Zeitstempel steht in `last_message_at`. Mit `updated_at` waere der
    // Insert in 42703 gelaufen.
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

  it('schreibt die live NOT-NULL-Spalten customer_id, provider_id und receiver_id', async () => {
    // Der eigentliche Regressionsanker fuer 2026-08-27. Fehlt eine davon,
    // antwortet die Fake-DB mit 23502 — wie Postgres — und der Test oben
    // faellt schon durch. Hier stehen die Werte selbst, damit auch eine
    // falsche Belegung auffaellt.
    const res = await POST(send({ receiverId: RECEIVER, content: 'Hallo!', salonId: SALON }))
    expect(res.status).toBe(201)

    expect(fakeDb.rows('conversations')[0]).toMatchObject({
      customer_id: SENDER,
      provider_id: RECEIVER,
      salon_id: SALON,
    })
    expect(fakeDb.rows('messages')[0]).toMatchObject({
      sender_id: SENDER,
      receiver_id: RECEIVER,
    })
  })

  it('legt bei der zweiten Nachricht keine zweite Konversation an', async () => {
    await POST(send({ receiverId: RECEIVER, content: 'Erste', salonId: SALON }))
    await POST(send({ receiverId: RECEIVER, content: 'Zweite', salonId: SALON }))

    expect(fakeDb.rows('conversations')).toHaveLength(1)
    expect(fakeDb.rows('messages')).toHaveLength(2)

    // Auf den Wert des Zeitstempels laesst sich nicht pruefen: beide Aufrufe
    // liegen in derselben Millisekunde. Belegt wird, DASS beide Nachrichten
    // ihn schreiben — und dass er `last_message_at` heisst.
    const touches = fakeDb.access.filter(a => a.table === 'conversations' && a.op === 'update')
    expect(touches).toHaveLength(2)
    for (const t of touches) {
      expect(Object.keys(t.payload?.[0] ?? {})).toEqual(['last_message_at'])
    }
  })

  it('haengt sich an den bestehenden Faden, wenn die UNIQUE-Regel zuschlaegt', async () => {
    // Live liegt `UNIQUE(customer_id, provider_id)` auf `conversations`.
    // Zwei gleichzeitige erste Nachrichten laufen deshalb in 23505 — die
    // Verliererin darf dem Nutzer keinen Fehler zeigen, sondern gehoert in
    // den Faden der Gewinnerin.
    fakeDb.addUniqueIndex('conversations', ['customer_id', 'provider_id'], 'conversations_pair_key')

    const convId = '99999999-9999-4999-8999-999999999999'
    fakeDb.seed('conversations', [
      { id: convId, customer_id: SENDER, provider_id: RECEIVER, salon_id: null, created_at: '2026-08-01T00:00:00.000Z', last_message_at: '2026-08-01T00:00:00.000Z' },
    ])
    // Absichtlich OHNE Teilnehmerzeilen: dadurch findet die Vorab-Suche
    // nichts, der Insert laeuft los und prallt an der UNIQUE-Regel ab.

    const res = await POST(send({ receiverId: RECEIVER, content: 'Hallo!' }))

    expect(res.status).toBe(201)
    expect(fakeDb.rows('conversations')).toHaveLength(1)
    expect(fakeDb.rows('messages')[0].conversation_id).toBe(convId)
  })

  it('raeumt die Konversation wieder ab, wenn die Teilnehmer nicht angelegt werden koennen', async () => {
    fakeDb.failOn('conversation_participants.insert', { code: '23503', message: 'fk violation' })

    const res = await POST(send({ receiverId: RECEIVER, content: 'Hallo!' }))

    expect(res.status).toBe(500)
    // Eine Konversation ohne Teilnehmer waere fuer beide Seiten unsichtbar
    // und nie wieder auffindbar.
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

// ---------------------------------------------------------------------------
// POST — Eingangspruefungen
// ---------------------------------------------------------------------------

describe('POST /api/messages — Eingangspruefungen', () => {
  it('weist nicht authentifizierte Anfragen ab, ohne etwas zu schreiben', async () => {
    auth.session = null

    const res = await POST(send({ receiverId: RECEIVER, content: 'Hallo!' }))

    expect(res.status).toBe(401)
    expect(fakeDb.rows('conversations')).toHaveLength(0)
    expect(fakeDb.rows('messages')).toHaveLength(0)
  })

  it('verlangt einen Adressaten', async () => {
    const res = await POST(send({ content: 'Hallo!' }))
    expect(res.status).toBe(400)
    expect(fakeDb.rows('messages')).toHaveLength(0)
  })

  it('weist leeren Inhalt ab', async () => {
    const res = await POST(send({ receiverId: RECEIVER, content: '   ' }))
    expect(res.status).toBe(400)
    expect(fakeDb.rows('messages')).toHaveLength(0)
  })

  it('weist Nachrichten ueber 5000 Zeichen ab', async () => {
    const res = await POST(send({ receiverId: RECEIVER, content: 'x'.repeat(5001) }))
    expect(res.status).toBe(400)
    expect(fakeDb.rows('messages')).toHaveLength(0)
  })

  it('weist die Nachricht an sich selbst ab', async () => {
    const res = await POST(send({ receiverId: SENDER, content: 'Hallo!' }))
    expect(res.status).toBe(400)
    expect(fakeDb.rows('conversations')).toHaveLength(0)
  })

  it('weist einen Empfaenger ab, den es nicht gibt', async () => {
    // Vorher nahm die Route jede UUID an und legte eine Konversation mit
    // einem Phantom an.
    const res = await POST(send({
      receiverId: '55555555-5555-4555-8555-555555555555',
      content: 'Hallo!',
    }))

    expect(res.status).toBe(404)
    expect(fakeDb.rows('conversations')).toHaveLength(0)
    expect(fakeDb.rows('messages')).toHaveLength(0)
  })

  it('weist ein zur Loeschung angemeldetes Konto ab', async () => {
    const gone = '66666666-6666-4666-8666-666666666666'
    fakeDb.seed('profiles', [
      { id: gone, email: null, full_name: 'Gelöscht', avatar_url: null, deleted_at: null, delete_requested_at: '2026-08-20T00:00:00.000Z' },
    ])

    const res = await POST(send({ receiverId: gone, content: 'Hallo!' }))

    expect(res.status).toBe(410)
    expect(fakeDb.rows('messages')).toHaveLength(0)
  })

  it('weist ein hart geloeschtes Konto ab', async () => {
    const gone = '77777777-7777-4777-8777-777777777777'
    fakeDb.seed('profiles', [
      { id: gone, email: null, full_name: 'Gelöscht', avatar_url: null, deleted_at: '2026-08-20T00:00:00.000Z', delete_requested_at: '2026-07-20T00:00:00.000Z' },
    ])

    const res = await POST(send({ receiverId: gone, content: 'Hallo!' }))

    expect(res.status).toBe(410)
    expect(fakeDb.rows('messages')).toHaveLength(0)
  })

  it('weist einen Salon ab, den es nicht gibt', async () => {
    // `conversations.salon_id` hat live einen Fremdschluessel — ohne diese
    // Pruefung bekam der Nutzer fuer seine eigene Falscheingabe einen 500.
    const res = await POST(send({
      receiverId: RECEIVER,
      content: 'Hallo!',
      salonId: '00000000-0000-4000-8000-0000000000ff',
    }))

    expect(res.status).toBe(400)
    expect(fakeDb.rows('conversations')).toHaveLength(0)
    expect(fakeDb.rows('messages')).toHaveLength(0)
  })

  it('bremst nach 20 Nachriten pro Minute', async () => {
    for (let i = 0; i < 20; i++) {
      const ok = await POST(send({ receiverId: RECEIVER, content: `Nr ${i}` }))
      expect(ok.status).toBe(201)
    }

    const res = await POST(send({ receiverId: RECEIVER, content: 'einundzwanzig' }))

    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBeTruthy()
    expect(fakeDb.rows('messages')).toHaveLength(20)
  })
})

// ---------------------------------------------------------------------------
// POST — Antwort im bestehenden Faden (conversationId)
// ---------------------------------------------------------------------------

describe('POST /api/messages — Antwort per conversationId', () => {
  const CONV = '88888888-8888-4888-8888-888888888888'

  function seedConversation(members: string[]) {
    fakeDb.seed('conversations', [
      { id: CONV, customer_id: members[0], provider_id: members[1] ?? members[0], salon_id: SALON, created_at: '2026-08-01T00:00:00.000Z', last_message_at: '2026-08-01T00:00:00.000Z' },
    ])
    fakeDb.seed(
      'conversation_participants',
      members.map((user_id, i) => ({ id: `p${i}`, conversation_id: CONV, user_id })),
    )
  }

  it('leitet den Empfaenger aus den Teilnehmern ab', async () => {
    // Das ChatWidget zog `receiverId` vorher aus `otherUser.id` — im
    // Postfach war der immer null, und dann brach das Senden ab, nachdem
    // das Eingabefeld schon geleert war.
    seedConversation([SENDER, RECEIVER])

    const res = await POST(send({ conversationId: CONV, content: 'Antwort' }))

    expect(res.status).toBe(201)
    expect(fakeDb.rows('messages')[0]).toMatchObject({
      conversation_id: CONV,
      sender_id: SENDER,
      receiver_id: RECEIVER,
    })
    // Kein zweiter Faden.
    expect(fakeDb.rows('conversations')).toHaveLength(1)
  })

  it('weist Fremde ab, ohne etwas zu schreiben', async () => {
    seedConversation([RECEIVER, STRANGER])

    const res = await POST(send({ conversationId: CONV, content: 'Reinreden' }))

    expect(res.status).toBe(403)
    expect(fakeDb.rows('messages')).toHaveLength(0)
  })

  it('verweigert einen Faden ohne eindeutiges Gegenueber', async () => {
    // `messages.receiver_id` ist einwertig — ein Faden mit drei Leuten
    // liesse sich nicht ehrlich eintragen.
    seedConversation([SENDER, RECEIVER, STRANGER])

    const res = await POST(send({ conversationId: CONV, content: 'An wen?' }))

    expect(res.status).toBe(409)
    expect(fakeDb.rows('messages')).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// GET /api/messages — Postfach
// ---------------------------------------------------------------------------

describe('GET /api/messages', () => {
  const MINE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const FOREIGN = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

  function seedInbox() {
    fakeDb.seed('conversations', [
      { id: MINE, customer_id: SENDER, provider_id: RECEIVER, salon_id: SALON, created_at: '2026-08-01T00:00:00.000Z', last_message_at: '2026-08-02T00:00:00.000Z' },
      { id: FOREIGN, customer_id: RECEIVER, provider_id: STRANGER, salon_id: null, created_at: '2026-08-01T00:00:00.000Z', last_message_at: '2026-08-03T00:00:00.000Z' },
    ])
    fakeDb.seed('conversation_participants', [
      { id: 'p1', conversation_id: MINE, user_id: SENDER },
      { id: 'p2', conversation_id: MINE, user_id: RECEIVER },
      { id: 'p3', conversation_id: FOREIGN, user_id: RECEIVER },
      { id: 'p4', conversation_id: FOREIGN, user_id: STRANGER },
    ])
    fakeDb.seed('messages', [
      { id: 'm1', conversation_id: MINE, sender_id: SENDER, receiver_id: RECEIVER, content: 'Erste', is_read: true, created_at: '2026-08-01T10:00:00.000Z' },
      { id: 'm2', conversation_id: MINE, sender_id: RECEIVER, receiver_id: SENDER, content: 'Antwort', is_read: false, created_at: '2026-08-02T10:00:00.000Z' },
      { id: 'm3', conversation_id: MINE, sender_id: RECEIVER, receiver_id: SENDER, content: 'Und noch was', is_read: false, created_at: '2026-08-02T11:00:00.000Z' },
      { id: 'm4', conversation_id: FOREIGN, sender_id: RECEIVER, receiver_id: STRANGER, content: 'Geht dich nichts an', is_read: false, created_at: '2026-08-03T10:00:00.000Z' },
    ])
  }

  it('nennt den Gespraechspartner beim Namen', async () => {
    // Der Regressionsanker fuer den eingebetteten Filter: hier stand vorher
    // ausnahmslos `otherUser: null`.
    seedInbox()

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body).toHaveLength(1)
    expect(body[0].otherUser).toMatchObject({ id: RECEIVER, full_name: 'Salon Anna' })
    expect(body[0].salonName).toBe('Salon Anna')
  })

  it('zeigt nur eigene Konversationen', async () => {
    seedInbox()

    const body = await (await GET()).json()

    expect(body.map((c: { id: string }) => c.id)).toEqual([MINE])
  })

  it('zaehlt nur fremde ungelesene Nachrichten und zeigt die neueste als Vorschau', async () => {
    seedInbox()

    const body = await (await GET()).json()

    expect(body[0].unreadCount).toBe(2)
    expect(body[0].lastMessage).toMatchObject({ content: 'Und noch was', senderId: RECEIVER })
  })

  it('liefert ein leeres Postfach als leere Liste, nicht als Fehler', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('weist nicht authentifizierte Anfragen ab', async () => {
    auth.session = null
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('meldet einen Datenbankfehler als 500 statt als leeres Postfach', async () => {
    fakeDb.failOn('conversation_participants.select', { code: '42703', message: 'boom' })

    const res = await GET()

    expect(res.status).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// GET /api/messages/[conversationId] — Verlauf
// ---------------------------------------------------------------------------

describe('GET /api/messages/[conversationId]', () => {
  const CONV = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

  function seedThread(members: string[]) {
    fakeDb.seed('conversations', [
      { id: CONV, customer_id: members[0], provider_id: members[1], salon_id: null, created_at: '2026-08-01T00:00:00.000Z', last_message_at: '2026-08-02T00:00:00.000Z' },
    ])
    fakeDb.seed(
      'conversation_participants',
      members.map((user_id, i) => ({ id: `q${i}`, conversation_id: CONV, user_id })),
    )
    fakeDb.seed('messages', [
      { id: 'n1', conversation_id: CONV, sender_id: members[1], receiver_id: members[0], content: 'Hallo', is_read: false, created_at: '2026-08-02T10:00:00.000Z' },
    ])
  }

  it('nennt currentUserId, damit die eigene Seite nicht geraten werden muss', async () => {
    // Ohne das Feld bestimmte das Widget die eigene Seite ueber
    // `sender_id !== otherUser?.id`. War `otherUser` null, galt JEDE
    // Nachricht als selbst geschrieben — auch die des Gegenuebers.
    seedThread([SENDER, RECEIVER])

    const res = await GET_ONE(detailReq(), { params: Promise.resolve({ conversationId: CONV }) })
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.currentUserId).toBe(SENDER)
    expect(body.otherUser).toMatchObject({ id: RECEIVER })
    expect(body.messages).toHaveLength(1)
  })

  it('markiert fremde Nachrichten als gelesen', async () => {
    seedThread([SENDER, RECEIVER])

    await GET_ONE(detailReq(), { params: Promise.resolve({ conversationId: CONV }) })

    expect(fakeDb.rows('messages')[0].is_read).toBe(true)
  })

  it('verweigert Fremden den Verlauf, ohne Nachrichten zu lesen', async () => {
    seedThread([RECEIVER, STRANGER])

    const res = await GET_ONE(detailReq(), { params: Promise.resolve({ conversationId: CONV }) })

    expect(res.status).toBe(403)
    const readAccess = fakeDb.access.filter(a => a.table === 'messages')
    expect(readAccess).toHaveLength(0)
  })
})
