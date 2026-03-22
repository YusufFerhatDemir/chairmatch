'use client'

import { DashboardShell } from '@/components/dashboard'
import type { NavItem } from '@/components/dashboard'
import { useSession } from 'next-auth/react'

const adminNav: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/benutzer', label: 'Benutzer', icon: '👥' },
  { href: '/admin/anbieter', label: 'Salons', icon: '💇' },
  { href: '/admin/buchungen', label: 'Buchungen', icon: '📅' },
  { href: '/admin/statistik', label: 'Statistik', icon: '📈' },
  { href: '/admin/mis', label: 'MIS / Analytics', icon: '🔬' },
  { href: '/admin/dokumente', label: 'Dokumente', icon: '📄' },
  { href: '/admin/tickets', label: 'Tickets', icon: '🎫' },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: '🔒' },
  { href: '/admin/besucher', label: 'Besucher', icon: '👁' },
  { href: '/admin/pricing', label: 'Pricing', icon: '💰' },
  { href: '/admin/risk-settings', label: 'Risk Settings', icon: '⚠️' },
]

const superAdminNav: NavItem[] = [
  { href: '/admin/super/einstellungen', label: 'Einstellungen', icon: '⚙️' },
  { href: '/admin/super/kategorien', label: 'Kategorien', icon: '🏷' },
  { href: '/admin/super/logo', label: 'Logo', icon: '🎨' },
  { href: '/admin/super/onboarding', label: 'Onboarding', icon: '🚀' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role
  const isSuperAdmin = role === 'super_admin'

  const navItems = isSuperAdmin ? [...adminNav, ...superAdminNav] : adminNav

  return (
    <DashboardShell
      title="Admin"
      subtitle={isSuperAdmin ? 'Super Admin' : 'Dashboard'}
      navItems={navItems}
      branding="CHAIRMATCH"
    >
      {children}
    </DashboardShell>
  )
}
