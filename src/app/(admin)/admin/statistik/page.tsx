export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'

export default async function StatistikPage() {
  await requireRole(['admin', 'super_admin'])

  const [
    totalSalons,
    activeSalons,
    totalBookings,
    pendingBookings,
    confirmedBookings,
    completedBookings,
    cancelledBookings,
    totalReviews,
    totalUsers,
  ] = await Promise.all([
    prisma.salon.count(),
    prisma.salon.count({ where: { isActive: true } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: 'pending' } }),
    prisma.booking.count({ where: { status: 'confirmed' } }),
    prisma.booking.count({ where: { status: 'completed' } }),
    prisma.booking.count({ where: { status: 'cancelled' } }),
    prisma.review.count(),
    prisma.user.count(),
  ])

  const avgRating = await prisma.review.aggregate({ _avg: { rating: true } })

  const stats = [
    { label: 'Salons gesamt', value: totalSalons },
    { label: 'Salons aktiv', value: activeSalons },
    { label: 'Buchungen gesamt', value: totalBookings },
    { label: 'Pending', value: pendingBookings },
    { label: 'Bestätigt', value: confirmedBookings },
    { label: 'Abgeschlossen', value: completedBookings },
    { label: 'Storniert', value: cancelledBookings },
    { label: 'Bewertungen', value: totalReviews },
    { label: 'Ø Bewertung', value: (avgRating._avg.rating || 0).toFixed(1) },
    { label: 'Benutzer', value: totalUsers },
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
