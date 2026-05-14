'use client'

/**
 * /register/anbieter — SEO-/Marketing-Deep-Link für Provider-Akquise.
 *
 * EINER VON DREI Provider-Registrierungs-UIs (siehe docs/adr/0001).
 * Backend (identisch): /api/register-provider
 * Schwesternfiles:
 *   - src/components/OnboardingGate.tsx (First-Visit-Overlay)
 *   - src/components/onboarding/ProviderSetupWizard.tsx (Reusable Multi-Step)
 *
 * Wenn du hier Form-Felder änderst, prüfe ob auch die anderen zwei UIs +
 * der Backend-Endpoint angepasst werden müssen.
 */

import { useState } from 'react'
import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'

const STEP_NAMES = ['Persönliche Daten', 'Geschäftsdaten', 'Services & Vermietung', 'Bestätigung']
const CATEGORIES = ['Barbershop', 'Friseur', 'Kosmetik', 'Ästhetik', 'Nail & Lash', 'Massage', 'OP-Raum'] as const

/**
 * Dynamische Labels für Schritt 3 — passend zur Kategorie.
 * Damit ein Ästhetik-Arzt nicht "Stuhl vermieten" liest, sondern "Praxisraum vermieten".
 */
function getRentalLabels(kat: string) {
  switch (kat) {
    case 'Ästhetik':
      return {
        title: 'PRAXISRAUM / BEHANDLUNGSLIEGE VERMIETEN',
        subtitle: 'Freie Behandlungsräume oder Liegen tageweise vermieten. 0 % Provision.',
        toggle: 'Ja, ich vermiete Räume / Liegen',
        sub: 'Zusatzeinnahmen · ca. 80–150 €/Tag',
        priceLabel: 'Preis/Tag (€)',
        placeholder: '95',
      }
    case 'Massage':
      return {
        title: 'MASSAGELIEGE / RAUM VERMIETEN',
        subtitle: 'Freie Liegen oder Behandlungsräume tageweise vermieten. 0 % Provision.',
        toggle: 'Ja, ich vermiete Liegen',
        sub: 'Zusatzeinnahmen · ca. 40–60 €/Tag',
        priceLabel: 'Preis/Tag (€)',
        placeholder: '50',
      }
    case 'Kosmetik':
    case 'Nail & Lash':
      return {
        title: 'BEHANDLUNGSPLATZ / KABINE VERMIETEN',
        subtitle: 'Freie Kabinen oder Arbeitsplätze tageweise vermieten. 0 % Provision.',
        toggle: 'Ja, ich vermiete Behandlungsplätze',
        sub: 'Zusatzeinnahmen · ca. 45–75 €/Tag',
        priceLabel: 'Preis/Tag (€)',
        placeholder: '55',
      }
    case 'OP-Raum':
      return {
        title: 'OP-RAUM VERMIETEN',
        subtitle: 'Premium-Kategorie. Tagesweise Vermietung an Ärzte / Ästhetik-Praxen. Hygiene- und Approbations-Check Pflicht.',
        toggle: 'Ja, ich vermiete OP-Räume',
        sub: 'Zusatzeinnahmen · ca. 250–500 €/Tag',
        priceLabel: 'Preis/Tag (€)',
        placeholder: '350',
      }
    case 'Barbershop':
    case 'Friseur':
    default:
      return {
        title: 'STUHL / KABINE VERMIETEN',
        subtitle: 'Freie Stühle tageweise vermieten. 0 % Provision.',
        toggle: 'Ja, ich vermiete Stühle',
        sub: 'Zusatzeinnahmen · ca. 35–55 €/Tag',
        priceLabel: 'Preis/Tag (€)',
        placeholder: '45',
      }
  }
}

interface RegData {
  vn: string; nn: string; em: string; tel: string
  geschaeft: string; st: string; plz: string; city: string; kat: string; iban: string; gb: boolean
  chair: boolean; cpr: string
  agb: boolean; dsgvo: boolean
}

