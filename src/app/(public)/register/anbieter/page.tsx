'use client'

import { useState } from 'react'
import Link from 'next/link'

const STEP_NAMES = ['Persönliche Daten', 'Geschäftsdaten', 'Services & Stuhl', 'Bestätigung']
const CATEGORIES = ['Barbershop', 'Friseur', 'Kosmetik', 'Ästhetik', 'Nail & Lash', 'Massage']

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo_lockup_512x384.png" alt="ChairMatch" style={{ height: 120, objectFit: 'contain' }} />
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
              {([['Vorname', 'vn', 'text', 'Max'], ['Nachname', 'nn', 'text', 'Mustermann'], ['E-Mail', 'em', 'email', 'max@mail.de'], ['Telefon', 'tel', 'tel', '+49 170 ...']] as const).map(([label, key, type, ph]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: 'var(--stone)', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input className="inp" type={type} value={f[key] as string} onChange={e => upd(key, e.target.value)} placeholder={ph} />
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Business */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([['Geschäftsname', 'geschaeft', 'Mein Studio'], ['Straße + Nr.', 'st', 'Münchener Str. 17'], ['PLZ', 'plz', '60329'], ['Stadt', 'city', 'Frankfurt']] as const).map(([label, key, ph]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: 'var(--stone)', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input className="inp" value={f[key] as string} onChange={e => upd(key, e.target.value)} placeholder={ph} />
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
                        border: `1px solid ${f.kat === c ? 'var(--gold)' : 'rgba(200,168,75,0.12)'}`,
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
                  border: `1px solid ${f.gb ? 'var(--gold)' : 'rgba(200,168,75,0.1)'}`,
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

          {/* Step 3: Stuhl */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--gold)', textTransform: 'uppercase' }}>
                Stuhl / Kabine vermieten
              </p>
              <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6 }}>
                Kerngeschäft: Freie Stühle vermieten. 0 % Provision.
              </p>
              <div
                onClick={() => upd('chair', !f.chair)}
                style={{
                  display: 'flex', gap: 10, alignItems: 'center', padding: '13px 15px',
                  background: f.chair ? 'rgba(200,168,75,0.06)' : 'var(--c2)', borderRadius: 12, cursor: 'pointer',
                  border: `1.5px solid ${f.chair ? 'var(--gold)' : 'rgba(200,168,75,0.1)'}`,
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
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)' }}>Ja, ich vermiete Stühle</p>
                  <p style={{ fontSize: 11, color: 'var(--stone)' }}>Zusatzeinnahmen durch Untervermietung</p>
                </div>
              </div>
              {f.chair && (
                <div>
                  <label style={{ fontSize: 12, color: 'var(--stone)', display: 'block', marginBottom: 4 }}>Preis/Tag (€)</label>
                  <input className="inp" type="number" value={f.cpr} onChange={e => upd('cpr', e.target.value)} placeholder="45" />
                </div>
              )}
            </div>
          )}

          {/* Step 4: Summary */}
          {step === 4 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 14 }}>
                Zusammenfassung
              </p>
              <div className="card" style={{ padding: 14, marginBottom: 16 }}>
                {([['Name', `${f.vn} ${f.nn}`], ['E-Mail', f.em], ['Geschäft', f.geschaeft], ['Stadt', f.city], ['Kategorie', f.kat], ['Stuhlmiete', f.chair ? `${f.cpr}€/Tag` : 'Nein']] as const).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(200,168,75,0.06)', fontSize: 13 }}>
                    <span style={{ color: 'var(--stone)' }}>{k}</span>
                    <span style={{ fontWeight: 600, color: 'var(--cream)' }}>{v || '—'}</span>
                  </div>
                ))}
              </div>

              {(['agb', 'dsgvo'] as const).map(key => (
                <div key={key} onClick={() => upd(key, !f[key])} style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: '1px solid rgba(200,168,75,0.06)', cursor: 'pointer', alignItems: 'center' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, flexShrink: 0,
                    background: f[key] ? 'var(--gold)' : 'var(--c4)', border: `2px solid ${f[key] ? 'var(--gold)' : 'var(--c5)'}`,
                    color: f[key] ? '#080706' : 'transparent',
                  }}>
                    ✓
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)' }}>
                    {key === 'agb' ? 'AGB akzeptieren' : 'Datenschutzerklärung akzeptieren'}
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
