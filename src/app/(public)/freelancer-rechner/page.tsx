/**
 * Freelancer-Rechner — Lead-Magnet für Mieter-Akquise.
 * Server-Component-Wrapper (für SEO/Metadata) + Client-Calculator.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import type { FaqItem } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'
import { PHASE_1_CITIES } from '@/lib/seo-data/cities'
import { CalculatorClient } from './CalculatorClient'

// GEO/SEO: natürlichsprachliche, zitierbare Antworten rund um den Rechner —
// sichtbar als Accordion + FAQPage-Schema (Featured Snippets / AI-Antworten).
const RECHNER_FAQS: FaqItem[] = [
  {
    question: 'Wie viel verdient ein selbstständiger Friseur mit Stuhlmiete?',
    answer: 'Bei einer üblichen Stuhlmiete von 25–60 € pro Tag und eigenen Preisen von 45–80 € pro Termin bleiben nach Miete, Material, Steuern und Versicherungen realistisch 2.200–3.800 € netto pro Monat — abhängig von Auslastung und Stadt. Zum Vergleich: angestellt liegt das Netto meist bei 1.400–1.800 €.',
  },
  {
    question: 'Welche Kosten kommen bei Selbstständigkeit mit Stuhlmiete auf mich zu?',
    answer: 'Stuhlmiete (ca. 500–1.200 €/Monat bei Vollzeit), Krankenversicherung (ca. 200–400 €), Berufshaftpflicht (ca. 10–25 €/Monat), BGW-Beitrag, Material und Rücklagen für die Einkommensteuer. Der Rechner berücksichtigt alle diese Posten.',
  },
  {
    question: 'Lohnt sich Stuhlmiete im Vergleich zur Festanstellung?',
    answer: 'Ab etwa 6–8 zahlenden Kund:innen pro Tag liegt das Netto-Einkommen als Stuhl-Mieter in fast allen Städten deutlich über dem Angestellten-Gehalt. Der Break-even hängt von Tagesmiete und eigenem Preisniveau ab — genau das rechnet dieser Rechner durch.',
  },
  {
    question: 'Muss ich als Stuhl-Mieter ein Gewerbe anmelden?',
    answer: 'Friseur:innen betreiben ein zulassungspflichtiges Handwerk (Meisterpflicht oder angestellter Meister als Betriebsleiter) und melden einen Handwerksbetrieb an. Kosmetik, Nageldesign und Lash & Brows sind ohne Meisterpflicht möglich — hier reicht die Gewerbeanmeldung (ca. 20–60 €).',
  },
  {
    question: 'Wie hoch sind die Steuern als selbstständiger Beauty-Profi?',
    answer: 'Bis zum Grundfreibetrag (ca. 12.000 € Gewinn) fällt keine Einkommensteuer an, darüber greift der progressive Tarif (14–42 %). Mit der Kleinunternehmerregelung entfällt bis 25.000 € Vorjahresumsatz die Umsatzsteuer. Faustregel: 25–30 % des Gewinns für Steuern zurücklegen.',
  },
  {
    question: 'Was kostet ein Stuhl bei ChairMatch?',
    answer: 'Die Tagesmieten auf ChairMatch beginnen bei 25 € pro Tag (z. B. Berlin) und reichen bis ca. 90 € in München-Toplagen. Buchbar tageweise, wochenweise oder monatlich — mit 0 % Provision auf deine Umsätze.',
  },
]

export const metadata: Metadata = {
  title: 'Freelancer-Rechner: Wie viel verdienst du als selbstständiger Friseur? | ChairMatch',
  description: 'Freelancer-Rechner: Vergleiche dein Gehalt als Angestellte(r) mit deinem Einkommen als Stuhl-Mieter — mit Steuern, Versicherungen und Stuhlmiete. Kostenlos.',
  keywords: 'freelancer friseur einkommen, selbstständig verdienst rechner, stuhl miete gehalt vergleich, beauty selbstständig kalkulation',
  alternates: { canonical: 'https://www.chairmatch.de/freelancer-rechner' },
  openGraph: {
    title: 'Freelancer-Rechner: Selbstständig vs. Angestellt',
    description: 'Realistischer Einkommens-Vergleich für Beauty-Profis.',
    url: 'https://www.chairmatch.de/freelancer-rechner',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChairMatch — Freelancer-Rechner' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Freelancer-Rechner: Selbstständig vs. Angestellt | ChairMatch',
    description: 'Realistischer Einkommens-Vergleich für Beauty-Profis — mit Steuern, Versicherungen, Stuhlmiete.',
    images: ['/og-image.png'],
  },
}

// WebApplication-Schema: der Rechner ist ein kostenloses Web-Tool —
// stärkt Sichtbarkeit als Tool-Ergebnis in Google & AI-Engines.
const APP_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  '@id': 'https://www.chairmatch.de/freelancer-rechner#app',
  name: 'ChairMatch Freelancer-Rechner',
  url: 'https://www.chairmatch.de/freelancer-rechner',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  inLanguage: 'de-DE',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  provider: { '@id': 'https://www.chairmatch.de/#organization' },
  description: 'Kostenloser Rechner: Einkommen als selbstständiger Beauty-Profi mit Stuhlmiete vs. Festanstellung — inkl. Steuern, Versicherungen und Miete.',
}

export default function CalculatorPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        {/* BreadcrumbList-Schema kommt aus der <Breadcrumbs>-Komponente — hier bewusst kein zweites. */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_SCHEMA) }}
        />

        <Breadcrumbs items={[{ name: 'Freelancer-Rechner', url: '/freelancer-rechner' }]} />

        <h1 className="cinzel" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 8 }}>
          Selbstständig vs. Angestellt
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          Wie viel mehr verdienst du als Stuhl-Mieter im Vergleich zur Festanstellung? Realistische
          Rechnung mit allen Kosten — Steuern, Versicherungen, Stuhl-Miete.
        </p>

        <CalculatorClient />

        <FAQ items={RECHNER_FAQS} title="Häufige Fragen zum Einkommen als Stuhl-Mieter" />

        {/* Interne Verlinkung: Stadt-Hubs (Stil analog [stadt]-Cross-Links) */}
        <section style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 12 }}>Stuhlmiete in deiner Stadt:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PHASE_1_CITIES.filter((c) => c.phase <= 2).map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>
                Stuhlmiete {c.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
