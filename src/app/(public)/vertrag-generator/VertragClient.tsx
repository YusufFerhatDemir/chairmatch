'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  buildVertrag,
  buildRubrum,
  formatEuro,
  typLabel,
  vertragsTitel,
  type Abrechnungsart,
  type Laufzeit,
  type ObjektTyp,
  type VertragDaten,
} from '@/lib/vertrag/vertrag-template'

// ── Formular-State ───────────────────────────────────────────────────────

interface FormState {
  // Schritt 1: Parteien
  vermieterName: string
  vermieterFirma: string
  vermieterStrasse: string
  vermieterPlz: string
  vermieterOrt: string
  mieterName: string
  mieterGewerbe: string
  mieterStrasse: string
  mieterPlz: string
  mieterOrt: string
  // Schritt 2: Objekt & Konditionen
  salonName: string
  salonAdresse: string
  typ: ObjektTyp
  bezeichnung: string
  abrechnungsart: Abrechnungsart
  preisEuro: string
  nebenkostenInklusive: boolean
  kautionAktiv: boolean
  kaution: string
  mietbeginn: string
  laufzeit: Laufzeit
  mietende: string
  kuendigungsfristWochen: string
  arbeitstage: string[]
  // Schritt 3: Zusatzklauseln
  eigeneProdukte: boolean
  kundenstammKlausel: boolean
  konkurrenzschutz: boolean
  haftpflichtNachweis: boolean
  schluessel: boolean
  reinigungInklusive: boolean
}

const STORAGE_KEY = 'chairmatch_vertrag_generator_v1'
const WOCHENTAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as const

function heuteIso(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function defaultState(): FormState {
  return {
    vermieterName: '', vermieterFirma: '', vermieterStrasse: '', vermieterPlz: '', vermieterOrt: '',
    mieterName: '', mieterGewerbe: '', mieterStrasse: '', mieterPlz: '', mieterOrt: '',
    salonName: '', salonAdresse: '', typ: 'stuhl', bezeichnung: '',
    abrechnungsart: 'tag', preisEuro: '50', nebenkostenInklusive: true,
    kautionAktiv: false, kaution: '',
    mietbeginn: heuteIso(), laufzeit: 'unbefristet', mietende: '',
    kuendigungsfristWochen: '2', arbeitstage: [],
    eigeneProdukte: true, kundenstammKlausel: true, konkurrenzschutz: false,
    haftpflichtNachweis: true, schluessel: false, reinigungInklusive: true,
  }
}

function ladeState(): FormState {
  const basis = defaultState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return basis
    const parsed = JSON.parse(raw) as Partial<FormState>
    if (typeof parsed !== 'object' || parsed === null) return basis
    const merged: FormState = { ...basis, ...parsed }
    // Nur bekannte Enum-Werte akzeptieren
    if (!['stuhl', 'kabine', 'raum', 'opraum'].includes(merged.typ)) merged.typ = 'stuhl'
    if (!['tag', 'woche', 'monat'].includes(merged.abrechnungsart)) merged.abrechnungsart = 'tag'
    if (!['unbefristet', 'befristet'].includes(merged.laufzeit)) merged.laufzeit = 'unbefristet'
    if (!Array.isArray(merged.arbeitstage)) merged.arbeitstage = []
    return merged
  } catch {
    return basis
  }
}

