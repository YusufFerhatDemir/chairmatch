'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'
import { berlinToday } from '@/lib/berlin-time'
import { tagGesperrt as tagGesperrtFuer, TAG_GESPERRT_TEXT } from '@/lib/booking-days'

/**
 * Termin buchen — /salon/[slug]/buchen
 *
 * Diese Seite war bis Track 6 vollstaendig erfunden, und zwar in jedem
 * Schritt:
 *
 *  - Schritt 1 zeigte vier fest verdrahtete Leistungen mit erfundenen Preisen
 *    (`MOCK_SERVICES`) — bei JEDEM Salon dieselben. Was der Salon wirklich
 *    anbietet und was es kostet, stand daneben in der Datenbank.
 *  - Schritt 2 zeigte eine fest verdrahtete Slot-Liste (`TIME_SLOTS`) mit
 *    erfundenen `free`-Flags. Jeder Besucher sah dieselben "freien" Zeiten,
 *    unabhaengig von Salon, Datum und Bestandsbuchungen. Genau das ist die
 *    Doppelbuchung: 09:30 galt als frei, auch wenn dort laengst ein Termin
 *    lag — und `/api/availability`, das die echte Belegung kennt, wurde nie
 *    gefragt.
 *  - Schritt 3 leitete mit dem erfundenen Preis in der URL auf die
 *    Bezahlseite, die die "Buchung" in `localStorage` legte und meldete, sie
 *    sei gespeichert. In der Datenbank stand nie etwas; der Salon erfuhr von
 *    keinem einzigen dieser Termine.
 *
 * Jetzt: Leistungen und Preise aus `/api/salons/[slug]`, freie Zeiten aus
 * `/api/availability` (dieselbe Belegungsrechnung, die auch `createBooking`
 * benutzt), und gebucht wird ueber `POST /api/bookings` — mit Slot-Pruefung,
 * Nachpruefung und, sobald die Migration eingespielt ist, dem
 * EXCLUDE-Constraint dahinter.
 */

interface ApiService {
  id: string
  name: string
  description?: string | null
  duration_minutes?: number | null
  price_cents?: number | null
  risk_level?: string | null
}

interface ApiSalon {
  id: string
  name?: string
  services?: ApiService[]
  /*
   * Beide Felder stehen schon in `SALON_PUBLIC_COLUMNS` von
   * /api/salons/[slug] — diese Seite hat sie nur nie angesehen.
   */
  state?: string | null
  opening_hours?: unknown
}

const DAY_NAMES = ['Mo','Di','Mi','Do','Fr','Sa','So']
const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

