/**
 * Stadt × Vertical: /[stadt]/[vertical]
 * Beispiel: /koeln/friseur, /berlin/barbershop, /muenchen/kosmetik
 *
 * Die wichtigste Money-Page-Kategorie. ISR 1h.
 * Indexierung: bedingt — wenn weniger als 3 Salons in der Kombi gelistet
 * sind, wird die Page mit noindex ausgespielt (Soft-404-Schutz).
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getCityBySlug, PHASE_1_CITIES } from '@/lib/seo-data/cities'
import { getVerticalBySlug, VERTICALS } from '@/lib/seo-data/verticals'
import { robotsForListingPage, breadcrumbSchema, faqSchema, slugToCity, salonSchema } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'

export const revalidate = 3600

interface Props {
  params: Promise<{ stadt: string; vertical: string }>
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
  const params: Array<{ stadt: string; vertical: string }> = []
  for (const c of PHASE_1_CITIES) {
    for (const v of VERTICALS) {
      params.push({ stadt: c.slug, vertical: v.slug })
    }
  }
  return params
}

async function loadCombo(citySlug: string, verticalSlug: string) {
  const city = getCityBySlug(citySlug)
  const vertical = getVerticalBySlug(verticalSlug)
  if (!city || !vertical) notFound()

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

  return { city, vertical, salons, salonCount: salons.length }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stadt, vertical } = await params
  const { city, vertical: v, salonCount } = await loadCombo(stadt, vertical)

  // Layout-Template fügt "| ChairMatch" auto an.
  const title = `${v.assetLabel} mieten in ${city.name} — ${v.name}-Stuhlmiete`
  const description = salonCount > 0
    ? `${salonCount} ${v.pluralName.toLowerCase()} in ${city.name} vermieten ${v.assetLabel} tageweise. Stuhlmiete ab ${city.priceRange.stuhl}. Verifiziert, Stripe-gesichert, 0 % Provision für dich als Mieter.`
    : `${v.name}-Stuhlmiete in ${city.name}: ${v.assetLabel} tageweise mieten. Werde Gründungsmitglied — 0 % Provision in den ersten 3 Monaten.`

  const cityLower = city.name.toLowerCase()
  const vName = v.name.toLowerCase()
  return {
    title,
    description,
    keywords: [
      `${vName} stuhlmiete ${cityLower}`,
      `stuhlmiete ${vName} ${cityLower}`,
      `${v.assetLabel.toLowerCase()} mieten ${cityLower}`,
      `${vName} stuhl mieten ${cityLower}`,
      `${vName} ${cityLower}`,
      `${vName} platz ${cityLower}`,
      `salonplatz ${cityLower}`,
      `chair rental ${cityLower}`,
    ].join(', '),
    alternates: { canonical: `https://chairmatch.de/${stadt}/${vertical}` },
    robots: robotsForListingPage(salonCount),
    openGraph: {
      title,
      description,
      url: `https://chairmatch.de/${stadt}/${vertical}`,
      type: 'website',
      locale: 'de_DE',
      siteName: 'ChairMatch',
    },
  }
}

export default async function CityVerticalPage({ params }: Props) {
  const { stadt, vertical } = await params
  const { city, vertical: v, salons, salonCount } = await loadCombo(stadt, vertical)

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        {/* Schema.org JSON-LD */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: `${v.name}-${v.assetLabel} mieten in ${city.name}`,
            provider: { '@id': 'https://chairmatch.de/#organization' },
            areaServed: {
              '@type': 'City',
              name: city.name,
              containedInPlace: { '@type': 'Country', name: 'Germany' },
            },
            serviceType: `${v.name} Chair Rental`,
            description: `Tageweise Vermietung von ${v.assetLabel} in ${city.name}.`,
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
          ])) }}
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
        ]} />

        {/* Hero */}
        <h1 className="cinzel" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 8 }}>
          {v.assetLabel} mieten in {city.name} — {v.name}-Stuhlmiete
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          {salonCount > 0
            ? `${salonCount} ${v.pluralName} in ${city.name} vermieten ${v.assetLabel} tageweise. Stuhlmiete-Tagespreise ${city.priceRange.stuhl}. 0 % Provision auf deine Behandlungs-Umsätze, Stripe-gesicherte Zahlung, klare Mietverträge.`
            : `${v.name}-Stuhlmiete in ${city.name}: aktuell noch keine verifizierten ${v.pluralName}. Werde Gründungsmitglied — 0 % Provision in den ersten 3 Monaten, lebenslange Founding-Auszeichnung.`}
        </p>

        {salonCount < 3 && (
          <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, padding: 14, marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: 'var(--gold2)', margin: '0 0 6px', fontWeight: 700 }}>
              Jetzt als Gründungsmitglied dabei — {v.name}-Stuhlmiete in {city.name}
            </p>
            <p style={{ fontSize: 12, color: 'var(--stone)', margin: 0, lineHeight: 1.5 }}>
              Diese Seite wird in Google sichtbar, sobald 3 verifizierte Vermieter gelistet sind.
              Werde Gründungsmitglied: 0 % Provision in den ersten 3 Monaten, Concierge-Onboarding kostenlos.
            </p>
            <Link href="/vermieter/wie-es-funktioniert" className="bgold" style={{ display: 'inline-block', marginTop: 12, padding: '8px 18px', fontSize: 13, textDecoration: 'none' }}>
              Stuhl inserieren →
            </Link>
          </div>
        )}

        {/* Salon-Liste */}
        {salons.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', marginBottom: 12 }}>
              Verfügbare {v.pluralName} in {city.name}
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

        {/* Was du als Mieter bekommst */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 12 }}>
            Was du als Mieter bekommst
          </h2>
          <ul style={{ color: 'var(--stone)', fontSize: 13, lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
            {v.benefits.tenant.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </section>

        {/* Was du als Anbieter erreichst */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 12 }}>
            Was du als Anbieter erreichst
          </h2>
          <ul style={{ color: 'var(--stone)', fontSize: 13, lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
            {v.benefits.provider.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </section>

        {/* FAQ kombiniert: Stadt + Vertical */}
        <FAQ
          items={[...v.faqs.slice(0, 4), ...city.faqs.slice(0, 3)]}
          title={`Häufige Fragen zu ${v.name}-Stuhl-Miete in ${city.name}`}
        />

        {/* Cross-Links */}
        <section style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 8, fontWeight: 700 }}>
            {v.name} auch in anderen Städten
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {PHASE_1_CITIES.filter((c) => c.slug !== city.slug).map((c) => (
              <Link key={c.slug} href={`/${c.slug}/${vertical}`} style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>
                {v.name} in {slugToCity(c.slug)}
              </Link>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 8, fontWeight: 700 }}>
            Weitere Kategorien in {city.name}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {VERTICALS.filter((vv) => vv.slug !== v.slug).map((vv) => (
              <Link key={vv.slug} href={`/${stadt}/${vv.slug}`} style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>
                {vv.name} in {city.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
