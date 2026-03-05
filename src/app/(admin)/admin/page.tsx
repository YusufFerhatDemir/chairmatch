export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'

export default async function AdminPage() {
  await requireRole(['admin', 'super_admin'])

  const [salonCount, bookingCount, reviewCount, userCount] = await Promise.all([
    prisma.salon.count(),
    prisma.booking.count(),
    prisma.review.count(),
    prisma.user.count(),
  ])

  const recentBookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      salon: { select: { name: true } },
      service: { select: { name: true } },
      customer: { select: { fullName: true } },
    },
  })

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
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--gold)' }}>{salonCount}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Salons</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)' }}>{bookingCount}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Buchungen</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)' }}>{reviewCount}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Bewertungen</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)' }}>{userCount}</div>
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
        </div>

        {/* Recent bookings */}
        <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>Letzte Buchungen</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recentBookings.map(b => (
            <div key={b.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: 'var(--font-sm)' }}>{b.service?.name}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>
                  {b.salon?.name} · {new Date(b.bookingDate).toLocaleDateString('de-DE')} {b.startTime.toISOString().slice(11, 16)}
                </div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone2)', marginTop: 2 }}>
                  {b.customer?.fullName || 'Gast'}
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
