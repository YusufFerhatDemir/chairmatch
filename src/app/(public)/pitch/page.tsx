import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'ChairMatch — Pitch Deck',
  description: 'Deutschlands erste Beauty-Booking-Plattform. 0% Provision. Für Investoren & Partner.',
}

const SLIDES = [
  {
    title: 'Das Problem',
    content: [
      'Salons verlieren bis zu 30% an Booking-Plattformen (Treatwell, Fresha)',
      'Stuhlvermietung läuft über WhatsApp & Mundpropaganda',
      'Keine zentrale Plattform für Beauty-Professionals in Deutschland',
      'Gesundheitsamt-Compliance ist ein Chaos aus Papier',
    ],
  },
  {
    title: 'Die Lösung: ChairMatch',
    content: [
      '0% Provision — Salons behalten ihren gesamten Umsatz',
      'Stuhlvermietung: Deutschlands erster digitaler Marktplatz',
      'Compliance-Paket: Gesundheitsamt-Dokumente digital verwalten',
      'All-in-One: Booking, Chat, Bewertungen, Kalender, Payments',
    ],
  },
  {
    title: 'Marktgröße (TAM/SAM/SOM)',
    content: [
      'TAM: 83.000+ Friseur-Salons + 45.000+ Kosmetikstudios in Deutschland',
      'SAM: 30.000 Salons in den Top-20 Städten',
      'SOM: 3.000 Salons im ersten Jahr (10% Penetration)',
      'Beauty-Markt Deutschland: €15 Mrd. Jahresumsatz',
    ],
  },
  {
    title: 'Geschäftsmodell',
    content: [
      'Freemium: Basis-Listing kostenlos für alle Salons',
      'Starter: 29€/Monat — Premium Listing, Promo-Tools',
      'Premium: 49€/Monat — Analytics, Priority Support, Badges',
      'Gold: 99€/Monat — Featured Placement, API, Compliance-Paket',
      'Stuhlvermietung: 5% Vermittlungsgebühr pro Transaktion',
    ],
  },
  {
    title: 'Technologie',
    content: [
      'Next.js 15 + React — Server-Side Rendering für SEO',
      'Supabase PostgreSQL — Skalierbare Datenbank mit RLS',
      'Stripe Payments — PCI-DSS konform, SEPA + Kreditkarte',
      'PWA — App Store ready, Offline-fähig, Push Notifications',
      'DSGVO-konform: 2FA, Verschlüsselung, Datenexport',
    ],
  },
  {
    title: 'Traction & Meilensteine',
    content: [
      'MVP LIVE auf chairmatch.de',
      '15+ Demo-Salons aus 7 Städten onboarded',
      '11 Kategorien: Barbershop bis OP-Raum',
      'Vollständiges Admin-Panel mit MIS Dashboard',
      'App Store Submission vorbereitet (iOS + Android)',
    ],
  },
  {
    title: 'Das Team',
    content: [
      'Yusuf Ferhat Demir — Gründer & CEO',
      'Erfahrung in Beauty-Branche & Tech-Startups',
      'ChairMatch GmbH (i. Gr.) — Deutschland',
      'Kontakt: legal@chairmatch.de',
    ],
  },
  {
    title: 'Finanzierung & Roadmap',
    content: [
      'Pre-Seed: €150K für Markteintritt Frankfurt + Berlin',
      'Q2 2026: 500 Salons, 5.000 Buchungen/Monat',
      'Q4 2026: Expansion auf 10 Städte, 2.000 Salons',
      '2027: Serie A, Expansion DACH (Österreich, Schweiz)',
      'Break-Even: Monat 18 bei 1.500 zahlenden Salons',
    ],
  },
]

export default function PitchDeckPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: '24px var(--pad)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40, paddingTop: 20 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1 className="cinzel" style={{ fontSize: 28, color: 'var(--gold2)', letterSpacing: 3 }}>
              CHAIR<span style={{ color: 'var(--gold3)' }}>MATCH</span>
            </h1>
          </Link>
          <p style={{ fontSize: 11, letterSpacing: 4, color: 'var(--stone)', marginTop: 4, textTransform: 'uppercase' }}>
            Pitch Deck 2026
          </p>
          <div style={{ marginTop: 20 }}>
            <p className="cinzel" style={{ fontSize: 18, color: 'var(--cream)', lineHeight: 1.4 }}>
              Deutschlands erste<br />Beauty-Booking-Plattform
            </p>
            <p style={{ fontSize: 13, color: 'var(--gold)', marginTop: 8, fontWeight: 600 }}>
              0% Provision · Stuhlvermietung · Compliance
            </p>
          </div>
        </div>

        {/* Slides */}
        {SLIDES.map((slide, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: 24,
              padding: 20,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(176,144,96,0.06), rgba(176,144,96,0.02))',
              border: '1px solid rgba(176,144,96,0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--gold), var(--gold2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#060504', flexShrink: 0,
              }}>
                {idx + 1}
              </span>
              <h2 className="cinzel" style={{ fontSize: 16, color: 'var(--gold2)', fontWeight: 700 }}>
                {slide.title}
              </h2>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {slide.content.map((item, i) => (
                <li key={i} style={{
                  padding: '8px 0',
                  fontSize: 13,
                  color: 'var(--cream)',
                  lineHeight: 1.5,
                  borderBottom: i < slide.content.length - 1 ? '1px solid rgba(176,144,96,0.06)' : 'none',
                  display: 'flex',
                  gap: 8,
                }}>
                  <span style={{ color: 'var(--gold)', flexShrink: 0 }}>•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '24px 0 40px' }}>
          <p className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 8 }}>
            Bereit für die Zukunft?
          </p>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 20 }}>
            Kontaktieren Sie uns für eine ausführliche Präsentation.
          </p>
          <a
            href="mailto:legal@chairmatch.de?subject=ChairMatch%20Investment%20Anfrage"
            className="bgold"
            style={{ display: 'inline-block', padding: '14px 32px', textDecoration: 'none', fontSize: 14 }}
          >
            Kontakt aufnehmen
          </a>
          <div style={{ marginTop: 16 }}>
            <Link href="/" style={{ fontSize: 13, color: 'var(--gold)', textDecoration: 'none' }}>
              chairmatch.de →
            </Link>
          </div>
        </div>

        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}
