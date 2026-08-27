// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fakeDb } from '@/test/fake-supabase'
import { applyLiveSchema } from '@/test/live-schema'

/**
 * Track 10 — was der Nutzer ueber sich selbst und ueber freie Zeiten erfaehrt.
 *
 * Drei Befunde, die alle dieselbe Form haben: eine Zahl im Quelltext, die
 * aussieht wie eine Auskunft aus der Datenbank.
 *
 *  1. /anbieter/mein-salon/bewertungen zeigte fest "4,9 ★", "47" und drei
 *     erfundene Rezensionen — jedem Saloninhaber dieselben, auch dem, der
 *     noch nie bewertet wurde.
 *  2. /anbieter/mein-salon/services zeigte fest "0" aktive Leistungen, auch
 *     bei acht gepflegten. Die umgekehrte Erfindung: eine Null, die keine ist.
 *  3. /booking/[salonId] bot ein festes Raster 09:00–18:30 an, ohne
 *     Oeffnungszeiten, Bestandsbuchungen oder Uhrzeit zu kennen.
 *
 * Dazu die Spaltenliste von `getReviews`: sie stand auf `*` und lieferte
 * `customer_id` und `reported_by` an jeden Aufrufer von
 * `GET /api/reviews?salonId=`.
 */

vi.mock('@/lib/supabase-server', async () => {
  const { fakeDb: db } = await import('@/test/fake-supabase')
  return { getSupabaseAdmin: () => db }
})

const SRC = join(process.cwd(), 'src')
const lies = (p: string) => readFileSync(join(SRC, p), 'utf8')

/** Kommentare beschreiben hier absichtlich die alten Werte — die zaehlen nicht. */
function ohneKommentare(quelltext: string): string {
  return quelltext
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

describe('Anbieter-Bereich zeigt keine erfundene Reputation', () => {
  const code = ohneKommentare(lies('app/(public)/anbieter/mein-salon/bewertungen/page.tsx'))

  it('enthaelt keine feste Sternezahl und keinen festen Bewertungszaehler mehr', () => {
    expect(code).not.toMatch(/4,9\s*★/)
    expect(code).not.toMatch(/\bn:\s*47\b/)
  })

  it('enthaelt keine erfundenen Rezensionen mehr', () => {
    for (const erfunden of ['Anna K.', 'Max R.', 'Lisa M.', 'Super Atmosphäre', 'Bester Salon in der Stadt']) {
      expect(code).not.toContain(erfunden)
    }
  })

  it('holt die Zahlen aus dem eigenen Endpunkt', () => {
    expect(code).toContain('/api/provider/reviews')
  })
})

describe('Anbieter-Bereich zeigt den echten Leistungsbestand', () => {
  const code = ohneKommentare(lies('app/(public)/anbieter/mein-salon/services/page.tsx'))

  it('holt den Bestand, statt eine Null zu behaupten', () => {
    expect(code).toContain('/api/provider/services')
  })

  it('haengt den Knopf an eine Aktion — er war ein <GoldButton> ohne onClick', () => {
    expect(code).toMatch(/<GoldButton\s+onClick=/)
  })
})

describe('Buchungsstrecken fragen nach echten freien Zeiten', () => {
  for (const seite of [
    'app/(protected)/booking/[salonId]/page.tsx',
    'app/(public)/salon/[slug]/buchen/page.tsx',
  ]) {
    it(`${seite} fragt /api/availability`, () => {
      expect(ohneKommentare(lies(seite))).toContain('/api/availability')
    })

    it(`${seite} traegt kein festes Slot-Raster mehr`, () => {
      const code = ohneKommentare(lies(seite))
      // Das alte Raster: eine Literal-Liste aus Uhrzeiten. Zwei benachbarte
      // Zeit-Literale in einem Array sind das verraeterische Muster.
      expect(code).not.toMatch(/'\d{2}:\d{2}',\s*'\d{2}:\d{2}'/)
    })
  }
})

// ── Verhalten: was `getReviews` wirklich ausliefert ────────────────────────

const SALON = '22222222-2222-4222-8222-222222222222'
const KUNDE = '33333333-3333-4333-8333-333333333333'

let getReviews: (salonId: string) => Promise<unknown[]>

// Der Import zieht die halbe Modulkette mit und braucht kalt deutlich mehr
// als die 10 Sekunden Standard-Hook-Timeout — die Datei war deshalb schon vor
// Track 13 rot, ohne dass an ihr etwas kaputt gewesen waere.
beforeAll(async () => {
  getReviews = (await import('@/modules/reviews/review.actions')).getReviews as unknown as typeof getReviews
}, 60_000)

beforeEach(() => {
  fakeDb.reset()
  applyLiveSchema(fakeDb)
  fakeDb.seed('reviews', [
    {
      id: 'r1',
      salon_id: SALON,
      customer_id: KUNDE,
      booking_id: null,
      review_type: 'customer_to_salon',
      rating: 5,
      comment: 'Sehr zufrieden',
      reply: null,
      replied_at: null,
      reported_flag: true,
      reported_at: '2026-08-20T10:00:00.000Z',
      reported_by: KUNDE,
      created_at: '2026-08-01T10:00:00.000Z',
      customer: { full_name: 'Anna Kowalski' },
    },
  ])
})

describe('getReviews liefert keine Konto-IDs mit', () => {
  it('gibt weder customer_id noch reported_by heraus', async () => {
    const [zeile] = (await getReviews(SALON)) as Array<Record<string, unknown>>
    expect(zeile).toBeDefined()
    expect(zeile).not.toHaveProperty('customer_id')
    expect(zeile).not.toHaveProperty('reported_by')
    expect(zeile).not.toHaveProperty('reported_at')
    expect(zeile).not.toHaveProperty('reported_flag')
  })

  it('liefert weiterhin, was die Salonseite anzeigt', () => {
    return getReviews(SALON).then(rows => {
      expect(rows[0]).toMatchObject({
        id: 'r1',
        rating: 5,
        comment: 'Sehr zufrieden',
        customer: { full_name: 'Anna Kowalski' },
      })
    })
  })
})
