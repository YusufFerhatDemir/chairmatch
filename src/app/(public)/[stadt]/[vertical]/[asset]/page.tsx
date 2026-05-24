/**
 * Stadt × Vertical × Asset: /[stadt]/[vertical]/[asset]
 * Beispiel: /frankfurt/friseur/stuhl-mieten, /berlin/kosmetik/raum-mieten
 *
 * Welle-1 hand-kuratierte Landingpages für die Top-Kombinationen aus
 * Modul 2 §4.6 — nur diese werden über generateStaticParams ausgespielt
 * und sind indexierbar. Alle anderen Kombinationen → 404.
 *
 * Indexierung: bedingt — sobald shouldIndex(salonCount) erfüllt ist
 * (Soft-404-Schutz auf Asset-Ebene).
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getCityBySlug, PHASE_1_CITIES } from '@/lib/seo-data/cities'
import { getVerticalBySlug } from '@/lib/seo-data/verticals'
import { getAssetBySlug, PHASE_1B_ASSET_COMBOS } from '@/lib/seo-data/assets'
import { robotsForListingPage, breadcrumbSchema, faqSchema, salonSchema, slugToCity } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'

export const revalidate = 3600

interface Props {
  params: Promise<{ stadt: string; vertical: string; asset: string }>
}

interface SalonRow {
  id: string
  slug: string
  name: string
  description: string | null
  city: string | null
  avg_rating: number | null
  review_count: number | null
}

export async function generateStaticParams() {
  return PHASE_1B_ASSET_COMBOS.map((c) => ({
    stadt: c.stadt,
    vertical: c.vertical,
    asset: c.asset,
  }))
}

export const dynamicParams = false

async function loadCombo(citySlug: string, verticalSlug: string, assetSlug: string) {
  const city = getCityBySlug(citySlug)
  const vertical = getVerticalBySlug(verticalSlug)
  const asset = getAssetBySlug(assetSlug)
  if (!city || !vertical || !asset) notFound()
  if (!asset.applicableVerticals.includes(vertical.slug)) notFound()

  // Whitelist-Doppelcheck: nur explizit priorisierte Kombinationen rendern
  const isWhitelisted = PHASE_1B_ASSET_COMBOS.some(
    (c) => c.stadt === citySlug && c.vertical === verticalSlug && c.asset === assetSlug,
  )
  if (!isWhitelisted) notFound()

  let salons: SalonRow[] = []
  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('salons')
      .select('id, slug, name, description, city, avg_rating, review_count')
      .eq('is_active', true)
      .ilike('city', city.name)
      .eq('category', verticalSlug)
      .order('avg_rating', { ascending: false, nullsFirst: false })
      .limit(20)
    salons = (data ?? []) as SalonRow[]
  } catch { /* fail-soft */ }

  return { city, vertical, asset, salons, salonCount: salons.length }
}

/**
 * Asset-Display: wenn der angefragte Asset-Slug der kanonische Asset-Typ
 * des Verticals ist → kompaktes Label (z.B. "Friseurstuhl"). Sonst
 * `Vertical-Asset` (z.B. "Kosmetik-Raum") um die Stadt-Bedeutung
 * sichtbar zu halten ohne Wortverdoppelung.
 */
function getAssetDisplay(
  verticalAssetType: string,
  verticalAssetLabel: string,
  verticalName: string,
  assetSlug: string,
  assetLabel: string,
): string {
  return verticalAssetType === assetSlug ? verticalAssetLabel : `${verticalName}-${assetLabel}`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stadt, vertical, asset } = await params
  const { city, vertical: v, asset: a, salonCount } = await loadCombo(stadt, vertical, asset)

  const assetDisplay = getAssetDisplay(v.assetType, v.assetLabel, v.name, a.slug, a.label)
  const title = `${assetDisplay} mieten in ${city.name} — Stuhlmiete`
  const description = salonCount > 0
    ? `${salonCount} ${v.pluralName} in ${city.name} vermieten ${a.pluralLabel} tageweise. Stuhlmiete ab ${city.priceRange.stuhl}, Stripe-gesichert, 0 % Provision für dich als Mieter.`
    : `${v.name}-Stuhlmiete in ${city.name}: ${assetDisplay} tageweise mieten. Jetzt als Gründungsmitglied dabei — 0 % Provision in den ersten 3 Monaten.`

  const cityLower = city.name.toLowerCase()
  const vName = v.name.toLowerCase()
  return {
    title,
    description,
    keywords: [
      `${vName} stuhlmiete ${cityLower}`,
      `${assetDisplay.toLowerCase()} mieten ${cityLower}`,
      `stuhlmiete ${vName} ${cityLower}`,
      `${v.assetLabel.toLowerCase()} mieten ${cityLower}`,
      `${a.label.toLowerCase()} mieten ${cityLower}`,
      `${vName} platz ${cityLower}`,
      `salonplatz ${cityLower}`,
    ].join(', '),
    alternates: { canonical: `https://chairmatch.de/${stadt}/${vertical}/${asset}` },
    robots: robotsForListingPage(salonCount),
    openGraph: {
      title,
      description,
      url: `https://chairmatch.de/${stadt}/${vertical}/${asset}`,
      type: 'website',
      locale: 'de_DE',
      siteName: 'ChairMatch',
    },
  }
}

