'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import { useTranslations } from '@/i18n/client'

type NavRole = 'anbieter' | 'vermieter' | 'mieter'

interface NavItem { labelKey: string; href: Route; svg: React.ReactNode }

const ICONS = {
  home:   <><path d="M3 12l9-9 9 9M5 10v10h14V10"/></>,
  cal:    <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/></>,
  msg:    <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
  user:   <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></>,
  search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  heart:  <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></>,
}

const NAVS: Record<NavRole, NavItem[]> = {
  anbieter: [
    { labelKey: 'bottomNav.start',       href: '/anbieter/mein-salon',              svg: ICONS.home },
    { labelKey: 'bottomNav.appointment', href: '/anbieter/mein-salon/termine',      svg: ICONS.cal },
    { labelKey: 'bottomNav.messages',    href: '/anbieter/mein-salon/bewertungen',  svg: ICONS.msg },
    { labelKey: 'bottomNav.account',     href: '/konto',                            svg: ICONS.user },
  ],
  vermieter: [
    { labelKey: 'bottomNav.start',       href: '/vermieter/mein-inserat',                  svg: ICONS.home },
    { labelKey: 'bottomNav.appointment', href: '/vermieter/mein-inserat/verfuegbarkeit',   svg: ICONS.cal },
    { labelKey: 'bottomNav.requests',    href: '/vermieter/mein-inserat/anfragen',         svg: ICONS.msg },
    { labelKey: 'bottomNav.account',     href: '/konto',                                   svg: ICONS.user },
  ],
  mieter: [
    { labelKey: 'bottomNav.start',       href: '/mieter/mein-bereich',           svg: ICONS.home },
    { labelKey: 'bottomNav.search',      href: '/mieter/mein-bereich/suchen',    svg: ICONS.search },
    { labelKey: 'bottomNav.favorites',   href: '/mieter/mein-bereich/favoriten', svg: ICONS.heart },
    { labelKey: 'bottomNav.account',     href: '/konto',                         svg: ICONS.user },
  ],
}

export default function BottomNav({ role }: { role?: NavRole }) {
  const pathname = usePathname() || ''
  const t = useTranslations()
  const items = role ? NAVS[role] : undefined
  if (!items) return null
  const rootHrefs = ['/anbieter/mein-salon', '/vermieter/mein-inserat', '/mieter/mein-bereich']
  return (
    <div style={{
      borderTop: '1px solid rgba(196,168,106,0.15)',
      background: 'rgba(11,11,15,0.97)',
      backdropFilter: 'blur(12px)',
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      padding: '11px 0 14px',
    }}>
      {items.map((it) => {
        const isOn = pathname === it.href || (!rootHrefs.includes(it.href) && pathname.startsWith(it.href + '/'))
        return (
          <Link key={it.labelKey} href={it.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            fontSize: 9, letterSpacing: 1.5, fontWeight: 600,
            color: isOn ? 'var(--gold2)' : 'rgba(232,230,218,0.45)',
            textDecoration: 'none',
          }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              {it.svg}
            </svg>
            <span>{t(it.labelKey)}</span>
          </Link>
        )
      })}
    </div>
  )
}
