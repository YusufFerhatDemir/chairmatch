'use client'

/**
 * Anbieter-Onboarding-Wizard — 4 Slides
 *
 * Klick auf "Anbieter" im V14-Welcome-Splitter führt hierhin.
 *
 * Slide 1: Was bietest du an? (10 Kategorien: Friseur/Barber/Kosmetik/Nagel/Massage/Wimpern/Ästhetik/Medical/Arzt/PMU)
 * Slide 2: Deine Services (Multi-Select pro Kategorie + eigener Preis/Dauer)
 * Slide 3: Wer bist du? (Salon-Daten + Sprachen)
 * Slide 4: Rechtliches (Gewerbe + AGB)
 *
 * ─────────────────────────────────────────────────────────────────────
 * DREI BEFUNDE AUS DER ONBOARDING-ANALYSE (P3)
 * ─────────────────────────────────────────────────────────────────────
 *
 * 1. DER GANZE WIZARD ENDETE IM NICHTS.
 *    `submit()` schrieb den Entwurf in den `localStorage` und schickte den
 *    Anbieter auf /auth. Danach las ihn niemand mehr: es gab keine Route,
 *    die daraus einen Salon, eine Leistung oder ein Inserat gemacht haette.
 *    Wer die vier Schritte vollstaendig ausfuellte, hatte danach keinen
 *    Salon und die Rolle `kunde` — und wurde von (provider)/layout.tsx
 *    wieder auf /auth geworfen. Der Entwurf geht jetzt nach der Anmeldung
 *    an /api/onboarding/salon (siehe src/lib/onboarding-draft.ts).
 *
 * 2. DAS ZIEL DER WEITERLEITUNG GAB ES NICHT.
 *    `router.push('/auth?mode=register&role=anbieter')` — die Auth-Seite
 *    liest aber `?tab=register`; `mode` und `role` kennt sie nicht. Der
 *    Anbieter landete deshalb auf dem LOGIN-Tab, ohne Konto. Korrigiert.
 *
 * 3. DIE PREISE WAREN ERFUNDEN.
 *    `SERVICES_BY_CAT` enthielt feste Betraege (Damenschnitt 45 €,
 *    Botox 250 €, …) — Zahlen, die niemand entschieden hat und die
 *    ausserdem denen in `SVC_CATALOG` (src/lib/constants.ts) widersprachen
 *    (Herrenschnitt: hier 25 €, dort 28 €). Der Anbieter setzt seinen Preis
 *    jetzt selbst; der Katalog liefert nur noch Name und Dauer.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from '@/i18n/client'
import { BrandLogo } from '@/components/BrandLogo'
import { speichereEntwurf, euroZuCent } from '@/lib/onboarding-draft'

type CatId = 'friseur' | 'barber' | 'kosmetik' | 'nagel' | 'massage' | 'wimpern' | 'aesthetik' | 'medical' | 'arzt' | 'pmu'

const CATEGORIES: { id: CatId; title: string }[] = [
  { id: 'friseur',   title: 'Friseur' },
  { id: 'barber',    title: 'Barbershop' },
  { id: 'kosmetik',  title: 'Kosmetik' },
  { id: 'nagel',     title: 'Nagel' },
  { id: 'massage',   title: 'Massage' },
  { id: 'wimpern',   title: 'Wimpern' },
  { id: 'aesthetik', title: 'Ästhetik' },
  { id: 'medical',   title: 'Medical Beauty' },
  { id: 'arzt',      title: 'Arzt' },
  { id: 'pmu',       title: 'Permanent Make-Up' },
]

/**
 * Leistungs-Katalog — NUR Name und Dauer.
 *
 * Hier standen bis zur Onboarding-Analyse feste Preise (`price: 45` fuer
 * den Damenschnitt, `price: 250` fuer Botox, …). Das war eine doppelte
 * Erfindung: die Betraege hat niemand entschieden, und sie widersprachen
 * dem zweiten, gleichnamigen Katalog in src/lib/constants.ts
 * (`SVC_CATALOG`), der fuer denselben Herrenschnitt 28 € statt 25 €
 * auswies. Welcher der beiden Kataloge gelten soll, ist eine
 * Produktentscheidung — sie wird hier nicht heimlich getroffen.
 *
 * Der Preis kommt jetzt aus der Eingabe des Anbieters. Wer keinen angibt,
 * bekommt die Leistung inaktiv angelegt (siehe onboarding.service.ts) —
 * nicht kostenlos und nicht zu einem geschaetzten Betrag.
 *
 * Die Dauern bleiben: eine Dauer ist eine fachliche Groesse des Handwerks,
 * kein Preisschild, und sie ist im Salon jederzeit aenderbar.
 */
