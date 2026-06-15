/**
 * /haartransplantation — Premium SEO-Landing-Page.
 *
 * Hochwertige Conversion-Seite für End-Kunden die Haartransplantation suchen.
 * Suchvolumen "haartransplantation kosten" = 165k/Monat in DE.
 * Behandlungs-Wert €2.000-8.000 = hohe Provision pro Vermittlung.
 *
 * Strategie:
 *   - Trust zuerst (verifizierte Kliniken, Approbation, DGÄPC)
 *   - Methoden-Vergleich (FUE / DHI / Saphir)
 *   - Realistische Preis-Range (transparent macht Vertrauen)
 *   - Vorher-Nachher (placeholder bis echte Provider drauf sind)
 *   - 4-Schritte-Prozess (Beratung → Plan → OP → Nachsorge)
 *   - Umfangreiche FAQ (für AI-Engines + featured snippets)
 *   - CTA: Verifizierte Klinik finden + Kostenlose Beratung anfragen
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { BackButton } from '@/components/BackButton'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { FAQ } from '@/components/seo/FAQ'
import { breadcrumbSchema, faqSchema } from '@/lib/seo'

export const revalidate = 3600 // 1h

export const metadata: Metadata = {
  title: 'Haartransplantation in Deutschland — Kosten, Methoden, Vergleich | ChairMatch',
  description: 'Verifizierte Kliniken für Haartransplantation in deiner Nähe finden. FUE, DHI, Saphir im Vergleich. Realistische Kosten: 2.490-4.990 €. Kostenlose Erstberatung anfragen.',
  keywords: 'haartransplantation, haartransplantation kosten, fue haartransplantation, dhi methode, saphir fue, haartransplantation deutschland, eigenhaartransplantation, haarausfall behandlung',
  alternates: { canonical: 'https://www.chairmatch.de/haartransplantation' },
  openGraph: {
    title: 'Haartransplantation — Verifizierte Kliniken in Deutschland',
    description: 'FUE, DHI, Saphir im Vergleich. Realistische Kosten + verifizierte Kliniken. Kostenlose Erstberatung.',
    url: 'https://www.chairmatch.de/haartransplantation',
    locale: 'de_DE',
    siteName: 'ChairMatch',
  },
}

const FAQS = [
  {
    question: 'Was kostet eine Haartransplantation in Deutschland?',
    answer: 'Realistische Preise in Deutschland: FUE-Methode 2.490-4.990 € (je nach Graft-Anzahl), DHI-Methode 3.290-4.590 €, Saphir-FUE 4.290-5.990 €. Im Vergleich zur Türkei (~1.500-2.500 €) zahlst du in Deutschland mehr, bekommst aber deutsche Approbation, deutsches Haftungsrecht, deutschsprachige Nachsorge und keine Flugkosten.',
  },
  {
    question: 'Welche Methode ist die beste — FUE, DHI oder Saphir?',
    answer: 'Es gibt keine "beste" Methode — es kommt auf dein Ausgangsbild an. FUE (Follicular Unit Extraction): Standard, gut bei mittlerem Haarausfall, sichtbare Schnitte minimal. DHI (Direct Hair Implantation, Choi-Pen): minimal-invasiv, kein Vor-Kanal-Stich nötig, höhere Dichte erzielbar, aber teurer. Saphir-FUE: Saphir-Klinge statt Stahl, präzisere Einschnitte, weniger Trauma, schnellere Heilung — Premium-Variante. Beratung mit einem erfahrenen Chirurgen klärt die richtige Wahl.',
  },
  {
    question: 'Wie viele Grafts brauche ich?',
    answer: 'Hängt vom Stadium ab (Norwood-Skala): Norwood II-III (Geheimratsecken): 1.500-2.500 Grafts. Norwood IV (mittlere Glatze): 2.500-3.500 Grafts. Norwood V-VI (große Glatze): 3.500-5.500 Grafts. Norwood VII (komplette Glatze): mehrere Sitzungen nötig, oft >6.000 Grafts total. Faustregel: 1 Graft = ca. 2-3 Haare.',
  },
  {
    question: 'Wann sehe ich Ergebnisse?',
    answer: 'Realistischer Zeitplan: Woche 2-3: Schorf fällt ab, transplantierte Haare fallen ebenfalls (sog. Shock-Loss, NORMAL). Monat 3-4: erste neue Haare wachsen. Monat 6: ~50% des finalen Ergebnisses sichtbar. Monat 9-12: ~80%. Monat 12-18: finales Ergebnis. Geduld ist Pflicht — Patienten die in Monat 3 enttäuscht sind, sehen meist in Monat 9 das versprochene Resultat.',
  },
  {
    question: 'Wie schmerzhaft ist eine Haartransplantation?',
    answer: 'Während der OP: lokale Betäubung, du spürst keine Schmerzen — nur den initialen Stich der Betäubung. Dauer 4-8 Stunden je nach Graft-Anzahl. Nach der OP: leichte Spannungsgefühle, eventuell mildes Brennen 1-3 Tage, mit Schmerzmittel gut beherrschbar. Die meisten Patienten arbeiten nach 3-5 Tagen wieder.',
  },
  {
    question: 'Frauen-Haartransplantation — funktioniert das auch?',
    answer: 'Ja, bei richtiger Indikation. Bei Frauen ist diffuser Haarausfall häufiger als typischer Geheimratsecken-Verlauf, deshalb muss erst die Ursache geklärt werden (Hormone, Eisenmangel, Stress, Schilddrüse). Wenn der Spenderbereich (Hinterkopf) stabil ist, kann eine HT funktionieren. Spezielle Frauen-Techniken erhalten bestehendes Haar.',
  },
  {
    question: 'Bart- und Augenbrauen-Transplantation — geht das auch?',
    answer: 'Ja. Bart-Transplantation: 1.500-3.500 Grafts, dauerhaftes Ergebnis, ideal bei Lücken oder dünnem Bart. Augenbrauen-Transplantation: 200-400 Grafts pro Seite, ideal nach Über-Zupfung oder genetisch dünnen Brauen. Beide nutzen Eigenhaar aus dem Hinterkopf. Wachsrichtung muss exakt eingehalten werden — nicht jeder Chirurg ist gleich gut darin.',
  },
  {
    question: 'Was unterscheidet ChairMatch von türkischen Kliniken?',
    answer: 'Türkei-Kliniken sind oft günstiger, aber: bei Komplikationen hast du keine deutsche Anwalts-Hebel. Sprach-Barrieren in Nachsorge. Reisekosten + Hotel. Keine Garantie wer wirklich operiert (oft Helfer, nicht der beworbene Arzt). ChairMatch verifiziert nur Kliniken mit deutscher Approbation, transparenten Preisen und nachgewiesener Erfahrung — alles im Sinne der Bundesärztekammer.',
  },
  {
    question: 'Bietet ChairMatch eine Garantie auf das Ergebnis?',
    answer: 'Eine "Erfolgs-Garantie" wäre unseriös — das Ergebnis hängt von individuellen Faktoren ab (Spenderhaar-Dichte, Wundheilung, hormonelle Situation). Was wir garantieren: nur verifizierte Kliniken mit Approbation und Erfahrung. Bei dokumentierten Behandlungsfehlern (z.B. nachweislicher Pfusch) hilft dir das deutsche Patientenrechte-Gesetz — was bei Türkei-Kliniken praktisch unmöglich ist.',
  },
  {
    question: 'Welche Voruntersuchungen brauche ich?',
    answer: 'Vor der OP: Blutbild (Eisenwert, Hormone, Schilddrüse), Aufklärungsgespräch (min. 1h), Foto-Dokumentation, Haaranalyse (Trichoskopie). Bei Vorerkrankungen: Rücksprache mit Hausarzt. Die seriöse Klinik schickt dich nicht direkt zur OP — sie nimmt sich Zeit zu klären, ob du überhaupt geeignet bist.',
  },
]

export default function HaartransplantationPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Start', url: '/' },
    { name: 'Haartransplantation', url: '/haartransplantation' },
  ])

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(FAQS)) }}
        />

        <div style={{ marginBottom: 14 }}>
          <BackButton href="/" label="Zurück zur Startseite" />
        </div>

        <Breadcrumbs items={[{ name: 'Haartransplantation', url: '/haartransplantation' }]} />

        {/* HERO */}
        <section style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: 'var(--gold2)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
            Premium · Verifizierte Kliniken
          </p>
          <h1 className="cinzel" style={{
            fontSize: 28, fontWeight: 700, color: 'var(--gold2)',
            lineHeight: 1.2, margin: '0 0 12px',
          }}>
            Haartransplantation in Deutschland
          </h1>
          <p style={{ color: 'var(--cream)', fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
            FUE, DHI oder Saphir — wir verbinden dich mit verifizierten Kliniken in deiner Nähe.
            Transparente Preise, deutsche Approbation, kostenlose Erstberatung.
          </p>

          {/* Trust-Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            marginBottom: 18,
          }}>
            <TrustChip icon="✓" label="Deutsche Approbation" />
            <TrustChip icon="✓" label="Transparente Preise" />
            <TrustChip icon="✓" label="Bewertete Kliniken" />
          </div>

          {/* CTA */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Link
              href={"/search?category=haartransplantation" as never}
              className="bgold"
              style={{
                display: 'block', padding: '12px 14px',
                textAlign: 'center', textDecoration: 'none',
                fontSize: 13, fontWeight: 700, borderRadius: 10,
              }}
            >
              Klinik finden
            </Link>
            <a
              href="mailto:beratung@chairmatch.de?subject=Haartransplantation%20-%20Kostenlose%20Erstberatung"
              className="boutline"
              style={{
                display: 'block', padding: '12px 14px',
                textAlign: 'center', textDecoration: 'none',
                fontSize: 13, fontWeight: 700, borderRadius: 10,
              }}
            >
              Kostenlose Beratung
            </a>
          </div>
        </section>

        {/* METHODEN-VERGLEICH */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{
            fontSize: 22, color: 'var(--gold2)', marginBottom: 14,
            borderBottom: '1px solid var(--border)', paddingBottom: 6,
          }}>
            Methoden im Vergleich
          </h2>

          <MethodCard
            name="FUE-Methode"
            tag="Standard"
            description="Follicular Unit Extraction. Einzelne Haarwurzeln werden mit einer kleinen Hohlnadel entnommen und in den kahlen Bereich transplantiert. Bewährte Methode, gute Erfolgsquote."
            priceRange="2.490 – 4.990 €"
            grafts="1.500 – 6.000 Grafts"
            durationHours="4 – 8 h"
            highlight={false}
          />

          <MethodCard
            name="DHI-Methode"
            tag="Minimal-Invasiv"
            description="Direct Hair Implantation mit Choi-Pen. Keine Vor-Schnitte nötig — die Haare werden direkt mit einem speziellen Stift implantiert. Höhere Dichte erzielbar, weniger Trauma."
            priceRange="3.290 – 4.590 €"
            grafts="2.000 – 5.000 Grafts"
            durationHours="6 – 9 h"
            highlight={true}
          />

          <MethodCard
            name="Saphir-FUE"
            tag="Premium"
            description="FUE mit Saphir-Klinge statt Stahl. Präzisere Einschnitte, weniger Gewebe-Trauma, schnellere Heilung. Empfohlen für hohe Dichte und sichtbare Bereiche (Haaransatz)."
            priceRange="4.290 – 5.990 €"
            grafts="2.000 – 5.000 Grafts"
            durationHours="6 – 10 h"
            highlight={false}
          />
        </section>

        {/* SPEZIAL-BEHANDLUNGEN */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{
            fontSize: 22, color: 'var(--gold2)', marginBottom: 14,
            borderBottom: '1px solid var(--border)', paddingBottom: 6,
          }}>
            Spezial-Behandlungen
          </h2>
          <div style={{ display: 'grid', gap: 10 }}>
            <SpecialRow name="Bart-Transplantation" price="1.890 – 2.890 €" />
            <SpecialRow name="Augenbrauen-Transplantation" price="1.690 €" />
            <SpecialRow name="Frauen-Haartransplantation" price="4.990 €" />
            <SpecialRow name="Schläfen-Auffüllung" price="1.990 €" />
            <SpecialRow name="Narben-Transplantation" price="1.990 €" />
            <SpecialRow name="PRP-Eigenblut-Therapie" price="290 € (Einzel) · 690 € (3er)" />
          </div>
        </section>

        {/* PROZESS */}
        <section style={{ marginBottom: 32 }}>
          <h2 className="cinzel" style={{
            fontSize: 22, color: 'var(--gold2)', marginBottom: 14,
            borderBottom: '1px solid var(--border)', paddingBottom: 6,
          }}>
            So läuft es ab
          </h2>
          <ProcessStep n={1} title="Kostenlose Erstberatung" body="Persönliches Gespräch (oder Video-Call) mit dem Chirurgen. Haaranalyse, Norwood-Klassifizierung, Methoden-Empfehlung." />
          <ProcessStep n={2} title="Behandlungsplan + Voruntersuchung" body="Detaillierter Plan: Graft-Anzahl, Methode, Termin, Preis. Blutbild + Aufklärung min. 24h vor OP." />
          <ProcessStep n={3} title="OP-Tag (4–10 Stunden)" body="Lokale Betäubung, du bleibst wach. Smartphone, Buch oder Netflix erlaubt. Mittagspause inklusive. Du fährst am gleichen Tag heim." />
          <ProcessStep n={4} title="Nachsorge + Foto-Dokumentation" body="Wöchentliche Kontrolle erste 4 Wochen. Foto-Dokumentation Monat 3, 6, 9, 12. Bei Komplikationen sofortige Hilfe vor Ort." />
        </section>

        {/* WARUM CHAIRMATCH */}
        <section style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(176,144,96,0.02))',
          border: '1px solid var(--gold)',
          borderRadius: 14, padding: 20, marginBottom: 32,
        }}>
          <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', margin: '0 0 14px' }}>
            Warum ChairMatch statt Türkei-Klinik?
          </h2>
          <div style={{ display: 'grid', gap: 10, fontSize: 13, color: 'var(--cream)' }}>
            <BulletRow text="Deutsche Approbation — operierender Arzt ist in DE zugelassen" />
            <BulletRow text="Deutsches Patientenrechte-Gesetz — bei Pfusch hast du Anspruch" />
            <BulletRow text="Deutschsprachige Nachsorge — du verstehst was passiert" />
            <BulletRow text="Keine Reisekosten + Hotel + Sprachbarriere" />
            <BulletRow text="Echte Bewertungen, nicht gekaufte Testimonials" />
            <BulletRow text="Transparente Preise vor der Buchung — keine Hidden-Costs" />
          </div>
        </section>

        {/* FAQ */}
        <FAQ items={FAQS} title="Häufige Fragen zur Haartransplantation" />

        {/* CTA FOOTER */}
        <section style={{
          background: 'var(--c2)', borderRadius: 14, padding: 20, marginTop: 32, textAlign: 'center',
          border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 14, color: 'var(--cream)', fontWeight: 600, margin: '0 0 6px' }}>
            Bereit für deine Beratung?
          </p>
          <p style={{ fontSize: 12, color: 'var(--stone)', margin: '0 0 14px' }}>
            Erstberatung ist kostenlos und unverbindlich. Du bekommst eine ehrliche Einschätzung
            ob eine Haartransplantation für dich sinnvoll ist.
          </p>
          <a
            href="mailto:beratung@chairmatch.de?subject=Haartransplantation%20-%20Kostenlose%20Erstberatung"
            className="bgold"
            style={{
              display: 'inline-block', padding: '12px 28px', fontSize: 13,
              textDecoration: 'none', borderRadius: 10, fontWeight: 700,
            }}
          >
            Kostenlose Beratung anfragen →
          </a>
        </section>

        <p style={{ fontSize: 10, color: 'var(--stone2)', textAlign: 'center', marginTop: 24 }}>
          Medizinische Inhalte sind allgemeine Informationen, keine Beratung im Einzelfall.
          Sprich mit einem approbierten Arzt für deine individuelle Situation.
        </p>
      </div>
    </div>
  )
}

