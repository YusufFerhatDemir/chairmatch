'use client'

/**
 * Vermieter-Onboarding-Wizard — 4 Slides
 *
 * Klick auf "Vermieter" im V14-Welcome-Splitter führt hierhin.
 * 1-Click-System: User landet direkt im Inserat-Wizard, ohne "Wie es funktioniert"-Erklärung.
 *
 * Slide 1: Was vermietest du? (Stuhl/Liege/Kabine/OP-Raum/Kompletter Raum mit Anzahl-Stepper)
 * Slide 2: Standort & Ausstattung (Adresse + GPS + Fotos + Ausstattung)
 * Slide 3: Preise & Verfügbarkeit (Stunden/Tag/Woche/Monat + Tage + Uhrzeit)
 * Slide 4: Inhaber & Rechtliches (Firma + Inhaber + Gewerbe + AGB)
 *
 * ─────────────────────────────────────────────────────────────────────
 * DREI BEFUNDE AUS DER ONBOARDING-ANALYSE (P3)
 * ─────────────────────────────────────────────────────────────────────
 *
 * 1. DAS INSERAT ENTSTAND NIE.
 *    Vier Schritte lang Plaetze, Adresse, Ausstattung, Preise und
 *    Verfuegbarkeiten — und `submit()` legte alles im `localStorage` ab
 *    und leitete weiter. Es gab keine Route, die daraus eine Zeile in
 *    `rental_equipment` gemacht haette; die Tabelle kann jedes dieser
 *    Felder (`price_per_hour_cents` … `available_from`, `features`), sie
 *    bekam sie nur nie. Der Entwurf geht jetzt nach der Anmeldung an
 *    /api/onboarding/salon.
 *
 * 2. ZWEI DER FUENF KACHELN KENNT DIE DATENBANK NICHT.
 *    `rental_equipment_type_check` (Migration CM22, live) laesst genau
 *    'stuhl', 'liege', 'raum' und 'opraum' zu. Der Wizard bietet
 *    zusaetzlich `kabine` und `op` an — ein Insert damit waere an 23514
 *    gescheitert. Die Abbildung steht in onboarding.service.ts, damit die
 *    Auswahl des Vermieters erhalten bleibt (der Anzeigename „Kabine"
 *    bleibt, der Typ wird 'raum').
 *
 * 3. IBAN UND STEUER-ID LAGEN IM BROWSER.
 *    Beide waren Pflichtfelder, beide gingen in den `localStorage`, keines
 *    wurde je gelesen. Entfernt — Auszahlungsdaten werden nach der
 *    Anmeldung ueber /api/me/payout-account erhoben.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from '@/i18n/client'
import { BrandLogo } from '@/components/BrandLogo'
import { speichereEntwurf, euroZuCent } from '@/lib/onboarding-draft'

type PlaceId = 'stuhl' | 'liege' | 'kabine' | 'op' | 'raum'

interface PlaceType {
  id: PlaceId
  title: string
  sub: string
}

const PLACE_TYPES: PlaceType[] = [
  { id: 'stuhl',  title: 'Stuhl',           sub: 'Friseur · Barbershop' },
  { id: 'liege',  title: 'Liege',           sub: 'Kosmetik · Massage · Wimpern' },
  { id: 'kabine', title: 'Kabine',          sub: 'Privater Behandlungsraum' },
  { id: 'op',     title: 'OP-Raum',         sub: 'Medical · Ästhetik · Arzt' },
  { id: 'raum',   title: 'Kompletter Raum', sub: 'Tagesmiete · Workshop' },
]

const EQUIPMENT: { id: string; label: string }[] = [
  { id: 'wifi',     label: 'WLAN' },
  { id: 'mirror',   label: 'Spiegel' },
  { id: 'water',    label: 'Wasseranschluss' },
  { id: 'tools',    label: 'Werkzeuge' },
  { id: 'reception',label: 'Empfang' },
  { id: 'sterile',  label: 'Sterilisation' },
  { id: 'waiting',  label: 'Wartebereich' },
  { id: 'parking',  label: 'Parkplatz' },
]

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function VermieterOnboardingPage() {
  const router = useRouter()
  const t = useTranslations()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Slide 1
  const [counts, setCounts] = useState<Record<PlaceId, number>>({
    stuhl: 0, liege: 0, kabine: 0, op: 0, raum: 0,
  })

  // Slide 2
  const [address, setAddress] = useState('')
  const [equipment, setEquipment] = useState<Set<string>>(new Set())
  const [description, setDescription] = useState('')

  // Slide 3
  const [price, setPrice] = useState({ hour: '', day: '', week: '', month: '' })
  const [days, setDays] = useState<Set<string>>(new Set(['Mo', 'Di', 'Mi', 'Do', 'Fr']))
  const [timeFrom, setTimeFrom] = useState('09:00')
  const [timeTo, setTimeTo] = useState('18:00')

  // Slide 4
  const [legal, setLegal] = useState({ name: '', owner: '' })
  const [agreed, setAgreed] = useState({ agb: false, pros: false, hygiene: false, fee: false })

  const totalPlaces = Object.values(counts).reduce((a, b) => a + b, 0)

  const adjust = (id: PlaceId, delta: number) =>
    setCounts((c) => ({ ...c, [id]: Math.max(0, c[id] + delta) }))

  const toggle = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(val)) next.delete(val); else next.add(val)
    setter(next)
  }

  const canProceed = (): boolean => {
    if (step === 1) return totalPlaces > 0
    if (step === 2) return address.trim().length > 3
    if (step === 3) return !!price.day || !!price.hour
    // `legal.iban.trim().length > 5` stand hier als Pflichtbedingung fuer
    // ein Feld, dessen Inhalt nirgends ankam. Die Bankverbindung wird nach
    // der Anmeldung erhoben (siehe Kopfkommentar, Befund 3).
    if (step === 4) return (
      legal.name.trim().length > 1 &&
      legal.owner.trim().length > 1 &&
      agreed.agb && agreed.pros && agreed.hygiene && agreed.fee
    )
    return false
  }

  function next() {
    if (!canProceed()) return
    if (step < 4) setStep((s) => (s + 1) as 1 | 2 | 3 | 4)
    else submit()
  }

  function submit() {
    const plaetze = (Object.keys(counts) as PlaceId[])
      .filter((id) => counts[id] > 0)
      .map((id) => ({ art: id, anzahl: counts[id] }))

    speichereEntwurf('vermieter', {
      counts,
      address,
      equipment: [...equipment],
      description,
      price,
      days: [...days],
      timeFrom,
      timeTo,
      legal,
      uebernahme: {
        quelle: 'vermieter',
        salon: {
          name: legal.name,
          // Der Vermieter-Wizard fragt keine Branche ab. 'raum' ist die
          // neutrale Einordnung fuer reine Vermietung — kein geratenes
          // Gewerk. Der Salon ist ohnehin `is_active: false`, bis er
          // freigeschaltet wird, und die Kategorie ist danach in
          // /anbieter/mein-salon aenderbar.
          category: 'raum',
          address,
          description,
        },
        vermietung: {
          plaetze,
          features: [...equipment],
          beschreibung: description,
          // Preise kommen ausschliesslich aus der Eingabe. Was der
          // Vermieter leer laesst, bleibt leer — ohne Tagespreis geht das
          // Inserat offline online (Constraint `…_online_needs_price`).
          preise: {
            hour_cents: euroZuCent(price.hour),
            day_cents: euroZuCent(price.day),
            week_cents: euroZuCent(price.week),
            month_cents: euroZuCent(price.month),
          },
          available_days: [...days],
          available_from: timeFrom || null,
          available_to: timeTo || null,
        },
        einwilligungen: {
          agb: agreed.agb,
          profi_nachweis: agreed.pros,
          hygiene: agreed.hygiene,
          gebuehren: agreed.fee,
        },
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
          >
            ‹
          </button>
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
            {step === 1 && t('wizVermieter.s1Title')}
            {step === 2 && t('wizVermieter.s2Title')}
            {step === 3 && t('wizVermieter.s3Title')}
            {step === 4 && t('wizVermieter.s4Title')}
          </p>
          <p style={{ fontSize: 13, color: 'var(--cream)', margin: 0 }}>
            {step === 1 && t('wizVermieter.s1Subtitle')}
            {step === 2 && t('wizVermieter.s2Subtitle')}
            {step === 3 && 'Pro Platz eigene Preise möglich.'}
            {step === 4 && 'Pflichtangaben für die Vermietung.'}
          </p>
        </div>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {PLACE_TYPES.map((p) => {
              const active = counts[p.id] > 0
              return (
                <div key={p.id} style={{
                  background: 'var(--c1)',
                  border: active ? '1px solid #C4A86A' : '0.5px solid rgba(196,168,106,0.3)',
                  borderRadius: 14,
                  padding: '12px 14px 12px 12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flexShrink: 0 }}>
                      <BrandLogo size={68} variant="glow" animateStar={false} priority={false} />
                    </div>
                    <div>
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
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
                    <button
                      onClick={() => adjust(p.id, -1)}
                      aria-label={`${p.title} weniger`}
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: active ? 'rgba(196,168,106,0.15)' : 'transparent',
                        color: active ? '#C4A86A' : 'rgba(196,168,106,0.4)',
                        border: active ? '0.5px solid rgba(196,168,106,0.4)' : '0.5px solid rgba(196,168,106,0.2)',
                        fontSize: 15, cursor: 'pointer',
                      }}
                    >
                      −
                    </button>
                    <span className={active ? 'text-gold-metallic' : ''} style={{
                      fontWeight: 600, fontSize: 16, minWidth: 16, textAlign: 'center',
                      color: active ? undefined : 'rgba(232,230,218,0.55)',
                    }}>
                      {counts[p.id]}
                    </span>
                    <button
                      onClick={() => adjust(p.id, 1)}
                      aria-label={`${p.title} mehr`}
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'rgba(196,168,106,0.15)',
                        color: '#C4A86A',
                        border: '0.5px solid rgba(196,168,106,0.4)',
                        fontSize: 15, cursor: 'pointer',
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label htmlFor="onb-vermieter-adresse" style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Adresse *</label>
              <input
                id="onb-vermieter-adresse"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Musterstr. 1, 50667 Köln"
                style={{
                  width: '100%', marginTop: 4, padding: '10px 12px',
                  background: 'var(--c1)', color: 'var(--cream)',
                  border: '0.5px solid rgba(196,168,106,0.3)', borderRadius: 8,
                  fontSize: 13, fontFamily: 'inherit',
                }}
              />
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Fotos (min. 3, max. 12)</span>
              <div style={{
                background: 'var(--c1)', border: '0.5px dashed rgba(196,168,106,0.3)',
                borderRadius: 10, padding: 16, marginTop: 4, textAlign: 'center',
                color: 'rgba(232,230,218,0.6)', fontSize: 12, cursor: 'pointer',
              }}>
                ☁ Fotos hochladen
              </div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Ausstattung</span>
              <div role="group" aria-label="Ausstattung" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {EQUIPMENT.map((e) => {
                  const active = equipment.has(e.id)
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggle(equipment, e.id, setEquipment)}
                      style={{
                        padding: '6px 11px',
                        background: active ? 'rgba(196,168,106,0.15)' : 'var(--c1)',
                        color: active ? '#C4A86A' : 'rgba(232,230,218,0.7)',
                        border: active ? '0.5px solid #C4A86A' : '0.5px solid rgba(255,255,255,0.08)',
                        borderRadius: 7, fontSize: 11.5, cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {active ? '✓ ' : ''}{e.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label htmlFor="onb-vermieter-beschreibung" style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Kurzbeschreibung (max. 200 Zeichen)</label>
              <textarea
                id="onb-vermieter-beschreibung"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                rows={3}
                placeholder="Heller Salon im Zentrum, 2 freie Stühle, eigener Spiegel."
                style={{
                  width: '100%', marginTop: 4, padding: '10px 12px',
                  background: 'var(--c1)', color: 'var(--cream)',
                  border: '0.5px solid rgba(196,168,106,0.3)', borderRadius: 8,
                  fontSize: 12.5, fontFamily: 'inherit', resize: 'vertical',
                }}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['hour', 'day', 'week', 'month'] as const).map((k) => (
                <div key={k}>
                  <label htmlFor={`onb-vermieter-preis-${k}`} style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>
                    Pro {k === 'hour' ? 'Stunde' : k === 'day' ? 'Tag' : k === 'week' ? 'Woche' : 'Monat'}
                  </label>
                  <input
                    id={`onb-vermieter-preis-${k}`}
                    type="number"
                    value={price[k]}
                    onChange={(e) => setPrice({ ...price, [k]: e.target.value })}
                    placeholder="€"
                    style={{
                      width: '100%', marginTop: 4, padding: '9px 10px',
                      background: 'var(--c1)', color: 'var(--cream)',
                      border: '0.5px solid rgba(196,168,106,0.3)', borderRadius: 8,
                      fontSize: 13, fontFamily: 'inherit',
                    }}
                  />
                </div>
              ))}
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Verfügbare Tage</span>
              <div role="group" aria-label="Verfügbare Tage" style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {DAYS.map((d) => {
                  const active = days.has(d)
                  return (
                    <button
                      key={d}
                      onClick={() => toggle(days, d, setDays)}
                      style={{
                        flex: 1, padding: '7px 0',
                        background: active ? 'rgba(196,168,106,0.15)' : 'var(--c1)',
                        color: active ? '#C4A86A' : 'rgba(232,230,218,0.6)',
                        border: active ? '1px solid #C4A86A' : '0.5px solid rgba(196,168,106,0.25)',
                        borderRadius: 7, fontSize: 12, cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Uhrzeit</span>
              <div role="group" aria-label="Uhrzeit" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                <input
                  aria-label="Von"
                  type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)}
                  style={{
                    flex: 1, padding: '9px 10px',
                    background: 'var(--c1)', color: 'var(--cream)',
                    border: '0.5px solid rgba(196,168,106,0.3)', borderRadius: 8,
                    fontSize: 13, fontFamily: 'inherit',
                  }}
                />
                <span style={{ color: '#C4A86A' }}>—</span>
                <input
                  aria-label="Bis"
                  type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)}
                  style={{
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

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {(['name', 'owner'] as const).map((field) => (
              <div key={field}>
                <label htmlFor={`onb-vermieter-${field}`} style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>
                  {field === 'name' && 'Salon-/Firmenname *'}
                  {field === 'owner' && 'Inhaber *'}
                </label>
                <input
                  id={`onb-vermieter-${field}`}
                  type="text"
                  value={legal[field]}
                  onChange={(e) => setLegal({ ...legal, [field]: e.target.value })}
                  style={{
                    width: '100%', marginTop: 4, padding: '10px 12px',
                    background: 'var(--c1)', color: 'var(--cream)',
                    border: '0.5px solid rgba(196,168,106,0.3)', borderRadius: 8,
                    fontSize: 13, fontFamily: 'inherit',
                  }}
                />
              </div>
            ))}
            {/*
              „Steuer-ID / USt-ID *" und „IBAN für Auszahlungen *" standen
              hier als Pflichtfelder. Ihr Inhalt landete im `localStorage`
              und wurde von keiner Zeile Code gelesen — siehe Befund 3 im
              Kopfkommentar.
            */}
            <div style={{
              background: 'rgba(196,168,106,0.06)', border: '0.5px solid rgba(196,168,106,0.2)',
              borderRadius: 10, padding: '12px 14px', fontSize: 12,
              color: 'rgba(232,230,218,0.75)', lineHeight: 1.55,
            }}>
              Steuerdaten und Bankverbindung trägst du nach der Anmeldung unter
              „Auszahlung" ein — sicher gespeichert und später nur noch mit den
              letzten vier Stellen sichtbar.
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'rgba(232,230,218,0.7)' }}>Gewerbeanmeldung *</span>
              <div style={{
                background: 'var(--c1)', border: '0.5px dashed rgba(196,168,106,0.3)',
                borderRadius: 10, padding: 12, marginTop: 4, textAlign: 'center',
                color: 'rgba(232,230,218,0.6)', fontSize: 12, cursor: 'pointer',
              }}>
                📄 PDF/JPG hochladen (max. 5 MB)
              </div>
            </div>
            <div style={{
              background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
              borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 1.7,
            }}>
              {([
                { k: 'agb' as const,     l: <>Ich akzeptiere <a style={{ color: '#C4A86A' }}>AGB</a> &amp; <a style={{ color: '#C4A86A' }}>Vermieter-Bedingungen</a></> },
                { k: 'pros' as const,    l: 'Ich vermiete nur an Profis mit Berufsnachweis' },
                { k: 'hygiene' as const, l: 'Hygiene- & Arbeitsstättenverordnung erfüllt' },
                { k: 'fee' as const,     l: 'Ich akzeptiere 0 % Provision auf Vermietungen' },
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

        {/* Footer-Button */}
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
            {step === 1 && (totalPlaces > 0 ? `${totalPlaces} ${totalPlaces === 1 ? 'Platz' : 'Plätze'} gewählt` : 'Wähle mind. 1 Platz')}
            {step === 2 && 'Weiter zu Preisen'}
            {step === 3 && 'Weiter zu Rechtliches'}
            {step === 4 && '✦ Inserat veröffentlichen'}
          </span>
          <span>{step === 4 ? '✦' : '→'}</span>
        </button>

      </div>
    </div>
  )
}