const SERVICES_BY_CAT: Record<CatId, { id: string; name: string; duration: number }[]> = {
  friseur: [
    { id: 'damenschnitt',  name: 'Damenschnitt',  duration: 60 },
    { id: 'herrenschnitt', name: 'Herrenschnitt', duration: 30 },
    { id: 'faerben',       name: 'Färben',        duration: 90 },
  ],
  barber: [
    { id: 'bart',     name: 'Bart trimmen',     duration: 20 },
    { id: 'rasur',    name: 'Hot-Towel-Rasur',  duration: 45 },
  ],
  kosmetik: [
    { id: 'reinigung', name: 'Gesichtsreinigung', duration: 60 },
    { id: 'peeling',   name: 'Peeling',           duration: 75 },
  ],
  nagel: [
    { id: 'maniküre', name: 'Maniküre', duration: 45 },
    { id: 'gelnaegel', name: 'Gel-Nägel', duration: 90 },
  ],
  massage: [
    { id: 'klassisch', name: 'Klassische Massage', duration: 60 },
    { id: 'shiatsu',   name: 'Shiatsu',            duration: 90 },
  ],
  wimpern: [
    { id: 'extensions', name: 'Wimpern-Extensions', duration: 120 },
    { id: 'lifting',    name: 'Wimpern-Lifting',    duration: 60 },
  ],
  aesthetik: [
    { id: 'hydrafacial', name: 'HydraFacial', duration: 60 },
    { id: 'microneedling', name: 'Microneedling', duration: 75 },
  ],
  medical: [
    { id: 'botox',  name: 'Botox',           duration: 30 },
    { id: 'filler', name: 'Hyaluron-Filler', duration: 45 },
  ],
  arzt: [
    { id: 'beratung',  name: 'Beratung',         duration: 30 },
    { id: 'check',     name: 'Hautcheck',         duration: 45 },
  ],
  pmu: [
    { id: 'augenbrauen', name: 'Augenbrauen',    duration: 120 },
    { id: 'lippen',      name: 'Lippen',         duration: 150 },
  ],
}

const LANGUAGES = ['DE', 'EN', 'TR', 'AR'] as const

