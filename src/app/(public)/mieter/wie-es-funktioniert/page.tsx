import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema, faqSchema } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'

export const metadata: Metadata = {
  title: 'Stuhl, Liege oder Raum mieten — so funktioniert es | ChairMatch',
  description: 'Wie findest du als Freelancer-Friseur, Kosmetikerin oder Lash-Specialist den perfekten Arbeitsplatz? In 4 Schritten zur ersten Buchung. 0% Provision für dich.',
  keywords: 'freelancer friseur platz suchen, selbstständig beauty, stuhl mieten anleitung, salonplatz finden, beauty workspace mieten',
  alternates: { canonical: 'https://chairmatch.de/mieter/wie-es-funktioniert' },
  openGraph: {
    title: 'Stuhl mieten — so funktioniert es | ChairMatch',
    description: 'Als Beauty-Freelancer in 4 Schritten zum perfekten Arbeitsplatz. 0% Provision.',
    url: 'https://chairmatch.de/mieter/wie-es-funktioniert',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
  },
}

const STEPS = [
  { n: 1, t: 'Kostenlos anmelden', d: 'Email + Beruf-Nachweis (Meisterbrief, Kosmetiker-Zertifikat). 5 Minuten.' },
  { n: 2, t: 'Plätze suchen', d: 'Filtere nach Stadt, Kategorie, Datum, Preis. Sieh Bewertungen.' },
  { n: 3, t: 'Anfragen & buchen', d: 'Tag wählen, Anfrage senden. Stripe-gesichert zahlen.' },
  { n: 4, t: 'Arbeiten & bewerten', d: 'Schlüssel kommt am Tag der Buchung. Nach Termin bewerten.' },
]

const FAQS = [
  { question: 'Was kostet mich ChairMatch?', answer: '0%. Du zahlst NUR die Stuhl-Miete an den Salon (z.B. 50€/Tag). ChairMatch verdient ausschließlich an der Provision des Salons — du behältst 100% deines Behandlungs-Umsatzes.' },
  { question: 'Brauche ich ein Gewerbe?', answer: 'Ja — als selbstständiger Beauty-Profi. Bei Friseur Meisterbrief Pflicht. Bei Kosmetik/Nail/Lash reicht einfache Gewerbeanmeldung (online bei deinem Gewerbeamt, ~30€).' },
  { question: 'Wie funktioniert die Bezahlung?', answer: 'Du zahlst nach Buchungsbestätigung via Stripe (Kreditkarte, Apple Pay, Google Pay, SEPA). Erst nach Zahlung bekommst du Adresse + Zugangscode des Salons.' },
  { question: 'Kann ich kurzfristig stornieren?', answer: 'Bis 48h vorher kostenlos. Danach 50-100% des Tagespreises (steht im Listing). Bei Krankheit (mit Attest): immer kostenlos.' },
  { question: 'Was wenn der Salon nicht passt?', answer: 'Bewerte ehrlich nach der Buchung. Bei schwerwiegenden Mängeln (verdreckte Ausstattung, vertragsbruch): Reklamation per Email → Streit-Schlichtung in 48h, oft mit Gutschein-Ausgleich.' },
  { question: 'Wie viele Buchungen pro Monat sind realistisch?', answer: 'Anfänger 8-12 Tage/Monat. Etablierte mit Stammkunden 18-22 Tage/Monat. Bei Vollzeit-Stuhl-Miete im Schnitt 20 Tage/Monat möglich.' },
  { question: 'Kann ich meine eigenen Kunden mitbringen?', answer: 'Ja — der Kundenstamm gehört dir. Du buchst den Stuhl, deine Kunden kommen zu DIR (nicht zum Salon). Achte aber auf "Konkurrenzschutz"-Klauseln im Vertrag — die meisten haben keine.' },
]

export default function TenantHowItWorksPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
            { name: 'Start', url: '/' },
            { name: 'Stuhl mieten', url: '/mieter/wie-es-funktioniert' },
          ])) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(FAQS)) }}
        />

        <Breadcrumbs items={[{ name: 'Stuhl mieten', url: '/mieter/wie-es-funktioniert' }]} />

        <h1 className="cinzel" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 8 }}>
          Stuhl mieten — so geht es
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          Als Freelancer-Friseur, Barber, Kosmetikerin oder Lash-Specialist in 4 Schritten zum
          flexiblen Arbeitsplatz. 0% Provision. Stripe-gesichert. Verifizierte Salons.
        </p>

        <section style={{ marginBottom: 32 }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #D4AF37, #B8962E)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 800, color: '#1a1000', flexShrink: 0,
              }}>{s.n}</div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)', margin: '0 0 4px' }}>{s.t}</p>
                <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6, margin: 0 }}>{s.d}</p>
              </div>
            </div>
          ))}
        </section>

        <section style={{ marginBottom: 32, textAlign: 'center' }}>
          <Link href="/explore" className="bgold" style={{ display: 'inline-block', padding: '12px 28px', fontSize: 14, textDecoration: 'none' }}>
            Plätze entdecken →
          </Link>
        </section>

        <FAQ items={FAQS} title="Häufige Fragen für Mieter" />
      </div>
    </div>
  )
}
