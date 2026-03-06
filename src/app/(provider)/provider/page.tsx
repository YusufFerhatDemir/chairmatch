export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProviderDashboardPage() {
  const session = await getServerSession()
  if (!session?.user) redirect('/auth')

  const supabase = getSupabaseAdmin()

  // Fetch salon owned by this user
  const { data: salon } = await supabase
    .from('salons')
    .select('*')
    .eq('owner_id', session.user.id)
    .limit(1)
    .single()

  if (!salon) {
    return (
      <div className="shell">
        <div className="screen" style={{ padding: 'var(--pad)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <h2 style={{ color: 'var(--cream)', marginBottom: 16 }}>Kein Salon gefunden</h2>
          <p style={{ color: 'var(--stone)', marginBottom: 24 }}>Registriere dich als Anbieter, um dein Dashboard zu nutzen.</p>
          <Link href="/" className="bgold" style={{ maxWidth: 200, textDecoration: 'none' }}>Zur Startseite</Link>
        </div>
      </div>
    )
  }

  // Fetch services, bookings, and reviews separately
  const [
    { data: services },
    { data: bookings },
    { data: reviews },
  ] = await Promise.all([
    supabase
      .from('services')
      .select('*')
      .eq('salon_id', salon.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('bookings')
      .select('*, service:services(name), customer:profiles(full_name)')
      .eq('salon_id', salon.id)
      .in('status', ['pending', 'confirmed'])
      .order('booking_date', { ascending: true })
      .limit(10),
    supabase
      .from('reviews')
      .select('*, customer:profiles(full_name)')
      .eq('salon_id', salon.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const salonServices = services ?? []
  const salonBookings = bookings ?? []
  const salonReviews = reviews ?? []

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginBottom: 4 }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginBottom: 24 }}>{salon.name}</p>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--gold)' }}>★ {Number(salon.avg_rating).toFixed(1)}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Bewertung</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)' }}>{salon.review_count}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Bewertungen</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)' }}>{salonBookings.length}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Offene Buchungen</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)' }}>{salonServices.length}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Dienste</div>
          </div>
        </div>

        {/* Upcoming Bookings */}
        <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>Anstehende Termine</h2>
        {salonBookings.length === 0 ? (
          <p style={{ color: 'var(--stone)', marginBottom: 24 }}>Keine offenen Termine.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {salonBookings.map((b: any) => (
              <div key={b.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--cream)' }}>{b.service?.name}</div>
                  <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)' }}>
                    {new Date(b.booking_date).toLocaleDateString('de-DE')} · {b.start_time?.slice(0, 5)} · {b.customer?.full_name || 'Gast'}
                  </div>
                </div>
                <span className="badge badge-gold">{b.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recent Reviews */}
        <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>Neueste Bewertungen</h2>
        {salonReviews.map((r: any) => (
          <div key={r.id} className="card" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: 'var(--cream)' }}>{r.customer?.full_name || 'Gast'}</span>
              <span style={{ color: 'var(--gold)' }}>{'★'.repeat(r.rating)}</span>
            </div>
            {r.comment && <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginTop: 4 }}>{r.comment}</p>}
          </div>
        ))}

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
