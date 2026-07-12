import type { Metadata } from 'next'
import Link from 'next/link'
import { MAGAZIN_ARTIKEL } from '@/lib/seo-data/magazin'
import { itemListSchema } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'

export const metadata: Metadata = {
  title: 'ChairMatch Magazin — Praxis-Wissen für Beauty-Selbstständige',
  description: 'Wie funktioniert Stuhl-Miete? Welche Steuern? Welche Verträge? Praktische Guides für Friseure, Barber, Kosmetikerinnen und Lash-Spezialistinnen.',
  keywords: 'stuhlmiete ratgeber, beauty selbstständig magazin, friseur selbstständig guide, stuhl mieten wissen',
  alternates: { canonical: 'https://www.chairmatch.de/magazin' },
  openGraph: {
    title: 'ChairMatch Magazin',
    description: 'Praxis-Wissen für selbstständige Beauty-Profis.',
    url: 'https://www.chairmatch.de/magazin',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChairMatch Magazin' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChairMatch Magazin — Praxis-Wissen für Beauty-Selbstständige',
    description: 'Praktische Guides für Friseure, Barber, Kosmetikerinnen und Lash-Spezialistinnen.',
    images: ['/og-image.png'],
  },
}

export default function MagazinIndexPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        {/* ItemList: alle Artikel — hilft Google & AI-Engines, das Magazin als Kollektion zu verstehen */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema({
            url: '/magazin',
            name: 'ChairMatch Magazin — Praxis-Wissen für Beauty-Selbstständige',
            items: MAGAZIN_ARTIKEL.map((a) => ({
              name: a.title,
              url: `/magazin/${a.slug}`,
              description: a.description,
            })),
          })) }}
        />
        {/* BreadcrumbList kommt aus <Breadcrumbs> — kein manuelles Duplikat */}
        <Breadcrumbs items={[{ name: 'Magazin', url: '/magazin' }]} />

        <h1 className="cinzel" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 8 }}>
          ChairMatch Magazin
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>
          Praxis-Wissen für selbstständige Beauty-Profis. Kein Marketing-Bla, sondern echte Anleitungen.
        </p>
        <p style={{ color: 'var(--stone)', fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
          Alle Guides thematisch sortiert findest du im{' '}
          <Link href="/stuhlvermietung-guide" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>
            Stuhlvermietung Guide
          </Link>{' '}
          — unserem Ratgeber-Hub von Kosten über Verträge bis zu den Berufsgruppen-Guides.
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
