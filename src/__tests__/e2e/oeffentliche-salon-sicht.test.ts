// @vitest-environment node
/**
 * E2E: was GET /api/salons/[id] oeffentlich herausgibt.
 *
 * Diese Route steht in `publicPrefixes` der Middleware und laeuft mit dem
 * Service-Client — sie umgeht RLS mit Absicht, weil `salons` fuer die Rolle
 * `anon` gar nicht lesbar ist. Damit ist die Spaltenliste der Route die
 * EINZIGE Zugangskontrolle, die es hier noch gibt.
 *
 * Bis Track 9 stand dort `select('*')`. Live fuehrt `salons` unter anderem
 * `email` (Kontaktadresse des Betreibers) und `owner_id` (die auth-ID, an der
 * Buchungen, Inserate und Auszahlungen haengen); `staff` fuehrt `user_id`.
 * Alle drei gingen an jeden anonymen Aufruf.
 *
 * Dass die Suite das nicht gesehen hat, lag am Nachbau: `select('a, b')` gab
 * dort bis zu diesem Track immer die ganze Zeile zurueck. Die Projektion im
 * Fake ist Teil dieses Fixes — ohne sie ist dieser Test wertlos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDb, getRequest, ctx, IDS } from './_harness/fixtures'
import type { FakeSupabase } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))

import { GET as salonGet } from '@/app/api/salons/[id]/route'

function db(): FakeSupabase {
  return state.db
}

/** Felder, die ein anonymer Aufruf nie zu sehen bekommen darf. */
const NIE_OEFFENTLICH = ['owner_id', 'email', 'status', 'gewerbe_check'] as const

function abrufen(idOderSlug: string) {
  return salonGet(
    getRequest(`https://www.chairmatch.de/api/salons/${idOderSlug}`),
    ctx({ id: idOderSlug }),
  )
}

beforeEach(() => {
  state.db = createDb()

  // Der Seed-Salon so, wie er live aussieht: mit Kontaktadresse, Inhaber-ID
  // und Moderationszustand.
  const salon = db().row('salons', IDS.salon)!
  Object.assign(salon, {
    email: 'inhaber@salon-sonnenschein.de',
    phone: '+4930123456',
    status: 'pending',
    gewerbe_check: false,
    description: 'Friseur in Berlin-Mitte',
  })

  db().rows('staff').push({
    id: '12121212-1212-4121-8121-121212121212',
    salon_id: IDS.salon,
    user_id: IDS.owner,
    name: 'Mira Schnitt',
    title: 'Stylistin',
    is_active: true,
  })
})

describe('GET /api/salons/[id] — oeffentliche Sicht', () => {
  it('findet den Salon ueber den Slug', async () => {
    const res = await abrufen('salon-sonnenschein')
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.id).toBe(IDS.salon)
    expect(body.name).toBe('Salon Sonnenschein')
  })

  it('findet den Salon auch ueber die ID', async () => {
    const res = await abrufen(IDS.salon)
    expect(res.status).toBe(200)
    expect(((await res.json()) as { slug: string }).slug).toBe('salon-sonnenschein')
  })

  it.each(NIE_OEFFENTLICH)('gibt %s nicht heraus', async (feld) => {
    const body = (await (await abrufen(IDS.salon)).json()) as Record<string, unknown>
    expect(Object.keys(body)).not.toContain(feld)
  })

  it('gibt die Kontaktdaten des Inhabers auch nicht im Rohtext preis', async () => {
    // Ein Feld umbenennen hilft nichts, wenn der Wert an anderer Stelle
    // wieder auftaucht (Einbettung, Alias, verschachtelte Relation).
    const roh = await (await abrufen(IDS.salon)).text()
    expect(roh).not.toContain('inhaber@salon-sonnenschein.de')
    expect(roh).not.toContain(IDS.owner)
  })

  it('liefert weiterhin, was die Buchungsseite braucht', async () => {
    const body = (await (await abrufen(IDS.salon)).json()) as Record<string, unknown>
    for (const feld of ['id', 'name', 'slug', 'category', 'city', 'phone', 'description']) {
      expect(body).toHaveProperty(feld)
    }
    expect(Array.isArray(body.services)).toBe(true)
    expect((body.services as unknown[]).length).toBeGreaterThan(0)
  })

  it('nennt Mitarbeitende mit Namen und Rolle, aber ohne Kontoschluessel', async () => {
    const body = (await (await abrufen(IDS.salon)).json()) as {
      staff: Record<string, unknown>[]
    }
    expect(body.staff).toHaveLength(1)
    expect(body.staff[0].name).toBe('Mira Schnitt')
    expect(body.staff[0].title).toBe('Stylistin')
    expect(Object.keys(body.staff[0])).not.toContain('user_id')
  })

  it('antwortet auf eine unbekannte ID mit 404 statt mit einer leeren Huelle', async () => {
    const res = await abrufen(IDS.unknown)
    expect(res.status).toBe(404)
  })
})
