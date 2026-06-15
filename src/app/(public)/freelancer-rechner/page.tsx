/**
 * Freelancer-Rechner — Lead-Magnet für Mieter-Akquise.
 * Server-Component-Wrapper (für SEO/Metadata) + Client-Calculator.
 */

import type { Metadata } from 'next'
import { breadcrumbSchema } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { CalculatorClient } from './CalculatorClient'

export const metadata: Metadata = {
  title: 'Freelancer-Rechner: Wie viel verdienst du als selbstständiger Friseur? | ChairMatch',
  description: 'Vergleiche dein Brutto-Gehalt als Angestellte(r) mit deinem realistischen Einkommen als Stuhl-Mieter. Mit Steuern, Versicherungen, allen Kosten.',
  keywords: 'freelancer friseur einkommen, selbstständig verdienst rechner, stuhl miete gehalt vergleich, beauty selbstständig kalkulation',
  alternates: { canonical: 'https://www.chairmatch.de/freelancer-rechner' },
  openGraph: {
    title: 'Freelancer-Rechner: Selbstständig vs. Angestellt',
    description: 'Realistischer Einkommens-Vergleich für Beauty-Profis.',
    url: 'https://www.chairmatch.de/freelancer-rechner',
    locale: 'de_DE',
    siteName: 'ChairMatch',
  },
}

export default function CalculatorPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
            { name: 'Start', url: '/' },
            { name: 'Freelancer-Rechner', url: '/freelancer-rechner' },
          ])) }}
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
      </div>
    </div>
  )
}
