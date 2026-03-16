export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'

interface Salon {
  id: string
  name: string
  slug: string | null
  description: string | null
  city: string | null
  avg_rating: number
  services: { id: string; name: string }[]
}

export default async function ExplorePage() {
  let salons: Salon[] = []

  try {
    const supabase = getSupabaseAdmin()

    const { data: salonData } = await supabase
      .from('salons')
      .select('id, name, slug, description, city, avg_rating, services(id, name)')
      .eq('is_active', true)
      .order('avg_rating', { ascending: false })

    if (salonData) salons = salonData as unknown as Salon[]
  } catch {
    // DB connection failed — render empty state
  }

  const cities = [...new Set(salons.map(s => s.city).filter(Boolean))]

  return (
    <div className="shell">
      <div className="screen">
        <div className="sticky">
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)' }}>
            Entdecken
          </h1>
        </div>

        <section style={{ padding: '0 var(--pad)' }}>
          {/* City filter chips */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16 }}>
            <a href="/explore" className="badge badge-gold">Alle</a>
            {cities.map(city => (
              <a key={city} href={`/search?city=${city}`} className="badge badge-gold" style={{ opacity: 0.7 }}>
                {city}
              </a>
            ))}
          </div>

          {/* Salon list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {salons.map(s => (
              <a key={s.id} href={`/salon/${s.slug || s.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: 'var(--c3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 700, color: 'var(--cream)', flexShrink: 0,
                  }}>
                    {s.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-md)', color: 'var(--cream)' }}>{s.name}</div>
                    <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginTop: 2 }}>{s.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 'var(--font-sm)', color: 'var(--gold)' }}>★ {Number(s.avg_rating).toFixed(1)}</span>
                      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--stone2)' }}>{s.city}</span>
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
