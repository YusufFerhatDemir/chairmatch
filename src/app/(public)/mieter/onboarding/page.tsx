'use client'

/**
 * Mieter-Onboarding-Wizard — 4 Slides
 *
 * Klick auf "Mieter" im V14-Welcome-Splitter führt hierhin.
 *
 * Slide 1: Was suchst du? (Stuhl/Liege/Kabine/OP-Raum/Kompletter Raum)
 * Slide 2: Wo & Wann? (Stadt + GPS-Ortung + Dauer + Budget)
 * Slide 3: Wer bist du? (Beruf + Erfahrung + Sprachen)
 * Slide 4: Lizenz & Rechtliches (Gewerbe + Berufsnachweis + Steuer-ID)
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from '@/i18n/client'
import { BrandLogo } from '@/components/BrandLogo'

type PlaceId = 'stuhl' | 'liege' | 'kabine' | 'op' | 'raum'

const PLACE_TYPES: { id: PlaceId; title: string; sub: string }[] = [
  { id: 'stuhl',  title: 'Stuhl',           sub: 'Friseur · Barbershop' },
  { id: 'liege',  title: 'Liege',           sub: 'Kosmetik · Massage · Wimpern' },
  { id: 'kabine', title: 'Kabine',          sub: 'Privater Behandlungsraum' },
  { id: 'op',     title: 'OP-Raum',         sub: 'Medical · Ästhetik · Arzt' },
  { id: 'raum',   title: 'Kompletter Raum', sub: 'Tagesmiete · Workshop' },
]

const DURATIONS = ['Stundenweise', 'Tageweise', 'Wochenweise', 'Monatlich'] as const
const LANGUAGES = ['DE', 'EN', 'TR', 'AR'] as const

export default function MieterOnboardingPage() {
  const router = useRouter()
  const t = useTranslations()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  const [selected, setSelected] = useState<Set<PlaceId>>(new Set())
  const [city, setCity] = useState('')
  const [duration, setDuration] = useState<Set<string>>(new Set())
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')

  const [profile, setProfile] = useState({ name: '', job: '', years: '', phone: '', email: '', portfolio: '' })
  const [languages, setLanguages] = useState<Set<string>>(new Set(['DE']))

  const [legal, setLegal] = useState({ tax: '' })
  const [agreed, setAgreed] = useState({ agb: false, gewerbe: false, hygiene: false })

  const togglePlace = (id: PlaceId) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }

  const toggle = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(val)) next.delete(val); else next.add(val)
    setter(next)
  }

  const useGPS = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      () => setCity('Mein Standort'),
      () => setCity(''),
    )
  }

  const canProceed = (): boolean => {
    if (step === 1) return selected.size > 0
    if (step === 2) return city.trim().length > 1 && duration.size > 0
    if (step === 3) return profile.name.trim().length > 1 && profile.job.trim().length > 1
    if (step === 4) return agreed.agb && agreed.gewerbe && agreed.hygiene
    return false
  }

  const next = () => {
    if (!canProceed()) return
    if (step < 4) setStep((s) => (s + 1) as 1 | 2 | 3 | 4)
    else submit()
  }

  const submit = () => {
    try { localStorage.setItem('cm_mieter_draft', JSON.stringify({ selected: [...selected], city, duration: [...duration], budgetMin, budgetMax, profile, languages: [...languages], legal, agreed })) } catch {}
    router.push('/auth?mode=register&role=mieter' as never)
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--c1)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      padding: '24px 16px 40px',
    }}>
      <div style={{
        maxWidth: 460, width: '100%',
        background: 'var(--c2)', borderRadius: 28,
        padding: '24px 20px',
        border: '0.5px solid rgba(196,168,106,0.18)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button
            onClick={() => step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3 | 4) : router.back()}
            aria-label="Zurück"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: 'none', color: 'var(--cream)',
              fontSize: 14, cursor: 'pointer',
            }}
          >‹</button>
          <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(196,168,106,0.7)' }}>
            {t('wizard.step')} {step} / 4
          </div>
          <div style={{ width: 32 }} />
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 24 }}>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: s <= step
                ? 'linear-gradient(90deg, #BF953F, #FCF6BA)'
                : 'rgba(255,255,255,0.08)',
            }} />
          ))}
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <p className="cinzel text-gold-metallic" style={{
            fontSize: 22, fontWeight: 500, letterSpacing: 1, margin: '0 0 6px',
          }}>
            {step === 1 && t('wizMieter.s1Title')}
            {step === 2 && t('wizMieter.s2Title')}
            {step === 3 && t('wizMieter.s3Title')}
            {step === 4 && t('wizMieter.s4Title')}
          </p>
          <p style={{ fontSize: 13, color: 'var(--cream)', margin: 0 }}>
            {step === 1 && t('wizMieter.s1Subtitle')}
            {step === 2 && 'Standort, Zeitraum und Budget.'}
            {step === 3 && 'Vermieter sieht dein Profil.'}
            {step === 4 && 'Pflicht für gewerbliche Anmietung.'}
          </p>
        </div>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {PLACE_TYPES.map((p) => {
              const active = selected.has(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlace(p.id)}
                  style={{
                    background: 'var(--c1)',
                    border: active ? '1px solid #C4A86A' : '0.5px solid rgba(196,168,106,0.3)',
                    borderRadius: 14,
                    padding: '12px 14px 12px 12px',
                    display: 'flex', alignItems: 'center', gap: 14,
                    cursor: 'pointer', width: '100%',
                    fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    <BrandLogo size={68} variant="glow" animateStar={false} priority={false} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className={active ? 'cinzel text-gold-metallic' : 'cinzel'} style={{
                      fontSize: 17, fontWeight: 500, lineHeight: 1.1, margin: 0,
                      color: active ? undefined : 'var(--cream)',
                    }}>
                      {p.title}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--cream)', margin: '3px 0 0' }}>
                      {p.sub}
                    </p>
                  </div>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    border: active ? '2px solid #C4A86A' : '1px solid rgba(196,168,106,0.3)',
                    background: active ? '#C4A86A' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#0B0B0F', fontSize: 14, fontWeight: 700,
                  }}>
                    {active ? '✓' : ''}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Stadt / PLZ *</label>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <input
                  type="text" value={city} onChange={(e) => setCity(e.target.value)}
                  placeholder="z.B. Köln"
                  style={{
                    flex: 1, padding: '10px 12px',
                    background: 'var(--c1)', color: 'var(--cream)',
                    border: '0.5px solid rgba(196,168,106,0.3)', borderRadius: 8,
                    fontSize: 13, fontFamily: 'inherit',
                  }}
                />
                <button
                  type="button" onClick={useGPS}
                  style={{
                    padding: '0 14px', background: 'rgba(196,168,106,0.15)',
                    color: '#C4A86A', border: '0.5px solid rgba(196,168,106,0.4)',
                    borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 12, whiteSpace: 'nowrap',
                  }}
                  aria-label="Standort verwenden"
                >📍 Standort</button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Wie lange?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
                {DURATIONS.map((d) => {
                  const active = duration.has(d)
                  return (
                    <button
                      key={d}
                      onClick={() => toggle(duration, d, setDuration)}
                      style={{
                        padding: '8px 0', textAlign: 'center',
                        background: active ? 'rgba(196,168,106,0.15)' : 'var(--c1)',
                        color: active ? '#C4A86A' : 'rgba(232,230,218,0.7)',
                        border: active ? '1px solid #C4A86A' : '0.5px solid rgba(196,168,106,0.25)',
                        borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >{d}</button>
                  )
                })}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Budget pro Tag (€)</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                <input
                  type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="min" style={{
                    flex: 1, padding: '9px 10px',
                    background: 'var(--c1)', color: 'var(--cream)',
                    border: '0.5px solid rgba(196,168,106,0.3)', borderRadius: 8,
                    fontSize: 13, fontFamily: 'inherit',
                  }}
                />
                <span style={{ color: '#C4A86A' }}>—</span>
                <input
                  type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="max" style={{
                    flex: 1, padding: '9px 10px',
                    background: 'var(--c1)', color: 'var(--cream)',
                    border: '0.5px solid rgba(196,168,106,0.3)', borderRadius: 8,
                    fontSize: 13, fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {([
              { k: 'name' as const,  l: 'Name *' },
              { k: 'job' as const,   l: 'Beruf *' },
              { k: 'years' as const, l: 'Berufserfahrung' },
              { k: 'phone' as const, l: 'Telefon *' },
              { k: 'email' as const, l: 'E-Mail *' },
              { k: 'portfolio' as const, l: 'Portfolio / Instagram (optional)' },
            ]).map(({ k, l }) => (
              <div key={k}>
                <label style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>{l}</label>
                <input
                  type="text" value={profile[k]}
                  onChange={(e) => setProfile({ ...profile, [k]: e.target.value })}
                  style={{
                    width: '100%', marginTop: 4, padding: '10px 12px',
                    background: 'var(--c1)', color: 'var(--cream)',
                    border: '0.5px solid rgba(196,168,106,0.3)', borderRadius: 8,
                    fontSize: 13, fontFamily: 'inherit',
                  }}
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Sprachen die du sprichst</label>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {LANGUAGES.map((lang) => {
                  const active = languages.has(lang)
                  return (
                    <button
                      key={lang}
                      onClick={() => toggle(languages, lang, setLanguages)}
                      style={{
                        flex: 1, padding: '8px 0',
                        background: active ? 'rgba(196,168,106,0.15)' : 'var(--c1)',
                        color: active ? '#C4A86A' : 'rgba(232,230,218,0.6)',
                        border: active ? '1px solid #C4A86A' : '0.5px solid rgba(196,168,106,0.25)',
                        borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >{lang}</button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Gewerbeanmeldung *</label>
              <div style={{
                background: 'var(--c1)', border: '0.5px dashed rgba(196,168,106,0.3)',
                borderRadius: 10, padding: 12, marginTop: 4, textAlign: 'center',
                color: 'rgba(232,230,218,0.6)', fontSize: 12, cursor: 'pointer',
              }}>📄 PDF/JPG hochladen</div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Berufsnachweis (Gesellen-/Meisterbrief)</label>
              <div style={{
                background: 'var(--c1)', border: '0.5px dashed rgba(196,168,106,0.3)',
                borderRadius: 10, padding: 12, marginTop: 4, textAlign: 'center',
                color: 'rgba(232,230,218,0.6)', fontSize: 12, cursor: 'pointer',
              }}>📜 Upload</div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Steuer-ID *</label>
              <input
                type="text" value={legal.tax}
                onChange={(e) => setLegal({ ...legal, tax: e.target.value })}
                style={{
                  width: '100%', marginTop: 4, padding: '10px 12px',
                  background: 'var(--c1)', color: 'var(--cream)',
                  border: '0.5px solid rgba(196,168,106,0.3)', borderRadius: 8,
                  fontSize: 13, fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{
              background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
              borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 1.7,
            }}>
              {([
                { k: 'agb' as const,     l: <>Ich akzeptiere <a style={{ color: '#C4A86A' }}>AGB</a> & <a style={{ color: '#C4A86A' }}>Datenschutz</a></> },
                { k: 'gewerbe' as const, l: 'Ich arbeite gewerblich' },
                { k: 'hygiene' as const, l: 'Hygieneverordnung wird eingehalten' },
              ]).map(({ k, l }) => (
                <label key={k} style={{ display: 'flex', gap: 8, color: 'var(--cream)', marginTop: 4 }}>
                  <input
                    type="checkbox" checked={agreed[k]}
                    onChange={(e) => setAgreed({ ...agreed, [k]: e.target.checked })}
                    style={{ accentColor: '#C4A86A', marginTop: 2 }}
                  />
                  <span>{l}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={next}
          disabled={!canProceed()}
          style={{
            width: '100%', marginTop: 22, padding: 14,
            background: canProceed()
              ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)'
              : 'rgba(196,168,106,0.18)',
            color: canProceed() ? '#0B0B0F' : 'rgba(232,230,218,0.55)',
            border: 'none', borderRadius: 14,
            fontWeight: 700, fontSize: 14, cursor: canProceed() ? 'pointer' : 'not-allowed',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontFamily: 'inherit',
            boxShadow: canProceed() ? '0 0 20px rgba(196,168,106,0.25)' : 'none',
            opacity: canProceed() ? 1 : 0.6,
          }}
        >
          <span>
            {step === 1 && (selected.size > 0 ? `${selected.size} gewählt` : 'Wähle mind. 1')}
            {step === 2 && 'Weiter zu Profil'}
            {step === 3 && 'Weiter zu Rechtliches'}
            {step === 4 && '🔍 Stühle finden'}
          </span>
          <span>{step === 4 ? '✦' : '→'}</span>
        </button>

      </div>
    </div>
  )
}
