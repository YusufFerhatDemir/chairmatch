export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { PHASE_1_CITIES } from '@/lib/seo-data/cities'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import BreakEvenClient from './BreakEvenClient'

export const metadata: Metadata = {
  // Layout-Template fügt "| ChairMatch" auto an.
  title: 'Preisvergleich: Was kostet Stuhlmiete in Deutschland?',
  description: 'Stuhlmiete Kosten im Überblick: Friseurstuhl mieten ab 25 €/Tag, Kabinen & Behandlungsräume — Live-Marktpreise aus echten Inseraten + Break-Even-Rechner.',
  keywords: 'stuhlmiete kosten, friseurstuhl mieten preis, stuhlmiete preisvergleich, was kostet stuhlmiete, friseurstuhl mieten kosten, kabine mieten preis, stuhlmiete oder anstellung, stuhlmiete rechner',
  alternates: { canonical: 'https://www.chairmatch.de/preisvergleich' },
  openGraph: {
    title: 'Preisvergleich: Was kostet Stuhlmiete in Deutschland? | ChairMatch',
    description: 'Live-Marktpreise für Stuhlmiete, Kabinen und Behandlungsräume — plus Break-Even-Rechner: Lohnt sich Stuhlmiete für dich?',
    url: 'https://www.chairmatch.de/preisvergleich',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChairMatch — Stuhlmiete Preisvergleich' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Was kostet Stuhlmiete in Deutschland? | ChairMatch',
    description: 'Live-Marktpreise für Stuhlmiete, Kabinen und Behandlungsräume — plus Break-Even-Rechner.',
    images: ['/og-image.png'],
  },
}

// ---------------------------------------------------------------------------
// Daten-Typen
// ---------------------------------------------------------------------------

interface EquipmentRow {
  type: string
  price_per_day_cents: number
  salon: { city: string | null } | null
}

interface PriceRow {
  city: string
  typeLabel: string
  range: string        // z. B. "45–75 €/Tag"
  median: string       // z. B. "58 €" oder "—"
  source: string       // "Live aus n Inseraten" | "Marktdaten"
  isLive: boolean
}

const TYPE_LABELS: Record<string, string> = {
  stuhl: 'Stuhl',
  liege: 'Liege / Kabine',
  raum: 'Behandlungsraum',
  opraum: 'OP-Raum',
}

// DB-Typ → Schlüssel im Benchmark-Datensatz (cities.ts priceRange)
const TYPE_TO_BENCHMARK: Record<string, 'stuhl' | 'kabine' | 'raum' | null> = {
  stuhl: 'stuhl',
  liege: 'kabine',
  raum: 'raum',
  opraum: null,
}

const BENCHMARK_LABELS: Record<'stuhl' | 'kabine' | 'raum', string> = {
  stuhl: 'Stuhl',
  kabine: 'Liege / Kabine',
  raum: 'Behandlungsraum',
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function euro(cents: number): string {
  return `${Math.round(cents / 100).toLocaleString('de-DE')} €`
}

// ---------------------------------------------------------------------------
// Preistabelle: Live-DB-Daten + Benchmark-Fallback zusammenführen
// ---------------------------------------------------------------------------

async function buildPriceRows(): Promise<PriceRow[]> {
  const liveRows: PriceRow[] = []
  const coveredKeys = new Set<string>() // "Stadt|BenchmarkTyp" — von Live-Daten abgedeckt

  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('rental_equipment')
      .select('type, price_per_day_cents, salon:salons(city)')
      .eq('is_available', true)

    if (data) {
      const groups = new Map<string, { city: string; type: string; prices: number[] }>()
      for (const row of data as unknown as EquipmentRow[]) {
        const city = row.salon?.city?.trim()
        if (!city || !row.price_per_day_cents || row.price_per_day_cents <= 0) continue
        const key = `${city}|${row.type}`
        const g = groups.get(key) ?? { city, type: row.type, prices: [] }
        g.prices.push(row.price_per_day_cents)
        groups.set(key, g)
      }

      for (const g of groups.values()) {
        const sorted = [...g.prices].sort((a, b) => a - b)
        const min = sorted[0]
        const max = sorted[sorted.length - 1]
        liveRows.push({
          city: g.city,
          typeLabel: TYPE_LABELS[g.type] || g.type,
          range: min === max ? `${euro(min)}/Tag` : `${euro(min)}–${euro(max).replace(' €', '')} €/Tag`,
          median: euro(median(sorted)),
          source: `Live aus ${sorted.length} ${sorted.length === 1 ? 'Inserat' : 'Inseraten'}`,
          isLive: true,
        })
        const benchKey = TYPE_TO_BENCHMARK[g.type]
        if (benchKey) coveredKeys.add(`${g.city}|${benchKey}`)
      }
    }
  } catch {
    // DB nicht erreichbar — nur Benchmark-Daten anzeigen
  }

  // Benchmark-Zeilen ergänzen (nur Kombinationen ohne Live-Daten)
  const benchmarkRows: PriceRow[] = []
  for (const city of PHASE_1_CITIES) {
    for (const key of ['stuhl', 'kabine', 'raum'] as const) {
      if (coveredKeys.has(`${city.name}|${key}`)) continue
      benchmarkRows.push({
        city: city.name,
        typeLabel: BENCHMARK_LABELS[key],
        range: city.priceRange[key].replace('-', '–'),
        median: '—',
        source: 'Marktdaten',
        isLive: false,
      })
    }
  }

  const all = [...liveRows, ...benchmarkRows]
  all.sort((a, b) => a.city.localeCompare(b.city, 'de') || a.typeLabel.localeCompare(b.typeLabel, 'de'))
  return all
}