function zuVertragDaten(s: FormState): VertragDaten {
  const preis = Number.parseFloat(s.preisEuro.replace(',', '.'))
  const kaution = Number.parseFloat(s.kaution.replace(',', '.'))
  const frist = Number.parseInt(s.kuendigungsfristWochen, 10)
  return {
    vermieter: {
      name: s.vermieterName,
      firma: s.vermieterFirma.trim() || undefined,
      strasse: s.vermieterStrasse,
      plz: s.vermieterPlz,
      ort: s.vermieterOrt,
    },
    mieter: {
      name: s.mieterName,
      gewerbe: s.mieterGewerbe.trim() || undefined,
      strasse: s.mieterStrasse,
      plz: s.mieterPlz,
      ort: s.mieterOrt,
    },
    objekt: {
      salonName: s.salonName,
      adresse: s.salonAdresse,
      typ: s.typ,
      bezeichnung: s.bezeichnung,
    },
    konditionen: {
      abrechnungsart: s.abrechnungsart,
      preisEuro: Number.isFinite(preis) ? preis : 0,
      nebenkostenInklusive: s.nebenkostenInklusive,
      kaution: s.kautionAktiv && Number.isFinite(kaution) && kaution > 0 ? kaution : undefined,
      mietbeginn: s.mietbeginn,
      laufzeit: s.laufzeit,
      mietende: s.laufzeit === 'befristet' ? s.mietende || undefined : undefined,
      kuendigungsfristWochen: Number.isFinite(frist) && frist > 0 ? frist : 2,
      arbeitstage: s.arbeitstage.length > 0 ? s.arbeitstage : undefined,
    },
    extras: {
      eigeneProdukte: s.eigeneProdukte,
      kundenstammKlausel: s.kundenstammKlausel,
      konkurrenzschutz: s.konkurrenzschutz,
      haftpflichtNachweis: s.haftpflichtNachweis,
      schluessel: s.schluessel,
      reinigungInklusive: s.reinigungInklusive,
    },
  }
}

// ── UI-Bausteine ─────────────────────────────────────────────────────────

const labelStyle: CSSProperties = {
  display: 'block',
  color: 'var(--stone)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  marginBottom: 4,
}

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--c2)',
  border: '1px solid rgba(245, 245, 247, 0.12)',
  borderRadius: 8,
  padding: '10px 12px',
  color: 'var(--cream)',
  fontSize: 13,
  outline: 'none',
}

function Feld(props: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  optional?: boolean
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>
        {props.label}
        {props.optional ? <span style={{ textTransform: 'none', fontWeight: 400 }}> (optional)</span> : null}
      </span>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        placeholder={props.placeholder}
        onChange={e => props.onChange(e.target.value)}
        style={inputStyle}
      />
    </label>
  )
}

function Toggle(props: { label: string; beschreibung: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      onClick={() => props.onChange(!props.checked)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        background: 'var(--c2)',
        border: `1px solid ${props.checked ? 'rgba(196, 168, 106, 0.5)' : 'rgba(245, 245, 247, 0.10)'}`,
        borderRadius: 10,
        padding: '12px 14px',
        cursor: 'pointer',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          marginTop: 2,
          width: 36,
          height: 20,
          borderRadius: 10,
          background: props.checked
            ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)'
            : 'rgba(245, 245, 247, 0.15)',
          position: 'relative',
          transition: 'background 0.15s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: props.checked ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: props.checked ? '#0B0B0F' : 'var(--cream)',
            transition: 'left 0.15s ease',
          }}
        />
      </span>
      <span>
        <span style={{ display: 'block', color: 'var(--cream)', fontSize: 13, fontWeight: 700 }}>{props.label}</span>
        <span style={{ display: 'block', color: 'var(--stone)', fontSize: 11, marginTop: 2, lineHeight: 1.45 }}>
          {props.beschreibung}
        </span>
      </span>
    </button>
  )
}

