/**
 * Match-Engine: deterministischer Scoring-Algorithmus für den Match-Finder.
 * Pure Funktionen ohne I/O — vollständig unit-testbar.
 */

export type Beruf = 'friseur' | 'barber' | 'kosmetik' | 'lash' | 'nail' | 'massage' | 'arzt'
export type Mietdauer = 'tageweise' | 'monatlich'
export type Prioritaet = 'preis' | 'lage' | 'bewertung' | 'ausstattung'
export type EquipmentType = 'stuhl' | 'liege' | 'raum' | 'opraum'
export type PreisEinschaetzung = 'unter_budget' | 'im_budget' | 'ueber_budget'

export interface MatchCriteria {
  beruf: Beruf
  stadt: string
  budgetProTagCents: number
  arbeitstageProWoche: number
  mietdauer: Mietdauer
  prioritaeten?: Prioritaet[]
}

export interface MatchSalon {
  id: string
  name: string
  slug: string | null
  city: string | null
  avg_rating: number | null
  review_count: number | null
  is_verified: boolean | null
  category: string | null
}

export interface MatchListing {
  id: string
  salon_id?: string
  type: string
  name: string | null
  description: string | null
  price_per_day_cents: number | null
  price_per_month_cents: number | null
  is_available?: boolean
  images?: string[] | null
  salon: MatchSalon | null
}

export interface MatchResult {
  score: number
  gruende: string[]
  preisEinschaetzung: PreisEinschaetzung
}

export interface RankedListing {
  listing: MatchListing
  match: MatchResult
}

// ─── Gewichtung ───────────────────────────────────────────────

type Dimension = 'standort' | 'budget' | 'typ' | 'qualitaet'

const BASE_WEIGHTS: Record<Dimension, number> = {
  standort: 30,
  budget: 25,
  typ: 25,
  qualitaet: 20,
}

const PRIO_TO_DIMENSION: Record<Prioritaet, Dimension> = {
  preis: 'budget',
  lage: 'standort',
  bewertung: 'qualitaet',
  ausstattung: 'typ',
}

/** Prioritäten verschieben Gewichte (+10 pro gewählter Dimension), danach normiert auf Summe 1. */
export function resolveWeights(prioritaeten?: Prioritaet[]): Record<Dimension, number> {
  const raw: Record<Dimension, number> = { ...BASE_WEIGHTS }
  const unique = Array.from(new Set(prioritaeten ?? []))
  for (const p of unique) {
    raw[PRIO_TO_DIMENSION[p]] += 10
  }
  const sum = raw.standort + raw.budget + raw.typ + raw.qualitaet
  return {
    standort: raw.standort / sum,
    budget: raw.budget / sum,
    typ: raw.typ / sum,
    qualitaet: raw.qualitaet / sum,
  }
}

// ─── Beruf → passende Arbeitsplatz-Typen ──────────────────────

const BERUF_TYPES: Record<Beruf, EquipmentType[]> = {
  friseur: ['stuhl'],
  barber: ['stuhl'],
  kosmetik: ['stuhl', 'raum'],
  lash: ['stuhl', 'raum'],
  nail: ['stuhl', 'raum'],
  massage: ['liege', 'raum'],
  arzt: ['opraum', 'raum'],
}

/** Beruf → Salon-Kategorien mit Affinität (primär = Spezialisierung, sekundär = verwandt). */
const BERUF_CATEGORY_AFFINITY: Record<Beruf, { primary: string[]; secondary: string[] }> = {
  friseur: { primary: ['friseur'], secondary: ['barber'] },
  barber: { primary: ['barber'], secondary: ['friseur'] },
  kosmetik: { primary: ['kosmetik'], secondary: ['aesthetik', 'lash', 'nail'] },
  lash: { primary: ['lash'], secondary: ['kosmetik', 'aesthetik'] },
  nail: { primary: ['nail'], secondary: ['kosmetik'] },
  massage: { primary: ['massage'], secondary: ['kosmetik'] },
  arzt: { primary: ['arzt', 'opraum'], secondary: ['aesthetik'] },
}

