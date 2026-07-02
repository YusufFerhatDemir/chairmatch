// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  rankListings,
  scoreListing,
  normalizeCity,
  resolveWeights,
  type MatchCriteria,
  type MatchListing,
} from './match-engine'

function listing(overrides: Partial<MatchListing> & { salonOverrides?: Partial<NonNullable<MatchListing['salon']>> } = {}): MatchListing {
  const { salonOverrides, ...rest } = overrides
  return {
    id: 'l1',
    type: 'stuhl',
    name: 'Friseurstuhl',
    description: null,
    price_per_day_cents: 5000,
    price_per_month_cents: null,
    salon: {
      id: 's1',
      name: 'Salon Test',
      slug: 'salon-test',
      city: 'Berlin',
      avg_rating: 4.5,
      review_count: 20,
      is_verified: true,
      category: 'friseur',
      ...salonOverrides,
    },
    ...rest,
  }
}

const criteria: MatchCriteria = {
  beruf: 'friseur',
  stadt: 'Berlin',
  budgetProTagCents: 5000,
  arbeitstageProWoche: 4,
  mietdauer: 'tageweise',
}

describe('normalizeCity', () => {
  it('vergleicht umlaut- und case-insensitiv', () => {
    expect(normalizeCity('München')).toBe(normalizeCity('muenchen'))
    expect(normalizeCity(' Berlin ')).toBe(normalizeCity('berlin'))
  })
})

describe('resolveWeights', () => {
  it('summiert ohne Prioritäten auf 1', () => {
    const w = resolveWeights()
    const sum = Object.values(w).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 5)
  })

  it('erhöht das Gewicht der gewählten Dimension', () => {
    const base = resolveWeights()
    const prio = resolveWeights(['preis'])
    expect(prio.budget).toBeGreaterThan(base.budget)
    const sum = Object.values(prio).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 5)
  })
})

describe('scoreListing', () => {
  it('liefert Score zwischen 0 und 100 mit Gründen', () => {
    const r = scoreListing(criteria, listing())
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
    expect(r.gruende.length).toBeGreaterThan(0)
  })

  it('bewertet Stadt-Treffer höher als andere Stadt', () => {
    const inCity = scoreListing(criteria, listing())
    const otherCity = scoreListing(criteria, listing({ salonOverrides: { city: 'Hamburg' } }))
    expect(inCity.score).toBeGreaterThan(otherCity.score)
  })

  it('erkennt Budget-Überschreitung', () => {
    const teuer = scoreListing(criteria, listing({ price_per_day_cents: 9000 }))
    expect(teuer.preisEinschaetzung).toBe('ueber_budget')
    const guenstig = scoreListing(criteria, listing({ price_per_day_cents: 3000 }))
    expect(guenstig.preisEinschaetzung).toBe('unter_budget')
  })

  it('bewertet passenden Equipment-Typ höher (Friseur → Stuhl statt OP-Raum)', () => {
    const stuhl = scoreListing(criteria, listing())
    const opraum = scoreListing(criteria, listing({ type: 'opraum' }))
    expect(stuhl.score).toBeGreaterThan(opraum.score)
  })
})

describe('rankListings', () => {
  it('sortiert absteigend nach Score', () => {
    const ranked = rankListings(criteria, [
      listing({ id: 'schlecht', price_per_day_cents: 12000, salonOverrides: { city: 'Hamburg', is_verified: false, avg_rating: 2.5 } }),
      listing({ id: 'gut' }),
    ])
    expect(ranked[0].listing.id).toBe('gut')
    expect(ranked[0].match.score).toBeGreaterThanOrEqual(ranked[1].match.score)
  })
})
