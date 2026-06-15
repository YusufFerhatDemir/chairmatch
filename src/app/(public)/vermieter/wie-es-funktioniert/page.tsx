import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema, faqSchema } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'

export const metadata: Metadata = {
  // Layout-Template fügt "| ChairMatch" auto an — daher hier ohne Suffix.
  title: 'Vermieter werden — Stuhl, Kabine oder Raum vermieten',
  description: 'Du betreibst einen Salon, ein Studio oder eine Praxis? Vermiete deinen freien Friseurstuhl, deine Kosmetik-Kabine oder deinen Behandlungsraum tageweise. Stuhlmiete planbar, Stripe-gesichert, 0 % Provision in den ersten 3 Monaten.',
  keywords: 'vermieter werden, stuhlmiete anbieten, friseurstuhl vermieten, kosmetikraum vermieten, salonplatz vermieten, untervermietung salon, beauty workspace vermieten, betreiber chairmatch',
  alternates: { canonical: 'https://www.chairmatch.de/vermieter/wie-es-funktioniert' },
  openGraph: {
    title: 'Vermieter werden — Stuhlmiete planbar anbieten | ChairMatch',
    description: 'In 4 Schritten dein Inserat live. Stuhlmiete, Kabine oder Raum tageweise vermieten — Stripe-gesichert.',
    url: 'https://www.chairmatch.de/vermieter/wie-es-funktioniert',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
  },
}

const STEPS = [
  {
    n: 1, t: 'Kostenlos registrieren',
    d: 'E-Mail, Salon-Name, Adresse, Kategorie. Identitäts- und Gewerbe-Check in 24 h.',
  },
  {
    n: 2, t: 'Inserat erstellen',
    d: 'Pro Asset (Stuhl, Kabine, Raum) ein Inserat: Preis pro Tag, Verfügbarkeit, Ausstattung, 3-5 Fotos. Concierge-Hilfe für Founding-Vermieter inklusive.',
  },
  {
    n: 3, t: 'Anfragen bestätigen',
    d: 'Verifizierte Mieter (Meisterbrief / Gewerbe-Nachweis geprüft) senden Anfragen. Du bestätigst oder lehnst ab — innerhalb 48 h.',
  },
  {
    n: 4, t: 'Stripe-Auszahlung erhalten',
    d: 'Mieter zahlen vor Beginn via Stripe. Auszahlung wöchentlich auf dein Geschäftskonto. CSV-Export für deinen Steuerberater pro Quartal.',
  },
]

const FAQS = [
  {
    question: 'Was unterscheidet "Vermieter" von "Anbieter" auf ChairMatch?',
    answer: 'Beide Begriffe meinen denselben Marktseite: Betreiber eines Salons, Studios oder einer Praxis, der freie Stühle, Kabinen oder Räume tageweise vermietet. "Vermieter" ist juristisch eindeutiger — du gehst ein Stuhlmiete-Verhältnis ein. "Mieter" sind die selbstständigen Freelancer (Friseure, Barber, Kosmetikerinnen, Lash-Profis), die deinen Platz tageweise nutzen.',
  },
  {
    question: 'Was kostet ChairMatch für Vermieter?',
    answer: '10 % Vermittlungsprovision auf Stuhl-/Kabinen-Miete, 8 % auf OP-Räume. 0 % auf normale Beauty-Buchungen (wenn deine Mieter zusätzlich Termine über ChairMatch annehmen). Für die ersten 50 Vermieter pro Stadt: 6 Monate komplett 0 % Provision plus Founding-Vermieter-Auszeichnung.',
  },
  {
    question: 'Welche Assets kann ich vermieten?',
    answer: 'Friseur-/Barberstuhl, Kosmetik-Kabine, Nagelstudio-Platz, Lash-Workstation, Behandlungsraum, OP-Raum (mit Lizenz-Nachweis), Massage-Liege. Du legst pro Asset ein eigenes Inserat an — mit eigener Tagesmiete und Verfügbarkeit.',
  },
  {
    question: 'Wie schütze ich mich vor Scheinselbstständigkeit?',
    answer: 'Stuhlmiete ist KEINE Scheinselbstständigkeit, wenn dein Mieter eigene Kunden, eigene Kasse, eigene Werkzeuge, eigene Arbeitszeiten und eigene Werbung hat. ChairMatch stellt einen rechtssicheren Standard-Stuhlmietvertrag und prüft Mieter-Gewerbeanmeldungen. Wir empfehlen jedem Vermieter zusätzlich Rücksprache mit einem Steuerberater — die Nachzahlungspflicht bei festgestellter Scheinselbstständigkeit beträgt 4 Jahre (mit Vorsatz bis 30 Jahre).',
  },
  {
    question: 'Wie lange dauert die Verifizierung?',
    answer: 'Standard: 24 h. Bei Founding-Vermieter-Programm (kostenlos für die ersten 50 pro Stadt): Concierge-Onboarding mit Live-Schalte innerhalb 4 h.',
  },
  {
    question: 'Kann ich Mieter ablehnen?',
    answer: 'Ja — jede Anfrage musst du aktiv bestätigen. Wenn du nichts tust, läuft die Anfrage nach 48 h ab. Auch nach Bestätigung kannst du bis 24 h vor Termin kostenlos stornieren.',
  },
  {
    question: 'Welche Versicherungen brauche ich als Vermieter?',
    answer: 'Eigene Betriebshaftpflicht und Inhalts-Versicherung für deinen Salon. Mieter brauchen separat eine eigene Berufshaftpflicht — das prüfen wir bei der Mieter-Verifizierung.',
  },
  {
    question: 'Was passiert bei Streit zwischen mir und einem Mieter?',
    answer: 'Stripe-Zahlung ist garantiert: dein Honorar ist abgesichert, sobald die Buchung bestätigt ist. Bei strukturellen Streitigkeiten (z.B. Mieter beschädigt Inventar, Mieter ignoriert Hausordnung) greift unser Streit-Schlichtungs-Service innerhalb 48 h.',
  },
  {
    question: 'Wann bekomme ich mein Geld?',
    answer: 'Stripe Connect zahlt automatisch wöchentlich (alle Buchungen der abgeschlossenen Vorwoche, jeden Montag) auf dein Geschäftskonto aus. Kein Cash-Risiko, kein Last-Minute-Aussetzer.',
  },
]

