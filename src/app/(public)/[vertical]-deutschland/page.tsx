/**
 * Vertical-Deutschland-Hub: /[vertical]-deutschland
 * Beispiel: /friseur-deutschland, /barbershop-deutschland
 *
 * Pillar-Content-Page. Server Component. ISR 6h.
 * Indexierung: immer index — auch ohne Listings (Provider-Akquise-Trichter).
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { VERTICALS, getVerticalBySlug } from '@/lib/seo-data/verticals'
import { PHASE_1_CITIES } from '@/lib/seo-data/cities'
import { breadcrumbSchema, faqSchema, slugToCity } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'

export const revalidate = 21600 // 6h ISR

interface Props {
  params: Promise<{ vertical: string }>
}

export async function generateStaticParams() {
  // Slug-Form: "{vertical}-deutschland" → "friseur-deutschland"
  return VERTICALS.map((v) => ({ vertical: `${v.slug}-deutschland` }))
}

function parseVerticalSlug(rawSlug: string | undefined | null): string | null {
  // Null-Check verhindert "Cannot read properties of undefined (reading 'endsWith')"
  // wenn Next.js die Page beim Build mit ungültigen Params probe-rendered.
  if (!rawSlug || typeof rawSlug !== 'string') return null
  if (!rawSlug.endsWith('-deutschland')) return null
  return rawSlug.replace(/-deutschland$/, '')
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vertical } = await params
  const vSlug = parseVerticalSlug(vertical)
  const v = vSlug ? getVerticalBySlug(vSlug) : undefined
  if (!v) return { title: 'Nicht gefunden' }

  return {
    title: `${v.name}-${v.assetLabel} mieten in Deutschland | ChairMatch`,
    description: `${v.name}-Chair-Rental in Deutschland: ${v.marketStats} Anbieter werden — 0% Provision in den ersten 3 Monaten.`,
    keywords: [
      `${v.name.toLowerCase()} chair rental`,
      `${v.assetLabel.toLowerCase()} mieten`,
      `${v.name.toLowerCase()} stuhl miete deutschland`,
      `${v.pluralName.toLowerCase()} vermieten`,
      'beauty workspace sharing',
    ].join(', '),
    alternates: { canonical: `https://chairmatch.de/${vertical}` },
    openGraph: {
      title: `${v.name}-${v.assetLabel} mieten in Deutschland`,
      description: v.marketStats,
      url: `https://chairmatch.de/${vertical}`,
      type: 'website',
      locale: 'de_DE',
      siteName: 'ChairMatch',
    },
  }
}

export default async function VerticalHubPage({ params }: Props) {
  const { vertical } = await params
  const vSlug = parseVerticalSlug(vertical)
  const v = vSlug ? getVerticalBySlug(vSlug) : undefined
  if (!v) notFound()

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
            { name: 'Start', url: '/' },
            { name: `${v.name} Deutschland`, url: `/${vertical}` },
          ])) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(v.faqs)) }}
        />

        <Breadcrumbs items={[{ name: `${v.name} Deutschland`, url: `/${vertical}` }]} />

        <h1 className="cinzel" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 8 }}>
          {v.name}-{v.assetLabel} mieten in Deutschland
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          {v.marketStats}
        </p>

        {/* Pillar-Intro */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', marginBottom: 12 }}>
            Was ist {v.name}-Chair-Rental?
          </h2>
          <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.8 }}>
            {v.pillarIntro}
          </p>
        </section>

        {/* Vorteile */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', marginBottom: 12 }}>
            Vorteile auf einen Blick
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
            <div style={{ background: 'var(--c2)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)', margin: '0 0 10px' }}>
                🎯 Für dich als Mieter
              </p>
              <ul style={{ color: 'var(--stone)', fontSize: 13, lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
                {v.benefits.tenant.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
            <div style={{ background: 'var(--c2)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)', margin: '0 0 10px' }}>
                💼 Für dich als Anbieter
              </p>
              <ul style={{ color: 'var(--stone)', fontSize: 13, lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
                {v.benefits.provider.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* Top-Städte interne Links */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', marginBottom: 12 }}>
            {v.name} in den Top-Städten
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            {PHASE_1_CITIES.map((c) => (
              <Link
                key={c.slug}
                href={`/${c.slug}/${v.slug}`}
                style={{ textDecoration: 'none', background: 'var(--c2)', borderRadius: 10, padding: 12, textAlign: 'center', border: '1px solid var(--border)' }}
              >
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold2)', margin: 0 }}>{slugToCity(c.slug)}</p>
                <p style={{ fontSize: 10, color: 'var(--stone)', margin: '2px 0 0' }}>{v.name}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Rechtliches */}
        <section style={{ marginBottom: 32, background: 'rgba(212,175,55,0.05)', borderRadius: 12, padding: 16, border: '1px solid rgba(212,175,55,0.15)' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold2)', margin: '0 0 8px' }}>
            ⚖️ Rechtlicher Rahmen (Disclaimer)
          </p>
          <p style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.7, margin: 0 }}>
            {v.legalNote}
          </p>
          <p style={{ fontSize: 10, color: 'var(--stone2)', marginTop: 10, fontStyle: 'italic' }}>
            Dies ist eine Orientierung, kein Rechtsrat. Für deine konkrete Situation konsultiere bitte einen Steuerberater oder Rechtsanwalt.
          </p>
        </section>

        {/* FAQ */}
        <FAQ items={v.faqs} title={`Häufige Fragen zu ${v.name}-Stuhl-Miete`} />

        {/* CTA */}
        <section style={{ marginTop: 32, textAlign: 'center' }}>
          <Link href="/anbieter/wie-es-funktioniert" className="bgold" style={{ display: 'inline-block', padding: '14px 28px', textDecoration: 'none', fontSize: 14 }}>
            Anbieter werden →
          </Link>
        </section>
      </div>
    </div>
  )
}
