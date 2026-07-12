/**
 * Stadt-Landing-Page: /[stadt]
 * Beispiel: /koeln, /berlin, /frankfurt, /muenchen, /hamburg
 *
 * Server Component. ISR mit revalidate 3600 (1h).
 *
 * SEO/GEO-Ausstattung:
 *  - H1 mit "Stuhlvermietung" + "mieten" + Stadtname
 *  - Service- (serviceAreaSchema), LocalBusiness-, Speakable- und
 *    FAQPage-Schema (via <FAQ>), BreadcrumbList (via <Breadcrumbs>)
 *  - 1500+ Wörter: Intro + hand-geschriebener City-Guide (city-guides.ts)
 *    + programmatische Sektionen (Ablauf, Berufsgruppen, Preisvergleich)
 *  - Interne Links: alle Stadtseiten (nearby zuerst), Verticals, Startseite
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getCityBySlug, getNearbyCities, PHASE_1_CITIES, type CityData } from '@/lib/seo-data/cities'
import { getCityGuide } from '@/lib/seo-data/city-guides'
import { VERTICALS } from '@/lib/seo-data/verticals'
import { shouldIndex, serviceAreaSchema, cityLocalBusinessSchema, speakableSchema, geoMeta, slugToCity } from '@/lib/seo'
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
    // Fokus-Keyword-Muster: "[Stadt] Stuhl mieten Friseur/Kosmetik"
    title: `Stuhl mieten in ${city.name} — Stuhlvermietung für Friseur & Kosmetik`,
    description: `Stuhlvermietung ${city.name}: Friseurstuhl, Barberstuhl, Kosmetik-Kabine oder Behandlungsraum tageweise mieten. Preise ${city.priceRange.stuhl}, verifizierte Salons, Stripe-gesichert, 0 % Provision für Mieter.`,
    keywords: [
      `${cityLower} stuhl mieten friseur`,
      `${cityLower} stuhl mieten kosmetik`,
      `stuhl mieten ${cityLower}`,
      `stuhlvermietung ${cityLower}`,
      `stuhlmiete ${cityLower}`,
      `stuhlvermietung friseur ${cityLower}`,
      `stuhlvermietung kosmetik ${cityLower}`,
      `friseurstuhl mieten ${cityLower}`,
      `barberstuhl mieten ${cityLower}`,
      `kosmetikraum mieten ${cityLower}`,
      `kosmetik kabine mieten ${cityLower}`,
      `nagelstudio platz mieten ${cityLower}`,
      `salonplatz ${cityLower}`,
      `beauty workspace ${cityLower}`,
      'beauty coworking',
      'stuhlvermietung beauty deutschland',
    ].join(', '),
    alternates: { canonical: `https://www.chairmatch.de/${stadt}` },
    // Stadt-Hubs sind seit dem Content-Ausbau eigenständige Landing Pages
    // (1500+ Wörter Lokal-Guide) und keine reinen Listing-Aggregationen mehr —
    // sie werden daher immer indexiert. Der Soft-404-Schutz (shouldIndex)
    // gilt weiterhin für die dünneren [vertical]-Unterseiten.
    robots: { index: true, follow: true },
    // Klassische Geo-Tags (geo.region, geo.position, ICBM) für regionale Suche
    other: geoMeta(city),
    openGraph: {
      title: `Stuhl mieten in ${city.name} — Stuhlvermietung für die Beauty-Branche`,
      description: `Friseurstuhl, Kosmetik-Kabine & Behandlungsraum in ${city.name} tageweise mieten. ${salonCount > 0 ? `${salonCount} verifizierte Vermieter.` : `Preise ${city.priceRange.stuhl}.`}`,
      url: `https://www.chairmatch.de/${stadt}`,
      type: 'website',
      locale: 'de_DE',
      siteName: 'ChairMatch',
    },
  }
}

/** Berufsgruppen-Sektion: Vertical-Slug → stadt-interpolierter Absatz */
function professionBlocks(city: CityData) {
  const n = city.neighborhoods
  return [
    {
      slug: 'friseur',
      title: `Friseurstuhl mieten in ${city.name}`,
      text: `Für selbstständige Friseur:innen ist die Stuhlmiete der schnellste Weg in die Eigenständigkeit: Ein voll ausgestatteter Friseurstuhl in ${city.name} kostet ${city.priceRange.stuhl} — inklusive Waschplatz-Mitnutzung, Wartebereich und meist auch Empfangsservice des Salons. Gefragte Lagen wie ${n[0]} oder ${n[1]} bieten dabei die beste Sichtbarkeit. Du bringst Schere, Können und Kundschaft mit, der Salon stellt die Infrastruktur.`,
    },
    {
      slug: 'barbershop',
      title: `Barberstuhl mieten in ${city.name}`,
      text: `Barbering boomt in ${city.name} wie überall in Deutschland — und viele Barbershops vermieten gezielt einzelne Stühle an selbstständige Barber, um ihre Fläche auszulasten. Der Vorteil für dich: Du arbeitest in einem etablierten Shop mit Laufkundschaft, statt bei null zu starten. Tagespreise liegen im Rahmen von ${city.priceRange.stuhl}, oft mit Rabatt für feste Wochentage.`,
    },
    {
      slug: 'kosmetik',
      title: `Kosmetik-Kabine mieten in ${city.name}`,
      text: `Kosmetiker:innen brauchen mehr als einen Stuhl: eine abschließbare Kabine mit Liege, gutem Licht und Hygiene-Ausstattung. In ${city.name} kosten Kosmetik-Kabinen ${city.priceRange.kabine} pro Tag. Etablierte Institute vermieten Kabinen bevorzugt an Spezialist:innen (Microneedling, Anti-Aging, apparative Kosmetik), deren Angebot das eigene ergänzt — eine Win-win-Situation für beide Seiten.`,
    },
    {
      slug: 'nagelstudio',
      title: `Nageldesign-Platz mieten in ${city.name}`,
      text: `Nageldesigner:innen mieten in ${city.name} einen eingerichteten Arbeitsplatz mit Tisch, Absaugung und Lampe — meist zu Konditionen am unteren Ende der Stuhl-Preisspanne (${city.priceRange.stuhl}). Da Nail-Kundschaft in festen Refill-Zyklen von 3–4 Wochen wiederkommt, ist die Auslastung besonders planbar: Schon ein Stamm von 25–30 Kund:innen füllt drei Miettage pro Woche zuverlässig.`,
    },
    {
      slug: 'lash-brows',
      title: `Lash- & Brow-Workstation mieten in ${city.name}`,
      text: `Lash-Extensions und Brow-Styling gehören zu den am stärksten wachsenden Beauty-Segmenten in ${city.name}. Für Lash-Artists zählt beim Platz vor allem: verstellbare Liege, blendfreies Licht und eine ruhige Ecke — Behandlungen dauern 90–180 Minuten. Viele Studios vermieten Workstations tageweise (${city.priceRange.kabine}), sodass du ohne eigenes Studio mit professionellem Setup arbeitest.`,
    },
  ]
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
  const nearby = getNearbyCities(city.slug, 8)
  const guide = getCityGuide(city.slug)
  const professions = professionBlocks(city)
  const pageUrl = `https://www.chairmatch.de/${stadt}`
  const h1 = `Stuhlvermietung ${city.name} — Friseurstuhl & Kosmetik-Platz mieten`

  const sectionH2: React.CSSProperties = { fontSize: 20, color: 'var(--gold2)', marginBottom: 12 }
  const bodyText: React.CSSProperties = { color: 'var(--stone)', fontSize: 14, lineHeight: 1.8 }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        {/* Schema.org JSON-LD: Service + LocalBusiness + Speakable
            (FAQPage kommt aus <FAQ>, BreadcrumbList aus <Breadcrumbs>) */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceAreaSchema(city, undefined, city.priceRange.stuhl)) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(cityLocalBusinessSchema(city, city.priceRange.stuhl)) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(speakableSchema(
              pageUrl,
              h1,
              `Stuhlvermietung in ${city.name} für Friseure, Barber, Kosmetiker:innen und Nageldesigner:innen — Arbeitsplätze tageweise mieten, Preise ab ${city.priceRange.stuhl.split('-')[0].trim()} €.`,
            )),
          }}
        />
        <Breadcrumbs items={[{ name: city.name, url: `/${stadt}` }]} />

        {/* Hero */}
        <h1 className="cinzel speakable-headline" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 8 }}>
          {h1}
        </h1>
        <p className="speakable-summary" style={{ ...bodyText, marginBottom: 24 }}>
          Du bist Friseur:in, Barber, Kosmetiker:in oder Nageldesigner:in und suchst einen Arbeitsplatz
          in {city.name}? Über ChairMatch mietest du Friseurstuhl, Barberstuhl, Kosmetik-Kabine,
          Lash-Workstation oder Behandlungsraum tageweise — flexibel, ohne langfristige Verträge,
          mit Stripe-gesicherter Zahlung und 0 % Provision für dich als Mieter:in.
          {salonCount > 0 && ` Aktuell ${salonCount} verifizierte Vermieter in ${city.name}.`}
        </p>

        {!indexed && (
          <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: 'var(--gold2)', margin: '0 0 6px', fontWeight: 700 }}>
              Jetzt als Gründungsmitglied dabei — Stuhlvermietung in {city.name}
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
          <h2 className="cinzel" style={sectionH2}>
            Beauty-Markt {city.name}
          </h2>
          <p style={bodyText}>
            {city.intro}
          </p>
        </section>

        {/* Preisspannen */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={sectionH2}>
            Was kostet Stuhl mieten in {city.name}?
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
          <p style={{ ...bodyText, fontSize: 13, marginTop: 10 }}>
            Die Spannen zeigen marktübliche Tagespreise in {city.name}: Das untere Ende gilt für
            Außenlagen und einfache Ausstattung, das obere für Top-Viertel wie {city.neighborhoods[0]} mit
            Premium-Setup. Wochen- und Monatspakete liegen üblicherweise 10–25 % unter dem Tagespreis.
          </p>
        </section>

        {/* So funktioniert's */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={sectionH2}>
            So funktioniert Stuhlvermietung in {city.name} über ChairMatch
          </h2>
          <ol style={{ ...bodyText, paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <li>
              <strong style={{ color: 'var(--cream)' }}>Platz finden:</strong> Durchsuche verifizierte Salons,
              Barbershops und Studios in {city.name} nach Stuhl, Kabine oder Raum — gefiltert nach Stadtteil,
              Ausstattung und Preis pro Tag.
            </li>
            <li>
              <strong style={{ color: 'var(--cream)' }}>Tage buchen:</strong> Wähle einzelne Tage oder feste
              Wochentage. Keine Mindestlaufzeit, keine Kaution über Monate — du zahlst nur die Tage, die du
              wirklich arbeitest.
            </li>
            <li>
              <strong style={{ color: 'var(--cream)' }}>Sicher zahlen:</strong> Die Zahlung läuft Stripe-gesichert
              über ChairMatch. Der Vermieter erhält das Geld erst nach Buchungsbeginn — beide Seiten sind
              abgesichert, ohne Bargeld und ohne Vorkasse-Risiko.
            </li>
            <li>
              <strong style={{ color: 'var(--cream)' }}>Loslegen:</strong> Du arbeitest auf eigene Rechnung mit
              deiner Kundschaft und deinen Preisen. Der Salon stellt Infrastruktur wie Waschplatz, Empfang
              und Wartebereich — je nach Inserat.
            </li>
          </ol>
        </section>

        {/* Berufsgruppen */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={sectionH2}>
            Stuhl mieten in {city.name}: für Friseure, Barber, Kosmetik, Nails & Lashes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {professions.map((p) => (
              <div key={p.slug}>
                <h3 style={{ fontSize: 15, color: 'var(--cream)', fontWeight: 700, margin: '0 0 6px' }}>
                  <Link href={`/${stadt}/${p.slug}`} style={{ color: 'var(--cream)', textDecoration: 'none' }}>
                    {p.title} →
                  </Link>
                </h3>
                <p style={{ ...bodyText, fontSize: 13, margin: 0 }}>{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Hand-geschriebener City-Guide (1500+-Wörter-Baustein) */}
        {guide.map((section) => (
          <section key={section.heading} style={{ marginBottom: 32 }}>
            <h2 className="cinzel" style={sectionH2}>
              {section.heading}
            </h2>
            {section.text.split('\n\n').map((para, i) => (
              <p key={i} style={{ ...bodyText, marginBottom: 12 }}>{para}</p>
            ))}
          </section>
        ))}

        {/* Verticals Grid */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={sectionH2}>
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
          <h2 className="cinzel" style={sectionH2}>
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

        {/* Preisvergleich mit Nachbarstädten */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={sectionH2}>
            Preisvergleich: {city.name} und Städte in der Nähe
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--stone)', fontWeight: 600 }}>Stadt</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--stone)', fontWeight: 600 }}>Stuhl</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--stone)', fontWeight: 600 }}>Kabine</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--stone)', fontWeight: 600 }}>Raum</th>
                </tr>
              </thead>
              <tbody>
                {[city, ...nearby.slice(0, 4)].map((c) => (
                  <tr key={c.slug} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 6px' }}>
                      {c.slug === city.slug ? (
                        <strong style={{ color: 'var(--gold2)' }}>{c.name}</strong>
                      ) : (
                        <Link href={`/${c.slug}`} style={{ color: 'var(--cream)', textDecoration: 'underline' }}>{c.name}</Link>
                      )}
                    </td>
                    <td style={{ padding: '8px 6px', color: 'var(--stone)' }}>{c.priceRange.stuhl}</td>
                    <td style={{ padding: '8px 6px', color: 'var(--stone)' }}>{c.priceRange.kabine}</td>
                    <td style={{ padding: '8px 6px', color: 'var(--stone)' }}>{c.priceRange.raum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ ...bodyText, fontSize: 13, marginTop: 10 }}>
            Den kompletten Städtevergleich mit allen {PHASE_1_CITIES.length} Standorten findest du im{' '}
            <Link href="/preisvergleich" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>
              ChairMatch Preisvergleich
            </Link>.
          </p>
        </section>

        {/* Vermieter-CTA */}
        <section style={{ marginBottom: 32, background: 'var(--c2)', borderRadius: 12, padding: 18, border: '1px solid var(--border)' }}>
          <h2 className="cinzel" style={{ ...sectionH2, fontSize: 18 }}>
            Du hast einen Salon in {city.name}? Vermiete freie Stühle.
          </h2>
          <p style={{ ...bodyText, fontSize: 13, marginBottom: 12 }}>
            Ein leerer Stuhl kostet dich Geld — jede Stunde. Als Vermieter auf ChairMatch verwandelst
            du ungenutzte Plätze in planbaren Zusatzumsatz: Du bestimmst Preis, Tage und Regeln,
            ChairMatch übernimmt Buchung, Stripe-Zahlung und Verifizierung der Mieter:innen.
            Salons in {city.name} erzielen mit einem vermieteten Stuhl je nach Lage{' '}
            {city.priceRange.stuhl.replace('€/Tag', '€ pro Tag')} — ohne eigenes Personal-Risiko.
          </p>
          <Link href="/vermieter/wie-es-funktioniert" className="bgold" style={{ display: 'inline-block', padding: '8px 18px', fontSize: 13, textDecoration: 'none' }}>
            Jetzt Stuhl inserieren →
          </Link>
        </section>

        {/* FAQ */}
        <FAQ items={city.faqs} title={`Häufige Fragen zu Stuhl-Miete in ${city.name}`} />

        {/* Cross-Links: nächstgelegene Städte zuerst (Geo-Relevanz), Rest danach */}
        <section style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 12 }}>Stuhlvermietung in Städten in der Nähe:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {nearby.map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>
                Stuhlvermietung {c.name}
              </Link>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 12 }}>Weitere Städte:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {PHASE_1_CITIES
              .filter((c) => c.slug !== city.slug)
              .filter((c) => !nearby.some((n) => n.slug === c.slug))
              .map((c) => (
                <Link key={c.slug} href={`/${c.slug}`} style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>
                  {slugToCity(c.slug)}
                </Link>
              ))}
          </div>
          <p style={{ fontSize: 13, color: 'var(--stone)', margin: 0 }}>
            <Link href="/" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>
              ChairMatch — Stuhlvermietung für die Beauty-Branche in ganz Deutschland
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