export default function AnbieterRegisterPage() {
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [f, setF] = useState<RegData>({
    vn: '', nn: '', em: '', tel: '',
    geschaeft: '', st: '', plz: '', city: '', kat: '', iban: '', gb: false,
    chair: false, cpr: '',
    agb: false, dsgvo: false,
  })

  function upd(key: keyof RegData, value: string | boolean) {
    setF(prev => ({ ...prev, [key]: value }))
  }

  if (done) {
    return (
      <div className="shell">
        <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '36px 22px', textAlign: 'center' }}>
          <div style={{ animation: 'logoFloat 3s ease-in-out infinite, logoGlow 3s ease-in-out infinite', display: 'inline-block', marginBottom: 16 }}>
            <BrandLogo size={80} variant="dark" animateStar />
          </div>
          <h2 className="cinzel" style={{ fontSize: 22, marginBottom: 8, color: 'var(--gold2)' }}>Eingereicht!</h2>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 18, lineHeight: 1.7 }}>
            Prüfung innerhalb 24h.<br />E-Mail-Bestätigung folgt.
          </p>
          <Link href="/" className="bgold" style={{ textDecoration: 'none', display: 'block' }}>Zurück zur App</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="shell">
      <div className="screen">
        {/* Sticky Header */}
        <div className="sticky">
          <Link href="/account" style={{ fontSize: 13, color: 'var(--stone)', textDecoration: 'none', marginBottom: 6, display: 'block' }}>
            ← Zurück
          </Link>
          <h1 className="cinzel" style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold2)' }}>
            Anbieter registrieren
          </h1>
          <p style={{ fontSize: 11, color: 'var(--stone)', marginBottom: 8 }}>
            Schritt {step}/4 — {STEP_NAMES[step - 1]}
          </p>
          <div style={{ height: 3, background: 'var(--c4)', borderRadius: 2 }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, var(--gold), var(--gold3))', borderRadius: 2, width: `${(step / 4) * 100}%`, transition: 'width 0.3s' }} />
          </div>
        </div>

        <div style={{ padding: '22px var(--pad) 40px' }}>
          {/* Step 1: Personal */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([
                ['Vorname', 'vn', 'text', 'Max', 1, 60],
                ['Nachname', 'nn', 'text', 'Mustermann', 1, 60],
                ['E-Mail', 'em', 'email', 'max@mail.de', 5, 120],
                ['Telefon', 'tel', 'tel', '+49 170 ...', 6, 30],
              ] as const).map(([label, key, type, ph, minLen, maxLen]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: 'var(--stone)', display: 'block', marginBottom: 4 }}>{label} *</label>
                  <input
                    className="inp"
                    type={type}
                    value={f[key] as string}
                    onChange={e => upd(key, e.target.value)}
                    placeholder={ph}
                    required
                    minLength={minLen}
                    maxLength={maxLen}
                    autoComplete={type === 'email' ? 'email' : type === 'tel' ? 'tel' : key === 'vn' ? 'given-name' : key === 'nn' ? 'family-name' : 'on'}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Business */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([
                ['Geschäftsname', 'geschaeft', 'Mein Studio', 2, 100, undefined],
                ['Straße + Nr.', 'st', 'Münchener Str. 17', 3, 100, undefined],
                ['PLZ', 'plz', '60329', 5, 5, '[0-9]{5}'],
                ['Stadt', 'city', 'Frankfurt', 2, 60, undefined],
              ] as const).map(([label, key, ph, minLen, maxLen, pattern]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: 'var(--stone)', display: 'block', marginBottom: 4 }}>{label} *</label>
                  <input
                    className="inp"
                    value={f[key] as string}
                    onChange={e => upd(key, e.target.value)}
                    placeholder={ph}
                    required
                    minLength={minLen}
                    maxLength={maxLen}
                    pattern={pattern}
                    inputMode={key === 'plz' ? 'numeric' : 'text'}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: 'var(--stone)', display: 'block', marginBottom: 8 }}>Kategorie</label>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      onClick={() => upd('kat', c)}
                      style={{
                        padding: '9px 13px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'inherit',
                        background: f.kat === c ? 'var(--gold)' : 'var(--c3)',
                        color: f.kat === c ? '#080706' : 'var(--stone)',
                        border: `1px solid ${f.kat === c ? 'var(--gold)' : 'rgba(176,144,96,0.12)'}`,
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--stone)', display: 'block', marginBottom: 4 }}>IBAN</label>
                <input className="inp" value={f.iban} onChange={e => upd('iban', e.target.value)} placeholder="DE89 3704 ..." />
              </div>
              <div
                onClick={() => upd('gb', !f.gb)}
                style={{
                  display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px',
                  background: 'var(--c2)', borderRadius: 12, cursor: 'pointer',
                  border: `1px solid ${f.gb ? 'var(--gold)' : 'rgba(176,144,96,0.1)'}`,
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, flexShrink: 0,
                  background: f.gb ? 'var(--gold)' : 'var(--c4)', border: `2px solid ${f.gb ? 'var(--gold)' : 'var(--c5)'}`,
                  color: f.gb ? '#080706' : 'transparent',
                }}>
                  ✓
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)' }}>Gewerbeschein vorhanden</p>
                  <p style={{ fontSize: 11, color: 'var(--stone)' }}>Hochladen nach Registrierung</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Vermietung — Labels dynamisch je nach Kategorie */}
          {step === 3 && (() => {
            const L = getRentalLabels(f.kat)
            const isOpRaum = f.kat === 'OP-Raum'
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--gold)', textTransform: 'uppercase' }}>
                  {L.title}
                </p>
                <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6 }}>
                  {L.subtitle}
                </p>
                {isOpRaum && (
                  <div style={{
                    padding: '10px 12px',
                    background: 'rgba(212,175,55,0.06)',
                    border: '1px solid rgba(212,175,55,0.25)',
                    borderRadius: 10,
                    fontSize: 11,
                    color: 'var(--gold2)',
                    lineHeight: 1.5,
                  }}>
                    <strong style={{ color: 'var(--gold)' }}>Premium-Kategorie:</strong> ChairMatch ist die einzige Plattform in DACH, die OP-Räume vermittelt. Pflicht-Checks vor Live-Schaltung: Hygieneverordnung, MDR-Compliance, Anästhesie-Standards.
                  </div>
                )}
                <div
                  onClick={() => upd('chair', !f.chair)}
                  style={{
                    display: 'flex', gap: 10, alignItems: 'center', padding: '13px 15px',
                    background: f.chair ? 'rgba(176,144,96,0.06)' : 'var(--c2)', borderRadius: 12, cursor: 'pointer',
                    border: `1.5px solid ${f.chair ? 'var(--gold)' : 'rgba(176,144,96,0.1)'}`,
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, flexShrink: 0,
                    background: f.chair ? 'var(--gold)' : 'var(--c4)', border: `2px solid ${f.chair ? 'var(--gold)' : 'var(--c5)'}`,
                    color: f.chair ? '#080706' : 'transparent',
                  }}>
                    ✓
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)' }}>{L.toggle}</p>
                    <p style={{ fontSize: 11, color: 'var(--stone)' }}>{L.sub}</p>
                  </div>
                </div>
                {f.chair && (
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--stone)', display: 'block', marginBottom: 4 }}>{L.priceLabel}</label>
                    <input className="inp" type="number" value={f.cpr} onChange={e => upd('cpr', e.target.value)} placeholder={L.placeholder} />
                  </div>
                )}
              </div>
            )
          })()}

          {/* Step 4: Summary */}
          {step === 4 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 14 }}>
                Zusammenfassung
              </p>
              <div className="card" style={{ padding: 14, marginBottom: 16 }}>
                {([
                  ['Name', `${f.vn} ${f.nn}`],
                  ['E-Mail', f.em],
                  ['Geschäft', f.geschaeft],
                  ['Stadt', f.city],
                  ['Kategorie', f.kat],
                  [
                    // Label passt sich der Kategorie an: Stuhl/Liege/Raum/OP-Raum
                    f.kat === 'OP-Raum' ? 'OP-Raum-Miete'
                      : f.kat === 'Ästhetik' ? 'Raum-/Liegen-Miete'
                      : f.kat === 'Massage' ? 'Liegen-Miete'
                      : (f.kat === 'Kosmetik' || f.kat === 'Nail & Lash') ? 'Platz-Miete'
                      : 'Stuhlmiete',
                    f.chair ? `${f.cpr}€/Tag` : 'Nein',
                  ],
                ] as const).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(176,144,96,0.06)', fontSize: 13 }}>
                    <span style={{ color: 'var(--stone)' }}>{k}</span>
                    <span style={{ fontWeight: 600, color: 'var(--cream)' }}>{v || '—'}</span>
                  </div>
                ))}
              </div>

              {(['agb', 'dsgvo'] as const).map(key => (
                <div key={key} onClick={() => upd(key, !f[key])} style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: '1px solid rgba(176,144,96,0.06)', cursor: 'pointer', alignItems: 'center' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, flexShrink: 0,
                    background: f[key] ? 'var(--gold)' : 'var(--c4)', border: `2px solid ${f[key] ? 'var(--gold)' : 'var(--c5)'}`,
                    color: f[key] ? '#080706' : 'transparent',
                  }}>
                    ✓
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)' }}>
                    {key === 'agb' ? (
                      <>AGB für Anbieter akzeptieren (<Link href="/agb-provider" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>AGB-Provider</Link>)</>)
                    : (
                      <>Datenschutzerklärung akzeptieren (<Link href="/datenschutz" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>Datenschutz</Link>)</>)
                    }
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            {step > 1 && (
              <button className="boutline" style={{ flex: '0 0 auto', padding: '13px 18px' }} onClick={() => setStep(step - 1)}>
                ←
              </button>
            )}
            <button
              className="bgold"
              style={{ flex: 1, padding: '14px 0', fontSize: 14, fontWeight: 800 }}
              disabled={(step === 4 && (!f.agb || !f.dsgvo)) || submitting}
              onClick={async () => {
                if (step === 4) {
                  setSubmitting(true)
                  setSubmitError(null)
                  try {
                    const res = await fetch('/api/register-provider', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(f),
                    })
                    const data = await res.json()
                    if (!res.ok) {
                      setSubmitError(data.error || 'Registrierung fehlgeschlagen')
                    } else {
                      setDone(true)
                    }
                  } catch {
                    setSubmitError('Netzwerkfehler. Bitte erneut versuchen.')
                  }
                  setSubmitting(false)
                } else {
                  setStep(step + 1)
                }
              }}
            >
              {submitting ? 'Wird gesendet...' : step === 4 ? 'Jetzt registrieren →' : 'Weiter →'}
            </button>
            {submitError && (
              <div style={{ background: 'rgba(232,80,64,0.1)', border: '1px solid rgba(232,80,64,0.3)', borderRadius: 10, padding: 10, marginTop: 10, color: 'var(--red)', fontSize: 12 }}>
                {submitError}
              </div>
            )}
          </div>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
