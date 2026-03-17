'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { BrandLogo } from '@/components/BrandLogo'
import { CATEGORIES, SVC_CATALOG, EQUIP_CATALOG } from '@/lib/constants'
import { Scissors, Paintbrush, Sparkles, Syringe, Hand, Heart, Eye, Stethoscope, Cross, type LucideIcon } from 'lucide-react'

const CAT_LUCIDE: Record<string, LucideIcon> = {
  barber: Scissors,
  friseur: Paintbrush,
  kosmetik: Sparkles,
  aesthetik: Syringe,
  nail: Hand,
  massage: Heart,
  lash: Eye,
  arzt: Stethoscope,
  opraum: Cross,
}

interface Slide {
  id: string
  title: string
  subtitle: string
  icon: string | null
  imageUrl: string | null
}

interface Props {
  slides: Slide[]
  children: React.ReactNode
}

type Phase = 'slides' | 'roleSelect' | 'login' | 'customerSetup' | 'provSetup'

interface ProfileData {
  vn: string; nn: string; email: string; phone: string; city: string
  biz: string; street: string; plz: string; iban: string; ustid: string
}

const emptyProfile: ProfileData = { vn: '', nn: '', email: '', phone: '', city: '', biz: '', street: '', plz: '', iban: '', ustid: '' }

function isValidEmail(e: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) }

