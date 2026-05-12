'use client'

import { DashboardShell } from '@/components/dashboard'
import type { NavItem } from '@/components/dashboard'

const providerNav: NavItem[] = [
  { href: '/provider/dashboard', label: 'Dashboard', icon: '💰' },
  { href: '/provider/buchungen', label: 'Buchungen', icon: '📅' },
  { href: '/provider/vermietung', label: 'Stuhl & Raum', icon: '🪑' },
  { href: '/provider/services', label: 'Services', icon: '✂️' },
  { href: '/provider/profil', label: 'Profil', icon: '👤' },
  { href: '/provider/abo', label: 'Abo & Zahlung', icon: '💳' },
]

export default function ProviderShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      title="Anbieter"
      subtitle="Dashboard"
      navItems={providerNav}
      branding="CHAIRMATCH"
    >
      {children}
    </DashboardShell>
  )
}
