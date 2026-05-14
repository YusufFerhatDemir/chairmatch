import type { Metadata } from 'next'
import Link from 'next/link'
import { MAGAZIN_ARTIKEL } from '@/lib/seo-data/magazin'
import { breadcrumbSchema } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'

export const metadata: Metadata = {
  title: 'ChairMatch Magazin — Praxis-Wissen für Beauty-Selbstständige',
  description: 'Wie funktioniert Stuhl-Miete? Welche Steuern? Welche Verträge? Praktische Guides für Friseure, Barber, Kosmetikerinnen und Lash-Spezialistinnen.',
  alternates: { canonical: 'https://chairmatch.de/magazin' },
  openGraph: {
    title: 'ChairMatch Magazin',
    description: 'Praxis-Wissen für selbstständige Beauty-Profis.',
    url: 'https://chairmatch.de/magazin',
    locale: 'de_DE',
    siteName: 'ChairMatch',
  },
}

export default function MagazinIndexPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
            { name: 'Start', url: '/' }, { name: 'Magazin', url: '/magazin' },
          ])) }}
        />

        <Breadcrumbs items={[{ name: 'Magazin', url: '/magazin' }]} />

        <h1 className="cinzel" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 8 }}>
          ChairMatch Magazin
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          Praxis-Wissen für selbstständige Beauty-Profis. Kein Marketing-Bla, sondern echte Anleitungen.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {MAGAZIN_ARTIKEL.map((a) => (
            <Link key={a.slug} href={`/magazin/${a.slug}`} style={{ textDecoration: 'none' }}>
              <article style={{ background: 'var(--c2)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, color: 'var(--gold2)', letterSpacing: 1, margin: '0 0 6px' }}>
                  {a.category.toUpperCase()} · {a.readMinutes} MIN LESEN
                </p>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--cream)', margin: '0 0 6px', lineHeight: 1.4 }}>
                  {a.title}
                </p>
                <p style={{ fontSize: 12, color: 'var(--stone)', margin: 0, lineHeight: 1.6 }}>
                  {a.description}
                </p>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