export default function VermieterHowItWorksPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
            { name: 'Start', url: '/' },
            { name: 'Vermieter werden', url: '/vermieter/wie-es-funktioniert' },
          ])) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(FAQS)) }}
        />

        <Breadcrumbs items={[{ name: 'Vermieter werden', url: '/vermieter/wie-es-funktioniert' }]} />

        <h1 className="cinzel" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 8 }}>
          Vermieter werden — Stuhlmiete planbar anbieten
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          Du betreibst einen Salon, ein Studio oder eine Praxis und hast freie Arbeitsplätze?
          Vermiete Friseurstuhl, Kosmetik-Kabine, Lash-Workstation oder Behandlungsraum
          tageweise an verifizierte Freelancer — Stripe-gesichert, mit rechtssicherem
          Stuhlmietvertrag und ohne mündliches Risiko.
        </p>

        {/* Rolle erklärt */}
        <section style={{ marginBottom: 24, background: 'var(--c2)', borderRadius: 12, padding: 14, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 2, margin: '0 0 4px' }}>ROLLE: VERMIETER</p>
          <p style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.6, margin: 0 }}>
            Als <strong style={{ color: 'var(--gold2)' }}>Vermieter</strong> (Betreiber) listest du Stühle, Kabinen oder Räume aus deinem Salon.
            Deine Gegenseite sind die <Link href="/mieter/wie-es-funktioniert" style={{ color: 'var(--gold2)' }}>Mieter</Link> — selbstständige Beauty-Freelancer,
            die einen flexiblen Arbeitsplatz suchen.
          </p>
        </section>

        {/* Schritte */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', marginBottom: 14 }}>
            In 4 Schritten zum ersten Mieter
          </h2>
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

        {/* Was du als Vermieter erreichst */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 12 }}>
            Was du als Vermieter erreichst
          </h2>
          <ul style={{ color: 'var(--stone)', fontSize: 13, lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
            <li>Bis zu 60 % Mehr-Auslastung an freien Tagen und Randzeiten</li>
            <li>Planbare Zusatzeinnahmen aus Stühlen, die sonst leer stehen</li>
            <li>Rechtssicherer Stuhlmietvertrag automatisch generiert (DSGVO + HwO konform)</li>
            <li>Stripe-Zahlung garantiert — kein Cash-Risiko, kein Ausfallrisiko</li>
            <li>Steuerberater-Export pro Quartal per Klick (CSV mit allen Buchungen)</li>
            <li>Mehr Vielfalt und Bewertungs-Profil durch wechselnde Spezialistinnen</li>
          </ul>
        </section>

        {/* Founding-Vermieter-Programm */}
        <section style={{ marginBottom: 32, background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(176,144,96,0.05))', borderRadius: 12, padding: 16, border: '1px solid rgba(212,175,55,0.3)' }}>
          <p style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 2, margin: '0 0 4px' }}>FOUNDING-VERMIETER</p>
          <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', margin: '0 0 8px' }}>
            6 Monate 0 % Provision für die ersten 50 Vermieter pro Stadt
          </h2>
          <p style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.6, marginBottom: 12 }}>
            Bei Founding-Vermietern übernimmt ChairMatch die Inserat-Erstellung kostenlos (inkl.
            Foto-Session in Köln, Frankfurt und Berlin). Lebenslange „Founding Vermieter"-Auszeichnung
            im Profil und bevorzugte Platzierung in Stadt-Suchen.
          </p>
          <Link href="/auth?tab=register" className="bgold" style={{ display: 'inline-block', padding: '10px 22px', fontSize: 13, textDecoration: 'none' }}>
            Jetzt Stuhl inserieren →
          </Link>
        </section>

        {/* Cross-Link zu Mieter-Seite */}
        <section style={{ marginBottom: 32, padding: 14, border: '1px dashed var(--border)', borderRadius: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--stone)', margin: 0, lineHeight: 1.6 }}>
            Du suchst selbst einen Arbeitsplatz statt einen anzubieten?
            {' '}
            <Link href="/mieter/wie-es-funktioniert" style={{ color: 'var(--gold2)' }}>
              Zur Mieter-Seite — Stuhl, Kabine oder Raum mieten →
            </Link>
          </p>
        </section>

        <FAQ items={FAQS} title="Häufige Fragen für Vermieter" />
      </div>
    </div>
  )
}
