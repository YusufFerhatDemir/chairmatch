'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

/**
 * Freelancer-Rechner: berechnet realistisches Selbstständigen-Einkommen
 * basierend auf Tagesumsatz, Arbeitstagen, Stuhl-Miete und allen
 * Pflicht-Kosten.
 */
export function CalculatorClient() {
  const [tagesUmsatz, setTagesUmsatz] = useState(200)
  const [arbeitsTage, setArbeitsTage] = useState(18)
  const [stuhlMiete, setStuhlMiete] = useState(50)
  const [angestelltGehalt, setAngestelltGehalt] = useState(2100)
  const [krankenkasse, setKrankenkasse] = useState(450)

  const calc = useMemo(() => {
    // Selbstständig
    const monatsUmsatz = tagesUmsatz * arbeitsTage
    const monatsStuhlMiete = stuhlMiete * arbeitsTage
    const produktKosten = monatsUmsatz * 0.08  // ~8% für Produkte
    const sonstigeKosten = 250  // Werkzeuge, Versicherungen, Weiterbildung
    const gewinn = monatsUmsatz - monatsStuhlMiete - produktKosten - sonstigeKosten

    // Einkommensteuer (vereinfacht — Bundes-Durchschnitt 25%)
    const jahresGewinn = gewinn * 11  // 11 Monate Arbeit (1 Monat Urlaub/Krankheit)
    let einkommenSteuerSatz = 0
    if (jahresGewinn > 62000) einkommenSteuerSatz = 0.32
    else if (jahresGewinn > 30000) einkommenSteuerSatz = 0.27
    else if (jahresGewinn > 18000) einkommenSteuerSatz = 0.18
    else if (jahresGewinn > 11000) einkommenSteuerSatz = 0.12
    else einkommenSteuerSatz = 0.05

    const einkommenSteuer = gewinn * einkommenSteuerSatz

    // Gewerbesteuer (~12% ab 24500 Jahres-Gewinn)
    const gewerbesteuer = jahresGewinn > 24500
      ? Math.max(0, gewinn - 2042) * 0.12
      : 0

    const nettoSelbstaendig = gewinn - einkommenSteuer - gewerbesteuer - krankenkasse

    // Angestellt: vereinfachte Netto-Berechnung aus Brutto-Gehalt
    // Annahme: ~32% Abzüge (LSt + SV)
    const nettoAngestellt = angestelltGehalt * 0.68

    return {
      monatsUmsatz,
      monatsStuhlMiete,
      produktKosten,
      sonstigeKosten,
      gewinn,
      einkommenSteuer,
      gewerbesteuer,
      krankenkasse,
      nettoSelbstaendig,
      nettoAngestellt,
      differenz: nettoSelbstaendig - nettoAngestellt,
      jahresGewinn,
    }
  }, [tagesUmsatz, arbeitsTage, stuhlMiete, angestelltGehalt, krankenkasse])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Inputs */}
      <section style={{ background: 'var(--c2)', borderRadius: 14, padding: 18, border: '1px solid var(--border)' }}>
        <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', margin: '0 0 14px' }}>
          Deine Zahlen
        </h2>

        <div style={{ display: 'grid', gap: 14 }}>
          <Slider
            label="Durchschnitts-Tagesumsatz (€)"
            value={tagesUmsatz} setValue={setTagesUmsatz}
            min={50} max={500} step={10}
            help="Was du in 8h Arbeit an Kunden machst (vor Produkt-Kosten)."
          />
          <Slider
            label="Arbeitstage pro Monat"
            value={arbeitsTage} setValue={setArbeitsTage}
            min={5} max={26} step={1}
            help="Realistisch 16-20. Vollzeit 22, Teilzeit 8-12."
          />
          <Slider
            label="Stuhl-Miete (€/Tag)"
            value={stuhlMiete} setValue={setStuhlMiete}
            min={20} max={120} step={5}
            help="Bundesdurchschnitt 45 €. München/Frankfurt 65-90 €."
          />
          <Slider
            label="Aktuelles Brutto-Gehalt als Angestellte(r) (€)"
            value={angestelltGehalt} setValue={setAngestelltGehalt}
            min={1500} max={4500} step={50}
            help="Damit vergleichen wir."
          />
          <Slider
            label="Krankenkasse pro Monat (€)"
            value={krankenkasse} setValue={setKrankenkasse}
            min={250} max={800} step={10}
            help="Gesetzlich 14-15% (Min 420 €), Privat oft 280-450 €."
          />
        </div>
      </section>

      {/* Ergebnis */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(176,144,96,0.04))',
        borderRadius: 14, padding: 20, border: '2px solid var(--gold)',
      }}>
        <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', margin: '0 0 14px' }}>
          Dein Ergebnis
        </h2>

        <div style={{ display: 'grid', gap: 14 }}>
          <ResultRow label="Monats-Umsatz selbstständig" value={`${calc.monatsUmsatz.toFixed(0)} €`} pos />
          <ResultRow label="− Stuhl-Miete (gesamt)" value={`-${calc.monatsStuhlMiete.toFixed(0)} €`} />
          <ResultRow label="− Produkte (~8%)" value={`-${calc.produktKosten.toFixed(0)} €`} />
          <ResultRow label="− Versicherungen, Werkzeuge" value={`-${calc.sonstigeKosten.toFixed(0)} €`} />
          <ResultRow label="− Einkommensteuer" value={`-${calc.einkommenSteuer.toFixed(0)} €`} />
          <ResultRow label="− Gewerbesteuer" value={`-${calc.gewerbesteuer.toFixed(0)} €`} />
          <ResultRow label="− Krankenkasse" value={`-${calc.krankenkasse.toFixed(0)} €`} />

          <div style={{ borderTop: '1px solid var(--gold)', paddingTop: 12, marginTop: 4 }}>
            <ResultRow
              label="Netto selbstständig"
              value={`${calc.nettoSelbstaendig.toFixed(0)} €/Monat`}
              big highlight
            />
            <ResultRow
              label="Netto angestellt (Vergleich)"
              value={`${calc.nettoAngestellt.toFixed(0)} €/Monat`}
            />
            <ResultRow
              label={calc.differenz > 0 ? 'MEHR-Verdienst selbstständig' : 'MINDER-Verdienst selbstständig'}
              value={`${calc.differenz > 0 ? '+' : ''}${calc.differenz.toFixed(0)} €/Monat`}
              big
              highlight={calc.differenz > 0}
              warning={calc.differenz <= 0}
            />
          </div>
        </div>

        <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 16, lineHeight: 1.5 }}>
          ⚠️ Vereinfachte Rechnung. Echte Werte hängen von individuellen Faktoren ab (Steuerklasse,
          Bundesland, Familienstand, KK-Tarif). Für deine konkrete Situation: Steuerberater fragen.
        </p>
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: 20 }}>
        <p style={{ color: 'var(--cream)', fontSize: 14, marginBottom: 12 }}>
          Bereit für mehr Selbstbestimmung und mehr Einkommen?
        </p>
        <Link href="/explore" className="bgold" style={{ display: 'inline-block', padding: '12px 28px', textDecoration: 'none', fontSize: 14 }}>
          Stuhl-Plätze entdecken →
        </Link>
      </section>
    </div>
  )
}

function Slider({
  label, value, setValue, min, max, step, help,
}: {
  label: string; value: number; setValue: (v: number) => void
  min: number; max: number; step: number; help?: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--cream)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 14, color: 'var(--gold2)', fontWeight: 700 }}>{value}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--gold)' }}
      />
      {help && <p style={{ fontSize: 10, color: 'var(--stone2)', margin: '4px 0 0' }}>{help}</p>}
    </div>
  )
}

function ResultRow({
  label, value, pos, big, highlight, warning,
}: {
  label: string; value: string; pos?: boolean; big?: boolean; highlight?: boolean; warning?: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: big ? 14 : 12, color: 'var(--stone)', fontWeight: big ? 700 : 400 }}>
        {label}
      </span>
      <span style={{
        fontSize: big ? 18 : 13,
        fontWeight: big ? 800 : 600,
        color: warning ? 'var(--red)' : highlight ? 'var(--green)' : pos ? 'var(--gold2)' : 'var(--cream)',
      }}>
        {value}
      </span>
    </div>
  )
}
