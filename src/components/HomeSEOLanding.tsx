/**
 * HomeSEOLanding — Server-Komponente.
 *
 * SSR-rendered Marketing- und SEO-Inhalt für die Homepage (/).
 * - <HomeHero/> wird OBEN über HomeClient gemountet (kompakte Hero-Band)
 * - <HomeSEOFooterContent/> wird UNTEN nach HomeClient gemountet
 *   (Was-ist + FAQ + interne Hub-Links + JSON-LD)
 *
 * Beides ist immer im HTML — Google + AI-Engines crawlen die Inhalte
 * unabhängig vom OnboardingGate-Client-State.
 */

import Link from 'next/link'
import { faqSchema, serviceAreaSchema, type FaqItem } from '@/lib/seo'

// ─────────────────────────────────────────────────────────────
// Hero — kompakte Band oben, H1 + Dual-CTA
// ─────────────────────────────────────────────────────────────

export function HomeHero() {
  return (
    <section
      aria-labelledby="home-h1"
      style={{
        padding: '32px var(--pad, 16px) 24px',
        background: 'linear-gradient(180deg, rgba(176,144,96,0.10) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(176,144,96,0.10)',
      }}
    >
      <h1
        id="home-h1"
        className="cinzel"
        style={{
          fontSize: 22,
          color: 'var(--gold2)',
          lineHeight: 1.3,
          margin: 0,
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}
      >
        Stuhlmiete &amp; Beauty-Workspace mieten — Deutschlands Marketplace
      </h1>
      <p style={{
        fontSize: 13.5,
        color: 'var(--cream)',
        lineHeight: 1.55,
        marginTop: 10,
        marginBottom: 0,
      }}>
        Friseurstuhl, Barberstuhl, Kosmetikraum, Lash-Platz oder OP-Raum —
        tageweise mieten oder als Salon vermieten. <strong>0% Provision</strong>,
        transparente Tagespreise, Termin-Buchung in 60 Sekunden.
      </p>
      <div style={{
        display: 'flex',
        gap: 10,
        marginTop: 16,
        flexWrap: 'wrap',
      }}>
        <Link
          href="/vermieter/onboarding"
          className="bgold"
          style={{
            padding: '12px 20px',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 700,
            flex: '1 1 160px',
            textAlign: 'center',
            minWidth: 0,
          }}
        >
          Stuhl inserieren →
        </Link>
        <Link
          href="/rentals"
          className="boutline"
          style={{
            padding: '12px 20px',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 700,
            flex: '1 1 160px',
            textAlign: 'center',
            minWidth: 0,
          }}
        >
          Freien Stuhl finden →
        </Link>
      </div>
      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: '14px 0 0',
        display: 'flex',
        gap: 14,
        flexWrap: 'wrap',
        fontSize: 11,
        color: 'var(--stone)',
        letterSpacing: '0.02em',
      }}>
        <li>✓ Tagespreis 25–75 €</li>
        <li>✓ Sichere Zahlung über Plattform</li>
        <li>✓ DSGVO &amp; Hosting in Deutschland</li>
      </ul>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// FAQ-Items (echte People-Also-Ask aus Recon 2026-05-22)
// ─────────────────────────────────────────────────────────────

const HOME_FAQ: FaqItem[] = [
  {
    question: 'Was kostet Stuhlmiete bei einem Friseur in Deutschland?',
    answer:
      'Die übliche Tagesmiete für einen Friseurstuhl liegt deutschlandweit zwischen 25 € und 75 € pro Tag, abhängig von Lage, Ausstattung und Salon-Standard. Premium-Locations in Top-Lagen (München, Berlin-Mitte, Düsseldorf) liegen am oberen Ende; einfache Standorte ab 25 €. Monatspauschalen sind ab ca. 300 €/Monat bis über 1.000 €/Monat üblich. ChairMatch zeigt für jedes Inserat den transparenten Tagespreis ohne versteckte Gebühren.',
  },
  {
    question: 'Wie funktioniert Stuhlmiete und was ist mit Scheinselbstständigkeit?',
    answer:
      'Bei Stuhlmiete mieten Sie als selbstständige/r Friseur*in, Barber, Kosmetiker*in oder Lash-Stylist*in einen festen Arbeitsplatz im Salon und behalten Ihren eigenen Umsatz vollständig. Wichtig: Sie müssen ein eigenes Gewerbe oder einen Eintrag in der Handwerksrolle (Friseur-Meister) haben, eigene Kasse, eigene Buchhaltung, eigene Kunden — sonst droht die Einstufung als Scheinselbstständigkeit mit Sozialversicherungs-Nachzahlung bis zu 4 Jahre rückwirkend (bei Vorsatz bis zu 30 Jahre). ChairMatch stellt Standard-Mietverträge zur Verfügung, die rechtliche Klarheit schaffen.',
  },
  {
    question: 'Wie funktioniert die Buchung bei ChairMatch?',
    answer:
      'Sie suchen nach Stadt, Vertikal (Friseur, Barber, Kosmetik, Nail, Lash, Medical) und Datum, sehen freie Stühle/Räume mit Tagespreis und Ausstattung, buchen direkt online. Die Bezahlung läuft sicher über Stripe (Kreditkarte, Apple Pay, Google Pay, SEPA). Der Vermieter erhält automatisch eine Bestätigung. Keine Anrufe, kein Pingpong — Buchung in unter 60 Sekunden.',
  },
  {
    question: 'Ist ChairMatch wirklich provisionsfrei für Salons?',
    answer:
      'Ja. Der Basis-Eintrag und alle Termin-Buchungen sind 0% Provision. ChairMatch verdient ausschließlich an optionalen Premium-Features (Promotion, Top-Listing) und Mehrwert-Diensten (Compliance-Paket Gesundheitsamt). Salons behalten ihren gesamten Umsatz aus Buchungen.',
  },
  {
    question: 'Kann ich als Salon einen Mietvertrag rechtssicher aufsetzen?',
    answer:
      'ChairMatch stellt geprüfte Standard-Stuhlmietverträge zur Verfügung, die die typischen Stolperfallen abdecken (klare Mietsumme, separate Nebenkosten, Abgrenzung zur Scheinselbstständigkeit, Kündigungsfristen, getrennte Kasse und Buchhaltung des Mieters). Für individuelle Fälle empfehlen wir zusätzlich Rücksprache mit Steuerberater oder Anwalt — wir verweisen aktiv auf das Erwerbsstatusfeststellungsverfahren der Deutschen Rentenversicherung.',
  },
  {
    question: 'In welchen Städten ist ChairMatch verfügbar?',
    answer:
      'Phase-1-Launch-Städte sind Berlin, Hamburg, München, Köln und Frankfurt — mit Schwerpunkt auf Friseur, Barber, Kosmetik, Nail, Lash und Premium-Medical (OP-Raum, Behandlungsraum). Weitere Städte folgen sobald in der jeweiligen Region mindestens drei verifizierte Anbieter aktiv sind. Sie können jederzeit als Erstanbieter in einer neuen Stadt starten.',
  },
  {
    question: 'Was unterscheidet ChairMatch von eBay Kleinanzeigen und Facebook-Gruppen?',
    answer:
      'Bei ChairMatch sind alle Anbieter verifiziert (Gewerbenachweis, Steuer-ID, optional Meisterbrief), Zahlungen laufen sicher über die Plattform, es gibt echte Bewertungen, ein digitales Compliance-Paket (Gesundheitsamt-Dokumente) und Termin-Buchung mit Kalender-Sync. Im Vergleich zu unmoderierten Anzeigenportalen reduziert das Risiko von Fake-Inseraten, unseriösen Mietern und rechtlichen Stolperfallen erheblich.',
  },
]

// ─────────────────────────────────────────────────────────────
// SEO Footer Content — Was-ist + FAQ + interne Links + JSON-LD
// ─────────────────────────────────────────────────────────────

const VERTICAL_HUBS: Array<{ slug: string; label: string }> = [
  { slug: 'barbershop-deutschland', label: 'Barbershop' },
  { slug: 'friseur-deutschland', label: 'Friseur' },
  { slug: 'kosmetik-deutschland', label: 'Kosmetik' },
  { slug: 'nagelstudio-deutschland', label: 'Nagelstudio' },
  { slug: 'lash-brows-deutschland', label: 'Lash & Brows' },
]

const CITY_HUBS: Array<{ slug: string; label: string }> = [
  { slug: 'berlin', label: 'Berlin' },
  { slug: 'hamburg', label: 'Hamburg' },
  { slug: 'muenchen', label: 'München' },
  { slug: 'koeln', label: 'Köln' },
  { slug: 'frankfurt', label: 'Frankfurt' },
]

export function HomeSEOFooterContent() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      faqSchema(HOME_FAQ),
      serviceAreaSchema('Deutschland'),
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        '@id': 'https://chairmatch.de/#service-rental',
        name: 'Stuhlmiete & Workspace-Vermietung für Beauty-, Barber- und Medical-Freelancer',
        description:
          'Online-Marketplace zur tageweisen Vermietung von Friseurstühlen, Barberstühlen, Kosmetikkabinen, Lash-Plätzen, Behandlungsräumen und OP-Räumen in Deutschland.',
        provider: { '@id': 'https://chairmatch.de/#organization' },
        areaServed: { '@type': 'Country', name: 'Germany' },
        serviceType: 'Workspace Rental Marketplace',
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'EUR',
          lowPrice: '25',
          highPrice: '75',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            unitText: 'DAY',
            priceCurrency: 'EUR',
          },
        },
      },
    ],
  }

  return (
    <section
      aria-labelledby="home-seo-content"
      style={{
        padding: '40px var(--pad, 16px) 32px',
        background: 'linear-gradient(180deg, transparent 0%, rgba(176,144,96,0.04) 100%)',
        marginTop: 24,
      }}
    >
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* "Was ist ChairMatch?" — für AI-Engines extraktierbar */}
      <h2
        id="home-seo-content"
        className="cinzel"
        style={{
          fontSize: 18,
          color: 'var(--gold2)',
          margin: '0 0 12px',
          fontWeight: 600,
        }}
      >
        Was ist ChairMatch?
      </h2>
      <p style={{
        fontSize: 13.5,
        color: 'var(--cream)',
        lineHeight: 1.7,
        margin: '0 0 12px',
      }}>
        <strong>ChairMatch</strong> ist Deutschlands B2B-Marketplace für
        Workspace-Sharing in der Beauty-, Barber- und Medical-Branche.
        Salons, Studios, Praxen und Kliniken vermieten ihre freien Stühle,
        Liegen, Kabinen und OP-Räume tageweise an selbstständige Friseure,
        Barber, Kosmetiker*innen, Lash-Stylist*innen, Nageldesigner*innen
        und Ärzt*innen — ohne Provision auf Buchungen, mit transparenten
        Tagespreisen und sicherer Online-Zahlung.
      </p>
      <p style={{
        fontSize: 13.5,
        color: 'var(--cream)',
        lineHeight: 1.7,
        margin: '0 0 18px',
      }}>
        Im Gegensatz zu unmoderierten Anzeigenportalen verifizieren wir alle
        Anbieter (Gewerbenachweis, Steuer-ID, optional Meisterbrief),
        stellen rechtssichere Stuhlmietverträge bereit und bieten ein
        digitales Compliance-Paket für die Gesundheitsamt-Anforderungen.
        Für Selbstständige bedeutet das: planbare Tagesmieten zwischen
        25 € und 75 €, eigene Kunden, eigene Kasse, eigenes Profil —
        ohne Investitionsrisiko eines eigenen Salons.
      </p>

      {/* Doppel-Zielgruppen-Pfade */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
          margin: '0 0 28px',
        }}
      >
        <article
          style={{
            background: 'var(--c2, #14110b)',
            border: '1px solid rgba(176,144,96,0.18)',
            borderRadius: 14,
            padding: '18px 16px',
          }}
        >
          <h3
            className="cinzel"
            style={{ fontSize: 15, color: 'var(--gold2)', margin: '0 0 8px', fontWeight: 600 }}
          >
            Für Salons &amp; Studios
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--cream)', lineHeight: 1.6, margin: '0 0 10px' }}>
            Ihre freien Stühle und Kabinen sind passives Einkommen. Inserieren
            Sie kostenlos, definieren Sie Tagespreis und Ausstattung,
            verwalten Sie Buchungen über das Dashboard.
          </p>
          <Link
            href="/vermieter/onboarding"
            style={{
              fontSize: 13,
              color: 'var(--gold)',
              fontWeight: 700,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            Jetzt kostenlos inserieren →
          </Link>
        </article>
        <article
          style={{
            background: 'var(--c2, #14110b)',
            border: '1px solid rgba(176,144,96,0.18)',
            borderRadius: 14,
            padding: '18px 16px',
          }}
        >
          <h3
            className="cinzel"
            style={{ fontSize: 15, color: 'var(--gold2)', margin: '0 0 8px', fontWeight: 600 }}
          >
            Für Freelancer &amp; Selbstständige
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--cream)', lineHeight: 1.6, margin: '0 0 10px' }}>
            Finden Sie freie Stühle, Liegen, Kabinen und OP-Räume in Ihrer
            Stadt. Tagespreis ab 25 €, ohne Vertrag, ohne Mindestbuchung.
            Eigene Kunden, eigener Umsatz, 0% Abgabe.
          </p>
          <Link
            href="/rentals"
            style={{
              fontSize: 13,
              color: 'var(--gold)',
              fontWeight: 700,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            Stuhlmiete in Ihrer Stadt finden →
          </Link>
        </article>
      </div>

      {/* FAQ — server-rendered <details> (kein JS nötig, sichtbar in HTML) */}
      <h2
        className="cinzel"
        style={{
          fontSize: 18,
          color: 'var(--gold2)',
          margin: '0 0 14px',
          fontWeight: 600,
        }}
      >
        Häufige Fragen zu Stuhlmiete &amp; Workspace-Sharing
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {HOME_FAQ.map((item, idx) => (
          <details
            key={idx}
            style={{
              background: 'var(--c2, #14110b)',
              borderRadius: 12,
              border: '1px solid rgba(176,144,96,0.10)',
              padding: '12px 14px',
            }}
          >
            <summary
              style={{
                color: 'var(--cream)',
                fontWeight: 600,
                fontSize: 13.5,
                listStyle: 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span>{item.question}</span>
              <span style={{ color: 'var(--gold2)', fontSize: 14, flexShrink: 0 }}>+</span>
            </summary>
            <p style={{
              marginTop: 10,
              fontSize: 12.5,
              color: 'var(--stone)',
              lineHeight: 1.7,
            }}>
              {item.answer}
            </p>
          </details>
        ))}
      </div>

      {/* Interne Hub-Links (PageRank-Distribution + sichtbare Navigation) */}
      <nav aria-label="Themen-Hubs" style={{ marginBottom: 14 }}>
        <p
          className="cinzel"
          style={{
            fontSize: 12,
            color: 'var(--gold2)',
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            margin: '0 0 10px',
          }}
        >
          Kategorien
        </p>
        <ul style={{
          listStyle: 'none', padding: 0, margin: 0,
          display: 'flex', flexWrap: 'wrap', gap: 8,
        }}>
          {VERTICAL_HUBS.map(v => (
            <li key={v.slug}>
              <Link
                href={`/${v.slug}`}
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: 'var(--c1, #0f0d08)',
                  border: '1px solid rgba(176,144,96,0.20)',
                  borderRadius: 999,
                  fontSize: 12,
                  color: 'var(--cream)',
                  textDecoration: 'none',
                }}
              >
                {v.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <nav aria-label="Stadt-Hubs">
        <p
          className="cinzel"
          style={{
            fontSize: 12,
            color: 'var(--gold2)',
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            margin: '0 0 10px',
          }}
        >
          Städte
        </p>
        <ul style={{
          listStyle: 'none', padding: 0, margin: 0,
          display: 'flex', flexWrap: 'wrap', gap: 8,
        }}>
          {CITY_HUBS.map(c => (
            <li key={c.slug}>
              <Link
                href={`/${c.slug}`}
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: 'var(--c1, #0f0d08)',
                  border: '1px solid rgba(176,144,96,0.20)',
                  borderRadius: 999,
                  fontSize: 12,
                  color: 'var(--cream)',
                  textDecoration: 'none',
                }}
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  )
}