export default function AnbieterOnboardingPage() {
  const router = useRouter()
  const t = useTranslations()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  const [cats, setCats] = useState<Set<CatId>>(new Set())
  const [services, setServices] = useState<Set<string>>(new Set())
  const [profile, setProfile] = useState({ name: '', owner: '', address: '', phone: '', email: '' })
  const [languages, setLanguages] = useState<Set<string>>(new Set(['DE']))
  /** Preis je Leistung in Euro, wie eingetippt. Leer = keine Angabe. */
  const [preise, setPreise] = useState<Record<string, string>>({})
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
    // Schritt 4 verlangte bis zur Onboarding-Analyse Steuer-ID UND IBAN.
    // Beide Felder hatten kein Ziel: sie landeten im `localStorage` und
    // wurden nie gelesen — /api/register-provider hat die IBAN aus demselben
    // Grund bereits entfernt. Auszahlungsdaten gehoeren nach der Anmeldung
    // in /anbieter/mein-salon/auszahlung (→ payout_accounts). Es bleiben die
    // beiden Zusagen, die tatsaechlich protokolliert werden.
    if (step === 4) return agreed.agb && agreed.gewerbe
    return false
  }

  const next = () => {
    if (!canProceed()) return
    if (step < 4) setStep((s) => (s + 1) as 1 | 2 | 3 | 4)
    else submit()
  }

  const submit = () => {
    // Die ausgewaehlten Leistungen werden hier mit Name und Dauer
    // ausgeschrieben — der Server soll den Katalog nicht kennen muessen,
    // und ein spaeterer Katalog-Umbau darf einen liegenden Entwurf nicht
    // entwerten.
    const leistungen = [...cats].flatMap((catId) =>
      (SERVICES_BY_CAT[catId] || [])
        .filter((s) => services.has(s.id))
        .map((s) => ({
          name: s.name,
          duration_minutes: s.duration,
          price_cents: euroZuCent(preise[s.id]),
        })),
    )

    speichereEntwurf('anbieter', {
      // `cats` bleibt: /anbieter/mein-salon leitet daraus den
      // Hygiene-Hinweis ab, /konto die angezeigte Rolle.
      cats: [...cats],
      services: [...services],
      profile,
      languages: [...languages],
      agreed,
      uebernahme: {
        quelle: 'anbieter',
        salon: {
          name: profile.name,
          category: [...cats][0] || 'friseur',
          address: profile.address,
          phone: profile.phone,
        },
        leistungen,
        einwilligungen: { agb: agreed.agb, gewerbeschein_angegeben: agreed.gewerbe },
      },
    })
    router.push('/auth?tab=register' as never)
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
            {t('wizard.step')} {step} / 4
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
            {step === 1 && t('wizAnbieter.s1Title')}
            {step === 2 && t('wizAnbieter.s2Title')}
            {step === 3 && t('wizAnbieter.s3Title')}
            {step === 4 && t('wizAnbieter.s4Title')}
          </p>
          <p style={{ fontSize: 13, color: 'var(--cream)', margin: 0 }}>
            {step === 1 && t('wizAnbieter.s1Subtitle')}
            {step === 2 && t('wizAnbieter.s2Subtitle')}
            {step === 3 && t('wizAnbieter.s3Subtitle')}
            {step === 4 && t('wizAnbieter.s4Subtitle')}
          </p>
        </div>

        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CATEGORIES.map((c) => {
              const active = cats.has(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCat(c.id)}
                  style={{
                    background: 'var(--c1)',
                    border: active ? '1px solid #C4A86A' : '0.5px solid rgba(196,168,106,0.25)',
                    borderRadius: 12, padding: '14px 8px',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 6,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <BrandLogo size={42} variant="glow" animateStar={false} priority={false} />
                  <span className={active ? 'cinzel text-gold-metallic' : 'cinzel'} style={{
                    fontSize: 12.5, fontWeight: 500, color: active ? undefined : 'var(--cream)',
                  }}>
                    {c.title}
                  </span>
                </button>
              )
            })}
          </div>
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
                        <div key={s.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          gap: 8, padding: '6px 0', fontSize: 12.5, color: 'var(--cream)',
                          borderBottom: '0.5px solid rgba(196,168,106,0.08)',
                        }}>
                          <label htmlFor={`onb-svc-${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                            <input
                              id={`onb-svc-${s.id}`}
                              type="checkbox" checked={active}
                              onChange={() => toggleService(s.id)}
                              style={{ accentColor: '#C4A86A' }}
                            />
                            {s.name}
                          </label>
                          {/*
                            Hier stand „€45 · 60min" — ein Preis, den niemand
                            entschieden hat. Der Anbieter tippt ihn jetzt
                            selbst; leer bleiben ist erlaubt und legt die
                            Leistung inaktiv an, statt einen Betrag zu raten.
                          */}
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(232,230,218,0.6)' }}>
                            <label htmlFor={`onb-preis-${s.id}`} className="sr-only">
                              Preis für {s.name} in Euro
                            </label>
                            <input
                              id={`onb-preis-${s.id}`}
                              type="text" inputMode="decimal"
                              value={preise[s.id] ?? ''}
                              disabled={!active}
                              placeholder="Preis €"
                              onChange={(e) => setPreise({ ...preise, [s.id]: e.target.value })}
                              style={{
                                width: 74, padding: '5px 7px', textAlign: 'right',
                                background: 'var(--c2)', color: 'var(--cream)',
                                border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 6,
                                fontSize: 12, fontFamily: 'inherit',
                                opacity: active ? 1 : 0.4,
                              }}
                            />
                            <span style={{ minWidth: 42 }}>{s.duration}min</span>
                          </span>
                        </div>
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
                <label htmlFor={`onb-anbieter-${k}`} style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>{l}</label>
                <input
                  id={`onb-anbieter-${k}`}
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
              <span style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Logo (optional)</span>
              <div style={{
                background: 'var(--c1)', border: '0.5px dashed rgba(196,168,106,0.3)',
                borderRadius: 10, padding: 14, marginTop: 4, textAlign: 'center',
                color: 'rgba(232,230,218,0.6)', fontSize: 12, cursor: 'pointer',
              }}>☁ Logo hochladen</div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Sprachen die du sprichst</span>
              <div role="group" aria-label="Sprachen die du sprichst" style={{ display: 'flex', gap: 6, marginTop: 4 }}>
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
            {/*
              Hier standen drei Eingabefelder: Steuer-ID, USt-ID und
              „IBAN für Auszahlung *". Sie waren Pflicht, und sie gingen
              nirgendwohin — der komplette `legal`-Block landete im
              `localStorage` und wurde von keiner Zeile Code wieder gelesen.
              Eine Bankverbindung, die im Browser liegen bleibt statt in
              `payout_accounts` anzukommen, ist die schlechtere Haelfte von
              beidem; /api/register-provider hat dasselbe Feld aus demselben
              Grund bereits entfernt.

              Die Auszahlungsdaten werden nach der Anmeldung erhoben, unter
              /anbieter/mein-salon/auszahlung — dort gehen sie ueber
              /api/me/payout-account in die Datenbank und kommen nur noch
              mit den letzten vier Stellen zurueck.
            */}
            <div style={{
              background: 'rgba(196,168,106,0.06)', border: '0.5px solid rgba(196,168,106,0.2)',
              borderRadius: 10, padding: '12px 14px', fontSize: 12,
              color: 'rgba(232,230,218,0.75)', lineHeight: 1.55,
            }}>
              Steuerdaten und Bankverbindung trägst du nach der Anmeldung in
              deinem Salon-Bereich unter „Auszahlung" ein — sicher gespeichert
              und für dich später nur noch mit den letzten vier Stellen sichtbar.
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Gewerbeanmeldung *</span>
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
