/**
 * Stadt-Hub: /[stadt]
 * Beispiel: /koeln, /berlin, /frankfurt, /muenchen, /hamburg
 *
 * Server Component. ISR mit revalidate 3600 (1h).
 * Indexierung: bedingt — wenn weniger als 3 Salons gelistet sind,
 * wird die Page mit noindex ausgespielt (Soft-404-Schutz).
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getCityBySlug, PHASE_1_CITIES, type CityData } from '@/lib/seo-data/cities'
import { VERTICALS } from '@/lib/seo-data/verticals'
import { shouldIndex, robotsForListingPage, serviceAreaSchema, breadcrumbSchema, slugToCity } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'

export const revalidate = 3600 // 1h ISR
// Nur die via generateStaticParams (PHASE_1_CITIES) erzeugten Slugs sind gültig.
// Ohne dieses Flag rendert jeder unbekannte Ein-Segment-Pfad (/foobar) die
// notFound()-UI, wird unter ISR aber als HTTP 200 gecacht (Soft-404) — Google
// wertet das als Thin-Content statt echter 404. dynamicParams=false → sauberer
// 404-Status für alles außerhalb der Liste (analog zur [asset]-Route).
export const dynamicParams = false

interface Props {
  params: Promise<{ stadt: string }>
}

export async function generateStaticParams() {
  return PHASE_1_CITIES.map((c) => ({ stadt: c.slug }))
}

async function loadCityData(slug: string): Promise<{ city: CityData; salonCount: number }> {
  const city = getCityBySlug(slug)
  if (!city) notFound()

  let salonCount = 0
  try {
    const supabase = getSupabaseAdmin()
    const { count } = await supabase
      .from('salons')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .ilike('city', city.name)
    salonCount = count ?? 0
  } catch {
    salonCount = 0
  }
  return { city, salonCount }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stadt } = await params
  const city = getCityBySlug(stadt)
  if (!city) return { title: 'Nicht gefunden' }
  const { salonCount } = await loadCityData(stadt)

  const cityLower = city.name.toLowerCase()
  return {
    // Layout-Template fügt "| ChairMatch" auto an.
    title: `Stuhlmiete in ${city.name} — Friseurstuhl, Kosmetik-Kabine & Raum mieten`,
    description: `Stuhlmiete in ${city.name}: Friseurstuhl, Barberstuhl, Kosmetik-Kabine, Lash-Workstation oder Behandlungsraum tageweise mieten. ${salonCount}+ verifizierte Vermieter, Stripe-gesichert, 0 % Provision für dich als Mieter.`,
    keywords: [
      `stuhlmiete ${cityLower}`,
      `stuhlvermietung ${cityLower}`,
      `stuhlvermietung beauty ${cityLower}`,
      `stuhlvermietung kosmetik ${cityLower}`,
      `friseur stuhlmiete ${cityLower}`,
      `friseurstuhl mieten ${cityLower}`,
      `stuhl mieten friseur ${cityLower}`,
      `barberstuhl mieten ${cityLower}`,
      `kosmetikraum mieten ${cityLower}`,
      `kosmetik kabine ${cityLower}`,
      `salonplatz ${cityLower}`,
      `beauty workspace ${cityLower}`,
      'beauty coworking',
      'chair rental deutschland',
    ].join(', '),
    alternates: { canonical: `https://www.chairmatch.de/${stadt}` },
    robots: robotsForListingPage(salonCount),
    openGraph: {
      title: `Stuhlmiete in ${city.name} — Friseurstuhl, Kabine & Raum mieten`,
      description: `${salonCount}+ verifizierte Vermieter in ${city.name} bieten Stuhlmiete, Kosmetik-Kabine und Behandlungsraum tageweise an.`,
      url: `https://www.chairmatch.de/${stadt}`,
      type: 'website',
      locale: 'de_DE',
      siteName: 'ChairMatch',
    },
  }
}

export default async function CityHubPage({ params }: Props) {
  const { stadt } = await params
  const { city, salonCount } = await loadCityData(stadt)

  // Pro Vertical Anzahl der Salons in dieser Stadt zählen
  const verticalCounts: Record<string, number> = {}
  try {
    const supabase = getSupabaseAdmin()
    for (const v of VERTICALS) {
      const { count } = await supabase
        .from('salons')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .ilike('city', city.name)
        .eq('category', v.slug)
      verticalCounts[v.slug] = count ?? 0
    }
  } catch { /* fail-soft: alle Counts bleiben 0 */ }

  const indexed = shouldIndex(salonCount)

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        {/* Schema.org JSON-LD */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceAreaSchema(city.name)) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
            { name: 'Start', url: '/' },
            { name: city.name, url: `/${stadt}` },
          ])) }}
        />

        <Breadcrumbs items={[{ name: city.name, url: `/${stadt}` }]} />

        {/* Hero */}
        <h1 className="cinzel" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 8 }}>
          Stuhlmiete in {city.name} — Friseurstuhl, Kabine & Raum mieten
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Friseurstuhl, Barberstuhl, Kosmetik-Kabine oder Behandlungsraum tageweise mieten —
          flexibel, ohne langfristige Verträge, Stripe-gesichert.
          {salonCount > 0 && ` ${salonCount} verifizierte Vermieter in ${city.name}.`}
        </p>

        {!indexed && (
          <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: 'var(--gold2)', margin: '0 0 6px', fontWeight: 700 }}>
              Jetzt als Gründungsmitglied dabei — Stuhlmiete in {city.name}
            </p>
            <p style={{ fontSize: 12, color: 'var(--stone)', margin: 0 }}>
              Aktuell sind noch keine Plätze verifiziert. Werde Gründungs-Vermieter:
              0 % Provision in den ersten 3 Monaten, Concierge-Onboarding kostenlos.
            </p>
            <Link href="/vermieter/wie-es-funktioniert" className="bgold" style={{ display: 'inline-block', marginTop: 12, padding: '8px 18px', fontSize: 13, textDecoration: 'none' }}>
              Stuhl inserieren →
            </Link>
          </div>
        )}

        {/* Lokaler Einleitungstext */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', marginBottom: 12 }}>
            Beauty-Markt {city.name}
          </h2>
          <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.8 }}>
            {city.intro}
          </p>
        </section>

        {/* Preisspannen */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', marginBottom: 12 }}>
            Preisspanne in {city.name}
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

        {/* Verticals Grid */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', marginBottom: 12 }}>
            Kategorien in {city.name}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {VERTICALS.map((v) => {
              const count = verticalCounts[v.slug] || 0
              return (
                <Link
                  key={v.slug}
                  href={`/${stadt}/${v.slug}`}
                  style={{ textDecoration: 'none', background: 'var(--c2)', borderRadius: 12, padding: 14, border: '1px solid var(--border)' }}
                >
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)', margin: '0 0 4px' }}>{v.name}</p>
                  <p style={{ fontSize: 11, color: count > 0 ? 'var(--gold2)' : 'var(--stone2)', margin: 0 }}>
                    {count > 0 ? `${count} Anbieter` : 'Bald verfügbar'}
                  </p>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Stadtteile */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', marginBottom: 12 }}>
            Top-Stadtteile für Beauty in {city.name}
          </h2>
          <p style={{ color: 'var(--stone)', fontSize: 13, marginBottom: 12 }}>
            {city.marketContext}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {city.neighborhoods.map((n) => (
              <span key={n} style={{ background: 'var(--c2)', color: 'var(--gold2)', fontSize: 12, padding: '6px 12px', borderRadius: 16, border: '1px solid var(--border)' }}>
                {n}
              </span>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <FAQ items={city.faqs} title={`Häufige Fragen zu Stuhl-Miete in ${city.name}`} />

        {/* Cross-Links zu anderen Städten */}
        <section style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 12 }}>Weitere Städte:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PHASE_1_CITIES.filter((c) => c.slug !== city.slug).map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>
                {slugToCity(c.slug)}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
