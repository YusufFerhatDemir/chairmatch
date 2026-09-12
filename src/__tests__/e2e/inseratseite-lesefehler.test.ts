// @vitest-environment node
/**
 * Die oeffentliche Inseratsseite `/listings/[slug]` — „gibt es nicht" ist
 * nicht dasselbe wie „konnte nicht geladen werden".
 *
 * `loadListing` gab bis zum 12.09.2026 bei JEDEM Ausgang `null` zurueck: der
 * unbekannte Slug, das abgeschaltete Inserat, der gesperrte Salon — und der
 * Verbindungsabbruch, das entzogene Recht, der Timeout. Der Rumpf
 * beantwortete alles davon mit `notFound()`.
 *
 * Die Folge trifft nur den Fehlerfall, dafuer hart: faellt die Datenbank aus,
 * antwortete jedes BESTEHENDE Inserat mit „Seite nicht gefunden". Die Seite
 * laeuft mit `revalidate = 600` — diese Auskunft stand damit bis zu zehn
 * Minuten fuer alle Besucher und fuer jeden Crawler, der in dem Fenster
 * vorbeikam.
 *
 * `src/app/(public)/salon/[slug]/page.tsx` hatte dieselbe Falle und hat sie
 * in Track C abgeraeumt (siehe `salonseite-bilder.test.ts`, „Lesefehler ist
 * kein 404"). Diese Route war die letzte mit der alten Form; dieser Test
 * haelt beide Faelle auseinander.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDb, IDS } from './_harness/fixtures'
import type { FakeSupabase } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))

import ListingDetailPage, { generateMetadata } from '@/app/(public)/listings/[slug]/page'

function db(): FakeSupabase {
  return state.db
}

/** Der Slug ist hier die `services.id` — die Route schlaegt beides nach. */
const SLUG = IDS.service

beforeEach(() => {
  state.db = createDb()
  const salon = db().row('salons', IDS.salon)!
  Object.assign(salon, { is_active: true })
})

describe('Lesefehler ist kein 404', () => {
  it('wirft, wenn das Inserat selbst nicht lesbar ist', async () => {
    db().failOn('services', 'select', {
      code: '08006',
      message: 'connection failure',
      details: null,
      hint: null,
    })

    await expect(
      ListingDetailPage({ params: Promise.resolve({ slug: SLUG }) }),
    ).rejects.toThrow(/nicht geladen/i)
  })

  it('wirft, wenn der Salon dahinter nicht lesbar ist', async () => {
    // Das Inserat wird gefunden, erst der zweite Zugriff faellt aus. Genau
    // dieser Fall verschwand vorher in `return null` und wurde zu 404.
    db().failOn('salons', 'select', {
      code: '42501',
      message: 'permission denied for table salons',
      details: null,
      hint: null,
    })

    await expect(
      ListingDetailPage({ params: Promise.resolve({ slug: SLUG }) }),
    ).rejects.toThrow(/nicht geladen/i)
  })

  it('meldet den Lesefehler nicht als „nicht gefunden" in den Metadaten', async () => {
    db().failOn('services', 'select', {
      code: '08006',
      message: 'connection failure',
      details: null,
      hint: null,
    })

    // Die Metadaten duerfen nicht werfen — sonst gibt es keine Seite, auf der
    // `(public)/error.tsx` „bitte neu versuchen" sagen koennte. `noindex`
    // gehoert trotzdem hin: was hier steht, ist keine gueltige Seite.
    const meta = await generateMetadata({ params: Promise.resolve({ slug: SLUG }) })
    expect(meta.robots).toMatchObject({ index: false })
  })
})

describe('„gibt es nicht" bleibt 404', () => {
  it('bei einem unbekannten Slug', async () => {
    await expect(
      ListingDetailPage({ params: Promise.resolve({ slug: IDS.unknown }) }),
    ).rejects.toThrow()
  })

  it('bei einem abgeschalteten Inserat', async () => {
    db().row('services', IDS.service)!.is_active = false

    await expect(
      ListingDetailPage({ params: Promise.resolve({ slug: SLUG }) }),
    ).rejects.toThrow()
  })

  it('bei einem gesperrten Salon — das Inserat gibt es, oeffentlich ist es nicht', async () => {
    db().row('salons', IDS.salon)!.is_active = false

    await expect(
      ListingDetailPage({ params: Promise.resolve({ slug: SLUG }) }),
    ).rejects.toThrow()
  })
})
