// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { fakeDb, type Row } from '@/test/fake-supabase'
import { applyLiveSchema } from '@/test/live-schema'
import { NOTIFICATION_TABLE } from '@/lib/notifications'

/**
 * Zweite Haelfte der Mietanfrage-Kette (Track 7b, Punkt 1): Statuswechsel und
 * Persistenz.
 *
 * Der Weg bis zur gespeicherten Anfrage ist in route.e2e.test.ts abgedeckt.
 * Hier geht es um das, was danach passiert — und was bis jetzt ungetestet
 * war: wer den Status aendern darf, welche Wechsel erlaubt sind, und ob die
 * Gegenseite davon erfaehrt. Ohne die Benachrichtigung bliebe der
 * Anfragende auf „open" sitzen und wuesste nie von der Zusage.
 *
 * Die Benachrichtigung ist hier kein Beiwerk: sie geht in `notification_log`
 * — die Tabelle, die der Code bis 2026-08-23 unter dem falschen Namen
 * `notifications` ansprach, wodurch in Produktion jede dieser Meldungen
 * still ausfiel.
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

// ── Fixtures ────────────────────────────────────────────────────────────────

const OWNER_ID = '11111111-1111-4111-8111-111111111111'
const REQUESTER_ID = '22222222-2222-4222-8222-222222222222'
const STRANGER_ID = '99999999-9999-4999-8999-999999999999'
const REQUEST_ID = '33333333-3333-4333-8333-333333333333'
const EQUIPMENT_ID = '44444444-4444-4444-8444-444444444444'
const SALON_ID = '55555555-5555-4555-8555-555555555555'
const UNKNOWN_ID = '66666666-6666-4666-8666-666666666666'

type Handler = (req: NextRequest, ctx: unknown) => Promise<Response>
let patchRequest: Handler
let listRequests: (req: NextRequest) => Promise<Response>

beforeAll(async () => {
  patchRequest = (await import('@/app/api/rental-requests/[id]/route')).PATCH as unknown as Handler
  listRequests = (await import('@/app/api/rental-requests/route')).GET as unknown as (
    req: NextRequest,
  ) => Promise<Response>
})

function seedRequest(overrides: Row = {}): Row {
  const row: Row = {
    id: REQUEST_ID,
    equipment_id: EQUIPMENT_ID,
    salon_id: SALON_ID,
    requester_id: REQUESTER_ID,
    recipient_id: OWNER_ID,
    request_type: 'miete',
    preferred_date: '2026-09-15',
    preferred_time: '10:00',
    duration_unit: 'day',
    units: 3,
    message: 'Ich würde den Stuhl gern drei Tage mieten.',
    estimated_cents: 12000,
    status: 'open',
    created_at: '2026-08-20T09:00:00.000Z',
    ...overrides,
  }
  fakeDb.rows('rental_requests').push(row)
  return row
}

function seedDatabase() {
  fakeDb.reset()
  applyLiveSchema(fakeDb)
}

function jsonRequest(body?: unknown, url = 'https://www.chairmatch.de/api/rental-requests/x'): NextRequest {
  return {
    url,
    method: 'PATCH',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => {
      if (body === undefined) throw new Error('no body')
      return body
    },
  } as unknown as NextRequest
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

async function readJson(res: Response) {
  return { status: res.status, json: (await res.json()) as Record<string, unknown> }
}

const requests = () => fakeDb.rows('rental_requests')
const notifications = () => fakeDb.rows(NOTIFICATION_TABLE)

beforeEach(() => {
  seedDatabase()
  auth.session = { user: { id: OWNER_ID } }
})

// ── 1. Erlaubte Wechsel ─────────────────────────────────────────────────────

describe('PATCH /api/rental-requests/[id] — Statuswechsel', () => {
  it('laesst den Vermieter zusagen und benachrichtigt den Anfragenden', async () => {
    seedRequest()

    const { status, json } = await readJson(
      await patchRequest(jsonRequest({ status: 'accepted' }), ctx(REQUEST_ID)),
    )

    expect(status).toBe(200)
    expect((json.request as Row).status).toBe('accepted')
    // Persistenz: der Zustand steht in der Datenbank, nicht nur in der Antwort.
    expect(requests()[0].status).toBe('accepted')
    expect(requests()[0].updated_at).toBeTruthy()

    expect(notifications()).toHaveLength(1)
    const note = notifications()[0]
    expect(note.user_id).toBe(REQUESTER_ID)
    expect(String(note.title)).toContain('bestätigt')
    expect(note.reference_id).toBe(REQUEST_ID)
    expect(note.reference_type).toBe('rental_request')
    expect(note.type).toBe('booking')
  })

  it('laesst den Vermieter absagen und benachrichtigt den Anfragenden', async () => {
    seedRequest()

    const { status } = await readJson(
      await patchRequest(jsonRequest({ status: 'declined' }), ctx(REQUEST_ID)),
    )

    expect(status).toBe(200)
    expect(requests()[0].status).toBe('declined')
    expect(notifications()[0].user_id).toBe(REQUESTER_ID)
    expect(String(notifications()[0].title)).toContain('abgelehnt')
  })

  it('laesst den Anfragenden zurueckziehen und benachrichtigt den Vermieter', async () => {
    seedRequest()
    auth.session = { user: { id: REQUESTER_ID } }

    const { status } = await readJson(
      await patchRequest(jsonRequest({ status: 'withdrawn' }), ctx(REQUEST_ID)),
    )

    expect(status).toBe(200)
    expect(requests()[0].status).toBe('withdrawn')
    // Die Richtung dreht sich: hier erfaehrt der Vermieter davon.
    expect(notifications()[0].user_id).toBe(OWNER_ID)
    expect(String(notifications()[0].title)).toContain('zurückgezogen')
  })

  it('nennt eine Besichtigung in der Benachrichtigung auch so', async () => {
    seedRequest({ request_type: 'besichtigung', duration_unit: null, units: null })

    await patchRequest(jsonRequest({ status: 'accepted' }), ctx(REQUEST_ID))

    expect(String(notifications()[0].title)).toContain('Besichtigungsanfrage')
    expect(String(notifications()[0].title)).not.toContain('Mietanfrage')
  })

  it('kommt ohne Vermieter aus, wenn die Anfrage keinen hat', async () => {
    seedRequest({ recipient_id: null })
    auth.session = { user: { id: REQUESTER_ID } }

    const { status } = await readJson(
      await patchRequest(jsonRequest({ status: 'withdrawn' }), ctx(REQUEST_ID)),
    )

    expect(status).toBe(200)
    expect(requests()[0].status).toBe('withdrawn')
    expect(notifications()).toHaveLength(0)
  })
})

// ── 2. Berechtigungen ───────────────────────────────────────────────────────

describe('PATCH /api/rental-requests/[id] — wer darf was', () => {
  it('laesst Unbeteiligte gar nicht an die Anfrage', async () => {
    seedRequest()
    auth.session = { user: { id: STRANGER_ID } }

    const { status, json } = await readJson(
      await patchRequest(jsonRequest({ status: 'accepted' }), ctx(REQUEST_ID)),
    )

    expect(status).toBe(403)
    expect(String(json.error)).toContain('Kein Zugriff')
    expect(requests()[0].status).toBe('open')
    expect(notifications()).toHaveLength(0)
  })

  it('laesst den Anfragenden seine eigene Anfrage nicht zusagen', async () => {
    seedRequest()
    auth.session = { user: { id: REQUESTER_ID } }

    const { status, json } = await readJson(
      await patchRequest(jsonRequest({ status: 'accepted' }), ctx(REQUEST_ID)),
    )

    expect(status).toBe(403)
    expect(String(json.error)).toContain('Berechtigung')
    expect(requests()[0].status).toBe('open')
  })

  it('laesst den Vermieter die Anfrage nicht im Namen des Anfragenden zurueckziehen', async () => {
    seedRequest()

    const { status } = await readJson(
      await patchRequest(jsonRequest({ status: 'withdrawn' }), ctx(REQUEST_ID)),
    )

    expect(status).toBe(403)
    expect(requests()[0].status).toBe('open')
  })

  it('verlangt eine Anmeldung', async () => {
    seedRequest()
    auth.session = null

    const { status } = await readJson(
      await patchRequest(jsonRequest({ status: 'accepted' }), ctx(REQUEST_ID)),
    )

    expect(status).toBe(401)
    expect(requests()[0].status).toBe('open')
  })
})

// ── 3. Ungueltige Wechsel ───────────────────────────────────────────────────

describe('PATCH /api/rental-requests/[id] — ungueltige Wechsel', () => {
  it.each(['accepted', 'declined', 'withdrawn'])(
    'laesst eine bereits entschiedene Anfrage nicht auf %s umbiegen',
    async (next) => {
      seedRequest({ status: 'accepted' })
      auth.session = { user: { id: next === 'withdrawn' ? REQUESTER_ID : OWNER_ID } }

      const { status, json } = await readJson(
        await patchRequest(jsonRequest({ status: next }), ctx(REQUEST_ID)),
      )

      expect(status).toBe(409)
      expect(String(json.error)).toContain('bereits')
      expect(requests()[0].status).toBe('accepted')
      expect(notifications()).toHaveLength(0)
    },
  )

  it.each(['open', 'gelöscht', 'ACCEPTED', ''])('weist den Status %s ab', async (next) => {
    seedRequest()

    const { status } = await readJson(await patchRequest(jsonRequest({ status: next }), ctx(REQUEST_ID)))

    expect(status).toBe(400)
    expect(requests()[0].status).toBe('open')
  })

  it('antwortet auf eine unbekannte Anfrage mit 404', async () => {
    const { status } = await readJson(
      await patchRequest(jsonRequest({ status: 'accepted' }), ctx(UNKNOWN_ID)),
    )
    expect(status).toBe(404)
  })

  it('behandelt eine ID, die keine UUID ist, als 404 ohne DB-Zugriff', async () => {
    const { status } = await readJson(
      await patchRequest(jsonRequest({ status: 'accepted' }), ctx('1 OR 1=1')),
    )

    expect(status).toBe(404)
    expect(fakeDb.access.filter((a) => a.table === 'rental_requests')).toHaveLength(0)
  })

  it('lehnt einen kaputten JSON-Body ab', async () => {
    seedRequest()

    const { status, json } = await readJson(await patchRequest(jsonRequest(), ctx(REQUEST_ID)))

    expect(status).toBe(400)
    expect(String(json.error)).toContain('JSON')
    expect(requests()[0].status).toBe('open')
  })

  it('meldet einen DB-Ausfall ehrlich und aendert nichts', async () => {
    seedRequest()
    fakeDb.failOn('rental_requests.update', { code: '57014', message: 'statement timeout' })

    const { status, json } = await readJson(
      await patchRequest(jsonRequest({ status: 'accepted' }), ctx(REQUEST_ID)),
    )

    expect(status).toBe(500)
    expect(String(json.error)).toContain('nicht geändert')
    expect(requests()[0].status).toBe('open')
    // Keine Benachrichtigung ueber etwas, das nie passiert ist.
    expect(notifications()).toHaveLength(0)
  })
})

// ── 4. Persistenz ueber die Sichten ─────────────────────────────────────────

describe('GET /api/rental-requests — Mieter- und Vermietersicht', () => {
  function listRequest(role?: string): NextRequest {
    const url = role
      ? `https://www.chairmatch.de/api/rental-requests?role=${role}`
      : 'https://www.chairmatch.de/api/rental-requests'
    return { url, method: 'GET' } as unknown as NextRequest
  }

  it('zeigt dem Anfragenden seine eigenen Anfragen', async () => {
    seedRequest()
    seedRequest({ id: UNKNOWN_ID, requester_id: STRANGER_ID, recipient_id: STRANGER_ID })
    auth.session = { user: { id: REQUESTER_ID } }

    const { status, json } = await readJson(await listRequests(listRequest()))

    expect(status).toBe(200)
    const rows = json.requests as Row[]
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(REQUEST_ID)
  })

  it('zeigt dem Vermieter die eingegangenen Anfragen', async () => {
    seedRequest()

    const { json } = await readJson(await listRequests(listRequest('recipient')))

    const rows = json.requests as Row[]
    expect(rows).toHaveLength(1)
    expect(rows[0].recipient_id).toBe(OWNER_ID)
  })

  it('zeigt niemandem fremde Anfragen', async () => {
    seedRequest()
    auth.session = { user: { id: STRANGER_ID } }

    for (const role of [undefined, 'recipient']) {
      const { json } = await readJson(await listRequests(listRequest(role)))
      expect(json.requests).toHaveLength(0)
    }
  })

  it('behaelt den geaenderten Status ueber die Sicht hinweg', async () => {
    seedRequest()
    await patchRequest(jsonRequest({ status: 'accepted' }), ctx(REQUEST_ID))

    auth.session = { user: { id: REQUESTER_ID } }
    const { json } = await readJson(await listRequests(listRequest()))

    expect((json.requests as Row[])[0].status).toBe('accepted')
  })

  it('verlangt eine Anmeldung', async () => {
    auth.session = null
    const { status } = await readJson(await listRequests(listRequest()))
    expect(status).toBe(401)
  })

  it('meldet einen DB-Ausfall als Fehler statt eine leere Liste vorzutaeuschen', async () => {
    fakeDb.failOn('rental_requests.select', { code: '57014', message: 'statement timeout' })

    const { status, json } = await readJson(await listRequests(listRequest()))

    expect(status).toBe(500)
    expect(String(json.error)).toContain('nicht geladen')
  })
})
