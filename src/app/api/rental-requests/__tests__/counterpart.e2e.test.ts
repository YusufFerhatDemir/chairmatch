// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { fakeDb } from '@/test/fake-supabase'
import { applyLiveSchema } from '@/test/live-schema'

/**
 * GET /api/rental-requests — wer hat da eigentlich angefragt?
 *
 * Die Route lieferte bis 2026-08-27 nur die Anfragezeile. Der Vermieter sah
 * damit „Mietanfrage · Stuhl am Fenster" ohne jeden Namen und konnte gar
 * nicht entscheiden, wem er zusagt. Die Seite hat diese Luecke mit fuenf
 * erfundenen Interessentinnen zugedeckt („Marko F., Friseur, 5 Jahre
 * Berufserfahrung, Meisterbrief") — erfundene Menschen, ueber die eine echte
 * Entscheidung getroffen werden sollte.
 *
 * Jetzt traegt jede Anfrage `counterpart`: aus Vermietersicht der
 * Anfragende, aus Mietersicht der Vermieter.
 */

const auth = vi.hoisted(() => ({ session: null as { user?: { id?: string } } | null }))

vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => auth.session,
}))

vi.mock('@/lib/supabase-server', async () => {
  const { fakeDb: db } = await import('@/test/fake-supabase')
  return { getSupabaseAdmin: () => db }
})

const VERMIETER = '11111111-1111-4111-8111-111111111111'
const MIETER = '22222222-2222-4222-8222-222222222222'
const OHNE_NAME = '33333333-3333-4333-8333-333333333333'
const EQUIPMENT = '44444444-4444-4444-8444-444444444444'
const SALON = '55555555-5555-4555-8555-555555555555'

interface RequestRow {
  id: string
  counterpart: { id: string; fullName: string | null } | null
}

type Get = (req: NextRequest) => Promise<Response>
let GET: Get

beforeAll(async () => {
  GET = (await import('@/app/api/rental-requests/route')).GET as unknown as Get
})

function seed() {
  fakeDb.reset()
  applyLiveSchema(fakeDb)
  auth.session = { user: { id: VERMIETER } }

  fakeDb.seed('profiles', [
    { id: VERMIETER, email: 'anna@example.com', full_name: 'Anna Vermieterin' },
    { id: MIETER, email: 'marko@example.com', full_name: 'Marko Mieter' },
    { id: OHNE_NAME, email: 'ohne@example.com', full_name: null },
  ])
  fakeDb.seed('rental_requests', [
    {
      id: 'req-1', equipment_id: EQUIPMENT, salon_id: SALON,
      requester_id: MIETER, recipient_id: VERMIETER,
      request_type: 'miete', preferred_date: '2026-09-01', preferred_time: '10:00',
      duration_unit: 'day', units: 3, message: 'Drei Probetage bitte',
      estimated_cents: 27000, status: 'open',
      created_at: '2026-08-20T10:00:00.000Z', updated_at: '2026-08-20T10:00:00.000Z',
      rental_equipment: { name: 'Stuhl am Fenster', type: 'stuhl', salon_id: SALON },
    },
    {
      id: 'req-2', equipment_id: EQUIPMENT, salon_id: SALON,
      requester_id: OHNE_NAME, recipient_id: VERMIETER,
      request_type: 'besichtigung', preferred_date: '2026-09-05', preferred_time: null,
      duration_unit: null, units: null, message: null,
      estimated_cents: 0, status: 'open',
      created_at: '2026-08-21T10:00:00.000Z', updated_at: '2026-08-21T10:00:00.000Z',
      rental_equipment: { name: 'Stuhl am Fenster', type: 'stuhl', salon_id: SALON },
    },
  ])
}

async function call(query = ''): Promise<{ status: number; requests: RequestRow[] }> {
  const req = new Request(`http://localhost:3000/api/rental-requests${query}`) as unknown as NextRequest
  const res = await GET(req)
  const body = (await res.json()) as { requests?: RequestRow[] }
  return { status: res.status, requests: body.requests ?? [] }
}

beforeEach(seed)

describe('GET /api/rental-requests — Gegenseite', () => {
  it('nennt dem Vermieter den Namen des Anfragenden', async () => {
    const { status, requests } = await call('?role=recipient')
    expect(status).toBe(200)
    const eins = requests.find((r) => r.id === 'req-1')!
    expect(eins.counterpart).toEqual({ id: MIETER, fullName: 'Marko Mieter' })
  })

  it('erfindet keinen Namen, wenn im Profil keiner steht', async () => {
    const { requests } = await call('?role=recipient')
    const zwei = requests.find((r) => r.id === 'req-2')!
    expect(zwei.counterpart).toEqual({ id: OHNE_NAME, fullName: null })
  })

  it('nennt dem Mieter umgekehrt den Vermieter', async () => {
    auth.session = { user: { id: MIETER } }
    const { requests } = await call()
    expect(requests).toHaveLength(1)
    expect(requests[0].counterpart).toEqual({ id: VERMIETER, fullName: 'Anna Vermieterin' })
  })

  it('liefert fremde Anfragen nicht mit', async () => {
    auth.session = { user: { id: OHNE_NAME } }
    const { requests } = await call()
    expect(requests.map((r) => r.id)).toEqual(['req-2'])
  })

  it('liefert die Anfragen auch dann, wenn der Profil-Lookup ausfaellt', async () => {
    // Der Name ist Beiwerk. Faellt `profiles` aus, ist die Anfrage trotzdem
    // wichtiger als die Zeile daneben — aber es wird auch keiner erfunden.
    fakeDb.failOn('profiles.select', { code: '42501', message: 'permission denied' })
    const { status, requests } = await call('?role=recipient')
    expect(status).toBe(200)
    expect(requests).toHaveLength(2)
    expect(requests.every((r) => r.counterpart === null)).toBe(true)
  })

  it('antwortet ohne Session mit 401', async () => {
    auth.session = null
    const { status } = await call('?role=recipient')
    expect(status).toBe(401)
  })
})