function TrustChip({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{
      background: 'var(--c2)', borderRadius: 10, padding: '8px 10px',
      border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 11, color: 'var(--cream)', fontWeight: 600,
    }}>
      <span style={{ color: 'var(--green)' }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </div>
  )
}

function MethodCard({
  name, tag, description, priceRange, grafts, durationHours, highlight,
}: {
  name: string; tag: string; description: string;
  priceRange: string; grafts: string; durationHours: string; highlight: boolean
}) {
  return (
    <div style={{
      background: highlight
        ? 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(176,144,96,0.04))'
        : 'var(--c2)',
      border: highlight ? '2px solid var(--gold)' : '1px solid var(--border)',
      borderRadius: 12, padding: 16, marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h3 className="cinzel" style={{ fontSize: 17, color: 'var(--gold2)', margin: 0 }}>
          {name}
        </h3>
        <span style={{
          fontSize: 10, padding: '3px 8px', borderRadius: 6,
          background: highlight ? 'var(--gold)' : 'var(--c3)',
          color: highlight ? '#080706' : 'var(--stone)',
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
        }}>
          {tag}
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.6, margin: '0 0 12px' }}>
        {description}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 11 }}>
        <div>
          <p style={{ color: 'var(--stone2)', margin: 0, fontSize: 10 }}>Preis</p>
          <p style={{ color: 'var(--gold2)', fontWeight: 700, margin: '2px 0 0' }}>{priceRange}</p>
        </div>
        <div>
          <p style={{ color: 'var(--stone2)', margin: 0, fontSize: 10 }}>Grafts</p>
          <p style={{ color: 'var(--cream)', fontWeight: 600, margin: '2px 0 0' }}>{grafts}</p>
        </div>
        <div>
          <p style={{ color: 'var(--stone2)', margin: 0, fontSize: 10 }}>Dauer</p>
          <p style={{ color: 'var(--cream)', fontWeight: 600, margin: '2px 0 0' }}>{durationHours}</p>
        </div>
      </div>
    </div>
  )
}

function SpecialRow({ name, price }: { name: string; price: string }) {
  return (
    <div style={{
      background: 'var(--c2)', borderRadius: 10, padding: '10px 14px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      border: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--cream)', fontWeight: 500 }}>{name}</span>
      <span style={{ fontSize: 13, color: 'var(--gold2)', fontWeight: 700 }}>{price}</span>
    </div>
  )
}

function ProcessStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'var(--gold)', color: '#080706',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 14, flexShrink: 0,
      }}>
        {n}
      </div>
      <div>
        <p style={{ fontSize: 14, color: 'var(--cream)', fontWeight: 700, margin: '4px 0 4px' }}>
          {title}
        </p>
        <p style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.6, margin: 0 }}>
          {body}
        </p>
      </div>
    </div>
  )
}

function BulletRow({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ color: 'var(--green)', fontSize: 14, flexShrink: 0, marginTop: -1 }}>✓</span>
      <span style={{ flex: 1 }}>{text}</span>
    </div>
  )
}
