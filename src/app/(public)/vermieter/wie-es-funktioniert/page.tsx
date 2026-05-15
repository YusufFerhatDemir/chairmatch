import type { Metadata } from 'next'
import Link from 'next/link'
import { breadcrumbSchema, faqSchema } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'

export const metadata: Metadata = {
  title: 'Stuhl, Kabine oder Raum vermieten — so funktioniert es | ChairMatch',
  description: 'Vermiete als Salon, Studio oder Praxis-Inhaber freie Plätze auf ChairMatch. Plane flexibel, fülle Leerstand, generiere Zusatzeinnahmen. In 4 Schritten zum ersten zahlenden Mieter.',
  keywords: 'stuhl vermieten, kabine vermieten, salon platz vermieten, beauty workspace vermieten, leerstand vermieten, friseur stuhl vermieten anleitung',
  alternates: { canonical: 'https://chairmatch.de/vermieter/wie-es-funktioniert' },
  openGraph: {
    title: 'Stuhl vermieten — so funktioniert es | ChairMatch',
    description: 'Als Salon-Inhaber in 4 Schritten zum ersten zahlenden Mieter. Leerstand füllen, Zusatzeinnahmen generieren.',
    url: 'https://chairmatch.de/vermieter/wie-es-funktioniert',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
  },
}

const STEPS = [
  { n: 1, t: 'Kostenlos anmelden', d: 'Email + Gewerbe-Nachweis. Kein Vorab-Investment. 5 Minuten.' },
  { n: 2, t: 'Listing anlegen', d: 'Bilder hoch, Verfügbarkeit, Preis und Ausstattung eintragen.' },
  { n: 3, t: 'Anfragen prüfen', d: 'Verifizierte Mieter mit Beruf-Nachweis sehen dein Listing. Du wählst aus.' },
  { n: 4, t: 'Auszahlung erhalten', d: 'Stripe Connect überweist 1–2 Tage nach Buchungstag automatisch.' },
]

const FAQS = [
  { question: 'Was kostet mich ChairMatch?', answer: 'Die ersten 3 Monate 0% Provision. Danach 12% pro vermitteltem Buchungs-Umsatz. Keine monatliche Grundgebühr, kein Lock-In.' },
  { question: 'Wer haftet bei Schäden?', answer: 'Jeder Mieter ist nach AGB verpflichtet, eine Berufshaftpflicht nachzuweisen. Bei Schäden am Inventar greift zusätzlich unsere optionale ChairMatch-Vertrauens-Garantie (kommt Q3/2026).' },
  { question: 'Wer sind die Mieter? Sind die geprüft?', answer: 'Friseure brauchen Meisterbrief, Kosmetiker/Lash/Nail eine Gewerbeanmeldung. Identität wird via Stripe Identity verifiziert. Du siehst Bewertungen vor der Bestätigung.' },
  { question: 'Kann ich ablehnen wenn mir der Mieter nicht passt?', answer: 'Ja — jederzeit und ohne Begründung. Du hast volle Kontrolle wer in deinem Salon arbeitet.' },
  { question: 'Wann bekomme ich mein Geld?', answer: 'Stripe Connect zahlt automatisch 1-2 Werktage nach dem Buchungstag aus. SEPA-Überweisung direkt auf dein Geschäftskonto.' },
  { question: 'Was passiert wenn ein Mieter storniert?', answer: 'Bei Stornierung <48h vor Termin behältst du 50-100% des Tagespreises (du legst die Stornierungsbedingungen im Listing fest). Bei No-Show: 100%.' },
  { question: 'Muss ich meinen Salon umrüsten?', answer: 'Nein. Du vermietest deinen bestehenden Platz wie er ist. Du gibst die Ausstattung (Stuhl, Spiegel, Waschbecken, Klimatisierung) im Listing an — der Mieter weiß was er bekommt.' },
  { question: 'Wie viel kann ich realistisch verdienen?', answer: 'Bei 50€/Tag und 12 vermieteten Tagen/Monat = 600€ Brutto-Zusatzeinnahmen monatlich pro Stuhl. Bei 3 Stühlen im Salon: 1.800€/Monat. Reduziert Leerstand-Kosten erheblich.' },
]

export default function LandlordHowItWorksPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
            { name: 'Start', url: '/' },
            { name: 'Stuhl vermieten', url: '/vermieter/wie-es-funktioniert' },
          ])) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(FAQS)) }}
        />

        <Breadcrumbs items={[{ name: 'Stuhl vermieten', url: '/vermieter/wie-es-funktioniert' }]} />

        <h1 className="cinzel" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 8 }}>
          Stuhl vermieten — so geht es
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          Vermiete als Salon-, Studio- oder Praxis-Inhaber freie Plätze flexibel an verifizierte
          Beauty-Profis. Reduziere Leerstand, generiere planbare Zusatzeinnahmen. 0% Provision für
          die ersten 3 Monate.
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
          <Link href="/anbieter/wie-es-funktioniert" className="bgold" style={{ display: 'inline-block', padding: '12px 28px', fontSize: 14, textDecoration: 'none' }}>
            Jetzt Vermieter werden →
          </Link>
        </section>

        <FAQ items={FAQS} title="Häufige Fragen für Vermieter" />
      </div>
    </div>
  )
}
