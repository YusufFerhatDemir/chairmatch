import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema, faqSchema } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'

export const metadata: Metadata = {
  title: 'Anbieter werden — Stuhl, Liege oder Kabine vermieten | ChairMatch',
  description: 'Wie funktioniert ChairMatch für Salons, Studios und Praxen? In 4 Schritten dein Listing live — 0% Provision in den ersten 3 Monaten. Stripe-gesichert.',
  keywords: 'salon vermieten, friseurstuhl vermieten, stuhl-miete anbieter werden, salonplatz anbieten, untervermietung salon',
  alternates: { canonical: 'https://chairmatch.de/anbieter/wie-es-funktioniert' },
  openGraph: {
    title: 'Anbieter werden — Stuhl vermieten | ChairMatch',
    description: 'In 4 Schritten dein Salon-Listing live. 0% Provision in den ersten 3 Monaten.',
    url: 'https://chairmatch.de/anbieter/wie-es-funktioniert',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
  },
}

const STEPS = [
  {
    n: 1, t: 'Anmelden — kostenlos',
    d: 'Email, Geschäftsname, Adresse, Kategorie. Dauert 5 Minuten. Verifizierung in 24 h.',
  },
  {
    n: 2, t: 'Listing einstellen',
    d: 'Services, Ausstattung, Preise, Verfügbarkeit, 3-5 Fotos. Concierge-Hilfe verfügbar.',
  },
  {
    n: 3, t: 'Buchungen empfangen',
    d: 'Mieter buchen Tagespakete via Stripe. Du bestätigst oder lehnst ab.',
  },
  {
    n: 4, t: 'Auszahlung erhalten',
    d: 'Stripe Connect zahlt automatisch wöchentlich aus. CSV-Export für Steuerberater per Klick.',
  },
]

const FAQS = [
  { question: 'Was kostet ChairMatch für Anbieter?', answer: '10% Vermittlungsprovision auf Stuhl/Kabinen-Miete. 8% auf OP-Räume. 0% auf normale Beauty-Buchungen. Für Founding-Salons (erste 50 pro Stadt): 6 Monate komplett 0%.' },
  { question: 'Wie lange dauert die Verifizierung?', answer: 'Standard 24 h. Bei Concierge-Onboarding (kostenlos für Founding-Salons): live innerhalb 4 h.' },
  { question: 'Muss ich Gewerbe angemeldet haben?', answer: 'Ja. Bei Friseur-Salons brauchst du Meisterbrief, bei Kosmetik/Nail/Lash reicht einfache Gewerbeanmeldung. Wir prüfen die Angaben.' },
  { question: 'Welche Versicherungen brauche ich?', answer: 'Inhalts-Versicherung deines Salons + Betriebshaftpflicht. Deine Stuhl-Mieter brauchen eigene Berufshaftpflicht (das prüfen wir bei Mieter-Verifizierung).' },
  { question: 'Wie schütze ich mich vor unzuverlässigen Mietern?', answer: 'Alle Mieter durchlaufen Verifikation (Identität + Branchen-Nachweis). Bewertungen sichtbar. Bei Streit greift unser Streit-Schlichtungs-Service. Stripe-Zahlung ist garantiert.' },
  { question: 'Kann ich Mieter ablehnen?', answer: 'Ja — du entscheidest. Jede Buchungs-Anfrage musst du aktiv bestätigen, sonst läuft sie nach 48 h ab. Auch nach Bestätigung kannst du bis 24 h vor Termin kostenfrei stornieren.' },
  { question: 'Wann bekomme ich mein Geld?', answer: 'Stripe Connect zahlt automatisch wöchentlich (alle Buchungen abgeschlossener Vorwoche, jeden Montag) auf dein Bankkonto aus.' },
]

export default function ProviderHowItWorksPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
            { name: 'Start', url: '/' },
            { name: 'Anbieter werden', url: '/anbieter/wie-es-funktioniert' },
          ])) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(FAQS)) }}
        />

        <Breadcrumbs items={[{ name: 'Anbieter werden', url: '/anbieter/wie-es-funktioniert' }]} />

        <h1 className="cinzel" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 8 }}>
          Anbieter werden — in 4 Schritten zu mehr Auslastung
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          Vermiete deine ungenutzten Arbeitsplätze tageweise an verifizierte Freelancer.
          Die ersten 50 Salons pro Stadt bekommen 6 Monate 0% Provision und einen Onboarding-Call.
        </p>

        {/* Schritte */}
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

        {/* Founding-Salon-Programm */}
        <section style={{ marginBottom: 32, background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(176,144,96,0.05))', borderRadius: 12, padding: 16, border: '1px solid rgba(212,175,55,0.3)' }}>
          <p style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 2, margin: '0 0 4px' }}>FOUNDING SALON</p>
          <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', margin: '0 0 8px' }}>
            6 Monate 0% Provision für die ersten 50 Salons pro Stadt
          </h2>
          <p style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.6, marginBottom: 12 }}>
            Bei Founding-Salons übernimmt ChairMatch die Listing-Erstellung kostenlos (inkl.
            Foto-Session in Köln, Frankfurt und Berlin). Lebenslange „Founding Salon"-Auszeichnung.
          </p>
          <Link href="/auth?tab=register" className="bgold" style={{ display: 'inline-block', padding: '10px 22px', fontSize: 13, textDecoration: 'none' }}>
            Jetzt Founding-Salon werden →
          </Link>
        </section>

        <FAQ items={FAQS} title="Häufige Fragen für Anbieter" />
      </div>
    </div>
  )
}