function buildCalendar(year: number, month: number): Array<number | null> {
  const first = new Date(Date.UTC(year, month, 1))
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const offset = (first.getUTCDay() + 6) % 7
  const days: Array<number | null> = []
  for (let i = 0; i < offset; i++) days.push(null)
  for (let d = 1; d <= last; d++) days.push(d)
  return days
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Preis nur zeigen, wenn der Salon einen hinterlegt hat — nie einen erfinden. */
function priceLabel(cents: number | null | undefined): string | null {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return null
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`
}

export default function BuchenPage() {
  const router = useRouter()
  const params = useParams()
  const slug = (params?.slug as string) || ''

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [salon, setSalon] = useState<ApiSalon | null>(null)
  const [salonFehler, setSalonFehler] = useState<string | null>(null)
  const [laedtSalon, setLaedtSalon] = useState(true)

  const [serviceId, setServiceId] = useState<string>('')
  const [date, setDate] = useState<{ y: number; m: number; d: number } | null>(null)
  const [timeSlot, setTimeSlot] = useState<string>('')

  const [slots, setSlots] = useState<string[]>([])
  const [laedtSlots, setLaedtSlots] = useState(false)
  const [slotFehler, setSlotFehler] = useState<string | null>(null)
  /**
   * Der Grund, den `/api/availability` mitschickt (`message`), wenn der Tag
   * nicht am Andrang liegt: Feiertag, Ruhetag, gesperrter Salon.
   *
   * Bis hierher hat diese Seite das Feld weggeworfen und JEDEN leeren Tag mit
   * „An diesem Tag ist nichts mehr frei" beschriftet — auch den 25. Dezember
   * und den Salon, den die Plattform gerade gesperrt hat. Das ist nicht nur
   * ungenau, es schickt den Kunden auf die Suche nach einem freien Slot, den
   * es an keinem Tag geben wird.
   */
  const [slotHinweis, setSlotHinweis] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [einwilligung, setEinwilligung] = useState(false)

  const heute = berlinToday()
  const [heuteY, heuteM] = heute.split('-').map(Number)
  const [calYear, setCalYear] = useState(heuteY)
  const [calMonth, setCalMonth] = useState(heuteM - 1)

  const calendar = useMemo(() => buildCalendar(calYear, calMonth), [calYear, calMonth])
  const services = salon?.services ?? []
  const service = services.find(s => s.id === serviceId) ?? null
  const dateIso = date ? iso(date.y, date.m, date.d) : ''

  // ── Salon + echte Leistungen laden ────────────────────────────────
  useEffect(() => {
    let abgebrochen = false
    setLaedtSalon(true)
    fetch(`/api/salons/${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then(async res => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json()
      })
      .then((data: ApiSalon) => {
        if (abgebrochen) return
        setSalon(data)
        setSalonFehler(null)
      })
      .catch(() => {
        if (abgebrochen) return
        // Frueher fiel dieser Pfad auf erfundene Leistungen zurueck. Ein
        // ehrlicher Fehler ist besser als ein Angebot, das es nicht gibt.
        setSalonFehler('Dieser Salon konnte nicht geladen werden.')
      })
      .finally(() => {
        if (!abgebrochen) setLaedtSalon(false)
      })
    return () => { abgebrochen = true }
  }, [slug])

  // ── Echte freie Zeiten laden ──────────────────────────────────────
  const slotsLaden = useCallback(async () => {
    if (!salon?.id || !serviceId || !dateIso) return
    setLaedtSlots(true)
    setSlotFehler(null)
    setSlotHinweis(null)
    setTimeSlot('')
    try {
      const url = `/api/availability?salonId=${encodeURIComponent(salon.id)}&serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(dateIso)}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        setSlots([])
        setSlotFehler('Freie Zeiten konnten nicht geladen werden.')
        return
      }
      const data = await res.json()
      const roh: string[] = Array.isArray(data?.slots) ? data.slots : []
      setSlotHinweis(typeof data?.message === 'string' ? data.message : null)

      // Heute keine Zeiten anbieten, die schon vorbei sind. Der Server weist
      // sie ohnehin ab (`startsInPast`); sie erst gar nicht anzuklicken zu
      // geben, erspart dem Kunden die Fehlermeldung.
      const jetzt = new Date()
      const vergangen =
        dateIso === berlinToday()
          ? (t: string) => {
              const [h, m] = t.split(':').map(Number)
              const berlinJetzt = new Intl.DateTimeFormat('de-DE', {
                timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false,
              }).format(jetzt)
              const [jh, jm] = berlinJetzt.split(':').map(Number)
              return h * 60 + m <= jh * 60 + jm
            }
          : () => false

      setSlots(roh.filter(t => !vergangen(t)))
    } catch {
      setSlots([])
      setSlotFehler('Verbindungsfehler — freie Zeiten konnten nicht geladen werden.')
    } finally {
      setLaedtSlots(false)
    }
  }, [salon?.id, serviceId, dateIso])

  useEffect(() => {
    if (step === 2 && dateIso) void slotsLaden()
  }, [step, dateIso, slotsLaden])

  const brauchtEinwilligung = ['HIGH', 'VERY_HIGH'].includes(String(service?.risk_level ?? ''))

  function canNext(): boolean {
    if (step === 1) return !!serviceId
    if (step === 2) return !!date && !!timeSlot
    return !brauchtEinwilligung || einwilligung
  }

  function goNext() {
    if (!canNext()) return
    if (step < 3) setStep((step + 1) as 1 | 2 | 3)
    else void buchen()
  }

  /**
   * Echte Buchung. Der Preis wird NICHT mitgeschickt — er kommt serverseitig
   * aus `services.price_cents`. Ein Preis aus dem Browser waere ein Preis, den
   * der Kunde selbst setzen kann.
   */
  async function buchen() {
    if (!salon?.id || !service || !dateIso || !timeSlot) return
    setSubmitting(true)
    setFehler(null)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: salon.id,
          serviceId: service.id,
          date: dateIso,
          startTime: timeSlot,
          consentGiven: brauchtEinwilligung ? einwilligung : undefined,
        }),
      })

      if (res.status === 401) {
        // Buchen setzt ein Konto voraus (die Buchung haengt an `customer_id`).
        // Statt nur zu melden, dass es nicht ging, direkt zum Login — mit
        // Rueckweg, damit die getroffene Auswahl nicht umsonst war.
        setFehler('Bitte melde dich an, um zu buchen — wir leiten dich weiter.')
        router.push(`/auth?next=${encodeURIComponent(`/salon/${slug}/buchen`)}` as never)
        return
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        // Kein stiller Erfolg mehr: frueher lief der Fehlerfall in eine
        // "Buchung gespeichert"-Meldung, egal was der Server antwortete.
        setFehler(data?.error || 'Buchung fehlgeschlagen.')
        if (String(data?.error ?? '').includes('belegt')) {
          await slotsLaden()
          setStep(2)
        }
        return
      }

      // Ziel ist die echte Terminliste — dort steht die Buchung, die gerade
      // wirklich entstanden ist.
      router.push('/termine' as never)
    } catch {
      setFehler('Verbindungsfehler — die Buchung wurde nicht gespeichert.')
    } finally {
      setSubmitting(false)
    }
  }

  function changeMonth(delta: number) {
    const nm = calMonth + delta
    if (nm < 0) { setCalMonth(11); setCalYear(calYear - 1) }
    else if (nm > 11) { setCalMonth(0); setCalYear(calYear + 1) }
    else setCalMonth(nm)
  }

  /*
   * Warum ein Tag nicht waehlbar ist — die Regel steht in
   * `lib/booking-days.ts`, damit beide Buchungsstrecken dieselbe benutzen
   * und sie pruefbar ist.
   */
  const tagGesperrt = (d: number) => tagGesperrtFuer(iso(calYear, calMonth, d), salon, heute)

  const dateLabel = date ? `${date.d}. ${MONTHS[date.m]} ${date.y}` : ''
  const preis = priceLabel(service?.price_cents)

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '22px 14px 0',
    }}>
      <div style={{
        width: '100%', maxWidth: 430, background: 'var(--bg)',
        borderRadius: 38, overflow: 'hidden',
        border: '1px solid rgba(196,168,106,0.12)',
        boxShadow: '0 50px 120px rgba(0,0,0,0.78)',
        marginBottom: 24,
      }}>
        <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => step > 1 ? setStep((step - 1) as 1 | 2 | 3) : router.back()}
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(196,168,106,0.08)',
              border: '1px solid rgba(196,168,106,0.22)',
              color: 'var(--gold2)', fontSize: 18, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >‹</button>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>
            Termin buchen · {step}/3
          </span>
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>
              CHAIRMATCH
            </h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        <div style={{ padding: '0 20px 14px', display: 'flex', gap: 6 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: step >= s ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)' : 'rgba(255,255,255,0.08)' }}></div>
          ))}
        </div>

        <div style={{ padding: '0 20px 16px' }}>
          <span style={{
            display: 'inline-block', fontSize: 9, letterSpacing: 2, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
            background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)',
            color: '#1a1000', marginBottom: 14,
          }}>SCHRITT {step}</span>
          <h2 className="cinzel text-gold-metallic" style={{ fontSize: 24, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>
            {step === 1 && 'Service wählen'}
            {step === 2 && 'Datum & Uhrzeit'}
            {step === 3 && 'Bestätigung'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>
            {step === 1 && (salon?.name || 'Was möchtest du buchen?')}
            {step === 2 && 'Wann passt es dir?'}
            {step === 3 && 'Alles korrekt? Dann buchen.'}
          </p>
        </div>

        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {fehler && (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(232,80,64,0.1)', border: '1px solid rgba(232,80,64,0.3)', color: '#FF8888', fontSize: 12.5, lineHeight: 1.5 }}>
              {fehler}
            </div>
          )}

          {/* STEP 1: echte Leistungen */}
          {step === 1 && (
            <>
              {laedtSalon && (
                <p style={{ fontSize: 13, color: 'var(--stone)', padding: '20px 0', textAlign: 'center' }}>Leistungen werden geladen …</p>
              )}
              {!laedtSalon && salonFehler && (
                <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(232,80,64,0.1)', border: '1px solid rgba(232,80,64,0.3)', color: '#FF8888', fontSize: 12.5 }}>
                  {salonFehler}
                </div>
              )}
              {!laedtSalon && !salonFehler && services.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', background: 'rgba(176,144,96,0.04)', border: '1px dashed rgba(176,144,96,0.25)', borderRadius: 18 }}>
                  <p className="cinzel" style={{ fontSize: 16, color: 'var(--gold2)', marginBottom: 8 }}>Keine Leistungen hinterlegt</p>
                  <p style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.6 }}>
                    Dieser Salon hat noch keine buchbaren Leistungen eingestellt. Bitte nimm direkt Kontakt auf.
                  </p>
                </div>
              )}
              {services.map(s => {
                const p = priceLabel(s.price_cents)
                return (
                  <button
                    key={s.id}
                    onClick={() => { setServiceId(s.id); setTimeSlot(''); setEinwilligung(false) }}
                    style={{
                      background: serviceId === s.id
                        ? 'linear-gradient(145deg, rgba(191,149,63,0.08) 0%, var(--c1) 50%, rgba(179,135,40,0.04) 100%)'
                        : 'var(--c1)',
                      border: serviceId === s.id ? '1.5px solid var(--gold2)' : '1px solid rgba(196,168,106,0.18)',
                      borderRadius: 14, padding: 14, cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                      fontFamily: 'inherit', textAlign: 'left',
                      boxShadow: serviceId === s.id ? '0 0 14px rgba(191,149,63,0.12)' : 'none',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--cream)' }}>{s.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>
                        {s.duration_minutes ? `${s.duration_minutes} Min` : 'Dauer auf Anfrage'}
                        {s.description ? ` · ${s.description}` : ''}
                      </p>
                    </div>
                    <span className="cinzel text-gold-metallic" style={{ fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                      {p ?? 'auf Anfrage'}
                    </span>
                  </button>
                )
              })}
            </>
          )}

          {/* STEP 2: Kalender + ECHTE freie Zeiten */}
          {step === 2 && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <button onClick={() => changeMonth(-1)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(196,168,106,0.08)', border: '1px solid rgba(196,168,106,0.22)', color: 'var(--gold2)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>‹</button>
                  <span className="cinzel" style={{ fontSize: 15, fontWeight: 600, letterSpacing: 1, color: 'var(--gold2)' }}>{MONTHS[calMonth]} {calYear}</span>
                  <button onClick={() => changeMonth(1)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(196,168,106,0.08)', border: '1px solid rgba(196,168,106,0.22)', color: 'var(--gold2)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>›</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                  {DAY_NAMES.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--stone)', fontWeight: 600, padding: '4px 0', letterSpacing: 1, textTransform: 'uppercase' }}>{d}</div>
                  ))}
                  {calendar.map((d, i) => {
                    if (d === null) return <div key={i}></div>
                    const grund = tagGesperrt(d)
                    const off = grund !== null
                    const geschlossen = grund === 'feiertag' || grund === 'ruhetag'
                    const isToday = iso(calYear, calMonth, d) === heute
                    const isSelected = date?.d === d && date?.m === calMonth && date?.y === calYear
                    return (
                      <button
                        key={i}
                        onClick={() => !off && setDate({ y: calYear, m: calMonth, d })}
                        disabled={off}
                        title={grund ? TAG_GESPERRT_TEXT[grund] : undefined}
                        aria-label={grund ? `${d}. ${MONTHS[calMonth]} — ${TAG_GESPERRT_TEXT[grund]}` : `${d}. ${MONTHS[calMonth]}`}
                        style={{
                          aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 8, fontSize: 13, cursor: off ? 'not-allowed' : 'pointer',
                          background: isSelected ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)' : 'var(--c1)',
                          border: isToday ? '1px solid var(--gold)' : '0.5px solid rgba(196,168,106,0.08)',
                          // Geschlossene Tage sind sichtbar geschlossen, nicht
                          // nur blass: „vergangen" und „Feiertag" duerfen
                          // nicht gleich aussehen.
                          color: isSelected ? '#1a1000' : geschlossen ? '#8A6A64' : 'var(--cream)',
                          textDecoration: geschlossen ? 'line-through' : 'none',
                          opacity: grund === 'vergangen' ? 0.25 : geschlossen ? 0.55 : 1,
                          fontWeight: isSelected ? 700 : 400,
                          fontFamily: 'inherit',
                        }}
                      >{d}</button>
                    )
                  })}
                </div>
                {/*
                  Ohne diese Zeile ist der durchgestrichene Tag auf dem Handy
                  nicht erklaerbar: `title` zeigt nur ein Zeigergeraet an.
                */}
                <p style={{ fontSize: 10.5, color: 'var(--stone)', marginTop: 8, lineHeight: 1.5 }}>
                  <span style={{ textDecoration: 'line-through' }}>Durchgestrichen</span> = Ruhetag oder gesetzlicher Feiertag.
                </p>
              </div>

              {date && (
                <div>
                  <p className="cinzel" style={{ fontSize: 11, letterSpacing: 2, color: 'var(--gold2)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
                    Freie Slots · {dateLabel}
                  </p>

                  {laedtSlots && <p style={{ fontSize: 12.5, color: 'var(--stone)' }}>Freie Zeiten werden geladen …</p>}

                  {!laedtSlots && slotFehler && (
                    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(232,80,64,0.1)', border: '1px solid rgba(232,80,64,0.3)', color: '#FF8888', fontSize: 12 }}>
                      {slotFehler}
                    </div>
                  )}

                  {!laedtSlots && !slotFehler && slots.length === 0 && (
                    <p style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.6 }}>
                      {slotHinweis
                        ? `${slotHinweis} Bitte einen anderen Tag wählen.`
                        : 'An diesem Tag ist nichts mehr frei. Bitte einen anderen Tag wählen.'}
                    </p>
                  )}

                  {!laedtSlots && slots.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      {slots.map(t => (
                        <button
                          key={t}
                          onClick={() => setTimeSlot(t)}
                          style={{
                            padding: '10px 6px', borderRadius: 10,
                            background: timeSlot === t ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)' : 'var(--c1)',
                            border: timeSlot === t ? 'none' : '0.5px solid rgba(196,168,106,0.15)',
                            color: timeSlot === t ? '#1a1000' : 'var(--cream)',
                            fontSize: 13, fontWeight: timeSlot === t ? 700 : 600,
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >{t}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* STEP 3: Bestaetigung mit echtem Preis */}
          {step === 3 && service && date && (
            <>
              <div style={{
                background: 'linear-gradient(145deg, rgba(191,149,63,0.08) 0%, var(--c1) 50%, rgba(179,135,40,0.04) 100%)',
                border: '1px solid var(--gold2)',
                borderRadius: 18, padding: 18,
              }}>
                {[
                  ['Salon', salon?.name ?? '—'],
                  ['Service', service.name],
                  ['Dauer', service.duration_minutes ? `${service.duration_minutes} Minuten` : 'auf Anfrage'],
                  ['Datum', dateLabel],
                  ['Uhrzeit', `${timeSlot} Uhr`],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(196,168,106,0.1)', fontSize: 13 }}>
                    <span style={{ color: 'var(--stone)' }}>{l}</span>
                    <span style={{ color: 'var(--cream)', fontWeight: 600, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop: 6, paddingTop: 12, borderTop: '2px solid rgba(196,168,106,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--cream)', fontWeight: 700 }}>Gesamt</span>
                  <span className="cinzel text-gold-metallic" style={{ fontSize: 22, fontWeight: 700 }}>{preis ?? 'auf Anfrage'}</span>
                </div>
              </div>

              {brauchtEinwilligung && (
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(232,80,64,0.06)', border: '1px solid rgba(232,80,64,0.25)', borderRadius: 12, padding: '12px 14px', fontSize: 11.5, color: 'var(--cream)', lineHeight: 1.55, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={einwilligung}
                    onChange={e => setEinwilligung(e.target.checked)}
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <span>Ich bestätige die Risikoaufklärung und die Hinweise zu Kontraindikationen für diese Behandlung.</span>
                </label>
              )}

              <div style={{ background: 'rgba(176,144,96,0.06)', border: '1px solid rgba(176,144,96,0.18)', borderRadius: 12, padding: '12px 14px', fontSize: 11.5, color: 'var(--cream)', lineHeight: 1.55 }}>
                <strong style={{ color: 'var(--gold2)' }}>Vor Ort bezahlen</strong> · Der Termin gilt zunächst als angefragt, bis der Salon ihn bestätigt. Absagen kannst du jederzeit unter „Meine Buchungen" — je nach Frist des Salons kostenfrei.
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {step > 1 && (
              <button
                onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                disabled={submitting}
                style={{
                  flex: 1, padding: 14, borderRadius: 14,
                  background: 'transparent', color: 'var(--gold2)',
                  border: '1px solid rgba(196,168,106,0.3)',
                  fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >Zurück</button>
            )}
            <button
              onClick={goNext}
              disabled={!canNext() || submitting}
              style={{
                flex: step > 1 ? 2 : 1, padding: 14, borderRadius: 14,
                background: canNext()
                  ? 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)'
                  : 'rgba(196,168,106,0.18)',
                color: canNext() ? '#1a1000' : 'rgba(232,230,218,0.55)',
                border: 'none',
                fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
                cursor: canNext() && !submitting ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: canNext() ? '0 0 18px rgba(196,168,106,0.25)' : 'none',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Buche…' : step === 3 ? 'Jetzt buchen ✓' : 'Weiter →'}
            </button>
          </div>
        </div>

        <BottomNav role="mieter" />
      </div>
    </div>
  )
}
