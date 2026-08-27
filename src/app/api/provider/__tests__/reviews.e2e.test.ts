// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { fakeDb } from '@/test/fake-supabase'
import { applyLiveSchema } from '@/test/live-schema'

/**
 * GET /api/provider/reviews — die Reputation, die der Saloninhaber ueber sich
 * selbst zu sehen bekommt.
 *
 * Auf /anbieter/mein-salon/bewertungen stand bis Track 10 fest im Quelltext:
 *
 *     4,9 ★ · "von {count}"
 *     Anna K. ★★★★★ "Super Atmosphäre, sehr freundlich!"
 *     Max R.  ★★★★★ "Bester Salon in der Stadt. Komme wieder."
 *     Lisa M. ★★★★  "Toll, ein Stern Abzug wegen Wartezeit."
 *
 * Kein Abruf, kein Endpunkt, jedem Betreiber dieselben Zahlen. Ein Salon ohne
 * eine einzige Bewertung sah 47 davon. Diese Tests halten fest, dass die
 * Zahlen jetzt aus den echten Zeilen kommen — und was NICHT mitgeliefert wird.
 */

const auth = vi.hoisted(() => ({ session: null as { user?: { id?: string } } | null }))

vi.mock('@/modules/auth/auth.config', () => ({ auth: async () => auth.session }))

vi.mock('@/lib/supabase-server', async () => {
  const { fakeDb: db } = await import('@/test/fake-supabase')
  return { getSupabaseAdmin: () => db }
})

const OWNER = '11111111-1111-4111-8111-111111111111'
const OHNE_SALON = '99999999-9999-4999-8999-999999999999'
const SALON = '22222222-2222-4222-8222-222222222222'
const KUNDE = '33333333-3333-4333-8333-333333333333'

let GET: () => Promise<Response>

beforeAll(async () => {
  GET = (await import('@/app/api/provider/reviews/route')).GET as unknown as () => Promise<Response>
})

/** Eine Bewertungszeile inklusive der eingebetteten Profilzeile. */
function review(over: Record<string, unknown>) {
  return {
    id: over.id,
    salon_id: SALON,
    customer_id: KUNDE,
    booking_id: null,
    review_type: 'customer_to_salon',
    rating: 5,
    comment: null,
    reply: null,
    replied_at: null,
    reported_flag: false,
    reported_at: null,
    reported_by: null,
    created_at: '2026-08-01T10:00:00.000Z',
    customer: { full_name: 'Anna Kowalski' },
    ...over,
  }
}

function seed(reviews: Array<Record<string, unknown>>) {
  fakeDb.reset()
  applyLiveSchema(fakeDb)
  fakeDb.seed('salons', [
    { id: SALON, owner_id: OWNER, name: 'Salon Eins', city: 'Köln', slug: 'salon-eins', is_active: true, created_at: '2026-01-01T00:00:00.000Z' },
  ])
  fakeDb.seed('reviews', reviews)
  auth.session = { user: { id: OWNER } }
}

beforeEach(() => seed([]))

describe('GET /api/provider/reviews', () => {
  it('rechnet den Schnitt aus den echten Zeilen', async () => {
    seed([
      review({ id: 'r1', rating: 5 }),
      review({ id: 'r2', rating: 2 }),
    ])

    const body = await (await GET()).json()
    expect(body.reviewCount).toBe(2)
    expect(body.avgRating).toBe(3.5)
  })

  it('meldet "noch keine Bewertung" als null — nicht als 4,9', async () => {
    const body = await (await GET()).json()
    expect(body.reviewCount).toBe(0)
    expect(body.avgRating).toBeNull()
    expect(body.reviews).toEqual([])
  })

  it('laesst Miet-Bewertungen draussen — die sind double-blind', async () => {
    // Sie tragen aus Legacy-Gruenden dieselbe salon_id. Vor der Freischaltung
    // durch den Cron duerfen sie nirgends auftauchen; zaehlten sie hier mit,
    // waere die Sperre ueber den Anbieter-Bereich zu umgehen.
    seed([
      review({ id: 'r1', rating: 4, review_type: 'customer_to_salon' }),
      review({ id: 'r2', rating: 1, review_type: 'tenant_to_provider' }),
      review({ id: 'r3', rating: 1, review_type: 'provider_to_tenant' }),
    ])

    const body = await (await GET()).json()
    expect(body.reviews.map((r: { id: string }) => r.id)).toEqual(['r1'])
    expect(body.avgRating).toBe(4)
  })

  it('zaehlt Altzeilen ohne Typ als Kundenbewertung', async () => {
    seed([review({ id: 'r1', rating: 3, review_type: null })])
    const body = await (await GET()).json()
    expect(body.reviewCount).toBe(1)
  })

  it('liefert keine Konto-IDs mit', async () => {
    seed([review({ id: 'r1', reported_by: KUNDE })])
    const roh = JSON.stringify(await (await GET()).json())
    expect(roh).not.toContain('customer_id')
    expect(roh).not.toContain('reported_by')
    expect(roh).not.toContain(KUNDE)
  })

  it('kuerzt den Namen des Bewertenden', async () => {
    seed([review({ id: 'r1', customer: { full_name: 'Anna Kowalski' } })])
    const body = await (await GET()).json()
    expect(body.reviews[0].authorLabel).toBe('Anna K.')
  })

  it('kommt ohne Namen aus', async () => {
    seed([review({ id: 'r1', customer: null })])
    const body = await (await GET()).json()
    expect(body.reviews[0].authorLabel).toBe('Gast')
  })

  it('verlangt eine Anmeldung', async () => {
    auth.session = null
    expect((await GET()).status).toBe(401)
  })

  it('ist ohne Salon leer, aber kein Fehler — der Anbieter ist im Onboarding', async () => {
    auth.session = { user: { id: OHNE_SALON } }
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ salonId: null, reviewCount: 0, avgRating: null })
  })
})
