export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'

export default async function StatistikPage() {
  await requireRole(['admin', 'super_admin'])

  const supabase = getSupabaseAdmin()

  const [
    { count: totalSalons },
    { count: activeSalons },
    { count: totalBookings },
    { count: pendingBookings },
    { count: confirmedBookings },
    { count: completedBookings },
    { count: cancelledBookings },
    { count: totalReviews },
    { count: totalUsers },
  ] = await Promise.all([
    supabase.from('salons').select('*', { count: 'exact', head: true }),
    supabase.from('salons').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    supabase.from('reviews').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const since7d = new Date()
  since7d.setDate(since7d.getDate() - 7)
  const { count: bookingsLast7 } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since7d.toISOString())

  const { data: ratings } = await supabase.from('reviews').select('rating')
  const avgRat = ratings?.length ? ratings.reduce((a: number, b: { rating?: number }) => a + (b.rating ?? 0), 0) / ratings.length : 0

  const { data: topSalons } = await supabase
    .from('bookings')
    .select('salon_id')
  const salonCounts = (topSalons ?? []).reduce((acc: Record<string, number>, b: { salon_id: string }) => {
    acc[b.salon_id] = (acc[b.salon_id] || 0) + 1
    return acc
  }, {})
  const topSalonIds = Object.entries(salonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)
  const { data: salonNames } = topSalonIds.length > 0
    ? await supabase.from('salons').select('id, name').in('id', topSalonIds)
    : { data: [] }
  const nameMap = new Map((salonNames ?? []).map((s: { id: string; name: string }) => [s.id, s.name]))
  const topSalonsList = topSalonIds.map(id => ({ id, name: nameMap.get(id) || id.slice(0, 8), count: salonCounts[id] }))

  const stats = [
    { label: 'Salons gesamt', value: totalSalons ?? 0 },
    { label: 'Salons aktiv', value: activeSalons ?? 0 },
    { label: 'Buchungen gesamt', value: totalBookings ?? 0 },
    { label: 'Buchungen (7 Tage)', value: bookingsLast7 ?? 0 },
    { label: 'Pending', value: pendingBookings ?? 0 },
    { label: 'Bestätigt', value: confirmedBookings ?? 0 },
    { label: 'Abgeschlossen', value: completedBookings ?? 0 },
    { label: 'Storniert', value: cancelledBookings ?? 0 },
    { label: 'Bewertungen', value: totalReviews ?? 0 },
    { label: 'Ø Bewertung', value: avgRat.toFixed(1) },
    { label: 'Benutzer', value: totalUsers ?? 0 },
  ]

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 24 }}>
        Statistik
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.08)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>Top Salons (Buchungen)</h3>
      <div style={{ background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.08)', borderRadius: 12, padding: 14 }}>
        {topSalonsList.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>Noch keine Buchungen.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {topSalonsList.map((s, i) => (
              <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < topSalonsList.length - 1 ? '1px solid rgba(176,144,96,0.08)' : 'none', fontSize: 13 }}>
                <span style={{ color: 'var(--cream)' }}>{s.name}</span>
                <span style={{ color: 'var(--gold2)', fontWeight: 600 }}>{s.count} Buchungen</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
