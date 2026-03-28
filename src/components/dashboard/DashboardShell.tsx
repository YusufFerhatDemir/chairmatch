'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface NavItem {
  href: string
  label: string
  icon: string
  badge?: number
}

interface DashboardShellProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  navItems: NavItem[]
  branding?: string
}

export default function DashboardShell({ children, title, subtitle, navItems, branding = 'ChairMatch' }: DashboardShellProps) {
  const pathname = usePathname()

  // Lock body scroll on iOS — prevents touch events leaking to body
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.style.overflow = 'hidden'
    html.style.height = '100%'
    body.style.overflow = 'hidden'
    body.style.height = '100%'
    body.style.overscrollBehavior = 'none'
    return () => {
      html.style.overflow = ''
      html.style.height = ''
      body.style.overflow = ''
      body.style.height = ''
      body.style.overscrollBehavior = ''
    }
  }, [])

  return (
    <div style={{ height: '100dvh', width: '100%', display: 'flex', background: 'var(--bg)', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      {/* Sidebar — desktop only */}
      <aside style={{
        width: 240,
        background: 'var(--c1)',
        borderRight: '1px solid rgba(176,144,96,0.08)',
        padding: '24px 0',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflowY: 'auto',
      }} className="dashboard-sidebar">
        {/* Brand */}
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(176,144,96,0.08)' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <p className="cinzel" style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold2)', letterSpacing: 2, margin: 0 }}>
              {branding}
            </p>
          </Link>
          <p style={{ fontSize: 10, color: 'var(--stone)', marginTop: 2, letterSpacing: 1 }}>{title}</p>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href as '/'} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--gold2)' : 'var(--stone)',
                background: isActive ? 'rgba(176,144,96,0.08)' : 'transparent',
                transition: 'all .15s',
              }}>
                <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#fff',
                    background: 'var(--red)', borderRadius: 8,
                    padding: '2px 6px', minWidth: 18, textAlign: 'center',
                  }}>{item.badge}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(176,144,96,0.08)' }}>
          <Link href="/" style={{ fontSize: 11, color: 'var(--stone2)', textDecoration: 'none' }}>
            Zur App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, minHeight: 0, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehavior: 'contain' }} className="dashboard-main">
        {/* Top bar */}
        <header style={{
          padding: '16px 28px',
          borderBottom: '1px solid rgba(176,144,96,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: 'var(--bg)',
          zIndex: 40,
        }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', margin: 0 }}>{title}</h1>
            {subtitle && <p style={{ fontSize: 12, color: 'var(--stone)', marginTop: 2 }}>{subtitle}</p>}
          </div>
          {/* Mobile hamburger placeholder — shown on mobile via CSS */}
          <button className="dashboard-menu-btn" style={{
            display: 'none', background: 'none', border: 'none',
            color: 'var(--cream)', fontSize: 20, cursor: 'pointer',
          }}>
            &#9776;
          </button>
        </header>

        {/* Page content */}
        <div style={{ padding: '24px 28px' }}>
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="dashboard-mobile-nav" style={{
        display: 'none',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--c1)',
        borderTop: '1px solid rgba(176,144,96,0.08)',
        zIndex: 50,
        padding: '6px 0 env(safe-area-inset-bottom)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {navItems.slice(0, 5).map(item => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href as '/'} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, padding: '6px 8px', textDecoration: 'none',
                color: isActive ? 'var(--gold2)' : 'var(--stone)',
                fontSize: 9, fontWeight: isActive ? 700 : 500,
              }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