function OptionsReihe<T extends string>(props: {
  label: string
  optionen: Array<{ wert: T; label: string }>
  wert: T
  onChange: (v: T) => void
}) {
  return (
    <div>
      <span style={labelStyle}>{props.label}</span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {props.optionen.map(o => {
          const aktiv = o.wert === props.wert
          return (
            <button
              key={o.wert}
              type="button"
              onClick={() => props.onChange(o.wert)}
              style={{
                padding: '8px 14px',
                fontSize: 12,
                borderRadius: 20,
                cursor: 'pointer',
                border: `1px solid ${aktiv ? '#C4A86A' : 'rgba(245, 245, 247, 0.15)'}`,
                background: aktiv ? 'rgba(196, 168, 106, 0.14)' : 'transparent',
                color: aktiv ? '#C4A86A' : 'var(--stone)',
                fontWeight: aktiv ? 700 : 400,
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SchrittKarte(props: { titel: string; children: ReactNode }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 className="cinzel" style={{ fontSize: 14, color: 'var(--gold2)', marginBottom: 12 }}>{props.titel}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{props.children}</div>
    </div>
  )
}

// ── Vertragsblatt (weiße Papier-Optik, druckoptimiert) ───────────────────

function VertragSheet(props: { daten: VertragDaten; kompakt?: boolean; printId?: string }) {
  const { daten, kompakt } = props
  const abschnitte = useMemo(() => buildVertrag(daten), [daten])
  const rubrum = useMemo(() => buildRubrum(daten), [daten])
  const basisSize = kompakt ? 10.5 : 13.5

  const sheetStyle: CSSProperties = {
    background: '#fdfcf8',
    color: '#1a1a1a',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: basisSize,
    lineHeight: 1.6,
    padding: kompakt ? '20px 22px' : '36px 34px',
    borderRadius: kompakt ? 8 : 4,
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
  }

  return (
    <div id={props.printId} data-vertrag-sheet="true" style={sheetStyle}>
      {/* Titel */}
      <div style={{ textAlign: 'center', marginBottom: kompakt ? 14 : 26 }}>
        <div style={{ fontSize: basisSize * 1.5, fontWeight: 700, letterSpacing: '0.02em' }}>
          {vertragsTitel(daten.objekt.typ)}
        </div>
        <div style={{ fontSize: basisSize * 0.85, color: '#555', marginTop: 4 }}>
          Mietvertrag &uuml;ber einen {typLabel(daten.objekt.typ)} in einem Salonbetrieb
        </div>
      </div>

      {/* Rubrum */}
      <div style={{ marginBottom: kompakt ? 12 : 22 }}>
        <p style={{ margin: '0 0 8px' }}>Zwischen</p>
        <div style={{ margin: '0 0 8px', paddingLeft: kompakt ? 12 : 24 }}>
          {rubrum.vermieter.zeilen.map((z, i) => (
            <div key={i} style={{ fontWeight: i === 0 ? 700 : 400 }}>{z}</div>
          ))}
          <div style={{ fontStyle: 'italic', color: '#555' }}>&mdash; {rubrum.vermieter.rolle} &mdash;</div>
        </div>
        <p style={{ margin: '0 0 8px' }}>und</p>
        <div style={{ margin: '0 0 8px', paddingLeft: kompakt ? 12 : 24 }}>
          {rubrum.mieter.zeilen.map((z, i) => (
            <div key={i} style={{ fontWeight: i === 0 ? 700 : 400 }}>{z}</div>
          ))}
          <div style={{ fontStyle: 'italic', color: '#555' }}>&mdash; {rubrum.mieter.rolle} &mdash;</div>
        </div>
        <p style={{ margin: 0 }}>wird folgender Mietvertrag geschlossen:</p>
      </div>

      {/* Paragraphen */}
      {abschnitte.map(a => (
        <section key={a.titel} style={{ marginBottom: kompakt ? 10 : 18, breakInside: 'avoid' as const }}>
          <h4
            style={{
              fontSize: basisSize * 1.05,
              fontWeight: 700,
              margin: `0 0 ${kompakt ? 4 : 8}px`,
              borderBottom: '1px solid #d8d2c2',
              paddingBottom: 3,
            }}
          >
            {a.titel}
          </h4>
          {a.absaetze.map((abs, i) => (
            <p key={i} style={{ margin: `0 0 ${kompakt ? 4 : 8}px`, textAlign: 'justify' }}>
              <span style={{ color: '#777', marginRight: 6 }}>({i + 1})</span>
              {abs}
            </p>
          ))}
        </section>
      ))}

      {/* Unterschriften */}
      <div style={{ marginTop: kompakt ? 18 : 44, breakInside: 'avoid' as const }}>
        <div style={{ display: 'flex', gap: kompakt ? 16 : 32 }}>
          {(['Vermieter', 'Mieter'] as const).map(rolle => (
            <div key={rolle} style={{ flex: 1 }}>
              <div style={{ borderBottom: '1px solid #1a1a1a', height: kompakt ? 24 : 44 }} />
              <div style={{ fontSize: basisSize * 0.8, color: '#555', marginTop: 4 }}>Ort, Datum</div>
              <div style={{ borderBottom: '1px solid #1a1a1a', height: kompakt ? 24 : 44, marginTop: kompakt ? 10 : 18 }} />
              <div style={{ fontSize: basisSize * 0.8, color: '#555', marginTop: 4 }}>
                Unterschrift {rolle}
                {rolle === 'Vermieter'
                  ? ` (${(daten.vermieter.name || '').trim() || '________________'})`
                  : ` (${(daten.mieter.name || '').trim() || '________________'})`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fußzeile */}
      <div
        style={{
          marginTop: kompakt ? 14 : 28,
          paddingTop: 8,
          borderTop: '1px solid #d8d2c2',
          fontSize: basisSize * 0.75,
          color: '#888',
          textAlign: 'center',
        }}
      >
        Erstellt mit ChairMatch &mdash; chairmatch.de &middot; Dieses Muster ersetzt keine Rechtsberatung.
      </div>
    </div>
  )
}

// ── Hauptkomponente ──────────────────────────────────────────────────────

const SCHRITTE = ['Parteien', 'Objekt & Konditionen', 'Zusatzklauseln'] as const

export default function VertragClient() {
  const [state, setState] = useState<FormState>(defaultState)
  const [geladen, setGeladen] = useState(false)
  const [schritt, setSchritt] = useState<number>(0)
  const [modus, setModus] = useState<'formular' | 'vertrag'>('formular')

  // Formularstand aus localStorage wiederherstellen (nur client-seitig)
  useEffect(() => {
    setState(ladeState())
    setGeladen(true)
  }, [])

  // Jede Änderung persistieren, damit nichts verloren geht
  useEffect(() => {
    if (!geladen) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Speicher voll / privater Modus — Formular funktioniert trotzdem
    }
  }, [state, geladen])

  const set = <K extends keyof FormState>(key: K, wert: FormState[K]) =>
    setState(prev => ({ ...prev, [key]: wert }))

  const daten = useMemo(() => zuVertragDaten(state), [state])

  const toggleArbeitstag = (tag: string) =>
    setState(prev => ({
      ...prev,
      arbeitstage: prev.arbeitstage.includes(tag)
        ? prev.arbeitstage.filter(t => t !== tag)
        : [...WOCHENTAGE.filter(w => prev.arbeitstage.includes(w) || w === tag)],
    }))

  const zurücksetzen = () => {
    if (!window.confirm('Alle Eingaben zurücksetzen?')) return
    setState(defaultState())
    setSchritt(0)
    try { window.localStorage.removeItem(STORAGE_KEY) } catch { /* ignorieren */ }
  }

  const preisEinheit = state.abrechnungsart === 'tag' ? 'Tag' : state.abrechnungsart === 'woche' ? 'Woche' : 'Monat'

  // ── Vertragsansicht ──
  if (modus === 'vertrag') {
    return (
      <div style={{ padding: '20px var(--pad) 0' }}>
        <style>{`
          @media print {
            @page { size: A4; margin: 16mm; }
            body * { visibility: hidden !important; }
            #vertrag-print-sheet, #vertrag-print-sheet * { visibility: visible !important; }
            #vertrag-print-sheet {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              background: #ffffff !important;
              font-size: 11pt !important;
            }
            .no-print { display: none !important; }
          }
        `}</style>

        <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className="bgold"
            onClick={() => window.print()}
            style={{ flex: 1, padding: '12px 0', fontSize: 13, cursor: 'pointer' }}
          >
            Drucken / Als PDF speichern
          </button>
          <button
            type="button"
            className="boutline"
            onClick={() => setModus('formular')}
            style={{ flex: 1, padding: '12px 0', fontSize: 13, cursor: 'pointer' }}
          >
            Zur&uuml;ck zum Formular
          </button>
        </div>
        <p className="no-print" style={{ color: 'var(--stone)', fontSize: 11, marginBottom: 12, lineHeight: 1.5 }}>
          Tipp: Im Druckdialog &bdquo;Als PDF speichern&ldquo; w&auml;hlen, um den Vertrag als Datei abzulegen.
          Anschlie&szlig;end von beiden Parteien unterschreiben lassen.
        </p>

        <VertragSheet daten={daten} printId="vertrag-print-sheet" />

        <div className="no-print" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="boutline"
            onClick={() => setModus('formular')}
            style={{ width: '100%', padding: '12px 0', fontSize: 13, cursor: 'pointer' }}
          >
            Zur&uuml;ck zum Formular
          </button>
        </div>
      </div>
    )
  }

  // ── Formularansicht ──
  return (
    <div className="no-print" style={{ padding: '20px var(--pad) 0' }}>
      {/* Schritt-Anzeige */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {SCHRITTE.map((s, i) => {
          const aktiv = i === schritt
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSchritt(i)}
              style={{
                flex: 1,
                padding: '8px 4px',
                fontSize: 10,
                fontWeight: aktiv ? 700 : 400,
                borderRadius: 8,
                border: `1px solid ${aktiv ? '#C4A86A' : 'rgba(245, 245, 247, 0.12)'}`,
                background: aktiv ? 'rgba(196, 168, 106, 0.12)' : 'var(--c1)',
                color: aktiv ? '#C4A86A' : 'var(--stone)',
                cursor: 'pointer',
              }}
            >
              {i + 1}. {s}
            </button>
          )
        })}
      </div>

      {/* Schritt 1: Parteien */}
      {schritt === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SchrittKarte titel="Vermieter (Salon-Inhaber)">
            <Feld label="Name" value={state.vermieterName} onChange={v => set('vermieterName', v)} placeholder="z. B. Maria Schneider" />
            <Feld label="Firma" optional value={state.vermieterFirma} onChange={v => set('vermieterFirma', v)} placeholder="z. B. Salon Schneider GmbH" />
            <Feld label="Straße & Hausnummer" value={state.vermieterStrasse} onChange={v => set('vermieterStrasse', v)} placeholder="z. B. Hauptstraße 12" />
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: '0 0 100px' }}>
                <Feld label="PLZ" value={state.vermieterPlz} onChange={v => set('vermieterPlz', v)} placeholder="10115" />
              </div>
              <div style={{ flex: 1 }}>
                <Feld label="Ort" value={state.vermieterOrt} onChange={v => set('vermieterOrt', v)} placeholder="Berlin" />
              </div>
            </div>
          </SchrittKarte>

          <SchrittKarte titel="Mieter (selbstständige/r Beauty-Profi)">
            <Feld label="Name" value={state.mieterName} onChange={v => set('mieterName', v)} placeholder="z. B. Ayşe Yılmaz" />
            <Feld label="Gewerbe / Tätigkeit" optional value={state.mieterGewerbe} onChange={v => set('mieterGewerbe', v)} placeholder="z. B. Friseurmeisterin, Lash-Stylistin" />
            <Feld label="Straße & Hausnummer" value={state.mieterStrasse} onChange={v => set('mieterStrasse', v)} placeholder="z. B. Gartenweg 3" />
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: '0 0 100px' }}>
                <Feld label="PLZ" value={state.mieterPlz} onChange={v => set('mieterPlz', v)} placeholder="50667" />
              </div>
              <div style={{ flex: 1 }}>
                <Feld label="Ort" value={state.mieterOrt} onChange={v => set('mieterOrt', v)} placeholder="Köln" />
              </div>
            </div>
          </SchrittKarte>

          <button type="button" className="bgold" onClick={() => setSchritt(1)} style={{ padding: '12px 0', fontSize: 13, cursor: 'pointer' }}>
            Weiter: Objekt &amp; Konditionen
          </button>
        </div>
      )}

      {/* Schritt 2: Objekt & Konditionen */}
      {schritt === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SchrittKarte titel="Mietobjekt">
            <Feld label="Salon-Name" value={state.salonName} onChange={v => set('salonName', v)} placeholder="z. B. Golden Scissors" />
            <Feld label="Adresse des Salons" value={state.salonAdresse} onChange={v => set('salonAdresse', v)} placeholder="z. B. Hauptstraße 12, 10115 Berlin" />
            <OptionsReihe
              label="Art des Platzes"
              wert={state.typ}
              onChange={v => set('typ', v)}
              optionen={[
                { wert: 'stuhl', label: 'Stuhl' },
                { wert: 'kabine', label: 'Kabine' },
                { wert: 'raum', label: 'Raum' },
                { wert: 'opraum', label: 'OP-Raum' },
              ]}
            />
            <Feld label="Bezeichnung im Salon" value={state.bezeichnung} onChange={v => set('bezeichnung', v)} placeholder="z. B. Platz 3 am Fenster" />
          </SchrittKarte>

          <SchrittKarte titel="Miete & Laufzeit">
            <OptionsReihe
              label="Abrechnungsart"
              wert={state.abrechnungsart}
              onChange={v => set('abrechnungsart', v)}
              optionen={[
                { wert: 'tag', label: 'pro Tag' },
                { wert: 'woche', label: 'pro Woche' },
                { wert: 'monat', label: 'pro Monat' },
              ]}
            />
            <Feld
              label={`Miete in Euro (pro ${preisEinheit})`}
              type="number"
              value={state.preisEuro}
              onChange={v => set('preisEuro', v)}
              placeholder="50"
            />
            <Toggle
              label="Nebenkosten inklusive"
              beschreibung="Strom, Wasser, WLAN & Müll sind mit der Miete abgegolten."
              checked={state.nebenkostenInklusive}
              onChange={v => set('nebenkostenInklusive', v)}
            />
            <Toggle
              label="Kaution vereinbaren"
              beschreibung="Sicherheit für den Vermieter, wird nach Vertragsende abgerechnet."
              checked={state.kautionAktiv}
              onChange={v => set('kautionAktiv', v)}
            />
            {state.kautionAktiv && (
              <Feld label="Kaution in Euro" type="number" value={state.kaution} onChange={v => set('kaution', v)} placeholder="z. B. 500" />
            )}
            <Feld label="Mietbeginn" type="date" value={state.mietbeginn} onChange={v => set('mietbeginn', v)} />
            <OptionsReihe
              label="Laufzeit"
              wert={state.laufzeit}
              onChange={v => set('laufzeit', v)}
              optionen={[
                { wert: 'unbefristet', label: 'Unbefristet' },
                { wert: 'befristet', label: 'Befristet' },
              ]}
            />
            {state.laufzeit === 'befristet' && (
              <Feld label="Mietende" type="date" value={state.mietende} onChange={v => set('mietende', v)} />
            )}
            <Feld
              label="Kündigungsfrist in Wochen"
              type="number"
              value={state.kuendigungsfristWochen}
              onChange={v => set('kuendigungsfristWochen', v)}
              placeholder="2"
            />
            {state.abrechnungsart !== 'monat' && (
              <div>
                <span style={labelStyle}>Feste Arbeitstage <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span></span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {WOCHENTAGE.map(tag => {
                    const aktiv = state.arbeitstage.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleArbeitstag(tag)}
                        style={{
                          padding: '6px 10px',
                          fontSize: 11,
                          borderRadius: 16,
                          cursor: 'pointer',
                          border: `1px solid ${aktiv ? '#C4A86A' : 'rgba(245, 245, 247, 0.15)'}`,
                          background: aktiv ? 'rgba(196, 168, 106, 0.14)' : 'transparent',
                          color: aktiv ? '#C4A86A' : 'var(--stone)',
                          fontWeight: aktiv ? 700 : 400,
                        }}
                      >
                        {tag.slice(0, 2)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </SchrittKarte>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="boutline" onClick={() => setSchritt(0)} style={{ flex: 1, padding: '12px 0', fontSize: 13, cursor: 'pointer' }}>
              Zur&uuml;ck
            </button>
            <button type="button" className="bgold" onClick={() => setSchritt(2)} style={{ flex: 1, padding: '12px 0', fontSize: 13, cursor: 'pointer' }}>
              Weiter: Zusatzklauseln
            </button>
          </div>
        </div>
      )}

      {/* Schritt 3: Zusatzklauseln */}
      {schritt === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SchrittKarte titel="Zusatzklauseln">
            <Toggle
              label="Eigene Produkte des Mieters"
              beschreibung="Der Mieter arbeitet mit eigenen Produkten und Werkzeugen — wichtig für die Selbstständigkeit."
              checked={state.eigeneProdukte}
              onChange={v => set('eigeneProdukte', v)}
            />
            <Toggle
              label="Kundenstamm-Klausel"
              beschreibung="Kunden und Kundendaten bleiben ausdrücklich beim Mieter — auch nach Vertragsende."
              checked={state.kundenstammKlausel}
              onChange={v => set('kundenstammKlausel', v)}
            />
            <Toggle
              label="Konkurrenzschutz"
              beschreibung="Der Vermieter vermietet keinen weiteren Platz an direkte Wettbewerber des Mieters."
              checked={state.konkurrenzschutz}
              onChange={v => set('konkurrenzschutz', v)}
            />
            <Toggle
              label="Berufshaftpflicht-Nachweis"
              beschreibung="Der Mieter weist eine Berufshaftpflichtversicherung nach — schützt beide Seiten."
              checked={state.haftpflichtNachweis}
              onChange={v => set('haftpflichtNachweis', v)}
            />
            <Toggle
              label="Schlüsselüberlassung"
              beschreibung="Der Mieter erhält einen eigenen Schlüssel bzw. Zugang zum Salon."
              checked={state.schluessel}
              onChange={v => set('schluessel', v)}
            />
            <Toggle
              label="Reinigung inklusive"
              beschreibung="Die Grundreinigung übernimmt der Vermieter; sonst reinigt der Mieter selbst."
              checked={state.reinigungInklusive}
              onChange={v => set('reinigungInklusive', v)}
            />
          </SchrittKarte>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="boutline" onClick={() => setSchritt(1)} style={{ flex: 1, padding: '12px 0', fontSize: 13, cursor: 'pointer' }}>
              Zur&uuml;ck
            </button>
            <button type="button" className="bgold" onClick={() => setModus('vertrag')} style={{ flex: 2, padding: '12px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Vertrag erstellen
            </button>
          </div>

          <button
            type="button"
            onClick={zurücksetzen}
            style={{ background: 'none', border: 'none', color: 'var(--stone2)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 4 }}
          >
            Alle Eingaben zur&uuml;cksetzen
          </button>
        </div>
      )}

      {/* Live-Vorschau */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 className="cinzel" style={{ fontSize: 13, color: 'var(--gold2)' }}>Live-Vorschau</h3>
          <span style={{ color: 'var(--stone2)', fontSize: 10 }}>
            {formatEuro(daten.konditionen.preisEuro)} / {preisEinheit} &middot; aktualisiert sich beim Tippen
          </span>
        </div>
        <div
          style={{
            maxHeight: 420,
            overflowY: 'auto',
            borderRadius: 10,
            border: '1px solid rgba(245, 245, 247, 0.10)',
          }}
        >
          <VertragSheet daten={daten} kompakt />
        </div>
      </div>
    </div>
  )
}
