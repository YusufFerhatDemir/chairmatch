export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'

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

  // Calculate average rating in JS
  const { data: ratings } = await supabase.from('reviews').select('rating')
  const avgRat = ratings?.length ? ratings.reduce((a: number, b: any) => a + b.rating, 0) / ratings.length : 0

  const stats = [
    { label: 'Salons gesamt', value: totalSalons ?? 0 },
    { label: 'Salons aktiv', value: activeSalons ?? 0 },
    { label: 'Buchungen gesamt', value: totalBookings ?? 0 },
    { label: 'Pending', value: pendingBookings ?? 0 },
    { label: 'Bestätigt', value: confirmedBookings ?? 0 },
    { label: 'Abgeschlossen', value: completedBookings ?? 0 },
    { label: 'Storniert', value: cancelledBookings ?? 0 },
    { label: 'Bewertungen', value: totalReviews ?? 0 },
    { label: 'Ø Bewertung', value: avgRat.toFixed(1) },
    { label: 'Benutzer', value: totalUsers ?? 0 },
  ]

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/admin" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Admin</Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 8, marginBottom: 24 }}>
          Statistik
        </h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {stats.map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--gold)' }}>{s.value}</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
