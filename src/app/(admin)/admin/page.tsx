export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'

export default async function AdminPage() {
  const session = await requireRole(['admin', 'super_admin'])
  const userRole = (session.user as { role?: string }).role

  const supabase = getSupabaseAdmin()

  const [
    { count: salonCount },
    { count: bookingCount },
    { count: reviewCount },
    { count: userCount },
  ] = await Promise.all([
    supabase.from('salons').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const { data: recentBookings } = await supabase
    .from('bookings')
    .select('*, salon:salons(name), service:services(name), customer:profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(10)

  const bookingsData = recentBookings ?? []

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)' }}>Admin Panel</h1>
          <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Zurück</Link>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--gold)' }}>{salonCount ?? 0}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Salons</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)' }}>{bookingCount ?? 0}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Buchungen</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)' }}>{reviewCount ?? 0}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Bewertungen</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)' }}>{userCount ?? 0}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Benutzer</div>
          </div>
        </div>

        {/* Admin nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          <Link href="/admin/anbieter" className="card" style={{ textDecoration: 'none' }}>
            <span style={{ color: 'var(--cream)', fontWeight: 600 }}>Salons verwalten</span>
          </Link>
          <Link href="/admin/benutzer" className="card" style={{ textDecoration: 'none' }}>
            <span style={{ color: 'var(--cream)', fontWeight: 600 }}>Benutzer verwalten</span>
          </Link>
          <Link href="/admin/buchungen" className="card" style={{ textDecoration: 'none' }}>
            <span style={{ color: 'var(--cream)', fontWeight: 600 }}>Buchungen</span>
          </Link>
          <Link href="/admin/statistik" className="card" style={{ textDecoration: 'none' }}>
            <span style={{ color: 'var(--cream)', fontWeight: 600 }}>Statistik</span>
          </Link>
          <Link href="/admin/besucher" className="card" style={{ textDecoration: 'none' }}>
            <span style={{ color: 'var(--cream)', fontWeight: 600 }}>Besucher &amp; Analytics</span>
          </Link>
          <Link href="/admin/audit-logs" className="card" style={{ textDecoration: 'none' }}>
            <span style={{ color: 'var(--cream)', fontWeight: 600 }}>Audit-Logs</span>
          </Link>
          <Link href="/admin/dokumente" className="card" style={{ textDecoration: 'none' }}>
            <span style={{ color: 'var(--cream)', fontWeight: 600 }}>Dokumente prüfen</span>
          </Link>
          <Link href="/admin/tickets" className="card" style={{ textDecoration: 'none' }}>
            <span style={{ color: 'var(--cream)', fontWeight: 600 }}>Einreich-Tickets</span>
          </Link>
          <Link href="/admin/risk-settings" className="card" style={{ textDecoration: 'none' }}>
            <span style={{ color: 'var(--cream)', fontWeight: 600 }}>Risk-Settings</span>
          </Link>
          <Link href="/admin/pricing" className="card" style={{ textDecoration: 'none' }}>
            <span style={{ color: 'var(--cream)', fontWeight: 600 }}>Pricing</span>
          </Link>
          {userRole === 'super_admin' && (
            <Link href="/admin/super" className="card" style={{
              textDecoration: 'none',
              borderColor: 'rgba(160, 120, 48, 0.3)',
              background: 'linear-gradient(135deg, rgba(160,120,48,0.08), rgba(160,120,48,0.02))',
            }}>
              <span style={{ color: 'var(--gold2)', fontWeight: 700 }}>Super Admin Panel</span>
            </Link>
          )}
        </div>

        {/* Recent bookings */}
        <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>Letzte Buchungen</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bookingsData.map((b: any) => (
            <div key={b.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: 'var(--font-sm)' }}>{b.service?.name}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>
                  {b.salon?.name} · {new Date(b.booking_date).toLocaleDateString('de-DE')} {b.start_time?.slice(0, 5)}
                </div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone2)', marginTop: 2 }}>
                  {b.customer?.full_name || 'Gast'}
                </div>
              </div>
              <span className="badge badge-gold" style={{ fontSize: 9 }}>{b.status}</span>
            </div>
          ))}
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
