'use client'

import { useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'

// Mock services (später aus DB)
const MOCK_SERVICES = [
  { id: 'damen', name: 'Damenschnitt', duration: 60, price: 45, sub: 'inkl. Waschen & Föhnen' },
  { id: 'herren', name: 'Herrenschnitt', duration: 30, price: 25, sub: 'klassisch oder modern' },
  { id: 'faerben', name: 'Färben (kurz)', duration: 90, price: 60, sub: 'Premium-Farben' },
  { id: 'balayage', name: 'Balayage', duration: 180, price: 130, sub: 'komplett' },
]

const TIME_SLOTS = [
  { t: '09:00', free: false }, { t: '09:30', free: true }, { t: '10:00', free: true },
  { t: '10:30', free: false }, { t: '11:00', free: true }, { t: '11:30', free: false },
  { t: '12:00', free: false }, { t: '12:30', free: false }, { t: '13:00', free: true },
  { t: '13:30', free: true }, { t: '14:00', free: true }, { t: '14:30', free: true },
  { t: '15:00', free: true }, { t: '15:30', free: true }, { t: '16:00', free: true },
  { t: '16:30', free: false }, { t: '17:00', free: true }, { t: '17:30', free: false },
]

const DAY_NAMES = ['Mo','Di','Mi','Do','Fr','Sa','So']
const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

function buildCalendar(year: number, month: number): Array<number | null> {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0).getDate()
  // Map Sunday=0 to 6, Monday=1 to 0
  const offset = (first.getDay() + 6) % 7
  const days: Array<number | null> = []
  for (let i = 0; i < offset; i++) days.push(null)
  for (let d = 1; d <= last; d++) days.push(d)
  return days
}

