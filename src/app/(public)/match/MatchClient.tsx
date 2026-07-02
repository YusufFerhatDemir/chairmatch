'use client'

import { useState } from 'react'
import Link from 'next/link'

type Beruf = 'friseur' | 'barber' | 'kosmetik' | 'lash' | 'nail' | 'massage' | 'arzt'
type Prioritaet = 'preis' | 'lage' | 'bewertung' | 'ausstattung'

interface MatchApiResult {
  id: string
  name: string | null
  type: string
  priceDayCents: number | null
  priceMonthCents: number | null
  salonName: string | null
  salonSlug: string | null
  city: string | null
  rating: number | null
  reviewCount: number | null
  verified: boolean
  score: number
  gruende: string[]
  preisEinschaetzung: 'unter_budget' | 'im_budget' | 'ueber_budget'
}

const BERUFE: Array<{ id: Beruf; label: string; icon: string }> = [
  { id: 'friseur', label: 'Friseur:in', icon: '✂️' },
  { id: 'barber', label: 'Barber', icon: '💈' },
  { id: 'kosmetik', label: 'Kosmetik', icon: '✨' },
  { id: 'lash', label: 'Lash & Brows', icon: '👁' },
  { id: 'nail', label: 'Nails', icon: '💅' },
  { id: 'massage', label: 'Massage', icon: '🤲' },
  { id: 'arzt', label: 'Ästhetik / Arzt', icon: '⚕️' },
]

const PRIOS: Array<{ id: Prioritaet; label: string }> = [
  { id: 'preis', label: 'Günstiger Preis' },
  { id: 'lage', label: 'Beste Lage' },
  { id: 'bewertung', label: 'Top-Bewertungen' },
  { id: 'ausstattung', label: 'Passende Ausstattung' },
]

const STAEDTE = [
  'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt am Main', 'Stuttgart', 'Düsseldorf',
  'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Hannover', 'Nürnberg', 'Duisburg',
  'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster', 'Mannheim', 'Karlsruhe', 'Augsburg',
  'Wiesbaden', 'Aachen', 'Kiel', 'Freiburg', 'Mainz', 'Erfurt', 'Rostock', 'Kassel', 'Potsdam',
]

const TYPE_LABELS: Record<string, string> = {
  stuhl: 'Stuhl', liege: 'Liege', raum: 'Raum', opraum: 'OP-Raum',
}

const eur = (cents: number) => new Intl.NumberFormat('de-DE', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
}).format(cents / 100)

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)',
  border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
}

function ScoreRing({ score }: { score: number }) {
  const r = 26
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" role="img" aria-label={`Match-Score ${score} von 100`}>
      <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(196,168,106,0.15)" strokeWidth="6" />
      <circle
        cx="34" cy="34" r={r} fill="none" stroke="url(#ring-gold)" strokeWidth="6"
        strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
        transform="rotate(-90 34 34)"
      />
      <defs>
        <linearGradient id="ring-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BF953F" />
          <stop offset="50%" stopColor="#FCF6BA" />
          <stop offset="100%" stopColor="#B38728" />
        </linearGradient>
      </defs>
      <text x="34" y="39" textAnchor="middle" fill="#FCF6BA" fontSize="16" fontWeight="700" fontFamily="inherit">
        {score}
      </text>
    </svg>
  )
}

