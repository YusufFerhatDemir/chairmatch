/**
 * SEO-Footer: Hub-and-Spoke-Verlinkung für interne SEO-Power.
 *
 * Wird NUR auf SEO-Pages (was-ist, provisionsmodell, faq, magazin, etc.)
 * eingebunden — die Home (page.tsx + HomeClient) bleibt unberührt.
 *
 * Linkt zu allen wichtigen Pillar-Pages, Vertical-Hubs, Stadt-Hubs.
 * Verstärkt internal-PageRank-Distribution.
 */

import Link from 'next/link'
import { PHASE_1_CITIES } from '@/lib/seo-data/cities'

const VERTICAL_LINKS = [
  { slug: 'barbershop-deutschland', label: 'Barbershop' },
  { slug: 'friseur-deutschland', label: 'Friseur' },
  { slug: 'kosmetik-deutschland', label: 'Kosmetik' },
  { slug: 'nagelstudio-deutschland', label: 'Nagelstudio' },
  { slug: 'lash-brows-deutschland', label: 'Lash & Brows' },
]

// Alle SEO-Städte aus der zentralen Datenquelle — hartcodiert war nur Phase 1,
// neue Städte bekamen sonst keine internen Links (PageRank-Verteilung).
const CITY_LINKS = PHASE_1_CITIES.map((c) => ({ slug: c.slug, label: c.name }))

const PILLAR_LINKS = [
  { href: '/was-ist-chairmatch', label: 'Was ist ChairMatch?' },
  { href: '/provisionsmodell', label: 'Provisionsmodell' },
  { href: '/anbieter/wie-es-funktioniert', label: 'Für Anbieter' },
  { href: '/mieter/wie-es-funktioniert', label: 'Für Mieter' },
  { href: '/freelancer-rechner', label: 'Freelancer-Rechner' },
  { href: '/preisvergleich', label: 'Preisvergleich' },
  { href: '/vertrag-generator', label: 'Vertrag-Generator' },
  { href: '/karte', label: 'Stuhl-Karte' },
  { href: '/match', label: 'Match-Finder' },
  { href: '/faq', label: 'FAQ' },
  { href: '/magazin', label: 'Magazin' },
  { href: '/empfehlungen', label: 'Top-Salons' },
]

const PREMIUM_LINKS = [
  { href: '/premium', label: 'Premium Hub' },
  { href: '/haartransplantation', label: 'Haartransplantation' },
  { href: '/zahnimplantate', label: 'Zahnimplantate' },
  { href: '/augenlasern', label: 'Augenlasern' },
  { href: '/longevity', label: 'Longevity' },
  { href: '/iv-infusionen', label: 'IV-Infusionen' },
]

const LEGAL_LINKS = [
  { href: '/impressum', label: 'Impressum' },
  { href: '/datenschutz', label: 'Datenschutz' },
  { href: '/agb', label: 'AGB' },
  { href: '/widerruf', label: 'Widerruf' },
  { href: '/cookie-settings', label: 'Cookies' },
]

export function SeoFooter() {
  return (
    <footer
      style={{
        marginTop: 60,
        padding: '40px 16px 80px',
        borderTop: '1px solid var(--border)',
        background: 'var(--c1)',
      }}
      aria-label="Footer-Navigation"
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 32,
          marginBottom: 32,
        }}>
          <FooterSection title="ChairMatch" links={PILLAR_LINKS} />
          <FooterSection title="Kategorien" links={VERTICAL_LINKS.map(v => ({ href: `/${v.slug}`, label: v.label }))} />
          <FooterSection title="Städte" links={CITY_LINKS.map(c => ({ href: `/${c.slug}`, label: c.label }))} />
          <FooterSection title="Premium" links={PREMIUM_LINKS} />
          <FooterSection title="Rechtliches" links={LEGAL_LINKS} />
        </div>

        <div style={{
          paddingTop: 24,
          borderTop: '1px solid var(--border)',
          textAlign: 'center',
          color: 'var(--stone)',
          fontSize: 12,
        }}>
          © {new Date().getFullYear()} ChairMatch — Deutschlands Marketplace für Beauty-Workspace-Sharing
        </div>
      </div>
    </footer>
  )
}

function FooterSection({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="cinzel" style={{
        fontSize: 13, fontWeight: 700, color: 'var(--gold2)',
        marginBottom: 12, letterSpacing: 1,
      }}>
        {title}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href as never}
              style={{
                fontSize: 12, color: 'var(--stone)',
                textDecoration: 'none', lineHeight: 1.6,
              }}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}