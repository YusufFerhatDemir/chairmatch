/**
 * /augenlasern — Premium SEO-Money-Page.
 * Suchvolumen "augen lasern kosten" = 60k/Monat in DE.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { BackButton } from '@/components/BackButton'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Augen lasern in Deutschland — LASIK, Femto, ReLEx Smile | ChairMatch',
  description: 'Augen lasern in Deutschland: LASIK, Femto-LASIK & ReLEx Smile bei verifizierten Augenkliniken. Realistische Kosten ab 1.490 € pro Auge, Voruntersuchung gratis.',
  keywords: 'augen lasern kosten, lasik, femto lasik, relex smile, augenoperation, brillenfrei, augenklinik',
  alternates: { canonical: 'https://www.chairmatch.de/augenlasern' },
  openGraph: {
    title: 'Augen lasern — Verifizierte Augenkliniken in Deutschland',
    description: 'LASIK, Femto-LASIK & ReLEx Smile im Vergleich. Realistische Kosten ab 1.490 € pro Auge.',
    url: 'https://www.chairmatch.de/augenlasern',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChairMatch — Augen lasern Deutschland' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Augen lasern — Verifizierte Augenkliniken | ChairMatch',
    description: 'LASIK, Femto-LASIK & ReLEx Smile im Vergleich. Realistische Kosten ab 1.490 € pro Auge.',
    images: ['/og-image.png'],
  },
}

// Service-Schema: ChairMatch vermittelt Raum-/Arbeitsplatz-Vermietung an Augenärzte
// und Kliniken — bewusst OHNE medizinische Claims (kein MedicalProcedure/MedicalClinic).
const SERVICE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': 'https://www.chairmatch.de/augenlasern#service',
  name: 'OP-Raum Vermittlung für Augenlaser-Praxen',
  serviceType: 'OP-Raum Vermietung',
  provider: { '@id': 'https://www.chairmatch.de/#organization' },
  areaServed: { '@type': 'Country', name: 'Germany' },
  url: 'https://www.chairmatch.de/augenlasern',
}

const FAQS = [
  {
    question: 'Was kostet eine Augenlaser-OP in Deutschland?',
    answer: 'LASIK: 1.490-1.890 € pro Auge (2.490-2.990 € beide Augen). Femto-LASIK: 1.890-2.290 € pro Auge. ReLEx Smile (Premium): 2.290-2.990 € pro Auge. ICL/Linsenaustausch (bei höheren Werten): 2.890-5.490 €. Voruntersuchung meist kostenlos.',
  },
  {
    question: 'LASIK, Femto-LASIK oder ReLEx Smile — was ist der Unterschied?',
    answer: 'LASIK: Standard-Methode, Hornhautlappen mit Mikrokeratom (Klinge). Femto-LASIK: Lappen mit Femtosekunden-Laser statt Klinge → präziser, weniger Komplikationen. ReLEx Smile: minimal-invasiv, nur 2-3 mm Schnitt (kein Lappen) → bestes Verfahren für trockene Augen + Sportler. Premium-Klassen mit unterschiedlichen Aufpreisen.',
  },
  {
    question: 'Bin ich geeignet für Augenlaser?',
    answer: 'Voraussetzungen: Alter 18-60, stabile Werte seit 1-2 Jahren, gesunde Hornhaut, keine Schwangerschaft, keine chronischen Augenkrankheiten. Sehstärke-Bereiche: LASIK -8/+4 dpt, Femto-LASIK -10/+5 dpt, ReLEx Smile -10/+5 dpt. Über diesen Werten: ICL (Linsenimplantat) oder Linsenaustausch. Voruntersuchung klärt das individuell.',
  },
  {
    question: 'Wie lange dauert die Heilung?',
    answer: 'Tag 1: Schon deutlich besseres Sehen (verschwommen wie nach Schwimmbad). Tag 2-3: Du arbeitest wieder normal. Woche 1-2: Trockenheit/Empfindlichkeit normal. Monat 1-3: finales Sehergebnis stabilisiert. Sport leicht: nach 1 Woche. Schwimmen/Sauna: 2-4 Wochen. Kontakt-Sport: 4-6 Wochen.',
  },
  {
    question: 'Wie hoch ist das Risiko?',
    answer: 'Augenlaser ist die meistdurchgeführte OP weltweit (~25 Mio./Jahr). Komplikations-Rate bei guten Kliniken: <1 %. Typische "Probleme": trockene Augen (häufig, meist 3-6 Monate, dann weg), Halos/Lichthöfe nachts (selten, meist temporär), Überkorrektur (sehr selten, korrigierbar). Komplette Erblindung praktisch ausgeschlossen.',
  },
  {
    question: 'Übernimmt die Krankenkasse?',
    answer: 'Gesetzlich (GKV): nein, gilt als Schönheits-OP. Privat: oft 50-100 %, kommt auf Vertrag an. Steuerlich: außergewöhnliche Belastung absetzbar (bei nachgewiesener Berufsnotwendigkeit oder über zumutbarer Eigenbelastung). Manche Arbeitgeber zahlen anteilig (z.B. Pilot, Berufsfeuerwehr).',
  },
  {
    question: 'Was ist ICL (Linsenimplantat)?',
    answer: 'Wenn deine Hornhaut zu dünn oder Sehfehler zu hoch ist (z.B. -12 Dioptrien), kann nicht gelasert werden. Dann ICL = Implantierbare Kontaktlinse: eine winzige Kunststoff-Linse wird hinter die natürliche Linse eingesetzt. Reversibel (rausnehmbar), schnelle Heilung. Kosten: 2.890-2.990 € pro Auge.',
  },
  {
    question: 'Sehe ich danach wirklich perfekt?',
    answer: '95-98 % der Patienten erreichen 100 % Sehkraft ohne Brille. 80-90 % brauchen auch keine Lesebrille mehr (bis 45-50 Jahre). Ab 45-50: Alterssichtigkeit kann trotzdem kommen → dann Lesebrille (das ist eine andere Sache als Kurzsichtigkeit). Lösung ab 50: Refraktiver Linsenaustausch (verhindert auch Alters-Lesebrille).',
  },
]

export default function AugenlasernPage() {
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
        <Breadcrumbs items={[{ name: 'Augenlasern', url: '/augenlasern' }]} />

        <section style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: 'var(--gold2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
            Premium · Verifizierte Augenkliniken
          </p>
          <h1 className="cinzel" style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold2)', lineHeight: 1.2, margin: '0 0 12px' }}>
            Augen lasern — endlich brillenfrei
          </h1>
          <p style={{ color: 'var(--cream)', fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
            LASIK, Femto-LASIK oder ReLEx Smile in verifizierten Kliniken in deiner Stadt.
            ~25 Mio. OPs weltweit pro Jahr — das sicherste etablierte Verfahren der Augenmedizin.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
            <Chip icon="✓" label="Erfahrene Operateure" />
            <Chip icon="✓" label="Voruntersuchung gratis" />
            <Chip icon="✓" label="Festpreis-Garantie" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Link href={"/search?category=augenlasern" as never} className="bgold" style={{ display: 'block', padding: '12px 14px', textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 700, borderRadius: 10 }}>
              Augenklinik finden
            </Link>
            <a href="mailto:beratung@chairmatch.de?subject=Augenlasern%20-%20Voruntersuchung" className="boutline" style={{ display: 'block', padding: '12px 14px', textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 700, borderRadius: 10 }}>
              Kostenlose Voruntersuchung
            </a>
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 22, color: 'var(--gold2)', marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
            Methoden &amp; Preise (pro Auge)
          </h2>
          <PriceCard name="LASIK (Standard)" price="1.490 – 1.890 €" desc="Bewährte Standard-Methode. Schnelle Heilung." />
          <PriceCard name="Femto-LASIK" price="1.890 – 2.290 €" desc="Lappen mit Laser statt Klinge. Präziser, sicherer." highlight />
          <PriceCard name="ReLEx Smile (Premium)" price="2.290 – 2.990 €" desc="Minimal-invasiv, nur 2-3 mm Schnitt. Beste Variante bei trockenen Augen." />
          <PriceCard name="Trans-PRK" price="1.490 – 1.890 €" desc="Oberflächlich, ohne Lappen. Längere Heilung aber sehr sicher." />
          <PriceCard name="ICL (Linsenimplantat)" price="2.890 – 2.990 €" desc="Wenn Hornhaut zu dünn / Werte zu hoch. Reversibel." />
          <PriceCard name="Refraktiver Linsenaustausch" price="2.890 – 3.490 €" desc="Ab ~45 Jahre. Ersetzt natürliche Linse — auch Alters-Lesebrille vorbei." />
        </section>

        <FAQ items={FAQS} title="Häufige Fragen zu Augenlasern" />

        <p style={{ fontSize: 10, color: 'var(--stone2)', textAlign: 'center', marginTop: 24 }}>
          Medizinische Inhalte sind allgemeine Informationen. Individuelle Eignungsprüfung beim Facharzt.
        </p>

        {/* Interne Verlinkung: verwandte Premium-Seiten (Stil analog [stadt]-Cross-Links) */}
        <section style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 12 }}>Weitere Medical-Beauty-Themen:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link href="/premium" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Medical Beauty Übersicht</Link>
            <Link href="/haartransplantation" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Haartransplantation</Link>
            <Link href="/zahnimplantate" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Zahnimplantate</Link>
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
