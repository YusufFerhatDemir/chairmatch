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
  return { title: `${title} — ChairMatch` }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, city, plz } = await searchParams

  let salons: Salon[] = []

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
      query = query.ilike('city', city)
    }

    const { data } = await query
    if (data) salons = data
  } catch {
    // DB connection failed
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

  return <SearchClient salons={salons} initialQ={q || ''} initialCity={city || ''} initialPlz={plz || ''} />
}
