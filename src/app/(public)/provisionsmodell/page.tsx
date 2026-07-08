import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'

export const metadata: Metadata = {
  // Kein "| ChairMatch"-Suffix — das Layout-Title-Template ('%s | ChairMatch') hängt es an
  title: 'Provisionsmodell — transparente Preise',
  description: 'ChairMatch Provisionsmodell: 10 % auf Stuhlmiete, 8 % auf OP-Räume, 0 % für Mieter & Kunden. Stripe-gesichert — im Vergleich mit Kleinanzeigen & Salonkee.',
  keywords: 'chairmatch provision, stuhl miete provision, salon vermietung gebühren, transparente preise marketplace',
  alternates: { canonical: 'https://www.chairmatch.de/provisionsmodell' },
  openGraph: {
    title: 'Provisionsmodell — transparente Preise',
    description: 'Klare Preise: 10% Stuhl-Miete, 8% OP-Räume, 0% für Kunden.',
    url: 'https://www.chairmatch.de/provisionsmodell',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChairMatch — Provisionsmodell' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Provisionsmodell — transparente Preise | ChairMatch',
    description: 'Klare Preise: 10% Stuhl-Miete, 8% OP-Räume, 0% für Kunden.',
    images: ['/og-image.png'],
  },
}

const FAQS = [
  { question: 'Warum überhaupt Provision?', answer: 'Wir bauen die Infrastruktur: Stripe-Zahlungen, Streit-Schlichtung, Verifizierung, Bewertungssystem, rechtliche Mietverträge, SEO-Sichtbarkeit. Das kostet pro Monat 4-stellig — die Provision finanziert das.' },
  { question: 'Was bekomme ich für die Provision?', answer: 'Garantierte Zahlung via Stripe (PCI-DSS Level 1). Streit-Schlichtung in 48h. Vertrauliche Kontaktdaten erst nach Zahlung. Verifizierte Gegenseite (Identität + Branchen-Nachweis). Automatischer CSV-Export für Steuerberater.' },
  { question: 'Wann ist es günstiger über eBay Kleinanzeigen?', answer: 'Nie — wenn du den Wert von Sicherheit, Bewertungssystem und rechtlichen Verträgen einbeziehst. Bei eBay zahlst du 0% Plattform, hast aber 100% Risiko: kein Bypass-Schutz, keine Zahlungs-Garantie, keine Bewertungs-Verlauf.' },
  { question: 'Wie zahle ich die Provision?', answer: 'Du zahlst nichts aktiv. Stripe Connect zieht die Provision automatisch ab BEVOR du das Geld bekommst. Beispiel: Kunde zahlt 100€, du bekommst 90€ ausgezahlt — die 10€ Provision sind transparent in deinem Dashboard sichtbar.' },
  { question: 'Wie lange gilt das Founding-Salon-0%-Programm?', answer: '6 Monate ab Listing-Aktivierung. Danach Standard-Provision. Founding-Salon-Badge bleibt lebenslang.' },
  { question: 'Fallen weitere Gebühren an?', answer: 'Stripe-Zahlungs-Gebühren (1,4% + 0,25€ pro Transaktion) trägt der Mieter. Keine Listing-Gebühren, keine monatlichen Gebühren, kein Setup-Fee.' },
]

export default function PricingPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        {/* FAQPage- und BreadcrumbList-Schema kommen aus <FAQ>/<Breadcrumbs> — hier bewusst keine zweiten. */}

        <Breadcrumbs items={[{ name: 'Provisionsmodell', url: '/provisionsmodell' }]} />

        <h1 className="cinzel" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 8 }}>
          Provisionsmodell — transparent und fair
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          Keine versteckten Gebühren. Du siehst pro Buchung exakt, was wir verdienen.
        </p>

        {/* Preis-Karten */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 32 }}>
          <div style={{ background: 'var(--c2)', borderRadius: 12, padding: 18, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 12, color: 'var(--stone)', margin: '0 0 4px' }}>FÜR KUNDEN (Endkunden, die einen Termin buchen)</p>
            <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--green)', margin: '0 0 4px' }}>0 %</p>
            <p style={{ fontSize: 13, color: 'var(--stone)', margin: 0 }}>Kostenlos. Immer.</p>
          </div>
          <div style={{ background: 'var(--c2)', borderRadius: 12, padding: 18, border: '1px solid var(--gold)' }}>
            <p style={{ fontSize: 12, color: 'var(--stone)', margin: '0 0 4px' }}>FÜR ANBIETER — Stuhl/Kabinen-Miete</p>
            <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--gold2)', margin: '0 0 4px' }}>10 %</p>
            <p style={{ fontSize: 13, color: 'var(--stone)', margin: 0 }}>Founding-Salons (erste 50/Stadt): 6 Monate 0 %.</p>
          </div>
          <div style={{ background: 'var(--c2)', borderRadius: 12, padding: 18, border: '1px solid var(--gold)' }}>
            <p style={{ fontSize: 12, color: 'var(--stone)', margin: '0 0 4px' }}>FÜR ANBIETER — OP-Räume (Premium)</p>
            <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--gold2)', margin: '0 0 4px' }}>8 %</p>
            <p style={{ fontSize: 13, color: 'var(--stone)', margin: 0 }}>Wegen höherer Compliance-Anforderungen ermäßigt.</p>
          </div>
        </section>

        {/* Vergleich */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', marginBottom: 12 }}>
            Im Vergleich
          </h2>
          <div style={{ background: 'var(--c2)', borderRadius: 12, padding: 14, border: '1px solid var(--border)', overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--stone)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px' }}>Plattform</th>
                  <th>Provision</th>
                  <th>Zahlungs-Schutz</th>
                  <th>Streit-Schlichtung</th>
                </tr>
              </thead>
              <tbody style={{ color: 'var(--cream)' }}>
                <tr style={{ background: 'rgba(212,175,55,0.08)' }}>
                  <td style={{ padding: '8px 6px', fontWeight: 700 }}>ChairMatch</td>
                  <td>10% / 8%</td>
                  <td>✅ Stripe</td>
                  <td>✅ in 48h</td>
                </tr>
                <tr><td style={{ padding: '8px 6px' }}>eBay Kleinanzeigen</td><td>0%</td><td>❌</td><td>❌</td></tr>
                <tr><td style={{ padding: '8px 6px' }}>Facebook-Gruppe</td><td>0%</td><td>❌</td><td>❌</td></tr>
                <tr><td style={{ padding: '8px 6px' }}>Salonkee</td><td>15-20%</td><td>✅</td><td>⚠️ langsam</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <FAQ items={FAQS} title="Häufige Fragen zum Preismodell" />

        {/* Interne Verlinkung: weiterführende Seiten (Stil analog [stadt]-Cross-Links) */}
        <section style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 12 }}>Mehr zu Preisen &amp; Ablauf:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link href="/preisvergleich" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Was kostet Stuhlmiete?</Link>
            <Link href="/vermieter/wie-es-funktioniert" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Vermieter werden</Link>
            <Link href="/mieter/wie-es-funktioniert" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Stuhl mieten</Link>
            <Link href="/freelancer-rechner" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Freelancer-Rechner</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