export default function MatchClient() {
  const [step, setStep] = useState(1)
  const [beruf, setBeruf] = useState<Beruf | null>(null)
  const [stadt, setStadt] = useState('')
  const [budget, setBudget] = useState(50)
  const [arbeitstage, setArbeitstage] = useState(4)
  const [prios, setPrios] = useState<Prioritaet[]>([])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<MatchApiResult[] | null>(null)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [openReason, setOpenReason] = useState<string | null>(null)

  function togglePrio(p: Prioritaet) {
    setPrios(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]))
  }

  async function findMatches() {
    if (!beruf || stadt.trim().length < 2) return
    setLoading(true)
    setHinweis(null)
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beruf,
          stadt: stadt.trim(),
          budgetProTagCents: budget * 100,
          arbeitstageProWoche: arbeitstage,
          mietdauer: 'tageweise',
          prioritaeten: prios.length ? prios : undefined,
        }),
      })
      const json = await res.json()
      setResults(json.results ?? [])
      if (json.hinweis) setHinweis(json.hinweis)
    } catch {
      setResults([])
      setHinweis('Verbindungsfehler — bitte versuch es gleich nochmal.')
    } finally {
      setLoading(false)
      setStep(4)
    }
  }

  const stepDot = (n: number) => (
    <span
      key={n}
      style={{
        width: 26, height: 4, borderRadius: 2,
        background: step >= n ? 'linear-gradient(90deg,#BF953F,#FCF6BA,#B38728)' : 'rgba(196,168,106,0.15)',
      }}
    />
  )

  return (
    <section style={{ padding: '18px var(--pad) 40px', maxWidth: 720 }}>
      {step < 4 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>{[1, 2, 3].map(stepDot)}</div>
      )}

      {/* Schritt 1: Beruf */}
      {step === 1 && (
        <div>
          <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--cream)', marginBottom: 12 }}>
            Was machst du?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {BERUFE.map(b => {
              const active = beruf === b.id
              return (
                <button
                  key={b.id}
                  onClick={() => { setBeruf(b.id); setStep(2) }}
                  style={{
                    padding: '16px 10px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                    background: active ? 'rgba(196,168,106,0.14)' : 'var(--c1)',
                    border: active ? '1px solid rgba(196,168,106,0.55)' : '0.5px solid rgba(196,168,106,0.22)',
                    color: 'var(--cream)',
                  }}
                >
                  <span style={{ display: 'block', fontSize: 22 }}>{b.icon}</span>
                  <span style={{ display: 'block', fontSize: 13, marginTop: 6 }}>{b.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Schritt 2: Stadt + Budget + Arbeitstage */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--cream)', margin: 0 }}>
            Wo und mit welchem Budget?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label htmlFor="match-stadt" style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Stadt</label>
            <input
              id="match-stadt" list="match-staedte" value={stadt}
              onChange={(e) => setStadt(e.target.value)} placeholder="z. B. Berlin" style={inputStyle}
            />
            <datalist id="match-staedte">
              {STAEDTE.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
              <span>Budget pro Tag</span>
              <span className="cinzel" style={{ color: 'var(--gold2)', fontSize: 15, letterSpacing: 0 }}>{budget} €</span>
            </label>
            <input type="range" min={20} max={150} step={5} value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ accentColor: '#C4A86A' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
              <span>Arbeitstage pro Woche</span>
              <span className="cinzel" style={{ color: 'var(--gold2)', fontSize: 15, letterSpacing: 0 }}>{arbeitstage}</span>
            </label>
            <input type="range" min={1} max={6} step={1} value={arbeitstage} onChange={(e) => setArbeitstage(Number(e.target.value))} style={{ accentColor: '#C4A86A' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setStep(1)} className="boutline" style={{ padding: '12px 20px', borderRadius: 12, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Zurück
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={stadt.trim().length < 2}
              style={{
                flex: 1, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                background: 'linear-gradient(135deg,#BF953F,#FCF6BA 50%,#B38728)', color: '#1a1000', border: 'none',
                opacity: stadt.trim().length < 2 ? 0.5 : 1,
              }}
            >
              Weiter
            </button>
          </div>
        </div>
      )}

      {/* Schritt 3: Prioritäten */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--cream)', margin: 0 }}>
            Was ist dir am wichtigsten? <span style={{ color: 'var(--stone)', fontSize: 12 }}>(optional)</span>
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PRIOS.map(p => {
              const active = prios.includes(p.id)
              return (
                <button
                  key={p.id} onClick={() => togglePrio(p.id)}
                  style={{
                    padding: '10px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    background: active ? 'rgba(196,168,106,0.16)' : 'var(--c1)',
                    border: active ? '1px solid rgba(196,168,106,0.55)' : '0.5px solid rgba(196,168,106,0.22)',
                    color: active ? 'var(--gold2)' : 'var(--cream)',
                  }}
                >
                  {active ? '✓ ' : ''}{p.label}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setStep(2)} className="boutline" style={{ padding: '12px 20px', borderRadius: 12, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Zurück
            </button>
            <button
              onClick={findMatches} disabled={loading}
              style={{
                flex: 1, padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                background: 'linear-gradient(135deg,#BF953F,#FCF6BA 50%,#B38728)', color: '#1a1000', border: 'none',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Analysiere Inserate…' : 'Matches finden →'}
            </button>
          </div>
        </div>
      )}

      {/* Schritt 4: Ergebnisse */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--cream)', margin: 0 }}>
              {results && results.length > 0 ? `${results.length} Matches für dich` : 'Deine Matches'}
            </h2>
            <button
              onClick={() => { setStep(1); setResults(null) }}
              className="boutline"
              style={{ padding: '8px 14px', borderRadius: 18, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Neue Suche
            </button>
          </div>

          {hinweis && (
            <p style={{ color: 'var(--stone)', fontSize: 13, background: 'var(--c1)', borderRadius: 12, padding: '10px 14px', margin: 0 }}>
              {hinweis}
            </p>
          )}

          {loading && <p style={{ color: 'var(--stone)', fontSize: 14 }}>Analysiere Inserate…</p>}

          {!loading && results && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', background: 'var(--c1)', borderRadius: 16 }}>
              <p style={{ color: 'var(--cream)', fontSize: 14, marginBottom: 6 }}>
                Noch keine passenden Inserate in {stadt || 'deiner Stadt'}.
              </p>
              <p style={{ color: 'var(--stone)', fontSize: 13, marginBottom: 16 }}>
                Neue Plätze kommen laufend dazu — schau dir solange alle Inserate an.
              </p>
              <Link href="/rentals" className="bgold" style={{ display: 'inline-block', padding: '12px 24px', textDecoration: 'none', fontSize: 13, borderRadius: 12 }}>
                Alle Inserate ansehen
              </Link>
            </div>
          )}

          {!loading && results && results.map(r => (
            <div
              key={r.id}
              style={{
                background: 'var(--c1)', border: '1px solid rgba(196,168,106,0.18)', borderRadius: 16,
                padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
              }}
            >
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <ScoreRing score={r.score} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'var(--cream)', fontSize: 15, fontWeight: 600, margin: 0 }}>
                    {r.name || TYPE_LABELS[r.type] || 'Arbeitsplatz'}
                    {r.verified && <span style={{ color: 'var(--gold2)', fontSize: 12, marginLeft: 6 }}>✓ verifiziert</span>}
                  </p>
                  <p style={{ color: 'var(--stone)', fontSize: 12, margin: '3px 0 0' }}>
                    {TYPE_LABELS[r.type] || r.type}
                    {r.salonName ? ` · ${r.salonName}` : ''}
                    {r.city ? ` · ${r.city}` : ''}
                    {r.rating ? ` · ★ ${r.rating.toFixed(1)}` : ''}
                  </p>
                  <p className="cinzel" style={{ color: 'var(--gold2)', fontSize: 16, margin: '6px 0 0' }}>
                    {r.priceDayCents ? `${eur(r.priceDayCents)} / Tag` : r.priceMonthCents ? `${eur(r.priceMonthCents)} / Monat` : 'Preis auf Anfrage'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setOpenReason(openReason === r.id ? null : r.id)}
                style={{ background: 'none', border: 'none', color: 'var(--stone)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: 0 }}
              >
                {openReason === r.id ? '▾' : '▸'} Warum dieser Match?
              </button>
              {openReason === r.id && (
                <ul style={{ margin: 0, paddingLeft: 4, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {r.gruende.map((g, i) => (
                    <li key={i} style={{ color: g.startsWith('△') ? 'var(--stone)' : 'var(--cream)', fontSize: 13 }}>{g}</li>
                  ))}
                </ul>
              )}

              <Link
                href={`/inserat/${r.id}`}
                className="bgold"
                style={{ display: 'block', textAlign: 'center', padding: '11px 0', textDecoration: 'none', fontSize: 13, borderRadius: 12 }}
              >
                Details ansehen →
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
