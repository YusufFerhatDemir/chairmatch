'use client'

import { useState } from 'react'

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const card: React.CSSProperties = {
  background: 'var(--c1)',
  border: '1px solid rgba(196,168,106,0.18)',
  borderRadius: 16,
  padding: '16px 18px',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.2,
  color: 'var(--stone)',
  textTransform: 'uppercase',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
}

function Slider({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; unit: string
  onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>
        <span>{label}</span>
        <span className="cinzel" style={{ color: 'var(--gold2, #C4A86A)', fontSize: 15, fontWeight: 700, letterSpacing: 0 }}>
          {value}{unit}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#C4A86A' }}
      />
    </div>
  )
}

export default function BreakEvenClient() {
  const [tagesumsatz, setTagesumsatz] = useState(250)
  const [arbeitstage, setArbeitstage] = useState(16)
  const [tagesmiete, setTagesmiete] = useState(50)
  const [produktkosten, setProduktkosten] = useState(12)

  const monatsumsatz = tagesumsatz * arbeitstage
  const mietkosten = tagesmiete * arbeitstage
  const produkte = Math.round(monatsumsatz * (produktkosten / 100))

  // Drei Modelle im Vergleich (vor Steuern, vereinfacht)
  const nettoStuhlmiete = monatsumsatz - mietkosten - produkte
  const nettoAngestellt = Math.round(monatsumsatz * 0.35)
  const nettoEigenerSalon = monatsumsatz - 4000 - produkte

  const modelle = [
    { name: 'Stuhlmiete', wert: nettoStuhlmiete, hinweis: `${eur(monatsumsatz)} Umsatz − ${eur(mietkosten)} Miete − ${eur(produkte)} Produkte` },
    { name: 'Angestellt', wert: nettoAngestellt, hinweis: 'ca. 35 % deines Umsatzes als Bruttolohn' },
    { name: 'Eigener Salon', wert: nettoEigenerSalon, hinweis: `${eur(monatsumsatz)} Umsatz − ${eur(4000)} Fixkosten − ${eur(produkte)} Produkte` },
  ]
  const best = modelle.reduce((a, b) => (b.wert > a.wert ? b : a))
  const maxWert = Math.max(...modelle.map(m => m.wert), 1)
  const vorsprung = nettoStuhlmiete - nettoAngestellt

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720, margin: '0 auto' }}>
      <h2 className="cinzel" style={{ fontSize: 22, color: 'var(--gold2, #C4A86A)', margin: 0 }}>
        Lohnt sich Stuhlmiete für dich?
      </h2>
      <p style={{ color: 'var(--stone)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
        Stell deine Zahlen ein — der Rechner vergleicht live, was dir am Monatsende bleibt (vor Steuern).
      </p>

      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Slider label="Tagesumsatz" value={tagesumsatz} min={100} max={600} step={10} unit=" €" onChange={setTagesumsatz} />
        <Slider label="Arbeitstage pro Monat" value={arbeitstage} min={8} max={24} step={1} unit="" onChange={setArbeitstage} />
        <Slider label="Tagesmiete" value={tagesmiete} min={25} max={100} step={5} unit=" €" onChange={setTagesmiete} />
        <Slider label="Produktkosten" value={produktkosten} min={5} max={25} step={1} unit=" %" onChange={setProduktkosten} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <div style={card}>
          <p style={{ ...labelStyle, margin: 0 }}>Monatsumsatz</p>
          <p className="cinzel" style={{ fontSize: 22, color: 'var(--cream)', margin: '6px 0 0' }}>{eur(monatsumsatz)}</p>
        </div>
        <div style={card}>
          <p style={{ ...labelStyle, margin: 0 }}>Mietkosten / Monat</p>
          <p className="cinzel" style={{ fontSize: 22, color: 'var(--cream)', margin: '6px 0 0' }}>{eur(mietkosten)}</p>
        </div>
        <div style={{ ...card, border: '1px solid rgba(196,168,106,0.45)' }}>
          <p style={{ ...labelStyle, margin: 0 }}>Netto bei Stuhlmiete</p>
          <p className="cinzel" style={{ fontSize: 22, color: 'var(--gold2, #C4A86A)', margin: '6px 0 0' }}>{eur(nettoStuhlmiete)}</p>
        </div>
      </div>

      {/* Modell-Vergleich als horizontales Balkendiagramm */}
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {modelle.map(m => {
          const breite = Math.max(4, Math.round((Math.max(m.wert, 0) / maxWert) * 100))
          const istBest = m.name === best.name
          return (
            <div key={m.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: istBest ? 'var(--gold2, #C4A86A)' : 'var(--cream)', fontWeight: istBest ? 700 : 400 }}>
                  {m.name}{istBest ? ' ★' : ''}
                </span>
                <span className="cinzel" style={{ color: istBest ? 'var(--gold2, #C4A86A)' : 'var(--cream)' }}>{eur(m.wert)}</span>
              </div>
              <svg width="100%" height="14" style={{ display: 'block' }}>
                <rect x="0" y="0" width="100%" height="14" rx="7" fill="rgba(196,168,106,0.08)" />
                <rect
                  x="0" y="0" width={`${breite}%`} height="14" rx="7"
                  fill={istBest ? 'url(#be-gold)' : 'rgba(196,168,106,0.35)'}
                />
                <defs>
                  <linearGradient id="be-gold" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#BF953F" />
                    <stop offset="50%" stopColor="#FCF6BA" />
                    <stop offset="100%" stopColor="#B38728" />
                  </linearGradient>
                </defs>
              </svg>
              <p style={{ color: 'var(--stone)', fontSize: 11, margin: '4px 0 0' }}>{m.hinweis}</p>
            </div>
          )
        })}
      </div>

      <div style={{ ...card, background: 'rgba(196,168,106,0.07)', border: '1px solid rgba(196,168,106,0.3)' }}>
        <p style={{ color: 'var(--cream)', fontSize: 13, lineHeight: 1.55, margin: 0 }}>
          {vorsprung > 0 ? (
            <>Mit deinen Zahlen verdienst du mit Stuhlmiete ca. <strong style={{ color: 'var(--gold2, #C4A86A)' }}>{eur(vorsprung)}</strong> mehr pro Monat als angestellt.</>
          ) : (
            <>Mit deinen Zahlen liegt die Anstellung aktuell vorn — erhöhe Tagesumsatz oder senke die Tagesmiete, um den Break-Even zu sehen.</>
          )}
          {' '}Alle Werte vor Steuern und Sozialabgaben — als Selbstständiger trägst du Kranken- und Rentenversicherung selbst.
        </p>
      </div>
    </div>
  )
}
