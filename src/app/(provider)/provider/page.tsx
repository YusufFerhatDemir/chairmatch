export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/modules/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProviderDashboardPage() {
  const session = await getServerSession()
  if (!session?.user) redirect('/auth')

  const salon = await prisma.salon.findFirst({
    where: { ownerId: session.user.id },
    include: {
      services: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      bookings: {
        where: { status: { in: ['pending', 'confirmed'] } },
        orderBy: { bookingDate: 'asc' },
        take: 10,
        include: {
          service: { select: { name: true } },
          customer: { select: { fullName: true } },
        },
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { customer: { select: { fullName: true } } },
      },
    },
  })

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
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--gold)' }}>★ {Number(salon.avgRating).toFixed(1)}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Bewertung</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)' }}>{salon.reviewCount}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Bewertungen</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)' }}>{salon.bookings.length}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Offene Buchungen</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)' }}>{salon.services.length}</div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Dienste</div>
          </div>
        </div>

        {/* Upcoming Bookings */}
        <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>Anstehende Termine</h2>
        {salon.bookings.length === 0 ? (
          <p style={{ color: 'var(--stone)', marginBottom: 24 }}>Keine offenen Termine.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {salon.bookings.map(b => (
              <div key={b.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--cream)' }}>{b.service?.name}</div>
                  <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)' }}>
                    {new Date(b.bookingDate).toLocaleDateString('de-DE')} · {b.startTime.toISOString().slice(11, 16)} · {b.customer?.fullName || 'Gast'}
                  </div>
                </div>
                <span className="badge badge-gold">{b.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recent Reviews */}
        <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>Neueste Bewertungen</h2>
        {salon.reviews.map(r => (
          <div key={r.id} className="card" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: 'var(--cream)' }}>{r.customer?.fullName || 'Gast'}</span>
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
