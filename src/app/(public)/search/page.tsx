export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { PROVS } from '@/lib/demo-data'
import type { Metadata } from 'next'
import SearchClient from './SearchClient'

interface Props {
  searchParams: Promise<{ q?: string; city?: string; plz?: string }>
}

interface Salon {
  id: string
  name: string
  slug: string | null
  city: string | null
  avg_rating: number
  category?: string | null
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, city } = await searchParams
  const title = q ? `Suche: ${q}` : city ? `Salons in ${city}` : 'Suche'
  return {
    title: `${title} — ChairMatch`,
    // QW-5: Suchergebnis-Seiten NICHT indexieren — verhindert
    // Faceted-Search-Falle + Duplicate-Content mit Stadt/Vertical-Hubs.
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, city, plz } = await searchParams

  let salons: Salon[] = []
  let dbTimedOut = false

  // DB search mit hard timeout — Search-Page darf NIEMALS hängen
  try {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('salons')
      .select('id, name, slug, city, avg_rating, category')
      .eq('is_active', true)
      .order('avg_rating', { ascending: false })
      .limit(50)

    if (q) {
      const safeQ = q
        .replace(/[%_(),.`'"\\;]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80)
      if (safeQ.length >= 2) {
        query = query.or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%`)
      }
    }

    if (city) {
      const safeCity = city.replace(/[^a-zA-ZäöüÄÖÜß\s-]/g, '').slice(0, 60).trim()
      if (safeCity) {
        query = query.ilike('city', safeCity)
      }
    }

    // Hard 4s timeout — falls Supabase langsam ist, fallback auf Demo-Daten + UI zeigt "Verbindung schwach"
    const timeout = new Promise<{ data: null; timedOut: true }>((resolve) =>
      setTimeout(() => resolve({ data: null, timedOut: true }), 4000)
    )
    const result = await Promise.race([
      query.then((r) => ({ data: r.data as Salon[] | null, timedOut: false })),
      timeout,
    ])

    if (result.timedOut) {
      dbTimedOut = true
    } else if (result.data) {
      salons = result.data
    }
  } catch {
    // DB connection failed — fallback to demo data below
    dbTimedOut = true
  }

  // Also search demo providers
  if (q || city) {
    const searchLower = (q || '').toLowerCase()
    const cityLower = (city || '').toLowerCase()

    const demoResults = PROVS.filter(p => {
      const nameMatch = !q || p.nm.toLowerCase().includes(searchLower) || p.tl.toLowerCase().includes(searchLower) || p.cat.toLowerCase().includes(searchLower)
      const cityMatch = !city || p.city.toLowerCase().includes(cityLower)
      return nameMatch && cityMatch
    }).map(p => ({
      id: p.id,
      name: p.nm,
      slug: p.id,
      city: p.city,
      avg_rating: p.rt,
      category: p.cat,
    }))

    // Merge, deduplicate by name
    const existingNames = new Set(salons.map(s => s.name.toLowerCase()))
    for (const d of demoResults) {
      if (!existingNames.has(d.name.toLowerCase())) {
        salons.push(d)
      }
    }
  }

  // Liste aller verfügbaren Städte (für Empty-State-Vorschläge)
  // Nimmt unique Cities aus salons + demo + Phase-1-Cities (Berlin/Hamburg/München/Köln/Frankfurt)
  const allCities = Array.from(new Set([
    ...salons.map((s) => s.city).filter(Boolean) as string[],
    ...PROVS.map((p) => p.city),
  ])).sort()

  return (
    <SearchClient
      salons={salons}
      initialQ={q || ''}
      initialCity={city || ''}
      initialPlz={plz || ''}
      availableCities={allCities}
      dbTimedOut={dbTimedOut}
    />
  )
}
