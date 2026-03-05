export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'

export default async function BuchungenPage() {
  await requireRole(['admin', 'super_admin'])

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      salon: { select: { name: true } },
      service: { select: { name: true } },
      customer: { select: { fullName: true, email: true } },
    },
  })

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/admin" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Admin</Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 8, marginBottom: 16 }}>
          Buchungen ({bookings.length})
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bookings.map(b => (
            <div key={b.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: 'var(--font-sm)' }}>{b.service?.name}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>
                    {b.salon?.name} · {new Date(b.bookingDate).toLocaleDateString('de-DE')} {b.startTime.toISOString().slice(11, 16)}
                  </div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone2)', marginTop: 2 }}>
                    {b.customer?.fullName || 'Gast'} · {b.customer?.email}
                  </div>
                </div>
                <span className="badge badge-gold" style={{ fontSize: 9 }}>{b.status}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