// ---------------------------------------------------------------------------
// FAQ (Inhalt + JSON-LD)
// ---------------------------------------------------------------------------

const FAQS = [
  {
    question: 'Was kostet ein Friseurstuhl zur Miete in Deutschland?',
    answer: 'Je nach Stadt und Lage zahlst du für einen Friseur- oder Barberstuhl zwischen 25 € (z. B. Berliner Außenbezirke) und 90 €/Tag (Münchner Top-Lagen). Bei Monatsmiete sind 800–1.500 € üblich. Kabinen und Liegen liegen etwas darüber, Behandlungs- und OP-Räume bei 90–350 €/Tag.',
  },
  {
    question: 'Lohnt sich Stuhlmiete im Vergleich zur Festanstellung?',
    answer: 'Als angestellte Fachkraft bleiben dir typischerweise nur 30–40 % deines erwirtschafteten Umsatzes als Bruttolohn. Bei Stuhlmiete behältst du den gesamten Umsatz und zahlst nur Miete und Produktkosten. Ab etwa 150–200 € Tagesumsatz verdienst du mit Stuhlmiete in der Regel deutlich mehr — rechne es oben im Break-Even-Rechner mit deinen eigenen Zahlen nach.',
  },
  {
    question: 'Welche Kosten kommen zur Stuhlmiete noch dazu?',
    answer: 'Neben der Miete solltest du Produktkosten (ca. 5–25 % vom Umsatz), Berufshaftpflicht (ca. 10–25 €/Monat), Gewerbeanmeldung (einmalig 20–60 €), Krankenversicherung und Rücklagen für Einkommensteuer einplanen. Strom, Wasser, Empfang und Reinigung sind bei den meisten Vermietern in der Stuhlmiete enthalten.',
  },
  {
    question: 'Stuhlmiete oder eigener Salon — was ist günstiger für den Start?',
    answer: 'Ein eigener Salon kostet 30.000–80.000 € Startkapital (Umbau, Einrichtung, Kaution, Erstausstattung) plus 2.500–6.000 € monatliche Fixkosten. Stuhlmiete startet mit 0 € Investition und 800–1.500 €/Monat — tageweise sogar noch flexibler. Für den Einstieg in die Selbstständigkeit ist Stuhlmiete das mit Abstand risikoärmste Modell.',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer },
  })),
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--stone)',
  borderBottom: '1px solid rgba(196, 168, 106, 0.25)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 12,
  color: 'var(--cream)',
  borderBottom: '1px solid rgba(245, 245, 247, 0.06)',
  whiteSpace: 'nowrap',
}

