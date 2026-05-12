'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from '@/i18n/client'

interface Tab {
  href: '/' | '/explore' | '/offers' | '/account'
  icon: string
  /** Key in den i18n-Messages unter `nav.*` */
  key: 'home' | 'appointment' | 'offers' | 'account'
  match: (p: string) => boolean
}

const TABS: Tab[] = [
  { href: '/', icon: '⌂', key: 'home', match: (p) => p === '/' },
  { href: '/explore', icon: '◫', key: 'appointment', match: (p) => p === '/explore' || p.startsWith('/booking') || p.startsWith('/salon') || p.startsWith('/category') },
  { href: '/offers', icon: '❋', key: 'offers', match: (p) => p === '/offers' || p === '/rentals' },
  { href: '/account', icon: '◎', key: 'account', match: (p) => p === '/account' || p === '/favorites' },
]

const HIDDEN_PATHS = ['/admin', '/provider', '/auth', '/register', '/investor', '/owner']

export default function BottomNav() {
  const pathname = usePathname()
  const t = useTranslations('nav')

  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null

  return (
    <nav className="bottom-nav" role="tablist" aria-label={t('mainNav')}>
      {TABS.map(tab => {
        const active = tab.match(pathname)
        const label = t(tab.key)
        return (
          <Link key={tab.href} href={tab.href} className="bottom-nav-btn" role="tab" aria-selected={active} aria-label={label} style={{ color: active ? 'var(--gold)' : 'var(--stone2)' }}>
            <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden="true">{tab.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em' }}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