const CATEGORY_LABELS: Record<string, string> = {
  barber: 'Barber',
  friseur: 'Friseur',
  kosmetik: 'Kosmetik',
  aesthetik: 'Ästhetik',
  nail: 'Nail-Design',
  massage: 'Massage',
  lash: 'Lash & Brows',
  arzt: 'medizinische Behandlungen',
  opraum: 'OP-Eingriffe',
}

const TYPE_LABELS: Record<string, string> = {
  stuhl: 'Stuhl-Arbeitsplatz',
  liege: 'Behandlungsliege',
  raum: 'Eigener Raum',
  opraum: 'OP-Raum',
}

// ─── Hilfsfunktionen ──────────────────────────────────────────

/** Städtenamen vergleichbar machen: lowercase, Umlaute → ae/oe/ue, Akzente weg. */
export function normalizeCity(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/**
 * Effektiver Tagespreis in Cents — bei monatlicher Miete wird der Monatspreis
 * über die Arbeitstage (Ø 4,33 Wochen/Monat) auf einen Tagessatz umgerechnet.
 */
export function effectiveDailyPriceCents(criteria: MatchCriteria, listing: MatchListing): number | null {
  const tage = Math.max(1, criteria.arbeitstageProWoche) * 4.33
  const monthlyAsDaily = listing.price_per_month_cents && listing.price_per_month_cents > 0
    ? listing.price_per_month_cents / tage
    : null
  const daily = listing.price_per_day_cents && listing.price_per_day_cents > 0
    ? listing.price_per_day_cents
    : null

  if (criteria.mietdauer === 'monatlich') return monthlyAsDaily ?? daily
  return daily ?? monthlyAsDaily
}

// ─── Teil-Scores (jeweils 0..1) ───────────────────────────────

function scoreStandort(criteria: MatchCriteria, listing: MatchListing, gruende: string[]): number {
  const wunsch = normalizeCity(criteria.stadt)
  const ort = normalizeCity(listing.salon?.city)

  if (!ort) {
    gruende.push('△ Standort des Salons nicht hinterlegt')
    return 0.3
  }
  if (wunsch && ort === wunsch) {
    gruende.push('✓ Direkt in deiner Stadt')
    return 1
  }
  // Teiltreffer: "Frankfurt" vs. "Frankfurt am Main"
  if (wunsch.length >= 3 && (ort.startsWith(wunsch) || wunsch.startsWith(ort))) {
    gruende.push(`✓ In deiner Region (${listing.salon?.city})`)
    return 0.8
  }
  gruende.push(`✗ Anderer Standort (${listing.salon?.city})`)
  return 0
}

function scoreBudget(
  criteria: MatchCriteria,
  listing: MatchListing,
  gruende: string[]
): { score: number; einschaetzung: PreisEinschaetzung } {
  const preis = effectiveDailyPriceCents(criteria, listing)
  const budget = criteria.budgetProTagCents

  if (!preis || budget <= 0) {
    gruende.push('△ Preis auf Anfrage')
    return { score: 0.4, einschaetzung: 'im_budget' }
  }

  const ratio = preis / budget
  // Sanfte Kurve: bis Budget volle Punkte, darüber linearer Abfall bis +50 %
  const score = ratio <= 1 ? 1 : clamp01(1 - (ratio - 1) / 0.5)

  if (ratio <= 0.9) {
    const unter = Math.round((1 - ratio) * 100)
    gruende.push(`✓ ${unter} % unter deinem Budget`)
    return { score, einschaetzung: 'unter_budget' }
  }
  if (ratio <= 1.05) {
    gruende.push('✓ Genau in deinem Budget')
    return { score, einschaetzung: 'im_budget' }
  }
  const ueber = Math.round((ratio - 1) * 100)
  if (ratio <= 1.3) {
    gruende.push(`△ Etwas über Budget (+${ueber} %)`)
    return { score, einschaetzung: 'ueber_budget' }
  }
  gruende.push(`✗ Deutlich über Budget (+${ueber} %)`)
  return { score, einschaetzung: 'ueber_budget' }
}

function scoreTyp(criteria: MatchCriteria, listing: MatchListing, gruende: string[]): number {
  const passendeTypen = BERUF_TYPES[criteria.beruf]
  const typLabel = TYPE_LABELS[listing.type] ?? listing.type
  const typeFit = passendeTypen.includes(listing.type as EquipmentType) ? 1 : 0

  if (typeFit === 1) {
    gruende.push(`✓ ${typLabel} passt zu deinem Beruf`)
  } else {
    gruende.push(`✗ ${typLabel} ist für dein Profil ungeeignet`)
  }

  // Salon-Kategorie-Affinität
  const affinity = BERUF_CATEGORY_AFFINITY[criteria.beruf]
  const cat = (listing.salon?.category ?? '').toLowerCase().trim()
  let categoryFit = 0.5 // keine Kategorie hinterlegt → neutral
  if (cat) {
    if (affinity.primary.includes(cat)) {
      categoryFit = 1
      gruende.push(`✓ Salon auf ${CATEGORY_LABELS[cat] ?? cat} spezialisiert`)
    } else if (affinity.secondary.includes(cat)) {
      categoryFit = 0.7
    } else {
      categoryFit = 0.3
    }
  }

  return typeFit * 0.7 + categoryFit * 0.3
}

function scoreQualitaet(listing: MatchListing, gruende: string[]): number {
  const rating = listing.salon?.avg_rating ?? null
  const reviews = listing.salon?.review_count ?? 0
  const verified = listing.salon?.is_verified === true

  const ratingScore = rating != null && rating > 0 ? clamp01(rating / 5) : 0.5
  const reviewScore = clamp01(Math.log10(reviews + 1) / 2) // 100 Bewertungen → 1.0
  const verifiedScore = verified ? 1 : 0

  if (rating != null && rating >= 4.5 && reviews >= 5) {
    gruende.push(`✓ Top bewertet (${rating.toFixed(1)} ★ bei ${reviews} Bewertungen)`)
  } else if (rating != null && rating >= 4.0 && reviews >= 3) {
    gruende.push(`✓ Gut bewertet (${rating.toFixed(1)} ★)`)
  }
  if (verified) {
    gruende.push('✓ Verifizierter Salon')
  }

  return ratingScore * 0.55 + reviewScore * 0.2 + verifiedScore * 0.25
}

// ─── Öffentliche API ──────────────────────────────────────────

/** Bewertet ein einzelnes Inserat gegen die Suchkriterien. */
export function scoreListing(criteria: MatchCriteria, listing: MatchListing): MatchResult {
  const gruende: string[] = []
  const weights = resolveWeights(criteria.prioritaeten)

  const standort = scoreStandort(criteria, listing, gruende)
  const budget = scoreBudget(criteria, listing, gruende)
  const typ = scoreTyp(criteria, listing, gruende)
  const qualitaet = scoreQualitaet(listing, gruende)

  const total =
    standort * weights.standort +
    budget.score * weights.budget +
    typ * weights.typ +
    qualitaet * weights.qualitaet

  return {
    score: Math.round(clamp01(total) * 100),
    gruende,
    preisEinschaetzung: budget.einschaetzung,
  }
}

/**
 * Bewertet & sortiert alle Inserate: bester Match zuerst.
 * Tie-Breaker: günstigerer Tagespreis, dann ID (deterministisch).
 */
export function rankListings(criteria: MatchCriteria, listings: MatchListing[]): RankedListing[] {
  return listings
    .map((listing) => ({ listing, match: scoreListing(criteria, listing) }))
    .sort((a, b) => {
      if (b.match.score !== a.match.score) return b.match.score - a.match.score
      const pa = effectiveDailyPriceCents(criteria, a.listing) ?? Number.MAX_SAFE_INTEGER
      const pb = effectiveDailyPriceCents(criteria, b.listing) ?? Number.MAX_SAFE_INTEGER
      if (pa !== pb) return pa - pb
      return a.listing.id.localeCompare(b.listing.id)
    })
}
