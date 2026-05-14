'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { CATEGORIES, SVC_CATALOG, EQUIP_CATALOG } from '@/lib/constants'
import { Scissors, Paintbrush, Sparkles, Syringe, Hand, Heart, Eye, Stethoscope, Cross, type LucideIcon } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { BackBtn, GoldGradientDefs } from './helpers'

/**
 * Provider-/B2B-Setup-Wizard — 5 Schritte:
 *   1) Kategorie wählen
 *   2) Services markieren / hinzufügen
 *   3) Equipment markieren / hinzufügen
 *   4) Profil-Daten ausfüllen
 *   5) Zusammenfassung + AGB + Bestätigen
 *
 * Aus OnboardingGate ausgegliedert — kapselt den ~300-Zeilen-Wizard inkl.
 * komplettem internen State. Parent muss nur das Profile-State teilen und
 * `onComplete(role)` empfangen.
 */

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

export interface ProviderProfileData {
  vn: string; nn: string; email: string; phone: string; city: string
  biz: string; street: string; plz: string; iban: string; ustid: string
}

export interface ProviderSetupResult {
  role: 'PROVIDER' | 'B2B'
  cat: string
  services: string[]
  customServices: { nm: string; dur: number; pr: number }[]
  equipment: string[]
  customEquipment: { nm: string; pr: number; icon: string }[]
}

export interface ProviderSetupWizardProps {
  role: 'PROVIDER' | 'B2B'
  profile: ProviderProfileData
  updateProfile: (key: keyof ProviderProfileData, val: string) => void
  isProfileValid: boolean
  /** Aufruf bei finalem "Profil erstellen" — Parent kümmert sich um Persistierung.
   *  Bekommt die finalen Wizard-Daten (Kategorie, Services, Equipment) zurück. */
  onComplete: (result: ProviderSetupResult) => void
  /** Zurück zur Rolle-Auswahl */
  onBack: () => void
  showToast: (msg: string) => void
}

