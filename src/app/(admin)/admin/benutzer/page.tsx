export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'

export default async function BenutzerPage() {
  await requireRole(['admin', 'super_admin'])

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/admin" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Admin</Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 8, marginBottom: 16 }}>
          Benutzer ({users.length})
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(u => (
            <div key={u.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--cream)' }}>
                  {u.fullName || 'Kein Name'}
                </div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>
                  {u.email || 'Keine E-Mail'} · {u.preferredLanguage}
                </div>
              </div>
              <span className="badge badge-gold">{u.role}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
