/**
 * /iv-infusionen — Premium SEO-Money-Page für Infusion-Therapien.
 * Boom-Markt: NAD+, Vitamin-Drips, Glutathion.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { BackButton } from '@/components/BackButton'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'IV-Infusionen Deutschland — NAD+, Vitamin-Drip, Glutathion | ChairMatch',
  description: 'IV-Infusionen & Vitamin-Drips: NAD+, Glutathion & Vitamin-C Hochdosis bei verifizierten Ärzten in deiner Stadt. Bluttest-gestützt, Sitzungen ab 99 €.',
  keywords: 'iv infusion, nad+, vitamin drip, glutathion, vitamin c hochdosis, anti aging infusion, biohacking',
  alternates: { canonical: 'https://www.chairmatch.de/iv-infusionen' },
  openGraph: {
    title: 'IV-Infusionen — NAD+, Vitamin-Drips, Glutathion in Deutschland',
    description: 'NAD+, Glutathion & Vitamin-C Hochdosis bei verifizierten Ärzten — Bluttest-gestützte Therapie.',
    url: 'https://www.chairmatch.de/iv-infusionen',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChairMatch — IV-Infusionen Deutschland' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IV-Infusionen — NAD+, Vitamin-Drips, Glutathion | ChairMatch',
    description: 'NAD+, Glutathion & Vitamin-C Hochdosis bei verifizierten Ärzten — Bluttest-gestützte Therapie.',
    images: ['/og-image.png'],
  },
}

// Service-Schema: ChairMatch vermittelt Raum-/Arbeitsplatz-Vermietung an Ärzte
// und Infusions-Praxen — bewusst OHNE medizinische Claims.
const SERVICE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': 'https://www.chairmatch.de/iv-infusionen#service',
  name: 'Behandlungsraum Vermittlung für Infusions-Praxen',
  serviceType: 'Behandlungsraum Vermietung',
  provider: { '@id': 'https://www.chairmatch.de/#organization' },
  areaServed: { '@type': 'Country', name: 'Germany' },
  url: 'https://www.chairmatch.de/iv-infusionen',
}

const FAQS = [
  {
    question: 'Was sind IV-Infusionen / Vitamin-Drips?',
    answer: 'Vitamine, Mineralien oder Substanzen werden direkt über eine Vene in die Blutbahn gegeben — 100 % Bioverfügbarkeit (vs. ~10-50 % bei oraler Einnahme). Dauert 45-180 Minuten je nach Mix. Effekte: schneller Energie-Schub, Immun-Boost, Anti-Aging, Recovery, Detox.',
  },
  {
    question: 'Was ist NAD+ und warum so teuer?',
    answer: 'NAD+ (Nicotinamid-Adenin-Dinukleotid) ist DAS Anti-Aging-Molekül. Mit dem Alter sinkt der Spiegel um 50 %. NAD+ Infusion füllt die Zellen wieder auf → mehr Energie, bessere Mitochondrien-Funktion, Anti-Aging-Effekte. Preis: 290 € (250mg), 490 € (500mg), 890 € (1000mg). Teuer weil Substanz selbst ~80 % der Kosten. Studien zeigen messbare Effekte ab 250mg.',
  },
  {
    question: 'Was bringt Hochdosis-Vitamin-C (25g)?',
    answer: 'Bei hohen Dosen (über oraler Aufnahme-Grenze) wirkt Vitamin-C ANDERS — pro-oxidativ statt anti-oxidativ. Klinische Studien zeigen Wirkung bei: chronischer Erschöpfung, Long-COVID, Krebs-Begleittherapie, Infektanfälligkeit. Kosten: 149 € pro Sitzung. WICHTIG: vor Behandlung G6PD-Test (genetisch bedingte Unverträglichkeit).',
  },
  {
    question: 'Glutathion-Glow — was bringt das wirklich?',
    answer: 'Glutathion ist Master-Antioxidans des Körpers. Wirkung bei IV: aufgehellter Hautton, weniger Pigmentflecken, Anti-Aging-Effekte für Haut. Beste Resultate bei Kombination mit Vitamin-C. Kosten: 129-189 € pro Sitzung, oft 6-10er-Kuren empfohlen. Effekt sichtbar nach 4-6 Sitzungen.',
  },
  {
    question: 'Beauty-Drips für Haare, Haut, Nägel?',
    answer: 'Custom-Mix mit Biotin (Haare/Nägel), Zink (Haut-Regeneration), Silizium (Bindegewebe) + Aminosäuren. Kosten: 139 € pro Sitzung. Effekt nach 4-6 Wochen sichtbar bei regelmäßiger Anwendung (1× alle 2-4 Wochen).',
  },
  {
    question: 'Sind IV-Infusionen sicher?',
    answer: 'Bei Durchführung durch approbierten Arzt oder geschultes Personal: ja, sehr sicher. Vor erster Sitzung: Bluttest + Anamnese (Pflicht). Allergie-Test wenn unklar. Niere/Leber-Werte müssen ok sein. Ein seriöser Anbieter nimmt sich Zeit für die Anamnese — wer dich sofort an die Nadel lässt, ist nicht seriös.',
  },
  {
    question: 'Was ist ein Hangover-Drip / "Banana Bag"?',
    answer: 'Klassischer Mix: Mg + B-Vitamine + Glucose + Anti-Emetikum (gegen Übelkeit). Wirkt schnell gegen Kater-Symptome, Dehydration, Müdigkeit. Kosten: 99 € pro Sitzung. Trend aus den USA, kommt jetzt nach DE. Beliebt nach Feiern, Hochzeiten, langen Flügen.',
  },
  {
    question: 'Wie oft pro Monat sind Infusionen sinnvoll?',
    answer: 'Hängt vom Ziel ab. Wellness-Boost: 1-2x/Monat. Anti-Aging (NAD+, Glutathion): 2-4x/Monat über 3 Monate, dann 1x/Monat zur Erhaltung. Recovery nach Krankheit/Stress: 3-5x in 2 Wochen, dann pausieren. Mehr ist nicht besser — Bluttest-basierte Strategie ist immer am sinnvollsten.',
  },
]

export default function IVInfusionenPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        {/* FAQPage- und BreadcrumbList-Schema kommen aus <FAQ>/<Breadcrumbs> — hier bewusst keine zweiten. */}
        <script type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICE_SCHEMA) }} />

        <div style={{ marginBottom: 14 }}>
          <BackButton href="/" label="Zurück zur Startseite" />
        </div>
        <Breadcrumbs items={[{ name: 'IV-Infusionen', url: '/iv-infusionen' }]} />

        <section style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: 'var(--gold2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
            Premium · Bluttest-basierte Therapie
          </p>
          <h1 className="cinzel" style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold2)', lineHeight: 1.2, margin: '0 0 12px' }}>
            IV-Infusionen &amp; Vitamin-Drips
          </h1>
          <p style={{ color: 'var(--cream)', fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
            NAD+, Glutathion, Vitamin-C Hochdosis, Beauty-Drips. Verifizierte Ärzte in deiner Stadt.
            100 % Bioverfügbarkeit — direkt in die Blutbahn.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
            <Chip icon="✓" label="Approbierte Ärzte" />
            <Chip icon="✓" label="Bluttest-gestützt" />
            <Chip icon="✓" label="Steril + sicher" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Link href={"/search?category=infusion" as never} className="bgold" style={{ display: 'block', padding: '12px 14px', textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 700, borderRadius: 10 }}>
              Anbieter finden
            </Link>
            <a href="mailto:beratung@chairmatch.de?subject=IV-Infusionen-Beratung" className="boutline" style={{ display: 'block', padding: '12px 14px', textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 700, borderRadius: 10 }}>
              Beratung anfragen
            </a>
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 22, color: 'var(--gold2)', marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
            Infusionen &amp; Preise
          </h2>
          <PriceCard name="NAD+ 250mg" price="290 €" desc="Anti-Aging-Master. Mitochondrien-Booster, Energie, Klarheit." highlight />
          <PriceCard name="NAD+ 500mg" price="490 €" desc="Stärkere Dosis für intensiveren Effekt. Empfohlen ab 40 Jahren." />
          <PriceCard name="NAD+ 1000mg (Mega-Dose)" price="890 €" desc="Maximum-Dosierung. Lange Infusion (4h). Premium-Anti-Aging." />
          <PriceCard name="Glutathion-Glow" price="129 – 189 €" desc="Hautaufhellung + Anti-Aging. Sichtbarer Effekt nach 4-6 Sitzungen." />
          <PriceCard name="Vitamin-C Hochdosis (25g)" price="149 €" desc="Immun-Booster, Long-COVID-Hilfe, Krebs-Begleittherapie." />
          <PriceCard name="Detox-Drip (Glutathion + ALA)" price="219 €" desc="Schwermetalle-Ausleitung, Leber-Entgiftung." />
          <PriceCard name="Hangover-Cure (Banana Bag)" price="99 €" desc="Sofort-Hilfe nach Feiern, Flügen, Erschöpfung." />
          <PriceCard name="Beauty-Drip (Haar/Haut/Nägel)" price="139 €" desc="Biotin, Zink, Silizium + Aminosäuren. 4-6 Wochen sichtbar." />
          <PriceCard name="Performance-Stack (Custom)" price="219 €" desc="Auf Bluttest abgestimmter Mix. Beste Ergebnisse." />
        </section>

        <section style={{ background: 'rgba(232, 80, 64, 0.06)', border: '1px solid rgba(232, 80, 64, 0.3)', borderRadius: 12, padding: 14, marginBottom: 32 }}>
          <p style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700, margin: '0 0 6px' }}>
            ⚠️ Wichtig zu wissen
          </p>
          <p style={{ fontSize: 12, color: 'var(--cream)', lineHeight: 1.6, margin: 0 }}>
            IV-Infusionen müssen durch approbierten Arzt oder unter ärztlicher Aufsicht verabreicht werden.
            Vor erster Sitzung: Anamnese + Bluttest (Niere, Leber, ggf. G6PD). Anbieter ohne Voruntersuchung
            sind nicht seriös. Bei Nebenwirkungen sofort melden.
          </p>
        </section>

        <FAQ items={FAQS} title="Häufige Fragen zu IV-Infusionen" />

        <p style={{ fontSize: 10, color: 'var(--stone2)', textAlign: 'center', marginTop: 24 }}>
          Inhalte sind allgemeine Informationen, keine medizinische Beratung. Individuelle Eignung beim Arzt klären.
        </p>

        {/* Interne Verlinkung: verwandte Premium-Seiten (Stil analog [stadt]-Cross-Links) */}
        <section style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 12 }}>Weitere Medical-Beauty-Themen:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link href="/premium" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Medical Beauty Übersicht</Link>
            <Link href="/longevity" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Longevity</Link>
            <Link href="/haartransplantation" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Haartransplantation</Link>
            <Link href="/zahnimplantate" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Zahnimplantate</Link>
            <Link href="/augenlasern" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Augenlasern</Link>
          </div>
        </section>
      </div>
    </div>
  )
}

function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ background: 'var(--c2)', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--cream)', fontWeight: 600 }}>
      <span style={{ color: 'var(--green)' }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </div>
  )
}

function PriceCard({ name, price, desc, highlight }: { name: string; price: string; desc: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(176,144,96,0.04))' : 'var(--c2)',
      border: highlight ? '2px solid var(--gold)' : '1px solid var(--border)',
      borderRadius: 12, padding: 14, marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)', margin: 0 }}>{name}</h3>
        <span style={{ fontSize: 14, color: 'var(--gold2)', fontWeight: 800, whiteSpace: 'nowrap', marginLeft: 8 }}>{price}</span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--stone)', margin: 0, lineHeight: 1.5 }}>{desc}</p>
    </div>
  )
}
