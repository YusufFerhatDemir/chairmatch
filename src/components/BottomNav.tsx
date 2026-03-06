'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const TABS: { href: '/' | '/explore' | '/offers' | '/account'; icon: string; label: string; match: (p: string) => boolean }[] = [
  { href: '/', icon: '⌂', label: 'START', match: (p) => p === '/' },
  { href: '/explore', icon: '◫', label: 'TERMIN', match: (p) => p === '/explore' || p.startsWith('/booking') || p.startsWith('/salon') || p.startsWith('/category') },
  { href: '/offers', icon: '❋', label: 'ANGEBOTE', match: (p) => p === '/offers' || p === '/rentals' },
  { href: '/account', icon: '◎', label: 'KONTO', match: (p) => p === '/account' || p === '/favorites' },
]

const HIDDEN_PATHS = ['/admin', '/provider', '/auth', '/register']

export default function BottomNav() {
  const pathname = usePathname()

  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null

  return (
    <nav className="bottom-nav">
      {TABS.map(tab => {
        const active = tab.match(pathname)
        return (
          <Link key={tab.href} href={tab.href} className="bottom-nav-btn" style={{ color: active ? 'var(--gold)' : 'var(--stone2)' }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em' }}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
