'use client'

import { DashboardShell } from '@/components/dashboard'
import type { NavItem } from '@/components/dashboard'

const investorNav: NavItem[] = [
  { href: '/investor', label: 'Overview', icon: '📊' },
  { href: '/investor/metriken', label: 'Metriken', icon: '📈' },
  { href: '/investor/dokumente', label: 'Dokumente', icon: '📄' },
]

export default function InvestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      title="Investor Portal"
      subtitle="ChairMatch GmbH (i. Gr.)"
      navItems={investorNav}
      branding="CHAIRMATCH"
    >
      {children}
    </DashboardShell>
  )
}