export function ProviderSetupWizard({
  role, profile, updateProfile, isProfileValid, onComplete, onBack, showToast,
}: ProviderSetupWizardProps) {
  const t = useTranslations()

  const [provStep, setProvStep] = useState(1)
  const [provCat, setProvCat] = useState('')
  const [provServices, setProvServices] = useState<string[]>([])
  const [customServices, setCustomServices] = useState<{ nm: string; dur: number; pr: number }[]>([])
  const [provEquip, setProvEquip] = useState<string[]>([])
  const [customEquip, setCustomEquip] = useState<{ nm: string; pr: number; icon: string }[]>([])
  const [agb, setAgb] = useState(false)
  const [csNm, setCsNm] = useState('')
  const [csDur, setCsDur] = useState('')
  const [csPr, setCsPr] = useState('')
  const [ceNm, setCeNm] = useState('')
  const [cePr, setCePr] = useState('')

  const provCategories = useMemo(
    () => CATEGORIES.filter((c) => !['angebote', 'termin'].includes(c.id)),
    []
  )

  const allServices = useMemo(() => {
    return [...(SVC_CATALOG[provCat] || []), ...customServices]
  }, [provCat, customServices])

  const allEquip = useMemo(() => {
    return [...(EQUIP_CATALOG[provCat] || []), ...customEquip]
  }, [provCat, customEquip])

  const provBack = () => {
    if (provStep === 1) onBack()
    else setProvStep(provStep - 1)
  }

  const shell = (content: React.ReactNode) => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg)', width: '100%', maxWidth: 'var(--shell-max)', margin: '0 auto' }}>
      <GoldGradientDefs />
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
        <div style={{ flexShrink: 0, height: 30 }} />
      </div>
    </div>
  )

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

  // ── Step 1: Category ──
  if (provStep === 1) {
    return shell(<>
      <BackBtn onClick={provBack} label={t('onboarding.back')} />
      {progressBar}
      <p className="cinzel" style={{ fontSize: 20, fontWeight: 600, color: 'var(--gold2)', marginBottom: 6 }}>Was ist dein Handwerk?</p>
      <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 20 }}>Wähle deine Branche</p>
      <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {provCategories.map(cat => (
          <button key={cat.id} type="button" onClick={() => {
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
              {(() => { const Icon = CAT_LUCIDE[cat.id]; return Icon ? <Icon size={40} stroke="url(#caticon-gold)" aria-label={cat.label} /> : null })()}
            </div>
            <div className="catlbl" style={{ fontSize: 12 }}>{cat.label}</div>
            <div className="catsub">{cat.sub}</div>
          </button>
        ))}
      </div>
      <button type="button" className="bgold" disabled={!provCat} style={{ marginTop: 20 }} onClick={() => {
        const catSvcs = SVC_CATALOG[provCat] || []
        setProvServices(catSvcs.slice(0, 3).map(s => s.nm))
        setProvStep(2)
      }}>
        {t('onboarding.next')}
      </button>
    </>)
  }

  // ── Step 2: Services ──
  if (provStep === 2) {
    const toggleSvc = (nm: string) =>
      setProvServices(prev => prev.includes(nm) ? prev.filter(s => s !== nm) : [...prev, nm])
    const toggleAllSvcs = () => {
      if (provServices.length === allServices.length) setProvServices([])
      else setProvServices(allServices.map(s => s.nm))
    }
    const addCustomSvc = () => {
      if (!csNm.trim()) { showToast('Bitte Name eingeben'); return }
      if (allServices.some(s => s.nm === csNm.trim())) { showToast('Existiert bereits'); return }
      const svc = { nm: csNm.trim(), dur: Number(csDur) || 30, pr: Number(csPr) || 0 }
      setCustomServices(prev => [...prev, svc])
      setProvServices(prev => [...prev, svc.nm])
      setCsNm(''); setCsDur(''); setCsPr('')
    }

    return shell(<>
      <BackBtn onClick={provBack} label={t('onboarding.back')} />
      {progressBar}
      <p className="cinzel" style={{ fontSize: 20, fontWeight: 600, color: 'var(--gold2)', marginBottom: 6 }}>Deine Services</p>
      <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 20, textAlign: 'center' }}>Tippe zum Aktivieren. Eigene Services kannst du unten hinzufügen.</p>

      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--gold2)', fontWeight: 700 }}>{provServices.length} aktiv</span>
        <button type="button" onClick={toggleAllSvcs} style={{ fontSize: 12, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>
          {provServices.length === allServices.length ? 'Alle aus' : 'Alle an'}
        </button>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {allServices.map(s => {
          const active = provServices.includes(s.nm)
          const isCustom = customServices.some(cs => cs.nm === s.nm)
          return (
            <button key={s.nm} type="button" onClick={() => toggleSvc(s.nm)} style={{
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

      <div style={{ width: '100%', marginTop: 14, padding: 14, border: '1.5px dashed var(--border)', borderRadius: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--stone)', marginBottom: 10 }}>+ Eigenen Service hinzufügen</p>
        <input className="inp" placeholder="Name (z.B. Trockenschnitt)" value={csNm} onChange={e => setCsNm(e.target.value)} style={{ marginBottom: 8, fontSize: 13 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="inp" type="number" placeholder="Dauer (min)" value={csDur} onChange={e => setCsDur(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
          <input className="inp" type="number" placeholder="Preis (€)" value={csPr} onChange={e => setCsPr(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
        </div>
        <button type="button" onClick={addCustomSvc} className="boutline" style={{ marginTop: 10, padding: '8px 16px', fontSize: 12, width: '100%' }}>+ Hinzufügen</button>
      </div>

      <button type="button" className="bgold" disabled={provServices.length === 0} style={{ marginTop: 20 }} onClick={() => {
        const catEq = EQUIP_CATALOG[provCat] || []
        setProvEquip(catEq.filter(e => e.pr === 0).map(e => e.nm))
        setProvStep(3)
      }}>
        {t('onboarding.next')}
      </button>
    </>)
  }

  // ── Step 3: Equipment ──
  if (provStep === 3) {
    const toggleEq = (nm: string) =>
      setProvEquip(prev => prev.includes(nm) ? prev.filter(e => e !== nm) : [...prev, nm])
    const toggleAllEq = () => {
      if (provEquip.length === allEquip.length) setProvEquip([])
      else setProvEquip(allEquip.map(e => e.nm))
    }
    const addCustomEq = () => {
      if (!ceNm.trim()) { showToast('Bitte Name eingeben'); return }
      if (allEquip.some(e => e.nm === ceNm.trim())) { showToast('Existiert bereits'); return }
      const eq = { nm: ceNm.trim(), pr: Number(cePr) || 0, icon: '' }
      setCustomEquip(prev => [...prev, eq])
      setProvEquip(prev => [...prev, eq.nm])
      setCeNm(''); setCePr('')
    }
    const hasEquip = allEquip.length > 0

    return shell(<>
      <BackBtn onClick={provBack} label={t('onboarding.back')} />
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
            <button type="button" onClick={toggleAllEq} style={{ fontSize: 12, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {provEquip.length === allEquip.length ? 'Alle aus' : 'Alle an'}
            </button>
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {allEquip.map(eq => {
              const active = provEquip.includes(eq.nm)
              const isCustom = customEquip.some(ce => ce.nm === eq.nm)
              return (
                <button key={eq.nm} type="button" onClick={() => toggleEq(eq.nm)} style={{
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

      <div style={{ width: '100%', marginTop: 14, padding: 14, border: '1.5px dashed var(--border)', borderRadius: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--stone)', marginBottom: 10 }}>+ Eigenes Gerät hinzufügen</p>
        <input className="inp" placeholder="Name (z.B. Dampfgerät)" value={ceNm} onChange={e => setCeNm(e.target.value)} style={{ marginBottom: 8, fontSize: 13 }} />
        <input className="inp" type="number" placeholder="Aufpreis pro Tag (€)" value={cePr} onChange={e => setCePr(e.target.value)} style={{ fontSize: 13 }} />
        <button type="button" onClick={addCustomEq} className="boutline" style={{ marginTop: 10, padding: '8px 16px', fontSize: 12, width: '100%' }}>+ Hinzufügen</button>
      </div>

      <button type="button" className="bgold" style={{ marginTop: 20 }} onClick={() => setProvStep(4)}>
        {t('onboarding.next')}
      </button>
    </>)
  }

  // ── Step 4: Profile ──
  if (provStep === 4) {
    return shell(<>
      <BackBtn onClick={provBack} label={t('onboarding.back')} />
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

      <button type="button" className="bgold" disabled={!isProfileValid} style={{ marginTop: 20 }} onClick={() => setProvStep(5)}>
        {t('onboarding.next')}
      </button>
    </>)
  }

  // ── Step 5: Summary ──
  const catLabel = CATEGORIES.find(c => c.id === provCat)?.label || provCat
  return shell(<>
    <BackBtn onClick={provBack} label={t('onboarding.back')} />
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

    <button type="button" onClick={() => setAgb(!agb)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'var(--c2)', borderRadius: 12, border: agb ? '1px solid var(--gold)' : '1px solid var(--border)', cursor: 'pointer', marginBottom: 20 }}>
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

    <button type="button" className="bgold" disabled={!agb} onClick={() => {
      showToast(`Bestätigungsmail gesendet an ${profile.email} ✉️`)
      setTimeout(() => onComplete({
        role,
        cat: provCat,
        services: provServices,
        customServices,
        equipment: provEquip,
        customEquipment: customEquip,
      }), 800)
    }}>
      Profil erstellen & Bestätigungsmail erhalten
    </button>
    <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 12, textAlign: 'center', lineHeight: 1.5 }}>
      Du erhältst eine Bestätigungs-E-Mail an <strong style={{ color: 'var(--cream)' }}>{profile.email}</strong>. Dein Profil wird nach Prüfung freigeschaltet.
    </p>
  </>)
}
