export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function FavoritesPage() {
  const session = await getServerSession()
  if (!session?.user) redirect('/auth')

  const supabase = getSupabaseAdmin()

  const { data: favorites } = await supabase
    .from('favorites')
    .select('*, salon:salons(id, name, slug, category, city, avg_rating, description)')
    .eq('customer_id', session.user.id)

  const favs = favorites ?? []

  return (
    <div className="shell">
      <div className="screen">
        <div className="sticky">
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)' }}>Favoriten</h1>
        </div>

        <section style={{ padding: '0 var(--pad)' }}>
          {favs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>❤️</div>
              <p style={{ color: 'var(--stone)', fontSize: 'var(--font-md)' }}>Noch keine Favoriten gespeichert.</p>
              <p style={{ color: 'var(--stone2)', fontSize: 'var(--font-sm)', marginTop: 4 }}>
                Tippe auf das Herz-Symbol bei einem Salon, um ihn hier zu speichern.
              </p>
              <Link href="/explore" className="boutline" style={{ display: 'inline-block', marginTop: 16, textDecoration: 'none' }}>
                Salons entdecken
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {favs.map((f: { id: string; salon: { id: string; name: string; slug: string | null; city: string | null; avg_rating: number } }) => (
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
                        ★ {Number(f.salon.avg_rating).toFixed(1)} · {f.salon.city}
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
