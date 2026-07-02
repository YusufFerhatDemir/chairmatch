import type { Metadata } from 'next'
import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'

export const metadata: Metadata = {
  title: 'Seite nicht gefunden',
  robots: { index: false, follow: false },
}

const POPULAR = [
  { href: '/match', label: 'Match-Finder', desc: 'In 60 Sekunden zum passenden Stuhl' },
  { href: '/karte', label: 'Stuhl-Karte', desc: 'Freie Plätze in deiner Stadt' },
  { href: '/explore', label: 'Salons entdecken', desc: 'Alle Studios & Anbieter' },
  { href: '/magazin', label: 'Magazin', desc: 'Guides & Branchenwissen' },
] as const

export default function NotFound() {
  return (
    <div className="shell">
      <div className="screen" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: 'var(--pad)',
        textAlign: 'center',
      }}>
        <BrandLogo size={72} variant="glow" priority={true} />
        <p className="cinzel" style={{ fontSize: 40, color: 'var(--gold2)', letterSpacing: 4, margin: '18px 0 4px' }}>
          404
        </p>
        <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginBottom: 8 }}>
          Seite nicht gefunden
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 'var(--font-md)', marginBottom: 24, maxWidth: 340 }}>
          Die angeforderte Seite existiert nicht oder wurde verschoben.
          Vielleicht hilft dir einer dieser Einstiege weiter:
        </p>

        <nav aria-label="Beliebte Seiten" style={{ width: '100%', maxWidth: 360, marginBottom: 24 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            {POPULAR.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  style={{
                    display: 'block', textAlign: 'left', textDecoration: 'none',
                    padding: '12px 16px', borderRadius: 14,
                    background: 'rgba(196,168,106,0.06)',
                    border: '1px solid rgba(196,168,106,0.2)',
                  }}
                >
                  <span style={{ display: 'block', color: 'var(--gold2)', fontWeight: 700, fontSize: 14 }}>
                    {p.label} →
                  </span>
                  <span style={{ display: 'block', color: 'var(--stone)', fontSize: 12, marginTop: 2 }}>
                    {p.desc}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link href="/" className="bgold" style={{ maxWidth: 200, display: 'inline-block' }}>
          Zur Startseite
        </Link>
      </div>
    </div>
  )
}
