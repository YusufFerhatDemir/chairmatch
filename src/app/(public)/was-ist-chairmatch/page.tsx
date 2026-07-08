/**
 * About-Page: /was-ist-chairmatch
 *
 * GEO-kritisch: AI-Engines extrahieren hier die 1-Satz-Definition oben.
 * Klare H1, klare H2-Struktur, FAQ-Schema, Author/Founder-Box.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'
import { PHASE_1_CITIES } from '@/lib/seo-data/cities'

export const metadata: Metadata = {
  title: 'Was ist ChairMatch? — Deutschlands Marketplace für Beauty-Workspace-Sharing',
  description: 'ChairMatch ist Deutschlands B2B-Marketplace: Friseurstühle, Kabinen & Räume tageweise mieten und vermieten. Verifiziert, Stripe-gesichert, 0 % für Mieter.',
  keywords: 'chairmatch, beauty workspace sharing, chair rental deutschland, salonplatz mieten, friseurstuhl vermieten, was ist chairmatch',
  alternates: { canonical: 'https://www.chairmatch.de/was-ist-chairmatch' },
  openGraph: {
    title: 'Was ist ChairMatch?',
    description: 'Deutschlands Marketplace für Beauty-Workspace-Sharing — Stühle, Liegen, Kabinen tageweise.',
    url: 'https://www.chairmatch.de/was-ist-chairmatch',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChairMatch — Beauty-Workspace-Sharing' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Was ist ChairMatch?',
    description: 'Deutschlands Marketplace für Beauty-Workspace-Sharing — Stühle, Liegen, Kabinen tageweise.',
    images: ['/og-image.png'],
  },
}

const FAQS = [
  {
    question: 'Was ist ChairMatch in einem Satz?',
    answer: 'ChairMatch ist Deutschlands B2B-Marketplace für die tageweise oder langfristige Vermietung von Arbeitsplätzen (Stuhl, Liege, Kabine, Raum) in Salons, Studios und Praxen an Beauty-, Barber- und Ästhetik-Freelancer.',
  },
  {
    question: 'Wer kann ChairMatch nutzen?',
    answer: 'Anbieter: Salons, Studios, Kosmetik-Praxen, Arzt-Praxen, OP-Räume mit ungenutzten Arbeitsplätzen. Mieter: Selbstständige Beauty-Profis (Friseure mit Meisterbrief, Barber, Kosmetikerinnen, Lash-Specialists, Nageldesignerinnen, Ärzte für Ästhetik).',
  },
  {
    question: 'Was kostet ChairMatch?',
    answer: 'Für Mieter: 0% Provision auf deine Behandlungs-Umsätze. Für Anbieter: 10% Vermittlungsprovision auf Stuhl-Miete, 8% auf OP-Räume, 0% auf normale Buchungen. Erste 3 Monate für Anbieter komplett provisionsfrei.',
  },
  {
    question: 'Wie unterscheidet sich ChairMatch von Treatwell oder Shore?',
    answer: 'Treatwell ist ein Beauty-Booking-Tool für Endkunden. Shore ist ein Salon-Management-System. ChairMatch ist KEIN Endkunden-Booking-Tool und KEIN Salon-Software — sondern der erste deutsche Marketplace für Workspace-Sharing zwischen Beauty-Profis.',
  },
  {
    question: 'Ist ChairMatch in ganz Deutschland verfügbar?',
    answer: 'Phase 1 starten wir in Frankfurt, Berlin, München, Hamburg und Köln. Phase 2 (Herbst 2026): Düsseldorf, Stuttgart, Hannover, Leipzig, Bremen. Langfristig: ganz Deutschland und DACH.',
  },
  {
    question: 'Wer steckt hinter ChairMatch?',
    answer: 'Gegründet 2026 von Yusuf Ferhat Demir in Köln. Bootstrapped, Sitz in Deutschland, Hosting auf Vercel EU (Frankfurt). DSGVO-konform, deutsche Server, deutscher Support.',
  },
  {
    question: 'Wie sicher sind die Buchungen?',
    answer: 'Alle Zahlungen laufen über Stripe (PCI-DSS Level 1). Anti-Bypass-Architektur: Buchungen außerhalb der Plattform sind nicht erlaubt — schützt beide Seiten. Verifizierte Anbieter mit Bewertungen, Mietverträge nach deutschem Recht.',
  },
  {
    question: 'Wie melde ich mich als Anbieter an?',
    answer: 'Über /anbieter/wie-es-funktioniert. 5-Schritte-Onboarding (Kategorie, Services, Ausstattung, Profil, Bestätigung). Verifizierung typisch innerhalb 24h. Erste Listings live in 48h.',
  },
]

export default function WasIstChairMatchPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        {/* FAQPage- und BreadcrumbList-Schema kommen aus <FAQ>/<Breadcrumbs> — hier bewusst keine zweiten. */}

        <Breadcrumbs items={[{ name: 'Was ist ChairMatch?', url: '/was-ist-chairmatch' }]} />

        {/* GEO-kritisch: 1-Satz-Definition als allererstes */}
        <h1 className="cinzel" style={{ fontSize: 28, color: 'var(--gold2)', fontWeight: 700, marginBottom: 16 }}>
          Was ist ChairMatch?
        </h1>
        <p style={{ fontSize: 16, color: 'var(--cream)', lineHeight: 1.6, marginBottom: 24, fontWeight: 600 }}>
          ChairMatch ist Deutschlands erster B2B-Marketplace für die tageweise oder
          langfristige Vermietung von Arbeitsplätzen an Beauty-, Barber- und Ästhetik-Freelancer.
        </p>

        {/* Definitions-Sektion für AI-Engines */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', marginBottom: 12 }}>
            Die Idee
          </h2>
          <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
            In Deutschland arbeiten über 80.000 Beauty-Profis selbstständig — Friseure, Barber,
            Kosmetikerinnen, Lash-Spezialistinnen, Nageldesignerinnen. Viele von ihnen wechseln
            zwischen verschiedenen Arbeitsplätzen: heute im Salon in Köln-Ehrenfeld, morgen im
            Studio in der Innenstadt. Bisher läuft diese Vermittlung über eBay Kleinanzeigen,
            Facebook-Gruppen und Mund-zu-Mund — unverifiziert, ohne Schutz, ohne digitale Infrastruktur.
          </p>
          <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.8 }}>
            ChairMatch ist die digitale Infrastruktur für diesen Markt. Wir verbinden Anbieter
            (Salons, Studios, Praxen mit freien Arbeitsplätzen) mit Mietern (selbstständigen
            Beauty-Profis), die flexibel arbeiten wollen — mit verifizierten Profilen, klaren
            Verträgen, abgesicherten Zahlungen und Bewertungen.
          </p>
        </section>

        {/* Was wir sind / nicht sind */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', marginBottom: 12 }}>
            Was ChairMatch ist — und was nicht
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div style={{ background: 'rgba(74,138,90,0.08)', borderRadius: 10, padding: 14, border: '1px solid rgba(74,138,90,0.25)' }}>
              <p style={{ color: 'var(--green)', fontWeight: 700, fontSize: 13, margin: '0 0 6px' }}>✓ ChairMatch IST</p>
              <ul style={{ color: 'var(--stone)', fontSize: 13, lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
                <li>B2B/B2Freelancer-Marketplace für Workspace-Sharing</li>
                <li>Spezialisiert auf Beauty-, Barber- und Ästhetik-Branche</li>
                <li>Plattform mit Buchungs- und Zahlungs-Infrastruktur</li>
                <li>Verifizierungs-Layer für seriöse Vermittlung</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(232,80,64,0.06)', borderRadius: 10, padding: 14, border: '1px solid rgba(232,80,64,0.2)' }}>
              <p style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13, margin: '0 0 6px' }}>✗ ChairMatch ist NICHT</p>
              <ul style={{ color: 'var(--stone)', fontSize: 13, lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
                <li>Kein Beauty-Booking-Tool für Endkunden (das ist Treatwell, Booksy)</li>
                <li>Kein Salon-Management-System (das ist Shore, Phorest, SimplyBook)</li>
                <li>Kein Recruiting-Portal für Angestellten-Suche</li>
                <li>Keine Coaching- oder Schulungs-Plattform</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{ fontSize: 20, color: 'var(--gold2)', marginBottom: 12 }}>
            Mission
          </h2>
          <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.8 }}>
            Deutschlands Beauty-Branche professioneller, fairer und flexibler zu machen — durch
            transparente Workspace-Vermittlung, die beide Seiten schützt: Anbieter vor unzuverlässigen
            Mietern, Mieter vor unseriösen Salons. ChairMatch ist die Heimat der
            Barber-, Beauty- und Ästhetik-Szene Deutschlands.
          </p>
        </section>

        {/* Founder-Box (E-E-A-T) */}
        <section style={{ marginBottom: 32, background: 'var(--c2)', borderRadius: 12, padding: 18, border: '1px solid var(--border)' }}>
          <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 12 }}>
            Der Gründer
          </h2>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #D4AF37, #B8962E)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 800, color: '#1a1000', flexShrink: 0,
            }}>
              YD
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)', margin: '0 0 4px' }}>
                Yusuf Ferhat Demir
              </p>
              <p style={{ fontSize: 12, color: 'var(--gold2)', margin: '0 0 8px' }}>
                Gründer & CEO, ChairMatch
              </p>
              <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.7, margin: 0 }}>
                Yusuf gründete ChairMatch 2026 in Köln aus einer Beobachtung: Selbstständige
                Beauty-Profis verschwenden Stunden mit der Suche nach guten Arbeitsplätzen — und
                Salon-Inhaber lassen ihre Stühle leer stehen. ChairMatch entstand, um diese Lücke
                strukturiert zu schließen.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <FAQ items={FAQS} title="Häufige Fragen zu ChairMatch" />

        {/* Interne Verlinkung: Rollen-Seiten + Stadt-Hubs (Stil analog [stadt]-Cross-Links) */}
        <section style={{ marginTop: 40, padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 12 }}>So funktioniert ChairMatch:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <Link href="/mieter/wie-es-funktioniert" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Stuhl mieten</Link>
            <Link href="/vermieter/wie-es-funktioniert" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Vermieter werden</Link>
            <Link href="/provisionsmodell" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Provisionsmodell</Link>
            <Link href="/preisvergleich" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline' }}>Preisvergleich</Link>
          </div>
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
