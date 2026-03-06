export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ q?: string; city?: string }>
}

interface Salon {
  id: string
  name: string
  slug: string | null
  city: string | null
  avg_rating: number
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, city } = await searchParams

  let salons: Salon[] = []

  try {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('salons')
      .select('id, name, slug, city, avg_rating')
      .eq('is_active', true)
      .order('avg_rating', { ascending: false })
      .limit(50)

    if (q) {
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    }

    if (city) {
      query = query.ilike('city', city)
    }

    const { data } = await query

    if (data) salons = data
  } catch {
    // DB connection failed — render empty state
  }

  return (
    <div className="shell">
      <div className="screen">
        <div className="sticky">
          <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
            &larr; Zur&uuml;ck
          </Link>
          <h1 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginTop: 8 }}>
            {q ? `Suche: "${q}"` : city ? `Salons in ${city}` : 'Suche'}
          </h1>
          <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginTop: 4 }}>
            {salons.length} Ergebnis{salons.length !== 1 ? 'se' : ''}
          </p>
        </div>

        <section style={{ padding: '0 var(--pad)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {salons.map(s => (
              <a key={s.id} href={`/salon/${s.slug || s.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: 'var(--c3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 700, color: 'var(--cream)', flexShrink: 0,
                  }}>
                    {s.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--cream)' }}>{s.name}</div>
                    <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)' }}>
                      &star; {Number(s.avg_rating).toFixed(1)} &middot; {s.city}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
