// @vitest-environment node
/**
 * Die oeffentliche Salonseite — Bilder und die Trennung „gibt es nicht" /
 * „konnte nicht geladen werden".
 *
 * Zwei Befunde aus Track C:
 *
 *  1. `salon_images` wurde auf dieser Seite NIE gelesen. Anbieter koennen
 *     ueber /provider/bilder Logo, Cover und Galerie hochladen
 *     (`POST /api/upload` schreibt die Zeilen), `/listings/[slug]` zeigt
 *     wenigstens das Logo — die Salonseite selbst zeigte einen Farbverlauf
 *     mit Platzhalter-Symbol und die Initialen des Salons.
 *
 *  2. Der gesamte Datenbankteil lag in `try { … } catch { notFound() }`, und
 *     der Fehler der Abfrage wurde nicht angesehen. Ein Lesefehler wurde
 *     damit zu „Seite nicht gefunden" — bei `revalidate = 300` bis zu fuenf
 *     Minuten lang, fuer alle, mit `noindex` im Kopf.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDb, IDS } from './_harness/fixtures'
import type { FakeSupabase } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/reviews/review.actions', () => ({ getReviews: async () => [] }))

import SalonDetailPage from '@/app/(public)/salon/[slug]/page'

function db(): FakeSupabase {
  return state.db
}

const SLUG = 'salon-sonnenschein'

/** Props, mit denen die Seite `SalonDetailClient` aufruft. */
async function clientProps(slug = SLUG): Promise<Record<string, unknown>> {
  const baum = (await SalonDetailPage({ params: Promise.resolve({ slug }) })) as {
    props: { children: { props: Record<string, unknown> }[] }
  }
  const kinder = baum.props.children as unknown as { props: Record<string, unknown> }[]
  const client = kinder.find(k => k?.props && 'salon' in k.props)
  if (!client) throw new Error('SalonDetailClient nicht im Baum gefunden')
  return client.props
}

beforeEach(() => {
  state.db = createDb()
  const salon = db().row('salons', IDS.salon)!
  Object.assign(salon, { slug: SLUG, is_active: true })
})

describe('Bilder des Salons', () => {
  it('reicht Logo, Cover und Galerie an die Seite durch', async () => {
    for (const [i, [typ, url]] of [
      ['logo', 'https://pwdbjqfpgumyfktbfswg.supabase.co/logo.jpg'],
      ['cover', 'https://pwdbjqfpgumyfktbfswg.supabase.co/cover.jpg'],
      ['gallery', 'https://pwdbjqfpgumyfktbfswg.supabase.co/g1.jpg'],
      ['gallery', 'https://pwdbjqfpgumyfktbfswg.supabase.co/g2.jpg'],
    ].entries()) {
      db().rows('salon_images').push({
        id: `aaaaaaaa-0000-4000-8000-00000000000${i}`,
        salon_id: IDS.salon,
        image_type: typ,
        url,
        sort_order: i,
        storage_path: `p${i}`,
        bucket: 'salon-images',
        uploaded_by: IDS.owner,
        created_at: '2026-08-01T00:00:00.000Z',
      })
    }

    const props = await clientProps()
    expect(props.images).toEqual({
      logo: 'https://pwdbjqfpgumyfktbfswg.supabase.co/logo.jpg',
      cover: 'https://pwdbjqfpgumyfktbfswg.supabase.co/cover.jpg',
      gallery: [
        'https://pwdbjqfpgumyfktbfswg.supabase.co/g1.jpg',
        'https://pwdbjqfpgumyfktbfswg.supabase.co/g2.jpg',
      ],
    })
  })

  it('kommt ohne Bilder aus — leer, nicht kaputt', async () => {
    const props = await clientProps()
    expect(props.images).toEqual({ logo: null, cover: null, gallery: [] })
  })

  it('kippt die Seite nicht, wenn die Bilder nicht lesbar sind', async () => {
    db().failOn('salon_images', 'select', {
      code: '42501',
      message: 'permission denied for table salon_images',
      details: null,
      hint: null,
    })

    const props = await clientProps()
    expect(props.salon).toBeTruthy()
    expect(props.images).toEqual({ logo: null, cover: null, gallery: [] })
  })
})

describe('Lesefehler ist kein 404', () => {
  it('wirft, statt "Salon nicht gefunden" zu behaupten', async () => {
    db().failOn('salons', 'select', {
      code: '08006',
      message: 'connection failure',
      details: null,
      hint: null,
    })

    await expect(
      SalonDetailPage({ params: Promise.resolve({ slug: SLUG }) }),
    ).rejects.toThrow(/nicht geladen/i)
  })

  it('ein unbekannter Slug bleibt ein 404', async () => {
    await expect(
      SalonDetailPage({ params: Promise.resolve({ slug: 'gibt-es-nicht' }) }),
    ).rejects.toThrow()
  })
})
