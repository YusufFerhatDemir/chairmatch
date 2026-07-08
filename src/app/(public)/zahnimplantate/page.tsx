/**
 * /zahnimplantate — Premium SEO-Money-Page.
 *
 * Suchvolumen "zahnimplantate kosten" = 90k/Monat in DE.
 * Behandlungswert €890-15.000.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { BackButton } from '@/components/BackButton'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Zahnimplantate Deutschland — Kosten, All-on-4, Veneers | ChairMatch',
  description: 'Zahnimplantate in Deutschland: verifizierte Kliniken für Implantate, All-on-4, Veneers & Invisalign. Preise ab 1.490 € pro Implantat, Erstberatung kostenlos.',
  keywords: 'zahnimplantat kosten, all-on-4, veneers, zahnersatz, invisalign, zahnklinik deutschland, implantologie',
  alternates: { canonical: 'https://www.chairmatch.de/zahnimplantate' },
  openGraph: {
    title: 'Zahnimplantate — Verifizierte Kliniken in Deutschland',
    description: 'Implantate, All-on-4, Veneers, Invisalign — verifizierte Preise + Kliniken.',
    url: 'https://www.chairmatch.de/zahnimplantate',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChairMatch — Zahnimplantate Deutschland' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zahnimplantate — Verifizierte Kliniken | ChairMatch',
    description: 'Implantate, All-on-4, Veneers, Invisalign — verifizierte Preise + Kliniken in Deutschland.',
    images: ['/og-image.png'],
  },
}

// Service-Schema: ChairMatch vermittelt Raum-/Arbeitsplatz-Vermietung an Zahnärzte
// und Praxen — bewusst OHNE medizinische Claims (kein MedicalProcedure/Dentist).
const SERVICE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': 'https://www.chairmatch.de/zahnimplantate#service',
  name: 'Behandlungsraum Vermittlung für Zahnarzt-Praxen',
  serviceType: 'Behandlungsraum Vermietung',
  provider: { '@id': 'https://www.chairmatch.de/#organization' },
  areaServed: { '@type': 'Country', name: 'Germany' },
  url: 'https://www.chairmatch.de/zahnimplantate',
}

const FAQS = [
  {
    question: 'Was kostet ein Zahnimplantat in Deutschland?',
    answer: 'Standard-Implantat: 1.490-1.990 € inkl. Krone. Premium-Implantat (Straumann/Nobel Biocare): 2.290-2.890 €. Sonderfälle (Sofortimplantat, Knochenaufbau) extra. Im Vergleich Türkei (~600-1.200 €) zahlst du in DE mehr, hast aber deutsche Zulassung, deutsches Haftungsrecht und Nachsorge ohne Reiseaufwand.',
  },
  {
    question: 'Was kostet All-on-4 (komplettes Gebiss fest)?',
    answer: 'All-on-4 (4 Implantate + feste Brücke pro Kiefer): 11.900-14.900 € pro Kiefer in DE. Beide Kiefer (Ober + Unter): 22.000-28.000 €. Die "günstigen" Türkei-Angebote (4.500-7.000 €) klingen verlockend, aber: Reisekosten, fehlende Nachsorge, oft minderwertige Implantate, keine Klagemöglichkeit bei Pfusch.',
  },
  {
    question: 'Was sind Veneers und wann lohnen sie sich?',
    answer: 'Veneers sind dünne Vollkeramik-Schalen die auf die Vorderzähne geklebt werden. Ergebnis: gleichmäßig weiße, perfekte Zähne. Kosten: 590-690 € pro Zahn in DE. Klassisches "Hollywood-Smile" braucht 8-10 Veneers (4.700-6.900 €). Hält 10-15 Jahre. Vorher Beratung Pflicht — nicht jeder Zahn ist geeignet.',
  },
  {
    question: 'Übernimmt die Krankenkasse Zahnimplantate?',
    answer: 'Gesetzlich (GKV): Festzuschuss von 60-75 % des Standardpreises für eine REGELVERSORGUNG (oft Brücke, nicht Implantat). Bei Implantaten gibt es keinen vollen Zuschuss. Bonus-Heft erhöht den Zuschuss um 30-50 %. Eigenanteil typisch 60-80 % der Kosten. Privat-Versicherung: meist 80-100 % Übernahme.',
  },
  {
    question: 'Was ist besser: Implantat oder Brücke?',
    answer: 'Implantat-Vorteile: nachbar-Zähne bleiben unberührt, fühlt sich an wie eigener Zahn, hält 20-30 Jahre. Brücke: günstiger initial, aber: 2 gesunde Nachbar-Zähne müssen beschliffen werden, hält 10-15 Jahre, Kieferknochen schwindet trotzdem. Faustregel: bei jüngeren Patienten und Einzelzahn-Lücke → Implantat. Bei Kostenproblem oder mehreren Lücken → Brücke.',
  },
  {
    question: 'Wie lange dauert die gesamte Implantation?',
    answer: 'Standardfall (genug Knochen, keine Komplikationen): 1. Termin Implantation (90 Min). 3-6 Monate Einheilzeit (Implantat wächst mit Knochen zusammen). 2. Termin Krone aufsetzen (60 Min). Gesamt: 4-7 Monate. Sofort-Implantation möglich wenn Zahn frisch gezogen + genug Knochen — in 1 Termin Implantat + Provisorium.',
  },
  {
    question: 'Was ist Invisalign?',
    answer: 'Unsichtbare Zahnschiene aus durchsichtigem Kunststoff. Korrigiert Zahnfehlstellungen ohne klassische Zahnspange. Vorteile: nahezu unsichtbar, herausnehmbar zum Essen/Putzen, weniger Reibung. Kosten: 2.490-5.990 € je nach Behandlungskomplexität. Behandlungsdauer 6-18 Monate.',
  },
  {
    question: 'Türkei-Reise oder Deutschland?',
    answer: 'Türkei lockt mit 50-70 % günstigeren Preisen. Aber rechne realistisch: Reise + Hotel + Trinkgelder + Sprachbarriere bei Nachsorge + bei Komplikationen erneute Reise + keine deutsche Klage-Möglichkeit. Bei Komplikationen (Knochenentzündung, Implantatverlust): Re-OP in DE kostet 3.000-8.000 €. Türkei ist kein Schnäppchen wenn was schiefgeht.',
  },
]

export default function ZahnimplantatePage() {
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
        <Breadcrumbs items={[{ name: 'Zahnimplantate', url: '/zahnimplantate' }]} />

        <section style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: 'var(--gold2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
            Premium · Verifizierte Zahnkliniken
          </p>
          <h1 className="cinzel" style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold2)', lineHeight: 1.2, margin: '0 0 12px' }}>
            Zahnimplantate &amp; Premium-Zahnersatz
          </h1>
          <p style={{ color: 'var(--cream)', fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
            Einzelimplantate, All-on-4, Veneers oder Invisalign — verifizierte Zahnkliniken in deiner Stadt.
            Transparente Preise, deutsche Approbation, ohne Türkei-Reise.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
            <Chip icon="✓" label="Deutsche Approbation" />
            <Chip icon="✓" label="GKV-Bonus möglich" />
            <Chip icon="✓" label="Festpreis-Garantie" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Link href={"/search?category=zahnimplantate" as never} className="bgold" style={{ display: 'block', padding: '12px 14px', textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 700, borderRadius: 10 }}>
              Zahnklinik finden
            </Link>
            <a href="mailto:beratung@chairmatch.de?subject=Zahnimplantate%20-%20Erstberatung" className="boutline" style={{ display: 'block', padding: '12px 14px', textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 700, borderRadius: 10 }}>
              Kostenlose Beratung
            </a>
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 22, color: 'var(--gold2)', marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
            Behandlungen &amp; Preise
          </h2>
          <PriceCard name="Einzel-Implantat (Standard)" price="1.490 – 1.990 €" desc="Titan-Implantat + Krone. Hält 20-30 Jahre. Bewährt." />
          <PriceCard name="Einzel-Implantat Premium" price="2.290 – 2.890 €" desc="Straumann / Nobel Biocare. Höhere Erfolgsquote, lebenslange Garantie." highlight />
          <PriceCard name="All-on-4 (komplett, pro Kiefer)" price="11.900 – 14.900 €" desc="4 Implantate + feste Brücke. Komplettes Gebiss in 1 Tag." />
          <PriceCard name="All-on-6 (Premium)" price="14.900 – 17.900 €" desc="6 Implantate für maximale Stabilität. Premium-Lösung." />
          <PriceCard name="Veneers Vollkeramik" price="590 – 690 € / Zahn" desc='"Hollywood-Smile". 8-10 Veneers für komplettes Bild.' />
          <PriceCard name="Invisalign (komplett)" price="2.490 – 5.990 €" desc="Unsichtbare Zahnspange. 6-18 Monate Behandlung." />
          <PriceCard name="Bleaching (Power-Bleaching)" price="290 – 390 €" desc="Praxis-Bleaching in 1 Sitzung. Sofort-Ergebnis." />
        </section>

        <section style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(176,144,96,0.02))', border: '1px solid var(--gold)', borderRadius: 14, padding: 20, marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', margin: '0 0 14px' }}>
            Warum Deutschland statt Türkei?
          </h2>
          <div style={{ display: 'grid', gap: 10, fontSize: 13, color: 'var(--cream)' }}>
            <Bullet text="Deutsche Approbation des Zahnarztes — kein Zahnarzt-Helfer am Stuhl" />
            <Bullet text="Bei Komplikationen sofortige Nachsorge ohne 2. Reise" />
            <Bullet text="Materialien CE-zertifiziert (oft in Türkei No-Name-Implantate)" />
            <Bullet text="Deutsches Patientenrecht — bei Pfusch hast du Anspruch" />
            <Bullet text="Krankenkasse-Bonus (Festzuschuss + Bonus-Heft) — bei Türkei 0 €" />
            <Bullet text="Keine Sprachbarriere, klare Aufklärung" />
          </div>
        </section>

        <FAQ items={FAQS} title="Häufige Fragen zu Zahnimplantaten" />

        <p style={{ fontSize: 10, color: 'var(--stone2)', textAlign: 'center', marginTop: 24 }}>
          Medizinische Inhalte sind allgemeine Informationen. Individuelle Beratung beim approbierten Zahnarzt.
        </p>

        {/* Interne Verlinkung: verwandte Premium-Seiten (Stil analog [stadt]-Cross-Links) */}
        <section style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 12 }}>Weitere Medical-Beauty-Themen:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link href="/premium" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Medical Beauty Übersicht</Link>
            <Link href="/haartransplantation" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Haartransplantation</Link>
            <Link href="/augenlasern" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Augenlasern</Link>
            <Link href="/iv-infusionen" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>IV-Infusionen</Link>
            <Link href="/longevity" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Longevity</Link>
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
        <span style={{ fontSize: 14, color: 'var(--gold2)', fontWeight: 800 }}>{price}</span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--stone)', margin: 0, lineHeight: 1.5 }}>{desc}</p>
    </div>
  )
}

function Bullet({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ color: 'var(--green)', fontSize: 14, flexShrink: 0, marginTop: -1 }}>✓</span>
      <span style={{ flex: 1 }}>{text}</span>
    </div>
  )
}
