'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/admin/super/einstellungen' as const, label: 'Einstellungen' },
  { href: '/admin/super/onboarding' as const, label: 'Onboarding' },
  { href: '/admin/super/logo' as const, label: 'Logo' },
  { href: '/admin/super/kategorien' as const, label: 'Kategorien' },
]

export default function SuperAdminTabs() {
  const pathname = usePathname()

  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 2 }}>
      {tabs.map(tab => {
        const active = pathname === tab.href
        return (
          <Link key={tab.href} href={tab.href as never} style={{
            padding: '8px 14px', borderRadius: 'var(--btn-radius)',
            fontSize: 'var(--font-sm)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
            color: active ? '#080706' : 'var(--cream)',
            background: active ? 'var(--gold)' : 'var(--c2)',
            border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
          }}>
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
