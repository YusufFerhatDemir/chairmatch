/**
 * Wiederverwendbarer Inhalt für Vertical-Hub-Pages.
 * Wird von /barbershop-deutschland, /friseur-deutschland etc. aus aufgerufen.
 */

import Link from "next/link"
import { notFound } from "next/navigation"
import { getVerticalBySlug } from "@/lib/seo-data/verticals"
import { PHASE_1_CITIES } from "@/lib/seo-data/cities"
import { slugToCity } from "@/lib/seo"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { FAQ } from "@/components/seo/FAQ"

interface Props { verticalSlug: string }

export function VerticalHubContent({ verticalSlug }: Props) {
  const v = getVerticalBySlug(verticalSlug)
  if (!v) notFound()

  const fullSlug = `${v.slug}-deutschland`

  // Service-Schema: deutschlandweit + OfferCatalog mit allen Stadt-Angeboten
  // (stärkstes Interlinking-Signal für Google & AI-Engines)
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `https://www.chairmatch.de/${fullSlug}#service`,
    name: `${v.name}-${v.assetLabel} mieten in Deutschland`,
    description: v.marketStats,
    serviceType: 'Workspace Rental',
    provider: { '@id': 'https://www.chairmatch.de/#organization' },
    areaServed: { '@type': 'Country', name: 'Germany' },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${v.name} Stuhlmiete nach Stadt`,
      itemListElement: PHASE_1_CITIES.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${v.name} Stuhlmiete ${c.name}`,
        url: `https://www.chairmatch.de/${c.slug}/${v.slug}`,
      })),
    },
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: "var(--pad)" }}>
        {/* BreadcrumbList & FAQPage kommen aus <Breadcrumbs>/<FAQ> — keine manuellen Duplikate */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
        />

        <Breadcrumbs items={[{ name: `${v.name} Deutschland`, url: `/${fullSlug}` }]} />

        <h1 className="cinzel" style={{ fontSize: 28, color: "var(--gold2)", fontWeight: 700, marginBottom: 8 }}>
          {v.name}-{v.assetLabel} mieten in Deutschland
        </h1>
        <p style={{ color: "var(--stone)", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          {v.marketStats}
        </p>

        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: "var(--gold2)", marginBottom: 12 }}>
            Was ist {v.name}-Chair-Rental?
          </h2>
          <p style={{ color: "var(--stone)", fontSize: 14, lineHeight: 1.8 }}>
            {v.pillarIntro}
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: "var(--gold2)", marginBottom: 12 }}>
            Vorteile auf einen Blick
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
            <div style={{ background: "var(--c2)", borderRadius: 12, padding: 16, border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--cream)", margin: "0 0 10px" }}>
                Für dich als Mieter
              </p>
              <ul style={{ color: "var(--stone)", fontSize: 13, lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
                {v.benefits.tenant.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
            <div style={{ background: "var(--c2)", borderRadius: 12, padding: 16, border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--cream)", margin: "0 0 10px" }}>
                Für dich als Anbieter
              </p>
              <ul style={{ color: "var(--stone)", fontSize: 13, lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
                {v.benefits.provider.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: "var(--gold2)", marginBottom: 12 }}>
            {v.name} in den Top-Städten
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
            {/* Anchor-Text "«Vertical» Stuhlmiete «Stadt»" — Keyword-Reihenfolge im DOM */}
            {PHASE_1_CITIES.map((c) => (
              <Link
                key={c.slug}
                href={`/${c.slug}/${v.slug}` as never}
                title={`${v.name} Stuhlmiete ${c.name}`}
                style={{ textDecoration: "none", background: "var(--c2)", borderRadius: 10, padding: 12, textAlign: "center", border: "1px solid var(--border)" }}
              >
                <p style={{ fontSize: 10, color: "var(--stone)", margin: 0 }}>{v.name} Stuhlmiete</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--gold2)", margin: "2px 0 0" }}>{slugToCity(c.slug)}</p>
              </Link>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 32, background: "rgba(212,175,55,0.05)", borderRadius: 12, padding: 16, border: "1px solid rgba(212,175,55,0.15)" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--gold2)", margin: "0 0 8px" }}>
            Rechtlicher Rahmen (Disclaimer)
          </p>
          <p style={{ fontSize: 12, color: "var(--stone)", lineHeight: 1.7, margin: 0 }}>
            {v.legalNote}
          </p>
          <p style={{ fontSize: 10, color: "var(--stone2)", marginTop: 10, fontStyle: "italic" }}>
            Dies ist eine Orientierung, kein Rechtsrat. Für deine konkrete Situation konsultiere bitte einen Steuerberater oder Rechtsanwalt.
          </p>
        </section>

        <FAQ items={v.faqs} title={`Häufige Fragen zu ${v.name}-Stuhl-Miete`} />

        <section style={{ marginTop: 32, textAlign: "center" }}>
          <Link href={"/anbieter/wie-es-funktioniert" as never} className="bgold" style={{ display: "inline-block", padding: "14px 28px", textDecoration: "none", fontSize: 14 }}>
            Anbieter werden
          </Link>
        </section>
      </div>
    </div>
  )
}

export function makeVerticalMetadata(verticalSlug: string) {
  const v = getVerticalBySlug(verticalSlug)
  if (!v) return { title: "Nicht gefunden" }
  const fullSlug = `${v.slug}-deutschland`
  const url = `https://www.chairmatch.de/${fullSlug}`
  return {
    title: `${v.name}-${v.assetLabel} mieten in Deutschland | ChairMatch`,
    description: `${v.name}-Chair-Rental in Deutschland: ${v.marketStats} Anbieter werden — 0% Provision in den ersten 3 Monaten.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${v.name}-${v.assetLabel} mieten in Deutschland — ChairMatch`,
      description: `${v.name} Stuhlmiete in 20 deutschen Städten: verifizierte Anbieter, transparente Tagespreise, rechtssichere Mietverträge.`,
      url,
      type: 'website' as const,
      locale: 'de_DE',
      siteName: 'ChairMatch',
    },
  }
}
