export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { PROVS } from '@/lib/demo-data'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props {
  searchParams: Promise<{ q?: string; city?: string }>
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
  const { q, city } = await searchParams

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

  // Popular cities for quick filters
  const cities = ['Frankfurt', 'Berlin', 'München', 'Hamburg', 'Köln', 'Düsseldorf', 'Stuttgart']

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

          <form action="/search" method="GET" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Salon, Service, Stadt..."
              autoComplete="off"
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid rgba(176,144,96,0.2)',
                background: 'var(--c2)',
                color: 'var(--cream)',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              className="bgold"
              style={{ width: 'auto', padding: '12px 18px', fontSize: 14, flexShrink: 0 }}
            >
              Suchen
            </button>
          </form>

          {/* City quick filters */}
          {!q && !city && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {cities.map(c => (
                <a
                  key={c}
                  href={`/search?city=${encodeURIComponent(c)}`}
                  className="boutline"
                  style={{ padding: '6px 14px', fontSize: 11, whiteSpace: 'nowrap', textDecoration: 'none', borderRadius: 20 }}
                >
                  {c}
                </a>
              ))}
            </div>
          )}

          <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginTop: 8 }}>
            {salons.length} Ergebnis{salons.length !== 1 ? 'se' : ''}
          </p>
        </div>

        <section style={{ padding: '0 var(--pad)' }}>
          {salons.length === 0 && (q || city) ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: 'var(--stone)', fontSize: 14, marginBottom: 8 }}>
                Keine Ergebnisse f&uuml;r diese Suche.
              </p>
              <p style={{ color: 'var(--stone)', fontSize: 12 }}>
                Versuche einen anderen Suchbegriff oder eine andere Stadt.
              </p>
            </div>
          ) : (
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
                        ★ {Number(s.avg_rating).toFixed(1)} · {s.city}
                        {s.category && <span> · {s.category}</span>}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}
