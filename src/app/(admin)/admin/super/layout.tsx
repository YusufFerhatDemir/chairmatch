import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const tabs = [
  { href: '/admin/super/einstellungen' as const, label: 'Einstellungen' },
  { href: '/admin/super/onboarding' as const, label: 'Onboarding' },
  { href: '/admin/super/logo' as const, label: 'Logo' },
  { href: '/admin/super/kategorien' as const, label: 'Kategorien' },
]

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireRole(['super_admin'])
  } catch {
    redirect('/admin')
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)' }}>Super Admin</h1>
          <Link href="/admin" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Admin</Link>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: 4,
          marginBottom: 20,
          overflowX: 'auto',
          paddingBottom: 2,
        }}>
          {tabs.map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--btn-radius)',
                fontSize: 'var(--font-sm)',
                fontWeight: 600,
                color: 'var(--cream)',
                textDecoration: 'none',
                background: 'var(--c2)',
                border: '1px solid var(--border)',
                whiteSpace: 'nowrap',
                transition: 'background 0.2s, border-color 0.2s',
              }}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Content */}
        {children}

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
