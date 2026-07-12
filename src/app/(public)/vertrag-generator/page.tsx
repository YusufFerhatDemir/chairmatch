import type { Metadata } from 'next'
import Link from 'next/link'
import VertragClient from './VertragClient'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'

export const metadata: Metadata = {
  // Layout-Template fügt "| ChairMatch" auto an.
  title: 'Mietvertrag-Generator: Stuhlmietvertrag in 2 Minuten',
  description:
    'Stuhlmietvertrag, Kabinen- oder Raummietvertrag für Salons automatisch erstellen: rechtssicher formulierte Klauseln gegen Scheinselbstständigkeit, Kundenstamm-Schutz, Kündigungsfristen — kostenlos ausfüllen, als PDF speichern und unterschreiben.',
  keywords:
    'stuhlmietvertrag muster, stuhlmiete vertrag, mietvertrag friseurstuhl, kabine mieten vertrag, stuhlmietvertrag vorlage, scheinselbstständigkeit stuhlmiete, mietvertrag kosmetikkabine, chair rental vertrag',
  alternates: { canonical: 'https://www.chairmatch.de/vertrag-generator' },
  openGraph: {
    title: 'Mietvertrag-Generator: Stuhlmietvertrag in 2 Minuten | ChairMatch',
    description:
      'Professionellen Stuhlmietvertrag automatisch generieren — mit Scheinselbstständigkeit-sicheren Klauseln, direkt als PDF. Kostenlos für ChairMatch-Nutzer.',
    url: 'https://www.chairmatch.de/vertrag-generator',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
  },
}

const TRUST_BULLETS = [
  {
    icon: '✓',
    titel: 'Von Branchen-Praxis geprüft',
    text: 'Aufgebaut nach dem, was in Salons wirklich vereinbart wird — von Abrechnungsart bis Schlüsselregelung.',
  },
  {
    icon: '§',
    titel: 'Scheinselbstständigkeit-sichere Klauseln',
    text: 'Eigene Preise, eigene Kunden, keine Weisungsbindung — die entscheidenden Formulierungen sind fest eingebaut.',
  },
  {
    icon: '€',
    titel: 'Kostenlos für ChairMatch-Nutzer',
    text: 'Vertrag konfigurieren, prüfen, drucken oder als PDF speichern — ohne Anmeldung, ohne Kosten.',
  },
]

export default function VertragGeneratorPage() {
  return (
    <div className="shell">
      <div className="screen">
        <div className="no-print" style={{ padding: '0 var(--pad)' }}>
          <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
            &larr; Zur&uuml;ck
          </Link>

          <Breadcrumbs items={[{ name: 'Vertrag-Generator', url: '/vertrag-generator' }]} className="no-print" />

          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginTop: 8 }}>
            Mietvertrag-Generator
          </h1>
          <p
            className="cinzel"
            style={{
              marginTop: 4,
              fontSize: 13,
              letterSpacing: '0.06em',
              background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Stuhlmietvertrag in 2 Minuten
          </p>
          <p style={{ color: 'var(--cream)', fontSize: 'var(--font-sm)', marginTop: 10, lineHeight: 1.5 }}>
            Ob Stuhl, Kabine, Behandlungsraum oder OP-Raum: Beantworte ein paar Fragen und erhalte einen
            vollst&auml;ndigen, professionell formulierten Mietvertrag &mdash; fertig zum Drucken und Unterschreiben.
          </p>

          {/* Trust-Bullets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {TRUST_BULLETS.map(b => (
              <div key={b.titel} className="card" style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: '1px solid #C4A86A',
                    color: '#C4A86A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {b.icon}
                </span>
                <div>
                  <div style={{ color: 'var(--cream)', fontSize: 13, fontWeight: 700 }}>{b.titel}</div>
                  <div style={{ color: 'var(--stone)', fontSize: 12, marginTop: 2, lineHeight: 1.45 }}>{b.text}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Rechtlicher Hinweis */}
          <div
            role="note"
            style={{
              marginTop: 16,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid rgba(196, 168, 106, 0.35)',
              background: 'rgba(196, 168, 106, 0.07)',
            }}
          >
            <div style={{ color: '#C4A86A', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Rechtlicher Hinweis
            </div>
            <p style={{ color: 'var(--stone)', fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
              Dieses Muster ersetzt keine Rechtsberatung. F&uuml;r den Einzelfall empfehlen wir die Pr&uuml;fung durch
              einen Anwalt.
            </p>
          </div>
        </div>

        <VertragClient />

        <div className="no-print" style={{ height: 80 }} />
      </div>
    </div>
  )
}