export default function BuchenPage() {
  const router = useRouter()
  const params = useParams()
  const slug = (params?.slug as string) || ''

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [serviceId, setServiceId] = useState<string>('')
  const [date, setDate] = useState<{ y: number; m: number; d: number } | null>(null)
  const [timeSlot, setTimeSlot] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  const calendar = useMemo(() => buildCalendar(calYear, calMonth), [calYear, calMonth])
  const service = MOCK_SERVICES.find(s => s.id === serviceId)

  function canNext(): boolean {
    if (step === 1) return !!serviceId
    if (step === 2) return !!date && !!timeSlot
    return true
  }

  function goNext() {
    if (!canNext()) return
    if (step < 3) setStep((step + 1) as 1 | 2 | 3)
    else submit()
  }

  function submit() {
    setSubmitting(true)
    setTimeout(() => {
      // Mock booking - in echtem System würde hier API-Call passieren
      try {
        const booking = {
          slug, service, date, timeSlot,
          bookedAt: new Date().toISOString(),
        }
        const existing = JSON.parse(localStorage.getItem('cm_bookings') || '[]')
        existing.unshift(booking)
        localStorage.setItem('cm_bookings', JSON.stringify(existing.slice(0, 20)))
      } catch {}
      router.push(`/salon/${slug}?booked=1` as never)
    }, 800)
  }

  function changeMonth(delta: number) {
    const nm = calMonth + delta
    if (nm < 0) { setCalMonth(11); setCalYear(calYear - 1) }
    else if (nm > 11) { setCalMonth(0); setCalYear(calYear + 1) }
    else setCalMonth(nm)
  }

  const isOff = (d: number): boolean => {
    const dt = new Date(calYear, calMonth, d)
    const tt = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return dt < tt
  }

  const dateLabel = date
    ? `${date.d}. ${MONTHS[date.m]} ${date.y}`
    : ''

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
        {/* Top */}
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

        {/* Logo */}
        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>
              CHAIRMATCH
            </h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        {/* Progress */}
        <div style={{ padding: '0 20px 14px', display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: step >= 1 ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)' : 'rgba(255,255,255,0.08)' }}></div>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: step >= 2 ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)' : 'rgba(255,255,255,0.08)' }}></div>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: step >= 3 ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)' : 'rgba(255,255,255,0.08)' }}></div>
        </div>

        {/* Title */}
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
            {step === 1 && 'Was möchtest du buchen?'}
            {step === 2 && 'Wann passt es dir?'}
            {step === 3 && 'Alles korrekt? Dann buchen.'}
          </p>
        </div>

        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* STEP 1: Service */}
          {step === 1 && (
            <>
              {MOCK_SERVICES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setServiceId(s.id)}
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
                    <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>{s.duration} Min · {s.sub}</p>
                  </div>
                  <span className="cinzel text-gold-metallic" style={{ fontSize: 16, fontWeight: 700 }}>{s.price} €</span>
                </button>
              ))}
            </>
          )}

          {/* STEP 2: Datum + Uhrzeit */}
          {step === 2 && (
            <>
              {/* Calendar */}
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
                    const off = isOff(d)
                    const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()
                    const isSelected = date?.d === d && date?.m === calMonth && date?.y === calYear
                    return (
                      <button
                        key={i}
                        onClick={() => !off && setDate({ y: calYear, m: calMonth, d })}
                        disabled={off}
                        style={{
                          aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 8, fontSize: 13, cursor: off ? 'not-allowed' : 'pointer',
                          background: isSelected ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)' : 'var(--c1)',
                          border: isToday ? '1px solid var(--gold)' : '0.5px solid rgba(196,168,106,0.08)',
                          color: isSelected ? '#1a1000' : 'var(--cream)',
                          opacity: off ? 0.25 : 1,
                          fontWeight: isSelected ? 700 : 400,
                          fontFamily: 'inherit',
                        }}
                      >{d}</button>
                    )
                  })}
                </div>
              </div>

              {/* Slots */}
              {date && (
                <div>
                  <p className="cinzel" style={{ fontSize: 11, letterSpacing: 2, color: 'var(--gold2)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
                    Freie Slots · {dateLabel}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {TIME_SLOTS.map(s => (
                      <button
                        key={s.t}
                        onClick={() => s.free && setTimeSlot(s.t)}
                        disabled={!s.free}
                        style={{
                          padding: '10px 6px', borderRadius: 10,
                          background: timeSlot === s.t ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)' : 'var(--c1)',
                          border: timeSlot === s.t ? 'none' : '0.5px solid rgba(196,168,106,0.15)',
                          color: timeSlot === s.t ? '#1a1000' : 'var(--cream)',
                          fontSize: 13, fontWeight: timeSlot === s.t ? 700 : 600,
                          cursor: s.free ? 'pointer' : 'not-allowed',
                          opacity: s.free ? 1 : 0.3,
                          textDecoration: s.free ? 'none' : 'line-through',
                          fontFamily: 'inherit',
                        }}
                      >{s.t}</button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 3: Confirmation */}
          {step === 3 && service && date && (
            <>
              <div style={{
                background: 'linear-gradient(145deg, rgba(191,149,63,0.08) 0%, var(--c1) 50%, rgba(179,135,40,0.04) 100%)',
                border: '1px solid var(--gold2)',
                borderRadius: 18, padding: 18,
              }}>
                {[
                  ['Service', service.name],
                  ['Dauer', `${service.duration} Minuten`],
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
                  <span className="cinzel text-gold-metallic" style={{ fontSize: 22, fontWeight: 700 }}>{service.price} €</span>
                </div>
              </div>

              <div style={{ background: 'rgba(176,144,96,0.06)', border: '1px solid rgba(176,144,96,0.18)', borderRadius: 12, padding: '12px 14px', fontSize: 11.5, color: 'var(--cream)', lineHeight: 1.55 }}>
                <strong style={{ color: 'var(--gold2)' }}>Vor Ort bezahlen</strong> · Du kannst kostenlos bis 24 Std. vorher absagen. Bestätigungs-Mail nach Buchung.
              </div>
            </>
          )}

          {/* Footer Buttons */}
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
