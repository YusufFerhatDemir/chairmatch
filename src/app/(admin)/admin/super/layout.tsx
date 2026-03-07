import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'
import SuperAdminTabs from './tabs'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['super_admin'])

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)' }}>Super Admin</h1>
          <Link href="/admin" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Admin</Link>
        </div>
        <SuperAdminTabs />
        {children}
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
