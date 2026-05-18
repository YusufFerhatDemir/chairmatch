'use client'

/**
 * Anbieter-Onboarding-Wizard — 4 Slides
 *
 * Klick auf "Anbieter" im V14-Welcome-Splitter führt hierhin.
 *
 * Slide 1: Was bietest du an? (10 Kategorien: Friseur/Barber/Kosmetik/Nagel/Massage/Wimpern/Ästhetik/Medical/Arzt/PMU)
 * Slide 2: Deine Services (Multi-Select pro Kategorie + Preis/Dauer)
 * Slide 3: Wer bist du? (Salon-Daten + Sprachen)
 * Slide 4: Rechtliches & Auszahlung (Gewerbe + Steuer-ID + IBAN + AGB)
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'
import {
  Paintbrush, Scissors, Sparkles, Hand, Heart, Eye,
  Syringe, Cross, Stethoscope, Pencil,
  type LucideIcon,
} from 'lucide-react'

type CatId = 'friseur' | 'barber' | 'kosmetik' | 'nagel' | 'massage' | 'wimpern' | 'aesthetik' | 'medical' | 'arzt' | 'pmu'

const CATEGORIES: { id: CatId; title: string; Icon: LucideIcon }[] = [
  { id: 'friseur',   title: 'Friseur',        Icon: Paintbrush },
  { id: 'barber',    title: 'Barbershop',     Icon: Scissors },
  { id: 'kosmetik',  title: 'Kosmetik',       Icon: Sparkles },
  { id: 'nagel',     title: 'Nagel',          Icon: Hand },
  { id: 'massage',   title: 'Massage',        Icon: Heart },
  { id: 'wimpern',   title: 'Wimpern',        Icon: Eye },
  { id: 'aesthetik', title: 'Ästhetik',       Icon: Syringe },
  { id: 'medical',   title: 'Medical Beauty', Icon: Cross },
  { id: 'arzt',      title: 'Arzt',           Icon: Stethoscope },
  { id: 'pmu',       title: 'PMU',            Icon: Pencil },
]

const SERVICES_BY_CAT: Record<CatId, { id: string; name: string; price: number; duration: number }[]> = {
  friseur: [
    { id: 'damenschnitt',  name: 'Damenschnitt',  price: 45, duration: 60 },
    { id: 'herrenschnitt', name: 'Herrenschnitt', price: 25, duration: 30 },
    { id: 'faerben',       name: 'Färben',        price: 60, duration: 90 },
  ],
  barber: [
    { id: 'bart',     name: 'Bart trimmen',     price: 15, duration: 20 },
    { id: 'rasur',    name: 'Hot-Towel-Rasur',  price: 30, duration: 45 },
  ],
  kosmetik: [
    { id: 'reinigung', name: 'Gesichtsreinigung', price: 50, duration: 60 },
    { id: 'peeling',   name: 'Peeling',           price: 70, duration: 75 },
  ],
  nagel: [
    { id: 'maniküre', name: 'Maniküre', price: 30, duration: 45 },
    { id: 'gelnaegel', name: 'Gel-Nägel', price: 50, duration: 90 },
  ],
  massage: [
    { id: 'klassisch', name: 'Klassische Massage', price: 60, duration: 60 },
    { id: 'shiatsu',   name: 'Shiatsu',            price: 80, duration: 90 },
  ],
  wimpern: [
    { id: 'extensions', name: 'Wimpern-Extensions', price: 90, duration: 120 },
    { id: 'lifting',    name: 'Wimpern-Lifting',    price: 60, duration: 60 },
  ],
  aesthetik: [
    { id: 'hydrafacial', name: 'HydraFacial', price: 120, duration: 60 },
    { id: 'microneedling', name: 'Microneedling', price: 150, duration: 75 },
  ],
  medical: [
    { id: 'botox',  name: 'Botox',           price: 250, duration: 30 },
    { id: 'filler', name: 'Hyaluron-Filler', price: 300, duration: 45 },
  ],
  arzt: [
    { id: 'beratung',  name: 'Beratung',         price: 80,  duration: 30 },
    { id: 'check',     name: 'Hautcheck',         price: 120, duration: 45 },
  ],
  pmu: [
    { id: 'augenbrauen', name: 'Augenbrauen',    price: 350, duration: 120 },
    { id: 'lippen',      name: 'Lippen',         price: 400, duration: 150 },
  ],
}

const LANGUAGES = ['DE', 'EN', 'TR', 'AR'] as const

export default function AnbieterOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  const [cats, setCats] = useState<Set<CatId>>(new Set())
  const [services, setServices] = useState<Set<string>>(new Set())
  const [profile, setProfile] = useState({ name: '', owner: '', address: '', phone: '', email: '' })
  const [languages, setLanguages] = useState<Set<string>>(new Set(['DE']))
  const [legal, setLegal] = useState({ tax: '', vat: '', iban: '' })
  const [agreed, setAgreed] = useState({ agb: false, gewerbe: false, newsletter: false })

  const toggleCat = (id: CatId) => {
    const next = new Set(cats)
    if (next.has(id)) next.delete(id); else next.add(id)
    setCats(next)
  }

  const toggleService = (id: string) => {
    const next = new Set(services)
    if (next.has(id)) next.delete(id); else next.add(id)
    setServices(next)
  }

  const toggleLang = (lang: string) => {
    const next = new Set(languages)
    if (next.has(lang)) next.delete(lang); else next.add(lang)
    setLanguages(next)
  }

  const canProceed = (): boolean => {
    if (step === 1) return cats.size > 0
    if (step === 2) return services.size > 0
    if (step === 3) return profile.name.trim().length > 1 && profile.owner.trim().length > 1 && profile.address.trim().length > 3
    if (step === 4) return legal.tax.trim().length > 1 && legal.iban.trim().length > 5 && agreed.agb && agreed.gewerbe
    return false
  }

  const next = () => {
    if (!canProceed()) return
    if (step < 4) setStep((s) => (s + 1) as 1 | 2 | 3 | 4)
    else submit()
  }

  const submit = () => {
    try { localStorage.setItem('cm_anbieter_draft', JSON.stringify({ cats: [...cats], services: [...services], profile, languages: [...languages], legal, agreed })) } catch {}
    router.push('/auth?mode=register&role=anbieter' as never)
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
            SCHRITT {step} / 4
          </div>
          <div style={{ width: 32 }} />
        </div>

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

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <p className="cinzel text-gold-metallic" style={{
            fontSize: 22, fontWeight: 500, letterSpacing: 1, margin: '0 0 6px',
          }}>
            {step === 1 && 'Was bietest du an?'}
            {step === 2 && 'Deine Services'}
            {step === 3 && 'Wer bist du?'}
            {step === 4 && 'Rechtliches & Auszahlung'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--cream)', margin: 0 }}>
            {step === 1 && 'Mehrere Kategorien möglich.'}
            {step === 2 && 'Wähle Services. Preise später anpassbar.'}
            {step === 3 && 'Diese Daten sehen Kunden im Profil.'}
            {step === 4 && 'Pflicht für gewerbliche Anbieter.'}
          </p>
        </div>

        {step === 1 && (
          <>
            {/* Shared SVG defs for gold-gradient icon stroke (same as HomeClient) */}
            <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
              <defs>
                <linearGradient id="caticon-gold-anb" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#BF953F" />
                  <stop offset="22%" stopColor="#FCF6BA" />
                  <stop offset="45%" stopColor="#B38728" />
                  <stop offset="67%" stopColor="#FBF5B7" />
                  <stop offset="100%" stopColor="#AA771C" />
                </linearGradient>
              </defs>
            </svg>
            <div className="cat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {CATEGORIES.map((c) => {
                const active = cats.has(c.id)
                const Icon = c.Icon
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleCat(c.id)}
                    className="catcard"
                    style={{
                      cursor: 'pointer',
                      border: active ? '1px solid #C4A86A' : undefined,
                    }}
                  >
                    <div className="caticon">
                      <Icon size={44} stroke="url(#caticon-gold-anb)" aria-label={c.title} />
                    </div>
                    <div className="catlbl">{c.title}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[...cats].map((catId) => {
              const cat = CATEGORIES.find((c) => c.id === catId)!
              const svcs = SERVICES_BY_CAT[catId] || []
              return (
                <div key={catId}>
                  <p className="cinzel text-gold-metallic" style={{
                    fontSize: 13, margin: '0 0 6px', padding: '4px 10px',
                    background: 'rgba(196,168,106,0.08)', borderRadius: 7,
                    borderLeft: '2px solid #C4A86A',
                  }}>{cat.title}</p>
                  <div style={{
                    background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
                    borderRadius: 10, padding: 10,
                  }}>
                    {svcs.map((s) => {
                      const active = services.has(s.id)
                      return (
                        <label key={s.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '6px 0', fontSize: 12.5, color: 'var(--cream)', cursor: 'pointer',
                          borderBottom: '0.5px solid rgba(196,168,106,0.08)',
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                              type="checkbox" checked={active}
                              onChange={() => toggleService(s.id)}
                              style={{ accentColor: '#C4A86A' }}
                            />
                            {s.name}
                          </span>
                          <span style={{ color: 'rgba(232,230,218,0.6)' }}>€{s.price} · {s.duration}min</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {([
              { k: 'name' as const,    l: 'Salon-Name *' },
              { k: 'owner' as const,   l: 'Inhaber *' },
              { k: 'address' as const, l: 'Adresse *' },
              { k: 'phone' as const,   l: 'Telefon *' },
              { k: 'email' as const,   l: 'E-Mail *' },
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
              <label style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Logo (optional)</label>
              <div style={{
                background: 'var(--c1)', border: '0.5px dashed rgba(196,168,106,0.3)',
                borderRadius: 10, padding: 14, marginTop: 4, textAlign: 'center',
                color: 'rgba(232,230,218,0.6)', fontSize: 12, cursor: 'pointer',
              }}>☁ Logo hochladen</div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Sprachen die du sprichst</label>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {LANGUAGES.map((lang) => {
                  const active = languages.has(lang)
                  return (
                    <button
                      key={lang}
                      onClick={() => toggleLang(lang)}
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
            {([
              { k: 'tax' as const,  l: 'Steuer-ID *' },
              { k: 'vat' as const,  l: 'USt-ID (falls vorhanden)' },
              { k: 'iban' as const, l: 'IBAN für Auszahlung *' },
            ]).map(({ k, l }) => (
              <div key={k}>
                <label style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>{l}</label>
                <input
                  type="text" value={legal[k]}
                  onChange={(e) => setLegal({ ...legal, [k]: e.target.value })}
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
              <label style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Gewerbeanmeldung *</label>
              <div style={{
                background: 'var(--c1)', border: '0.5px dashed rgba(196,168,106,0.3)',
                borderRadius: 10, padding: 12, marginTop: 4, textAlign: 'center',
                color: 'rgba(232,230,218,0.6)', fontSize: 12, cursor: 'pointer',
              }}>📄 PDF/JPG hochladen (max. 5 MB)</div>
            </div>
            <div style={{
              background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
              borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 1.7,
            }}>
              {([
                { k: 'agb' as const,        l: <>Ich akzeptiere <a style={{ color: '#C4A86A' }}>AGB</a> & <a style={{ color: '#C4A86A' }}>Datenschutz</a></> },
                { k: 'gewerbe' as const,    l: 'Ich bin gewerblich tätig (UWG §5 & HWG)' },
                { k: 'newsletter' as const, l: 'Newsletter (max. 1×/Monat, optional)' },
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
            {step === 1 && (cats.size > 0 ? `${cats.size} Kategorie${cats.size === 1 ? '' : 'n'} gewählt` : 'Wähle mind. 1')}
            {step === 2 && (services.size > 0 ? `${services.size} Service${services.size === 1 ? '' : 's'} aktiv` : 'Wähle Services')}
            {step === 3 && 'Weiter zu Rechtliches'}
            {step === 4 && '✦ Profil veröffentlichen'}
          </span>
          <span>{step === 4 ? '✦' : '→'}</span>
        </button>

      </div>
    </div>
  )
}
