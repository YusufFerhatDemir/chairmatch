export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'

export default async function ExplorePage() {
  const salons = await prisma.salon.findMany({
    where: { isActive: true },
    include: {
      services: { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, take: 3 },
    },
    orderBy: [{ avgRating: 'desc' }],
  })

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
                      <span style={{ fontSize: 'var(--font-sm)', color: 'var(--gold)' }}>★ {Number(s.avgRating).toFixed(1)}</span>
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