export default function OnboardingGate({ slides, children }: Props) {
  const { data: session } = useSession()
  const [done, setDone] = useState<boolean | null>(null)

  // Onboarding state
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState<Phase>('slides')
  const [role, setRole] = useState<'CUSTOMER' | 'PROVIDER' | 'B2B'>('CUSTOMER')

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPw, setLoginPw] = useState('')
  const [loginError, setLoginError] = useState('')

  // Customer setup
  const [profile, setProfile] = useState<ProfileData>({ ...emptyProfile })

  // Provider setup
  const [provStep, setProvStep] = useState(1)
  const [provCat, setProvCat] = useState('')
  const [provServices, setProvServices] = useState<string[]>([])
  const [customServices, setCustomServices] = useState<{ nm: string; dur: number; pr: number }[]>([])
  const [provEquip, setProvEquip] = useState<string[]>([])
  const [customEquip, setCustomEquip] = useState<{ nm: string; pr: number; icon: string }[]>([])
  const [agb, setAgb] = useState(false)

  // Custom add forms
  const [csNm, setCsNm] = useState('')
  const [csDur, setCsDur] = useState('')
  const [csPr, setCsPr] = useState('')
  const [ceNm, setCeNm] = useState('')
  const [cePr, setCePr] = useState('')

  // Toast
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (session) { setDone(true); return }
    const v = sessionStorage.getItem('cm_onboarded')
    setDone(v === '1')
  }, [session])

  // Scroll to top on phase/step change (must be before early returns — Rules of Hooks)
  useEffect(() => {
    const el = document.getElementById('ob-scroll')
    if (el) el.scrollTop = 0
  }, [phase, provStep, step])

  if (done === null) return null
  if (done) return <>{children}</>

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function finish(r: string) {
    sessionStorage.setItem('cm_onboarded', '1')
    sessionStorage.setItem('cm_role', r)
    if (profile.vn || profile.email) {
      localStorage.setItem('cm_setup_profile', JSON.stringify(profile))
    }
    if (provCat) localStorage.setItem('cm_prov_cat', provCat)
    if (provServices.length) localStorage.setItem('cm_prov_svcs', JSON.stringify(provServices))
    if (provEquip.length) localStorage.setItem('cm_prov_equip', JSON.stringify(provEquip))
    if (customServices.length) localStorage.setItem('cm_custom_svcs', JSON.stringify(customServices))
    if (customEquip.length) localStorage.setItem('cm_custom_equip', JSON.stringify(customEquip))

    // Persist provider/B2B data to DB
    if ((r === 'PROVIDER' || r === 'B2B') && profile.email && profile.vn && profile.nn) {
      try {
        await fetch('/api/register-provider', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vn: profile.vn, nn: profile.nn, em: profile.email, tel: profile.phone || '',
            geschaeft: profile.biz || `${profile.vn} ${profile.nn}`,
            st: profile.street || '', plz: profile.plz || '', city: profile.city || '',
            kat: provCat || 'friseur', iban: profile.iban || '', gb: true,
            chair: false, agb: true, dsgvo: true,
          }),
        })
      } catch { /* best effort */ }
    }

    setDone(true)
  }

  function selectRole(r: 'CUSTOMER' | 'PROVIDER' | 'B2B') {
    setRole(r)
    if (r === 'CUSTOMER') {
      setPhase('customerSetup')
    } else {
      setPhase('provSetup')
      setProvStep(1)
    }
  }

  function updateProfile(key: keyof ProfileData, val: string) {
    setProfile(prev => ({ ...prev, [key]: val }))
  }

  // Service/Equip catalog for selected category
  const catServices = SVC_CATALOG[provCat] || []
  const catEquip = EQUIP_CATALOG[provCat] || []
  const allServices = [...catServices, ...customServices.map(s => ({ nm: s.nm, dur: s.dur, pr: s.pr }))]
  const allEquip = [...catEquip, ...customEquip.map(e => ({ nm: e.nm, pr: e.pr, icon: e.icon }))]

  // Provider categories (exclude angebote, termin)
  const provCategories = CATEGORIES.filter(c => !['angebote', 'termin'].includes(c.id))

  const isProfileValid = profile.vn && profile.nn && profile.email && isValidEmail(profile.email) && profile.phone && profile.biz && profile.street && profile.plz && profile.city

  // ═══ RENDER ═══

  const shell = (content: React.ReactNode) => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg)', width: '100%', maxWidth: 'var(--shell-max)', margin: '0 auto' }}>
      <div id="ob-scroll" style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'max(env(safe-area-inset-top, 20px), 20px) 22px max(env(safe-area-inset-bottom, 40px), 40px)',
      }}>
        {content}
        {/* Bottom spacer for iOS safe area */}
        <div style={{ flexShrink: 0, height: 30 }} />
      </div>
      {toast && (
        <div className="toast-enter" style={{ position: 'fixed', bottom: 'max(env(safe-area-inset-bottom, 20px), 20px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--c3)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 20px', fontSize: 13, color: 'var(--cream)', zIndex: 300, maxWidth: 360, textAlign: 'center' }}>
          {toast}
        </div>
      )}
    </div>
  )

  const logo = () => (
    <div style={{
      marginBottom: 24,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 14,
    }}>
      <BrandLogo size={120} variant="dark" animateStar priority />
      <div style={{ textAlign: 'center' }}>
        <p
          className="cinzel"
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 3,
            color: 'var(--gold2)',
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          CHAIR<span style={{ color: 'var(--gold3)' }}>MATCH</span>
        </p>
        <p
          style={{
            fontSize: 9,
            letterSpacing: 4,
            color: 'var(--stone)',
          }}
        >
          DEUTSCHLAND
        </p>
      </div>
    </div>
  )

  const backBtn = (onClick: () => void) => (
    <button onClick={onClick} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--stone)', fontSize: 14, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
      ← Zurück
    </button>
  )

  // ═══ LOGIN ═══
  if (phase === 'login') {
    return shell(<>
      {backBtn(() => setPhase('roleSelect'))}
      {logo()}
      <div className="card" style={{ width: '100%', padding: 20 }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold2)', marginBottom: 16, textAlign: 'center' }}>Willkommen zurück</p>
        <input className="inp" type="email" placeholder="E-Mail" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} style={{ marginBottom: 10 }} />
        <input className="inp" type="password" placeholder="Passwort (min. 6 Zeichen)" value={loginPw} onChange={e => setLoginPw(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
          style={{ marginBottom: 16 }} />
        {loginError && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{loginError}</p>}
        <button className="bgold" style={{ fontSize: 15, fontWeight: 800 }} onClick={handleLogin}>Anmelden →</button>
      </div>
    </>)
  }

  async function handleLogin() {
    if (!loginEmail || !loginPw) { setLoginError('Bitte alle Felder ausfüllen.'); return }
    setLoginError('')
    try {
      const res = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPw }),
      })
      if (res.ok) {
        finish('CUSTOMER')
      } else {
        setLoginError('Ungültige Anmeldedaten.')
      }
    } catch {
      setLoginError('Verbindungsfehler.')
    }
  }

  // ═══ CUSTOMER SETUP ═══
  if (phase === 'customerSetup') {
    const canSubmit = profile.vn && profile.nn && profile.email && isValidEmail(profile.email)
    return shell(<>
      {backBtn(() => setPhase('roleSelect'))}
      {logo()}
      <p className="cinzel" style={{ fontSize: 20, fontWeight: 600, color: 'var(--gold2)', marginBottom: 6 }}>Dein Profil</p>
      <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 20, textAlign: 'center' }}>Damit wir dir passende Anbieter zeigen können.</p>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="inp" placeholder="Vorname *" value={profile.vn} onChange={e => updateProfile('vn', e.target.value)} style={{ flex: 1 }} />
          <input className="inp" placeholder="Nachname *" value={profile.nn} onChange={e => updateProfile('nn', e.target.value)} style={{ flex: 1 }} />
        </div>
        <input className="inp" type="email" placeholder="E-Mail *" value={profile.email} onChange={e => updateProfile('email', e.target.value)} />
        <input className="inp" type="tel" placeholder="Telefon" value={profile.phone} onChange={e => updateProfile('phone', e.target.value)} />
        <input className="inp" placeholder="Stadt" value={profile.city} onChange={e => updateProfile('city', e.target.value)} />
      </div>

      <button className="bgold" disabled={!canSubmit} style={{ marginTop: 20 }} onClick={() => {
        showToast(profile.vn ? `Willkommen, ${profile.vn}! ✉️ Bestätigung an ${profile.email}` : 'Willkommen bei ChairMatch!')
        setTimeout(() => finish('CUSTOMER'), 800)
      }}>
        Los geht&apos;s!
      </button>
      <button onClick={() => finish('CUSTOMER')} style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--stone)', fontSize: 13, cursor: 'pointer' }}>
        Später ausfüllen
      </button>
    </>)
  }

  // ═══ PROVIDER / B2B SETUP (5 Steps) ═══
  if (phase === 'provSetup') {
    const progressBar = (
      <div style={{ width: '100%', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--stone)' }}>Schritt {provStep}/5</span>
        </div>
        <div style={{ height: 3, background: 'var(--c3)', borderRadius: 2 }}>
          <div style={{ height: 3, background: 'var(--gold)', borderRadius: 2, width: `${provStep * 20}%`, transition: 'width 0.3s' }} />
        </div>
      </div>
    )

    function provBack() {
      if (provStep === 1) setPhase('roleSelect')
      else setProvStep(provStep - 1)
    }

    // ── Step 1: Category ──
    if (provStep === 1) {
      return shell(<>
        {backBtn(provBack)}
        {progressBar}
        <p className="cinzel" style={{ fontSize: 20, fontWeight: 600, color: 'var(--gold2)', marginBottom: 6 }}>Was ist dein Handwerk?</p>
        <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 20 }}>Wähle deine Branche</p>
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {provCategories.map(cat => (
            <button key={cat.id} onClick={() => {
              setProvCat(cat.id)
              setProvServices([])
              setProvEquip([])
              setCustomServices([])
              setCustomEquip([])
            }} className="catcard" style={{
              border: provCat === cat.id ? '1.5px solid var(--gold)' : '1px solid #2a2418',
              boxShadow: provCat === cat.id ? '0 0 28px rgba(176,144,96,.1)' : undefined,
              position: 'relative',
            }}>
              {provCat === cat.id && (
                <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#080706', fontWeight: 800 }}>✓</div>
              )}
              <div className="caticon" style={{ height: 80, padding: 8, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(() => { const Icon = CAT_LUCIDE[cat.id]; return Icon ? <Icon size={36} aria-label={cat.label} /> : null })()}
              </div>
              <div className="catlbl" style={{ fontSize: 12 }}>{cat.label}</div>
              <div className="catsub">{cat.sub}</div>
            </button>
          ))}
        </div>
        <button className="bgold" disabled={!provCat} style={{ marginTop: 20 }} onClick={() => {
          // Init services for this category
          const catSvcs = SVC_CATALOG[provCat] || []
          setProvServices(catSvcs.slice(0, 3).map(s => s.nm))
          setProvStep(2)
        }}>
          Weiter →
        </button>
      </>)
    }

    // ── Step 2: Services ──
    if (provStep === 2) {
      function toggleSvc(nm: string) {
        setProvServices(prev => prev.includes(nm) ? prev.filter(s => s !== nm) : [...prev, nm])
      }
      function toggleAllSvcs() {
        if (provServices.length === allServices.length) setProvServices([])
        else setProvServices(allServices.map(s => s.nm))
      }
      function addCustomSvc() {
        if (!csNm.trim()) { showToast('Bitte Name eingeben'); return }
        if (allServices.some(s => s.nm === csNm.trim())) { showToast('Existiert bereits'); return }
        const svc = { nm: csNm.trim(), dur: Number(csDur) || 30, pr: Number(csPr) || 0 }
        setCustomServices(prev => [...prev, svc])
        setProvServices(prev => [...prev, svc.nm])
        setCsNm(''); setCsDur(''); setCsPr('')
      }

      return shell(<>
        {backBtn(provBack)}
        {progressBar}
        <p className="cinzel" style={{ fontSize: 20, fontWeight: 600, color: 'var(--gold2)', marginBottom: 6 }}>Deine Services</p>
        <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 20, textAlign: 'center' }}>Tippe zum Aktivieren. Eigene Services kannst du unten hinzufügen.</p>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--gold2)', fontWeight: 700 }}>{provServices.length} aktiv</span>
          <button onClick={toggleAllSvcs} style={{ fontSize: 12, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {provServices.length === allServices.length ? 'Alle aus' : 'Alle an'}
          </button>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {allServices.map(s => {
            const active = provServices.includes(s.nm)
            const isCustom = customServices.some(cs => cs.nm === s.nm)
            return (
              <button key={s.nm} onClick={() => toggleSvc(s.nm)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--c2)', borderRadius: 12,
                border: active ? '1px solid var(--gold)' : '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', width: '100%',
              }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, border: '1.5px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--gold)', background: active ? 'rgba(176,144,96,.15)' : 'transparent', flexShrink: 0 }}>
                  {active ? '✓' : ''}
                </div>
                <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 700 : 400, color: active ? 'var(--cream)' : 'var(--stone)' }}>
                  {s.nm} {isCustom && <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: 'rgba(176,144,96,.1)', color: 'var(--gold2)', marginLeft: 4 }}>EIGENER</span>}
                </span>
                <span style={{ fontSize: 11, color: 'var(--stone)', flexShrink: 0 }}>{s.dur} min</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold2)', flexShrink: 0 }}>{s.pr}€</span>
              </button>
            )
          })}
        </div>

        {/* Custom Service Form */}
        <div style={{ width: '100%', marginTop: 14, padding: 14, border: '1.5px dashed var(--border)', borderRadius: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--stone)', marginBottom: 10 }}>+ Eigenen Service hinzufügen</p>
          <input className="inp" placeholder="Name (z.B. Trockenschnitt)" value={csNm} onChange={e => setCsNm(e.target.value)} style={{ marginBottom: 8, fontSize: 13 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="inp" type="number" placeholder="Dauer (min)" value={csDur} onChange={e => setCsDur(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
            <input className="inp" type="number" placeholder="Preis (€)" value={csPr} onChange={e => setCsPr(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
          </div>
          <button onClick={addCustomSvc} className="boutline" style={{ marginTop: 10, padding: '8px 16px', fontSize: 12, width: '100%' }}>+ Hinzufügen</button>
        </div>

        <button className="bgold" disabled={provServices.length === 0} style={{ marginTop: 20 }} onClick={() => {
          const catEq = EQUIP_CATALOG[provCat] || []
          setProvEquip(catEq.filter(e => e.pr === 0).map(e => e.nm))
          setProvStep(3)
        }}>
          Weiter →
        </button>
      </>)
    }

    // ── Step 3: Equipment ──
    if (provStep === 3) {
      function toggleEq(nm: string) {
        setProvEquip(prev => prev.includes(nm) ? prev.filter(e => e !== nm) : [...prev, nm])
      }
      function toggleAllEq() {
        if (provEquip.length === allEquip.length) setProvEquip([])
        else setProvEquip(allEquip.map(e => e.nm))
      }
      function addCustomEq() {
        if (!ceNm.trim()) { showToast('Bitte Name eingeben'); return }
        if (allEquip.some(e => e.nm === ceNm.trim())) { showToast('Existiert bereits'); return }
        const eq = { nm: ceNm.trim(), pr: Number(cePr) || 0, icon: '' }
        setCustomEquip(prev => [...prev, eq])
        setProvEquip(prev => [...prev, eq.nm])
        setCeNm(''); setCePr('')
      }

      const hasEquip = allEquip.length > 0

      return shell(<>
        {backBtn(provBack)}
        {progressBar}
        <p className="cinzel" style={{ fontSize: 20, fontWeight: 600, color: 'var(--gold2)', marginBottom: 6 }}>Deine Ausstattung</p>
        <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 20, textAlign: 'center' }}>Geräte die Mieter gegen Aufpreis nutzen können. 0 € = inklusive.</p>

        {!hasEquip && (
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 16, textAlign: 'center' }}>
            Für deine Kategorie gibt es noch keine Standard-Geräte. Du kannst eigene hinzufügen oder direkt weiter.
          </p>
        )}

        {hasEquip && (
          <>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--gold2)', fontWeight: 700 }}>{provEquip.length} aktiv</span>
              <button onClick={toggleAllEq} style={{ fontSize: 12, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {provEquip.length === allEquip.length ? 'Alle aus' : 'Alle an'}
              </button>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allEquip.map(eq => {
                const active = provEquip.includes(eq.nm)
                const isCustom = customEquip.some(ce => ce.nm === eq.nm)
                return (
                  <button key={eq.nm} onClick={() => toggleEq(eq.nm)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--c2)', borderRadius: 12,
                    border: active ? '1px solid var(--gold)' : '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, border: '1.5px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--gold)', background: active ? 'rgba(176,144,96,.15)' : 'transparent', flexShrink: 0 }}>
                      {active ? '✓' : ''}
                    </div>
                    <span style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37' }}>
                      {(() => { const Icon = CAT_LUCIDE[provCat]; return Icon ? <Icon size={18} /> : <span style={{ fontSize: 14 }}>{eq.icon}</span> })()}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 700 : 400, color: active ? 'var(--cream)' : 'var(--stone)' }}>
                      {eq.nm} {isCustom && <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: 'rgba(176,144,96,.1)', color: 'var(--gold2)', marginLeft: 4 }}>EIGENER</span>}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: eq.pr === 0 ? 'var(--green)' : 'var(--gold2)', flexShrink: 0 }}>
                      {eq.pr === 0 ? 'Inkl.' : `+${eq.pr}€`}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Custom Equipment Form */}
        <div style={{ width: '100%', marginTop: 14, padding: 14, border: '1.5px dashed var(--border)', borderRadius: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--stone)', marginBottom: 10 }}>+ Eigenes Gerät hinzufügen</p>
          <input className="inp" placeholder="Name (z.B. Dampfgerät)" value={ceNm} onChange={e => setCeNm(e.target.value)} style={{ marginBottom: 8, fontSize: 13 }} />
          <input className="inp" type="number" placeholder="Aufpreis pro Tag (€)" value={cePr} onChange={e => setCePr(e.target.value)} style={{ fontSize: 13 }} />
          <button onClick={addCustomEq} className="boutline" style={{ marginTop: 10, padding: '8px 16px', fontSize: 12, width: '100%' }}>+ Hinzufügen</button>
        </div>

        <button className="bgold" style={{ marginTop: 20 }} onClick={() => setProvStep(4)}>
          Weiter →
        </button>
      </>)
    }

    // ── Step 4: Profile ──
    if (provStep === 4) {
      return shell(<>
        {backBtn(provBack)}
        {progressBar}
        <p className="cinzel" style={{ fontSize: 20, fontWeight: 600, color: 'var(--gold2)', marginBottom: 6 }}>Dein Profil</p>
        <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 20, textAlign: 'center' }}>
          {role === 'B2B' ? 'Geschäftsdaten für B2B-Vermietung' : 'Damit Kunden dich finden & kontaktieren können'}
        </p>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="inp" placeholder="Vorname *" value={profile.vn} onChange={e => updateProfile('vn', e.target.value)} style={{ flex: 1 }} />
            <input className="inp" placeholder="Nachname *" value={profile.nn} onChange={e => updateProfile('nn', e.target.value)} style={{ flex: 1 }} />
          </div>
          <input className="inp" type="email" placeholder="E-Mail *" value={profile.email} onChange={e => updateProfile('email', e.target.value)} />
          <input className="inp" type="tel" placeholder="Telefon *" value={profile.phone} onChange={e => updateProfile('phone', e.target.value)} />
          <input className="inp" placeholder="Geschäftsname *" value={profile.biz} onChange={e => updateProfile('biz', e.target.value)} />
          <input className="inp" placeholder="Straße + Nr. *" value={profile.street} onChange={e => updateProfile('street', e.target.value)} />
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="inp" placeholder="PLZ *" value={profile.plz} onChange={e => updateProfile('plz', e.target.value)} style={{ flex: 1 }} />
            <input className="inp" placeholder="Stadt *" value={profile.city} onChange={e => updateProfile('city', e.target.value)} style={{ flex: 1 }} />
          </div>
          {role === 'B2B' && (
            <>
              <input className="inp" placeholder="IBAN (für Auszahlungen)" value={profile.iban} onChange={e => updateProfile('iban', e.target.value)} />
              <input className="inp" placeholder="USt-IdNr." value={profile.ustid} onChange={e => updateProfile('ustid', e.target.value)} />
            </>
          )}
        </div>

        <button className="bgold" disabled={!isProfileValid} style={{ marginTop: 20 }} onClick={() => setProvStep(5)}>
          Weiter →
        </button>
      </>)
    }

    // ── Step 5: Summary ──
    if (provStep === 5) {
      const catLabel = CATEGORIES.find(c => c.id === provCat)?.label || provCat
      return shell(<>
        {backBtn(provBack)}
        {progressBar}

        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(74,138,90,.15)', border: '1px solid rgba(74,138,90,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 14 }}>✓</div>

        <p className="cinzel" style={{ fontSize: 20, fontWeight: 600, color: 'var(--gold2)', marginBottom: 6 }}>Alles bereit!</p>
        <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 20, textAlign: 'center' }}>Prüfe deine Angaben und bestätige.</p>

        <div className="card" style={{ width: '100%', padding: 14, marginBottom: 20 }}>
          {[
            ['Branche', catLabel],
            ['Name', `${profile.vn} ${profile.nn}`],
            ['Geschäft', profile.biz],
            ['Adresse', `${profile.street}, ${profile.plz} ${profile.city}`],
            ['E-Mail', profile.email],
            ['Telefon', profile.phone],
            ['Services', `${provServices.length} aktiv`],
            ['Ausstattung', `${provEquip.length} Geräte`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--stone)' }}>{k}</span>
              <span style={{ color: 'var(--cream)', fontWeight: 600, textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* AGB Checkbox */}
        <button onClick={() => setAgb(!agb)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'var(--c2)', borderRadius: 12, border: agb ? '1px solid var(--gold)' : '1px solid var(--border)', cursor: 'pointer', marginBottom: 20 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, border: '1.5px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--gold)', background: agb ? 'rgba(176,144,96,.15)' : 'transparent', flexShrink: 0 }}>
            {agb ? '✓' : ''}
          </div>
          <span style={{ fontSize: 12, color: 'var(--cream)', textAlign: 'left' }}>
            Ich akzeptiere die{' '}
            <Link href="/agb" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>AGB</Link>
            {' '}& die{' '}
            <Link href="/datenschutz" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>Datenschutzerklärung</Link>
          </span>
        </button>

        <button className="bgold" disabled={!agb} onClick={() => {
          showToast(`Bestätigungsmail gesendet an ${profile.email} ✉️`)
          setTimeout(() => finish(role), 800)
        }}>
          Profil erstellen & Bestätigungsmail erhalten
        </button>
        <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 12, textAlign: 'center', lineHeight: 1.5 }}>
          Du erhältst eine Bestätigungs-E-Mail an <strong style={{ color: 'var(--cream)' }}>{profile.email}</strong>. Dein Profil wird nach Prüfung freigeschaltet.
        </p>
      </>)
    }
  }

  // ═══ ROLE SELECT ═══
  if (phase === 'roleSelect') {
    return shell(<>
      {backBtn(() => { setPhase('slides'); setStep(slides.length - 1) })}
      {logo()}
      <p className="cinzel" style={{ fontSize: 20, fontWeight: 600, textAlign: 'center', marginBottom: 20, color: 'var(--gold2)' }}>
        Ich bin...
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        {([
          ['Kunde — ich suche Termine', 'CUSTOMER'],
          ['Anbieter — ich biete Services', 'PROVIDER'],
          ['B2B — Stuhl / Kabine mieten', 'B2B'],
        ] as const).map(([label, r]) => (
          <button key={r} className="boutline" style={{ padding: 17, fontSize: 14, fontWeight: 700, textAlign: 'left' }}
            onClick={() => selectRole(r)}>
            {label}
          </button>
        ))}
      </div>
      {/* Login link */}
      <div style={{ width: '100%', borderTop: '1px solid var(--border)', marginTop: 24, paddingTop: 20, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 10 }}>Bereits registriert?</p>
        <button onClick={() => setPhase('login')} className="boutline" style={{ padding: '12px 24px', fontSize: 13 }}>
          Anmelden →
        </button>
      </div>
    </>)
  }

  // ═══ SLIDES ═══
  const rawSlide = slides[step] || { title: 'Willkommen', subtitle: '', icon: null, imageUrl: null }
  const slide = (() => {
    if (!rawSlide) return { title: 'Willkommen', subtitle: '', icon: null, imageUrl: null }
    // Entdecken-Slide: kurz erklären, was ChairMatch macht
    if (rawSlide.title === 'Entdecken') {
      return {
        ...rawSlide,
        subtitle:
          'ChairMatch verbindet dich mit Friseuren, Kosmetikstudios, Massagen & mehr in deiner Nähe – buche Termine in Sekunden, ohne Telefonstress.',
      }
    }
    return rawSlide
  })()
  const isFirst = step === 0
  const isLast = step === slides.length - 1

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg)', width: '100%', maxWidth: 'var(--shell-max)', margin: '0 auto' }}>
      <div id="ob-scroll" style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'max(env(safe-area-inset-top, 30px), 30px) 30px max(env(safe-area-inset-bottom, 30px), 30px)',
      }}>
        {isFirst ? (
          logo()
        ) : (
          <div style={{
            marginBottom: 28,
            width: 96,
            height: 96,
            borderRadius: 28,
            border: '1.5px solid rgba(176,144,96,0.2)',
            background: 'rgba(176,144,96,0.05)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {(slide.imageUrl?.includes('termin') || slide.icon === 'booking') ? (
              /* Kalender-Icon — sauberes SVG */
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="M9 16l2 2 4-4" />
              </svg>
            ) : (slide.imageUrl?.includes('stuhl') || slide.icon === 'chair') ? (
              /* Stuhl-Icon — sauberes SVG */
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 11V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v5" />
                <path d="M4 11h16a1 1 0 0 1 1 1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1z" />
                <path d="M6 15v4" />
                <path d="M18 15v4" />
                <path d="M8 19h8" />
              </svg>
            ) : (
              /* Entdecken — Kompass-Icon */
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill="rgba(176,144,96,0.15)" stroke="var(--gold)" />
              </svg>
            )}
          </div>
        )}

        <p className="cinzel" style={{ fontSize: 22, fontWeight: 600, marginBottom: 10, lineHeight: 1.3, color: 'var(--gold2)' }}>
          {slide.title}
        </p>
        <p style={{ fontSize: 14, color: 'var(--stone)', lineHeight: 1.7, marginBottom: 44 }}>
          {slide.subtitle}
        </p>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 30 }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 22 : 8, height: 8, borderRadius: 4,
              background: i === step ? 'var(--gold)' : 'var(--c4)', transition: 'all 0.3s',
            }} />
          ))}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'center' }}>
          {!isFirst && (
            <button onClick={() => setStep(step - 1)} className="boutline" style={{ padding: '15px 24px', fontSize: 14 }}>
              ← Zurück
            </button>
          )}
          <button className="bgold" style={{ width: 'auto', padding: '15px 36px', fontSize: 14 }}
            onClick={() => {
              if (isLast) setPhase('roleSelect')
              else setStep(step + 1)
            }}>
            {isLast ? "Los geht's" : 'Weiter →'}
          </button>
        </div>
        {/* Bottom spacer for iOS safe area */}
        <div style={{ flexShrink: 0, height: 30 }} />
      </div>
    </div>
  )
}