const h2Style: React.CSSProperties = {
  fontSize: 'var(--font-lg)',
  color: 'var(--gold2)',
  marginBottom: 12,
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PreisvergleichPage() {
  const rows = await buildPriceRows()
  const liveCount = rows.filter((r) => r.isLive).length

  return (
    <div className="shell">
      <div className="screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        {/* ---------------------------------------------------------------- */}
        {/* (a) Headline + Intro                                              */}
        {/* ---------------------------------------------------------------- */}
        <div style={{ padding: '0 var(--pad)' }}>
          <Breadcrumbs items={[{ name: 'Preisvergleich', url: '/preisvergleich' }]} />
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginTop: 8, lineHeight: 1.25 }}>
            Preisvergleich: Was kostet Stuhlmiete in Deutschland?
          </h1>
          <p style={{ color: 'var(--cream)', fontSize: 'var(--font-sm)', marginTop: 10, lineHeight: 1.55 }}>
            Friseurstuhl, Kabine oder Behandlungsraum mieten — aber zu welchem Preis? Hier findest du
            aktuelle Marktpreise pro Stadt und Platz-Typ, einen Break-Even-Rechner für deine eigenen
            Zahlen und den ehrlichen Vergleich der drei Karrieremodelle: Stuhlmiete, eigener Salon
            und Festanstellung.
          </p>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* (b) Live-Marktpreise                                              */}
        {/* ---------------------------------------------------------------- */}
        <section style={{ padding: '28px var(--pad) 0' }}>
          <h2 className="cinzel" style={h2Style}>Live-Marktpreise</h2>
          <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', lineHeight: 1.5, marginBottom: 14 }}>
            {liveCount > 0
              ? 'Die Preisspannen unten stammen teils direkt aus aktuell verfügbaren ChairMatch-Inseraten, teils aus unseren redaktionellen Marktdaten der größten deutschen Städte.'
              : 'Aktuell zeigen wir redaktionelle Marktdaten der größten deutschen Städte. Sobald Inserate live sind, erscheinen hier echte Preise aus der Plattform.'}
          </p>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                <thead>
                  <tr style={{ background: 'var(--c2)' }}>
                    <th style={thStyle}>Stadt</th>
                    <th style={thStyle}>Platz-Typ</th>
                    <th style={thStyle}>Preisspanne</th>
                    <th style={thStyle}>Median</th>
                    <th style={thStyle}>Quelle</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.city}-${r.typeLabel}-${i}`}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.city}</td>
                      <td style={tdStyle}>{r.typeLabel}</td>
                      <td style={{ ...tdStyle, color: 'var(--gold)', fontWeight: 600 }}>{r.range}</td>
                      <td style={tdStyle}>{r.median}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 10,
                            fontSize: 9,
                            letterSpacing: '0.04em',
                            background: r.isLive ? 'rgba(196, 168, 106, 0.15)' : 'rgba(245, 245, 247, 0.06)',
                            color: r.isLive ? 'var(--gold2)' : 'var(--stone)',
                            border: r.isLive ? '1px solid rgba(196, 168, 106, 0.35)' : '1px solid rgba(245, 245, 247, 0.10)',
                          }}
                        >
                          {r.source}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ color: 'var(--stone)', fontSize: 'var(--font-xs)', marginTop: 8, lineHeight: 1.5 }}>
            Alle Angaben in €/Tag. Wochen- und Monatspakete sind bei den meisten Vermietern 10–25 % günstiger als der Tagessatz.
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* (c) Break-Even-Rechner                                            */}
        {/* ---------------------------------------------------------------- */}
        <section style={{ padding: '32px var(--pad) 0' }}>
          <BreakEvenClient />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* (d) SEO-Text: Drei Modelle im Vergleich                           */}
        {/* ---------------------------------------------------------------- */}
        <section style={{ padding: '32px var(--pad) 0' }}>
          <h2 className="cinzel" style={h2Style}>Stuhlmiete, eigener Salon oder Anstellung — der große Vergleich</h2>
          <div style={{ color: 'var(--cream)', fontSize: 'var(--font-sm)', lineHeight: 1.65 }}>
            <p style={{ marginBottom: 12 }}>
              Wer als Friseur, Barber, Kosmetikerin oder Lash-Artist Geld verdienen will, hat in
              Deutschland drei Wege: die klassische Festanstellung, den eigenen Salon — oder das
              Stuhlmiete-Modell, bei dem du dich in einen bestehenden Salon einmietest. Die Kosten
              unterscheiden sich dramatisch.
            </p>
            <p style={{ marginBottom: 12 }}>
              Ein <strong style={{ color: 'var(--gold2)' }}>eigener Salon</strong> verlangt 30.000 bis
              80.000 € Startkapital: Ladenumbau, Einrichtung, Kaution, Technik und Erstausstattung.
              Dazu kommen 2.500 bis 6.000 € monatliche Fixkosten für Gewerbemiete, Nebenkosten,
              Versicherungen und oft Personal — Kosten, die anfallen, bevor die erste Kundin auf dem
              Stuhl sitzt. Das volle unternehmerische Risiko trägst du allein.
            </p>
            <p style={{ marginBottom: 12 }}>
              In der <strong style={{ color: 'var(--gold2)' }}>Anstellung</strong> hast du null
              Startkosten und null Risiko — aber vom Umsatz, den du erwirtschaftest, kommen nur etwa
              30 bis 40 % als Bruttolohn bei dir an. Wer 8.000 € Monatsumsatz für den Salon macht,
              verdient angestellt oft nur 2.400 bis 3.200 € brutto.
            </p>
            <p style={{ marginBottom: 16 }}>
              Die <strong style={{ color: 'var(--gold2)' }}>Stuhlmiete</strong> liegt genau
              dazwischen: 0 € Startkosten, planbare 800 bis 1.500 € Monatsmiete (tageweise ab
              25 €/Tag) — und 100 % deines Umsatzes gehören dir. Du bleibst flexibel, kannst
              monatsweise kündigen, die Stadt wechseln oder mit nur zwei Miettagen pro Woche starten.
            </p>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <thead>
                  <tr style={{ background: 'var(--c2)' }}>
                    <th style={thStyle}>&nbsp;</th>
                    <th style={{ ...thStyle, color: 'var(--gold2)' }}>Stuhlmiete</th>
                    <th style={thStyle}>Eigener Salon</th>
                    <th style={thStyle}>Anstellung</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--stone)' }}>Startkosten</td>
                    <td style={{ ...tdStyle, color: 'var(--gold)', fontWeight: 600 }}>0 €</td>
                    <td style={tdStyle}>30.000–80.000 €</td>
                    <td style={tdStyle}>0 €</td>
                  </tr>
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--stone)' }}>Fixkosten / Monat</td>
                    <td style={{ ...tdStyle, color: 'var(--gold)', fontWeight: 600 }}>800–1.500 €</td>
                    <td style={tdStyle}>2.500–6.000 €</td>
                    <td style={tdStyle}>0 €</td>
                  </tr>
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--stone)' }}>Dein Umsatzanteil</td>
                    <td style={{ ...tdStyle, color: 'var(--gold)', fontWeight: 600 }}>100 %</td>
                    <td style={tdStyle}>100 %</td>
                    <td style={tdStyle}>ca. 30–40 % (als Lohn)</td>
                  </tr>
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--stone)' }}>Risiko</td>
                    <td style={{ ...tdStyle, color: 'var(--gold)', fontWeight: 600 }}>Niedrig</td>
                    <td style={tdStyle}>Hoch</td>
                    <td style={tdStyle}>Keins</td>
                  </tr>
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--stone)', borderBottom: 'none' }}>Flexibilität</td>
                    <td style={{ ...tdStyle, color: 'var(--gold)', fontWeight: 600, borderBottom: 'none' }}>Sehr hoch</td>
                    <td style={{ ...tdStyle, borderBottom: 'none' }}>Niedrig</td>
                    <td style={{ ...tdStyle, borderBottom: 'none' }}>Mittel</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p style={{ color: 'var(--cream)', fontSize: 'var(--font-sm)', lineHeight: 1.65, marginTop: 16 }}>
            Fazit: Für den Einstieg in die Selbstständigkeit ist Stuhlmiete das Modell mit dem besten
            Verhältnis aus Verdienst, Risiko und Freiheit. Der eigene Salon lohnt sich erst, wenn du
            einen großen Kundenstamm mitbringst und selbst Plätze untervermieten kannst — viele
            ChairMatch-Vermieter haben genau so angefangen.
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* (e) FAQ                                                           */}
        {/* ---------------------------------------------------------------- */}
        <section style={{ padding: '32px var(--pad) 0' }}>
          <h2 className="cinzel" style={h2Style}>Häufige Fragen zu Stuhlmiete-Kosten</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((f) => (
              <div key={f.question} className="card" style={{ padding: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold2)', marginBottom: 8, lineHeight: 1.4 }}>
                  {f.question}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--cream)', lineHeight: 1.6 }}>{f.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div style={{ padding: '32px var(--pad)', textAlign: 'center' }}>
          <a
            href="/rentals"
            className="bgold"
            style={{ display: 'inline-block', padding: '12px 28px', textDecoration: 'none', fontSize: 13 }}
          >
            Freie Plätze ansehen
          </a>
          <div style={{ marginTop: 14 }}>
            <a href="/register/anbieter" style={{ fontSize: 'var(--font-sm)', color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
              Du hast freie Plätze? Jetzt inserieren
            </a>
          </div>
        </div>

        {/* Interne Verlinkung: Stadt-Hubs (Stil analog [stadt]-Cross-Links) */}
        <section style={{ margin: '0 var(--pad)', padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 12 }}>Stuhlmiete-Preise in deiner Stadt:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PHASE_1_CITIES.filter((c) => c.phase <= 2).map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>
                Stuhlmiete {c.name}
              </Link>
            ))}
          </div>
        </section>
        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}