export default async function CityVerticalAssetPage({ params }: Props) {
  const { stadt, vertical, asset } = await params
  const { city, vertical: v, asset: a, salons, salonCount } = await loadCombo(stadt, vertical, asset)
  const assetDisplay = getAssetDisplay(v.assetType, v.assetLabel, v.name, a.slug, a.label)
  const breadcrumbLabel = `${assetDisplay} mieten`

  const FAQS = [
    {
      question: `Was kostet ein ${assetDisplay} in ${city.name} pro Tag?`,
      answer: `In ${city.name} liegen die Tagespreise für ${v.assetLabel}-Stuhlmiete typischerweise bei ${city.priceRange.stuhl}. Wochenpakete sind oft 10–15 % günstiger, Monatspauschalen bei längerer Bindung verhandelbar.`,
    },
    {
      question: `Was ist im ${a.label}-Mietpreis enthalten?`,
      answer: `Standard: voll ausgestatteter Arbeitsplatz inklusive Strom, Wasser, Klima, Grundausstattung des Vermieters (Spiegel, Becken, Sterilisator), Wartebereich für deine Kunden. NICHT enthalten: deine eigenen Produkte und Werkzeuge.`,
    },
    {
      question: `Brauche ich für ${v.name}-Stuhlmiete in ${city.name} einen Meisterbrief?`,
      answer: v.legalNote,
    },
    {
      question: `Wie schnell bekomme ich einen ${a.label} in ${city.name}?`,
      answer: `Sobald 3 verifizierte Vermieter gelistet sind, kannst du direkt buchen. Vorab kannst du dich als Gründungsmitglied registrieren und erhältst die ersten Listings exklusiv per E-Mail.`,
    },
  ]

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        {/* JSON-LD: Service + AggregateOffer (wenn Salons da sind) */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: `${assetDisplay} mieten in ${city.name}`,
            provider: { '@id': 'https://chairmatch.de/#organization' },
            areaServed: {
              '@type': 'City',
              name: city.name,
              containedInPlace: { '@type': 'Country', name: 'Germany' },
            },
            serviceType: `${v.name} ${a.label} Rental`,
            description: `Tageweise Stuhlmiete eines ${assetDisplay} in ${city.name}.`,
            offers: salons.length > 0 ? {
              '@type': 'AggregateOffer',
              priceCurrency: 'EUR',
              lowPrice: city.priceRange.stuhl.split('-')[0].replace(/\D/g, ''),
              highPrice: city.priceRange.stuhl.split('-')[1]?.replace(/\D/g, '').replace('€/Tag', '') || '90',
              offerCount: salons.length,
            } : undefined,
          }) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
            { name: 'Start', url: '/' },
            { name: city.name, url: `/${stadt}` },
            { name: v.name, url: `/${stadt}/${vertical}` },
            { name: breadcrumbLabel, url: `/${stadt}/${vertical}/${asset}` },
          ])) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(FAQS)) }}
        />
        {salons.slice(0, 5).map((s) => (
          <script
            key={s.id}
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(salonSchema({
              id: s.id, name: s.name, slug: s.slug, description: s.description,
              category: v.name, city: s.city, avg_rating: s.avg_rating, review_count: s.review_count,
            })) }}
          />
        ))}

        <Breadcrumbs items={[
          { name: city.name, url: `/${stadt}` },
          { name: v.name, url: `/${stadt}/${vertical}` },
          { name: breadcrumbLabel, url: `/${stadt}/${vertical}/${asset}` },
        ]} />

        {/* Hero */}
        <h1 className="cinzel" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 8 }}>
          {assetDisplay} mieten in {city.name} — Stuhlmiete
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          {salonCount > 0
            ? `${salonCount} verifizierte ${v.pluralName} in ${city.name} bieten ${assetDisplay}-Stuhlmiete tageweise an — ab ${city.priceRange.stuhl}. Stripe-gesicherte Zahlung, klare Mietverträge, 0 % Provision auf deine Behandlungs-Umsätze.`
            : `${v.name}-Stuhlmiete in ${city.name} startet bei ${city.priceRange.stuhl}. Aktuell noch keine verifizierten ${assetDisplay}-Plätze — jetzt als Gründungsmitglied dabei und 0 % Provision in den ersten 3 Monaten sichern.`}
        </p>

        {/* Gründungsmitglied-CTA wenn unter Threshold */}
        {salonCount < 3 && (
          <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, padding: 14, marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: 'var(--gold2)', margin: '0 0 6px', fontWeight: 700 }}>
              Jetzt als Gründungsmitglied dabei — {v.name}-Stuhlmiete in {city.name}
            </p>
            <p style={{ fontSize: 12, color: 'var(--stone)', margin: '0 0 12px', lineHeight: 1.5 }}>
              Diese Seite wird in Google sichtbar, sobald 3 verifizierte Vermieter gelistet sind.
              Werde Gründungs-Vermieter und sichere dir lebenslange Founding-Auszeichnung.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/vermieter/wie-es-funktioniert" className="bgold" style={{ display: 'inline-block', padding: '8px 18px', fontSize: 13, textDecoration: 'none' }}>
                Stuhl inserieren →
              </Link>
              <Link href="/mieter/wie-es-funktioniert" className="boutline" style={{ display: 'inline-block', padding: '8px 18px', fontSize: 13, textDecoration: 'none' }}>
                Als Mieter eintragen
              </Link>
            </div>
          </div>
        )}

        {/* Salon-Liste */}
        {salons.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', marginBottom: 12 }}>
              Verfügbare {v.pluralName} mit {assetDisplay}-Stuhlmiete in {city.name}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {salons.map((s) => (
                <Link key={s.id} href={`/salon/${s.slug}`} style={{ textDecoration: 'none' }}>
                  <article style={{ background: 'var(--c2)', borderRadius: 12, padding: 14, border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)', margin: '0 0 4px' }}>{s.name}</p>
                    {s.description && (
                      <p style={{ fontSize: 12, color: 'var(--stone)', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--stone2)' }}>
                      {s.avg_rating && <span>★ {s.avg_rating.toFixed(1)} {s.review_count ? `(${s.review_count})` : ''}</span>}
                      <span>{s.city}</span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* SEO-Text: Markt-Kontext */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', marginBottom: 12 }}>
            {v.name}-Markt in {city.name}
          </h2>
          <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
            {city.intro}
          </p>
          <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.8 }}>
            {v.pillarIntro}
          </p>
        </section>

        {/* Preisspanne */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 12 }}>
            Preisspanne {assetDisplay}-Stuhlmiete in {city.name}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div style={{ background: 'var(--c2)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: 'var(--stone)', margin: 0 }}>Stuhl</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold2)', margin: '4px 0 0' }}>{city.priceRange.stuhl}</p>
            </div>
            <div style={{ background: 'var(--c2)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: 'var(--stone)', margin: 0 }}>Kabine</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold2)', margin: '4px 0 0' }}>{city.priceRange.kabine}</p>
            </div>
            <div style={{ background: 'var(--c2)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: 'var(--stone)', margin: 0 }}>Raum / OP</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold2)', margin: '4px 0 0' }}>{city.priceRange.raum}</p>
            </div>
          </div>
        </section>

        {/* Was du als Mieter bekommst */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 12 }}>
            Was du als Mieter bekommst
          </h2>
          <ul style={{ color: 'var(--stone)', fontSize: 13, lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
            {v.benefits.tenant.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </section>

        {/* FAQ */}
        <FAQ items={FAQS} title={`Häufige Fragen zu ${v.name}-Stuhlmiete in ${city.name}`} />

        {/* Cross-Links: zurück zur Eltern-Ebene und Geschwister-Pages */}
        <section style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 8, fontWeight: 700 }}>
            Übergeordnete Seiten
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <Link href={`/${stadt}/${vertical}`} style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>
              Alle {v.pluralName} in {city.name}
            </Link>
            <Link href={`/${stadt}`} style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>
              Stuhlmiete in {city.name}
            </Link>
            <Link href={`/${vertical}-deutschland`} style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>
              {v.name} deutschlandweit
            </Link>
          </div>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 8, fontWeight: 700 }}>
            {v.name}-Stuhlmiete in anderen Städten
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PHASE_1_CITIES.filter((c) => c.slug !== city.slug).map((c) => (
              <Link key={c.slug} href={`/${c.slug}/${vertical}`} style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>
                {v.name} in {slugToCity(c.slug)}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
