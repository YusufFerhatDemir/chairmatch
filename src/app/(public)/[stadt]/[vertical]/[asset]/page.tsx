/**
 * Stadt × Vertical × Asset-Page (Money-Page Type 2):
 *   /[stadt]/[vertical]/[asset]
 *
 * Beispiele:
 *   /koeln/friseur/stuhl-mieten
 *   /berlin/lash-brows/platz-mieten
 *   /frankfurt/barbershop/stuhl-mieten
 *   /muenchen/op-raum-mieten
 *
 * Die heißesten Money-Keywords landen hier.
 * ISR 1h. Indexierung bedingt — bei <3 Listings noindex.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getCityBySlug, PHASE_1_CITIES } from '@/lib/seo-data/cities'
import { getVerticalBySlug, VERTICALS } from '@/lib/seo-data/verticals'
import { robotsForListingPage, breadcrumbSchema, slugToCity } from '@/lib/seo'
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

/**
 * Asset-Slug-Whitelist + zugehöriger Display-Label.
 * Nur diese Asset-Slugs werden für SEO indexiert.
 */
const ASSET_LABELS: Record<string, { label: string; pluralLabel: string; intro: string }> = {
  'stuhl-mieten': {
    label: 'Stuhl',
    pluralLabel: 'Stühle',
    intro: 'Tagespreis-Stühle für Friseure, Barber, Selbstständige. Vollausstattung mit Becken, Spiegel, Wartebereich.',
  },
  'liege-mieten': {
    label: 'Liege',
    pluralLabel: 'Liegen',
    intro: 'Behandlungs- und Massageliegen mit Lampe, Sterilisator und ergonomischer Verstellung.',
  },
  'kabine-mieten': {
    label: 'Kabine',
    pluralLabel: 'Kabinen',
    intro: 'Geschlossene Behandlungs-Kabinen für Kosmetik, Lash, Microneedling. Ruhig, separat, voll ausgestattet.',
  },
  'platz-mieten': {
    label: 'Workstation-Platz',
    pluralLabel: 'Plätze',
    intro: 'Voll ausgestatteter Arbeitsplatz für Nail-Designerinnen, Lash-Spezialistinnen oder Beauty-Profis.',
  },
  'raum-mieten': {
    label: 'Behandlungsraum',
    pluralLabel: 'Räume',
    intro: 'Geschlossener Raum für Ärzte, Ästhetik-Praxen, Apparativ-Behandlungen.',
  },
}

export async function generateStaticParams() {
  const params: Array<{ stadt: string; vertical: string; asset: string }> = []
  for (const c of PHASE_1_CITIES) {
    for (const v of VERTICALS) {
      params.push({ stadt: c.slug, vertical: v.slug, asset: v.assetType })
    }
  }
  return params
}

