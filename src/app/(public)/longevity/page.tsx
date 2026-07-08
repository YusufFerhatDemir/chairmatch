/**
 * /longevity — Premium SEO-Money-Page für Longevity-Center.
 * Trend-Markt: Cryo, HBOT, HIFU, EMS, Body-Contouring.
 * Behandlungswert €39-1.490.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { BackButton } from '@/components/BackButton'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Longevity-Center Deutschland — Cryo, HBOT, HIFU | ChairMatch',
  description: 'Longevity-Center in Deutschland: Kryotherapie, HBOT-Sauerstofftherapie, HIFU & EMS. Verifizierte Anbieter in deiner Stadt, Sitzungen ab 29 € — transparent.',
  keywords: 'longevity, anti aging, cryotherapie, hbot, sauerstofftherapie, hifu, biohacking, kältekammer, body contouring',
  alternates: { canonical: 'https://www.chairmatch.de/longevity' },
  openGraph: {
    title: 'Longevity-Center — Cryo, HBOT, HIFU in Deutschland',
    description: 'Kryotherapie, Sauerstofftherapie, HIFU & EMS — verifizierte Longevity-Center in deiner Stadt.',
    url: 'https://www.chairmatch.de/longevity',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChairMatch — Longevity-Center Deutschland' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Longevity-Center — Cryo, HBOT, HIFU | ChairMatch',
    description: 'Kryotherapie, Sauerstofftherapie, HIFU & EMS — verifizierte Longevity-Center in deiner Stadt.',
    images: ['/og-image.png'],
  },
}

// Service-Schema: ChairMatch vermittelt Raum-/Arbeitsplatz-Vermietung an
// Longevity-Anbieter — bewusst OHNE medizinische Claims.
const SERVICE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': 'https://www.chairmatch.de/longevity#service',
  name: 'Behandlungsraum Vermittlung für Longevity-Center',
  serviceType: 'Behandlungsraum Vermietung',
  provider: { '@id': 'https://www.chairmatch.de/#organization' },
  areaServed: { '@type': 'Country', name: 'Germany' },
  url: 'https://www.chairmatch.de/longevity',
}

const FAQS = [
  {
    question: 'Was ist ein Longevity-Center?',
    answer: 'Ein Premium-Wellness-Center mit Fokus auf Anti-Aging und gesundes Altern. Kombiniert evidenzbasierte Therapien: Kältekammer (Cryo), Sauerstofftherapie (HBOT), Rotlicht, EMS-Training, HIFU-Hautstraffung, Body-Contouring. Ziel: biologisches Alter senken, Erholung beschleunigen, Erscheinungsbild verjüngen.',
  },
  {
    question: 'Was kostet Ganzkörper-Kryotherapie?',
    answer: 'Einzelsitzung -110°C für 3 Min: 29-49 €. 10er-Paket: 290-390 € (~30 € pro Sitzung). Effekte: Entzündungen runter, Endorphin-Boost, schnellere Sport-Erholung, bessere Hautqualität. Studien zeigen messbare Vorteile bei 8-12 Sitzungen pro Monat.',
  },
  {
    question: 'Was ist HBOT (hyperbare Sauerstofftherapie)?',
    answer: 'Du sitzt in einer Druckkammer und atmest 100 % Sauerstoff bei 1,5-3 bar Überdruck. Sauerstoff-Sättigung im Blut steigt drastisch → schnellere Wundheilung, Anti-Aging-Effekte, mentale Klarheit. Kosten: 149 € Einzelsitzung, 1.290 € 10er-Paket. Studien (Tel-Aviv 2020): senkt biologisches Alter um 25 % nach 60 Sitzungen.',
  },
  {
    question: 'Was ist HIFU-Hautstraffung?',
    answer: 'High-Intensity-Focused-Ultrasound. Ultraschall-Energie wird tief unter die Haut gerichtet → strafft Kollagen ohne Operation. Ergebnis sichtbar nach 2-3 Monaten, hält 12-18 Monate. Kosten Gesicht: 490-690 €, Hals/Décolleté: 390-490 €. Schmerz: gering, oft als „Pieken in tieferer Schicht" beschrieben.',
  },
  {
    question: 'CoolSculpting / Body-Contouring — funktioniert das?',
    answer: 'Cryolipolyse: gezielte Kälte zerstört Fettzellen permanent. Wirkt am besten bei kleinen, lokalen Fett-Depots (Bauch, Flanken, Doppelkinn). Kein Gewichtsverlust-Tool — bei 5-10 % Übergewicht ineffektiv. Kosten: 390 € pro Zone, oft 2 Sitzungen empfohlen. Ergebnis nach 2-3 Monaten sichtbar.',
  },
  {
    question: 'EMS-Ganzkörper-Training — was bringt das?',
    answer: 'Elektrische Muskelstimulation während Workout. 20 Min EMS = ~2 h Krafttraining. Wirksam für: Muskelaufbau, Rückenschmerzen, Zeitsparen. Studien: 30 % mehr Kraftgewinn vs. klassisches Training (gleiche Zeit). Kosten: 39 € pro Sitzung, oft 8-10er-Pakete günstiger.',
  },
  {
    question: 'Was ist epigenetische Altersmessung?',
    answer: 'Test misst die DNA-Methylierung — gibt dir dein „biologisches Alter" vs. dein Kalender-Alter. Beispiel: 35 Jahre alt, biologisches Alter 31 oder 39. Du erfährst welche Faktoren dich altern lassen (Stress, Schlaf, Ernährung) und kannst gezielt gegensteuern. Kosten: 290 € (Test) + Beratung.',
  },
  {
    question: 'Lohnt sich ein Longevity-Programm?',
    answer: 'Ja, wenn du systematisch vorgehst. Einzelsitzungen bringen wenig — die Kombination ist der Hebel: HBOT + Kryo + HIFU + Bluttest-basierte Supplementation + Trainings-Optimierung. Typisches 3-Monats-Programm: 1.490-2.990 €. Faustregel: Investition wie ein guter Urlaub, aber mit messbaren Anti-Aging-Effekten.',
  },
]

export default function LongevityPage() {
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
        <Breadcrumbs items={[{ name: 'Longevity', url: '/longevity' }]} />

        <section style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: 'var(--gold2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
            Bio-Hacking · Anti-Aging
          </p>
          <h1 className="cinzel" style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold2)', lineHeight: 1.2, margin: '0 0 12px' }}>
            Longevity-Center
          </h1>
          <p style={{ color: 'var(--cream)', fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
            Kältekammer, Sauerstofftherapie, HIFU, EMS, Body-Contouring. Evidenzbasierte Anti-Aging-Therapien
            für besser altern, schnellere Erholung und sichtbare Verjüngung.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
            <Chip icon="✓" label="Evidenz-basiert" />
            <Chip icon="✓" label="Bluttest-gestützt" />
            <Chip icon="✓" label="Programme verfügbar" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Link href={"/search?category=longevity" as never} className="bgold" style={{ display: 'block', padding: '12px 14px', textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 700, borderRadius: 10 }}>
              Center finden
            </Link>
            <a href="mailto:beratung@chairmatch.de?subject=Longevity-Beratung" className="boutline" style={{ display: 'block', padding: '12px 14px', textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 700, borderRadius: 10 }}>
              Beratung anfragen
            </a>
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 22, color: 'var(--gold2)', marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
            Therapien &amp; Preise
          </h2>
          <PriceCard name="Ganzkörper-Kryotherapie (-110°C)" price="29 – 49 € / Sitzung" desc="3 Minuten Kältekammer. Entzündungs-Reduktion, Endorphin-Boost. 10er ab 290 €." />
          <PriceCard name="HBOT (Hyperbare Sauerstofftherapie)" price="149 € / Sitzung" desc="90 Min Druckkammer mit reinem Sauerstoff. Anti-Aging-Effekte, Wundheilung. 10er 1.290 €." highlight />
          <PriceCard name="HIFU-Hautstraffung Gesicht" price="490 – 690 €" desc="Ultraschall-Lifting ohne OP. Hält 12-18 Monate." />
          <PriceCard name="EMS-Ganzkörper-Training (20 Min)" price="39 € / Sitzung" desc="Elektro-Stimulation, 20 Min = 2h klassisches Training." />
          <PriceCard name="CoolSculpting Body-Contouring" price="390 € / Zone" desc="Kryolipolyse: gezielter Fett-Abbau ohne OP." />
          <PriceCard name="Epigenetische Altersmessung" price="290 €" desc="DNA-Test misst dein biologisches Alter. Mit Auswertung." />
          <PriceCard name="3-Monats-Longevity-Programm" price="1.490 €" desc="Strukturiertes Coaching + Therapien-Mix individuell." />
        </section>

        <FAQ items={FAQS} title="Häufige Fragen zu Longevity" />

        <p style={{ fontSize: 10, color: 'var(--stone2)', textAlign: 'center', marginTop: 24 }}>
          Anti-Aging-Therapien sind ergänzend zu gesundem Lebensstil. Keine medizinische Behandlung.
        </p>

        {/* Interne Verlinkung: verwandte Premium-Seiten (Stil analog [stadt]-Cross-Links) */}
        <section style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 12 }}>Weitere Medical-Beauty-Themen:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link href="/premium" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Medical Beauty Übersicht</Link>
            <Link href="/iv-infusionen" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>IV-Infusionen</Link>
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
        <span style={{ fontSize: 13, color: 'var(--gold2)', fontWeight: 800, whiteSpace: 'nowrap', marginLeft: 8 }}>{price}</span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--stone)', margin: 0, lineHeight: 1.5 }}>{desc}</p>
    </div>
  )
}
