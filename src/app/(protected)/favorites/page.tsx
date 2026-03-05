export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/modules/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function FavoritesPage() {
  const session = await getServerSession()
  if (!session?.user) redirect('/auth')

  const favorites = await prisma.favorite.findMany({
    where: { customerId: session.user.id },
    include: {
      salon: {
        select: { id: true, name: true, slug: true, category: true, city: true, avgRating: true, description: true },
      },
    },
  })

  return (
    <div className="shell">
      <div className="screen">
        <div className="sticky">
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)' }}>Favoriten</h1>
        </div>

        <section style={{ padding: '0 var(--pad)' }}>
          {favorites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: 'var(--stone)', fontSize: 'var(--font-md)' }}>Noch keine Favoriten gespeichert.</p>
              <Link href="/explore" className="boutline" style={{ display: 'inline-block', marginTop: 16, textDecoration: 'none' }}>
                Salons entdecken
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {favorites.map(f => (
                <Link key={f.id} href={`/salon/${f.salon.slug || f.salon.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: 'var(--c3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 700, color: 'var(--cream)', flexShrink: 0,
                    }}>
                      {f.salon.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--cream)' }}>{f.salon.name}</div>
                      <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)' }}>
                        ★ {Number(f.salon.avgRating).toFixed(1)} · {f.salon.city}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