async function loadCombo(citySlug: string, verticalSlug: string, assetSlug: string) {
  const city = getCityBySlug(citySlug)
  const vertical = getVerticalBySlug(verticalSlug)
  const asset = ASSET_LABELS[assetSlug]
  if (!city || !vertical || !asset) notFound()

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stadt, vertical, asset } = await params
  const { city, vertical: v, asset: a, salonCount } = await loadCombo(stadt, vertical, asset)

  const title = `${v.name}-${a.label} mieten in ${city.name} | Tagespreis ${city.priceRange.stuhl}`
  const description = salonCount > 0
    ? `${salonCount} ${v.pluralName} in ${city.name} vermieten ${a.pluralLabel} tageweise. ${a.intro} 0% Provision für dich als Mieter.`
    : `Bald: ${v.name}-${a.label} in ${city.name} mieten. Werde der erste Anbieter — 6 Monate 0% Provision.`

  return {
    title,
    description,
    keywords: [
      `${a.label.toLowerCase()} mieten ${city.name.toLowerCase()}`,
      `${v.name.toLowerCase()} ${a.label.toLowerCase()} ${city.name.toLowerCase()}`,
      `${v.name.toLowerCase()} ${a.label.toLowerCase()} miete`,
      `${v.name.toLowerCase()} platz ${city.name.toLowerCase()}`,
      `chair rental ${city.name.toLowerCase()}`,
      'beauty workspace mieten',
      'salonplatz mieten',
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

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: `${v.name}-${a.label} mieten in ${city.name}`,
            provider: { '@id': 'https://chairmatch.de/#organization' },
            areaServed: {
              '@type': 'City',
              name: city.name,
              containedInPlace: { '@type': 'Country', name: 'Germany' },
            },
            serviceType: `${v.name} ${a.label} Rental`,
            description: a.intro,
            offers: salons.length > 0 ? {
              '@type': 'AggregateOffer',
              priceCurrency: 'EUR',
              offerCount: salons.length,
              lowPrice: city.priceRange.stuhl.split('-')[0].replace(/\D/g, ''),
              highPrice: (city.priceRange.stuhl.split('-')[1] || '90').replace(/\D/g, ''),
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
            { name: a.label + ' mieten', url: `/${stadt}/${vertical}/${asset}` },
          ])) }}
        />

        <Breadcrumbs items={[
          { name: city.name, url: `/${stadt}` },
          { name: v.name, url: `/${stadt}/${vertical}` },
          { name: a.label + ' mieten', url: `/${stadt}/${vertical}/${asset}` },
        ]} />

        <h1 className="cinzel" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 8 }}>
          {v.name}-{a.label} mieten in {city.name}
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
          {a.intro} Tagespreise zwischen {city.priceRange.stuhl} in {city.name}.
        </p>

        {/* Hot-Stats-Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
          <div style={{ background: 'var(--c2)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: 'var(--stone)', margin: 0 }}>Tagespreis</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold2)', margin: '2px 0 0' }}>{city.priceRange.stuhl}</p>
          </div>
          <div style={{ background: 'var(--c2)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: 'var(--stone)', margin: 0 }}>Anbieter</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold2)', margin: '2px 0 0' }}>{salonCount}</p>
          </div>
          <div style={{ background: 'var(--c2)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: 'var(--stone)', margin: 0 }}>Provision für dich</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)', margin: '2px 0 0' }}>0 %</p>
          </div>
        </div>

        {salonCount < 3 && (
          <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, padding: 14, marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: 'var(--gold2)', margin: '0 0 6px', fontWeight: 700 }}>
              Bist du der erste {v.name}-Anbieter in {city.name}?
            </p>
            <p style={{ fontSize: 12, color: 'var(--stone)', margin: 0, lineHeight: 1.5 }}>
              Founding-Salon-Programm: 6 Monate 0 % Provision, Concierge-Listing kostenlos, lebenslanges "Founding"-Badge.
            </p>
            <Link href="/anbieter/wie-es-funktioniert" className="bgold" style={{ display: 'inline-block', marginTop: 12, padding: '8px 18px', fontSize: 13, textDecoration: 'none' }}>
              Founding-Salon werden →
            </Link>
          </div>
        )}

        {/* Salon-Liste */}
        {salons.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', marginBottom: 12 }}>
              Verfügbare {a.pluralLabel} in {city.name}
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
                      {s.avg_rating && <span>★ {s.avg_rating.toFixed(1)} {s.review_count && `(${s.review_count})`}</span>}
                      <span>{s.city}</span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Tenant + Provider Benefits */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 12 }}>
            Was dich erwartet
          </h2>
          <ul style={{ color: 'var(--stone)', fontSize: 13, lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
            {v.benefits.tenant.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </section>

        {/* FAQ */}
        <FAQ
          items={[...v.faqs.slice(0, 4), ...city.faqs.slice(0, 2)]}
          title={`Häufige Fragen: ${v.name}-${a.label} in ${city.name}`}
        />

        {/* Cross-Links */}
        <section style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 8, fontWeight: 700 }}>
            {a.label} auch in anderen Städten
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PHASE_1_CITIES.filter((c) => c.slug !== city.slug).map((c) => (
              <Link key={c.slug} href={`/${c.slug}/${vertical}/${asset}`} style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>
                {a.label} {slugToCity(c.slug)}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
