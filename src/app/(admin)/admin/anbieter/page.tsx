export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'

export default async function AnbieterPage() {
  await requireRole(['admin', 'super_admin'])

  const salons = await prisma.salon.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { bookings: true, reviews: true, services: true } },
    },
  })

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/admin" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Admin</Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 8, marginBottom: 16 }}>
          Salons ({salons.length})
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {salons.map(s => (
            <div key={s.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--cream)' }}>{s.name}</div>
                  <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)' }}>
                    {s.category} · {s.city} · {s.subscriptionTier}
                  </div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone2)', marginTop: 4 }}>
                    {s._count.services} Dienste · {s._count.bookings} Buchungen · {s._count.reviews} Bewertungen
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 700 }}>★ {Number(s.avgRating).toFixed(1)}</span>
                  {s.isActive ? (
                    <span className="badge badge-green" style={{ fontSize: 8 }}>AKTIV</span>
                  ) : (
                    <span className="badge" style={{ fontSize: 8, background: 'rgba(232,80,64,0.1)', color: 'var(--red)', border: '1px solid rgba(232,80,64,0.2)' }}>INAKTIV</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
