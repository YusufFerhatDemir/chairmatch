export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { PROVS } from '@/lib/demo-data'
import { cityToCoords } from '@/lib/geo/city-coords'
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
  /*
   * Naeherungskoordinaten aus dem Stadtnamen — `salons` hat live keine
   * lat/lng-Spalten (siehe lib/geo/city-coords.ts). Die Umkreissortierung
   * lief bis hierher NUR fuer die Demo-Anbieter: `SearchClient` holte lat/lng
   * ausschliesslich aus `PROVS`, jeder echte Salon bekam `lat = 0` und damit
   * `dist = null`. „Naechste zuerst" hat echte Salons also nie sortiert.
   *
   * Die Tabelle bleibt serverseitig; der Client bekommt nur zwei Zahlen.
   */
  lat?: number | null
  lng?: number | null
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, city } = await searchParams
  const title = q ? `Suche: ${q}` : city ? `Salons in ${city}` : 'Suche'
  return {
    // Layout-Template fügt "| ChairMatch" auto an.
    title,
    description: 'Suche Salons, Studios und Praxen auf ChairMatch. Diese Seite ist als interne Suche nicht für Suchmaschinen indexiert — nutze stattdessen unsere Stadt- und Kategorie-Seiten.',
    robots: { index: false, follow: true },
    alternates: { canonical: 'https://www.chairmatch.de/search' },
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, city, plz } = await searchParams

  let salons: Salon[] = []
  let ladeFehler = false

  // DB search
  try {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('salons')
      .select('id, name, slug, city, avg_rating, category')
      .eq('is_active', true)
      .order('avg_rating', { ascending: false })
      .limit(50)

    if (q) {
      const safeQ = q.replace(/[%_(),.]/g, '')
      if (safeQ) {
        query = query.or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%`)
      }
    }

    if (city) {
      /*
       * `ilike` OHNE Platzhalter ist ein exakter (nur case-insensitiver)
       * Vergleich. Die Stadt-Schnellfilter dieser Seite verlinken auf
       * `?city=Frankfurt`, in `salons.city` steht aber „Frankfurt am Main"
       * — ein echter Salon dort war ueber den eigenen Filter nicht zu
       * finden. Gefunden wurden nur die Demo-Anbieter, weil die weiter
       * unten mit `includes()` verglichen werden.
       */
      const safeCity = city.replace(/[%_,()]/g, '').trim()
      if (safeCity) query = query.ilike('city', `%${safeCity}%`)
    }

    const { data, error } = await query
    if (error) {
      console.error('[search] Salons konnten nicht geladen werden:', error.message)
      ladeFehler = true
    }
    if (data) {
      salons = data.map(s => {
        const coords = cityToCoords(s.city)
        return { ...s, lat: coords?.lat ?? null, lng: coords?.lng ?? null }
      })
    }
  } catch (err) {
    console.error('[search] Datenbank nicht erreichbar:', err)
    ladeFehler = true
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
      lat: p.lat,
      lng: p.lng,
    }))

    // Merge, deduplicate by name
    const existingNames = new Set(salons.map(s => s.name.toLowerCase()))
    for (const d of demoResults) {
      if (!existingNames.has(d.name.toLowerCase())) {
        salons.push(d)
      }
    }
  }

  return <SearchClient salons={salons} initialQ={q || ''} initialCity={city || ''} initialPlz={plz || ''} ladeFehler={ladeFehler} />
}
