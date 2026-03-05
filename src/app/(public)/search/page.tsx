export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ q?: string; city?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, city } = await searchParams

  const salons = await prisma.salon.findMany({
    where: {
      isActive: true,
      ...(q && {
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } },
        ],
      }),
      ...(city && { city: { equals: city, mode: 'insensitive' as const } }),
    },
    orderBy: [{ avgRating: 'desc' }],
    take: 50,
  })

  return (
    <div className="shell">
      <div className="screen">
        <div className="sticky">
          <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
            ← Zurück
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
                      ★ {Number(s.avgRating).toFixed(1)} · {s.city}
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
