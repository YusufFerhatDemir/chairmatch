'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PROVS, getProviderSpecs, type DemoProvider, type DemoSpec } from '@/lib/demo-data'
import { PROMO_CODES } from '@/lib/constants'

interface Service {
  id: string
  name: string
  durationMinutes?: number
  duration_minutes?: number
  priceCents?: number
  price_cents?: number
  risk_level?: string | null
}

interface Staff {
  id: string
  name: string
  title: string | null
}

interface SalonData {
  id: string
  name: string
  category: string
  city: string
  phone?: string
  services: Service[]
  staff: Staff[]
}

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ opacity: i <= Math.round(rating) ? 1 : 0.3, color: '#E8C86A', fontSize: size }}>★</span>
      ))}
    </span>
  )
}

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const salonId = params.salonId as string

  const [step, setStep] = useState(1)
  const [salon, setSalon] = useState<SalonData | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDay, setSelectedDay] = useState(0)
  const [startTime, setStartTime] = useState('')
  const [selectedSpec, setSelectedSpec] = useState<DemoSpec | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [promoValid, setPromoValid] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consentGiven, setConsentGiven] = useState(false)

  // Try demo provider
  const demoP = PROVS.find(p => p.id === salonId)
  const specs = demoP ? getProviderSpecs(demoP) : []

  useEffect(() => {
    if (demoP) {
      setSalon({
        id: demoP.id, name: demoP.nm, category: demoP.cat, city: demoP.city,
        services: demoP.svs.map(s => ({ id: s.id, name: s.nm, durationMinutes: s.dur, priceCents: s.pr * 100 })),
        staff: specs.map(s => ({ id: s.id, name: s.nm, title: s.role })),
      })
    } else {
      fetch(`/api/salons/${salonId}`)
        .then(r => r.json())
        .then(data => setSalon(data))
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId])

  // Generate 7 days from today
  const days = useMemo(() => {
    const result: { day: string; dt: number; mo: number; full: string; iso: string }[] = []
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      result.push({
        day: dayNames[d.getDay()],
        dt: d.getDate(),
        mo: d.getMonth() + 1,
        full: `${dayNames[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}`,
        iso: d.toISOString().split('T')[0],
      })
    }
    return result
  }, [])

  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30']

  // Promo code validation
  function checkPromo() {
    const code = promoCode.trim().toUpperCase()
    if (PROMO_CODES[code]) {
      setPromoValid(true)
    } else {
      setPromoValid(false)
    }
  }

  // Calculate final price
  const basePrice = selectedService ? ((selectedService.priceCents ?? selectedService.price_cents ?? 0) / 100) : 0
  const promoDiscount = promoValid && promoCode.trim().toUpperCase() in PROMO_CODES
    ? PROMO_CODES[promoCode.trim().toUpperCase()]
    : null
  const discountAmount = promoDiscount
    ? promoDiscount.type === 'percent' ? basePrice * promoDiscount.discount / 100 : promoDiscount.discount
    : 0
  const finalPrice = Math.max(0, basePrice - discountAmount)

  const needsConsent = selectedService && ['HIGH', 'VERY_HIGH'].includes(String((selectedService as Service).risk_level ?? ''))
  const canSubmit = !needsConsent || consentGiven

  async function handleSubmit() {
    if (!selectedService || !startTime) {
      setError('Bitte Service und Uhrzeit auswählen.')
      return
    }
    if (needsConsent && !consentGiven) {
      setError('Bitte bestätige die Risikoaufklärung und Kontraindikationen.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: demoP ? undefined : salonId,
          serviceId: selectedService.id,
          staffId: selectedSpec?.id || undefined,
          date: days[selectedDay].iso,
          startTime,
          notes: notes || undefined,
          promoCode: promoCode || undefined,
          customerName: name || undefined,
          customerEmail: email || undefined,
          customerPhone: phone || undefined,
          consentGiven: needsConsent ? true : undefined,
        }),
      })

      if (!res.ok) {
        // For demo providers, just simulate success
        if (demoP) {
          saveAndRedirectToSuccess()
          return
        }
        const data = await res.json()
        setError(data.error || 'Buchung fehlgeschlagen.')
        return
      }

      saveAndRedirectToSuccess()
    } catch {
      // For demo, just show success
      if (demoP) {
        saveAndRedirectToSuccess()
        return
      }
      setError('Verbindungsfehler.')
    } finally {
      setLoading(false)
    }
  }

  const BOOKING_SUCCESS_KEY = 'cm_booking_success'
  function saveAndRedirectToSuccess() {
    const payload = {
      salonName: salon?.name ?? '',
      serviceName: selectedService?.name ?? '',
      durationMinutes: selectedService?.durationMinutes ?? selectedService?.duration_minutes ?? 0,
      dateFull: days[selectedDay]?.full ?? '',
      startTime,
      finalPrice,
      discountAmount,
      specName: selectedSpec?.nm,
      hasPromo: !!promoDiscount,
      salonPhone: salon?.phone ?? '',
    }
    try {
      sessionStorage.setItem(BOOKING_SUCCESS_KEY, JSON.stringify(payload))
    } catch {}
    router.replace('/booking/success')
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href={`/salon/${salonId}`} style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Zurück</Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 12, marginBottom: 4 }}>Termin buchen</h1>
        {salon && <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginBottom: 16 }}>{salon.name}</p>}

        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%', height: 3, borderRadius: 2,
                background: step >= s ? 'var(--gold)' : 'var(--c3)',
              }} />
              <span style={{ fontSize: 10, color: step >= s ? 'var(--gold2)' : 'var(--stone)', fontWeight: step === s ? 700 : 400 }}>
                {s === 1 ? 'Service' : s === 2 ? 'Spezialist' : 'Details'}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(232,80,64,0.1)', border: '1px solid rgba(232,80,64,0.3)', borderRadius: 12, padding: 12, marginBottom: 16, color: 'var(--red)', fontSize: 'var(--font-sm)' }}>
            {error}
          </div>
        )}

        {/* STEP 1: Service + Day + Time */}
        {step === 1 && (
          <div>
            {/* Service Selection */}
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 10 }}>Service</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {(salon?.services || []).map(s => (
                <button key={s.id} onClick={() => setSelectedService(s)} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '13px 15px', background: 'var(--c2)', borderRadius: 13, cursor: 'pointer',
                  border: selectedService?.id === s.id ? '1.5px solid var(--gold)' : '1px solid var(--border)',
                  textAlign: 'left',
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>{s.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--stone)' }}>{s.durationMinutes ?? s.duration_minutes ?? 0} min</p>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold2)' }}>{((s.priceCents ?? s.price_cents ?? 0) / 100).toFixed(0)} €</span>
                </button>
              ))}
            </div>

            {/* Day Selection — 7 day scroll */}
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 10 }}>Tag</p>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
              {days.map((d, i) => (
                <button key={i} onClick={() => setSelectedDay(i)} style={{
                  flexShrink: 0, width: 56, padding: '10px 0', borderRadius: 14, textAlign: 'center', cursor: 'pointer',
                  background: selectedDay === i ? 'rgba(200,168,75,.1)' : 'var(--c2)',
                  border: selectedDay === i ? '1.5px solid var(--gold)' : '1px solid var(--border)',
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: selectedDay === i ? 'var(--gold2)' : 'var(--stone)' }}>{d.day}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: selectedDay === i ? 'var(--gold2)' : 'var(--cream)' }}>{d.dt}</p>
                  <p style={{ fontSize: 10, color: 'var(--stone)' }}>{d.mo}.</p>
                </button>
              ))}
            </div>

            {/* Time Grid */}
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 10 }}>Uhrzeit</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 20 }}>
              {timeSlots.map(t => (
                <button key={t} onClick={() => setStartTime(t)} style={{
                  padding: '10px 0', borderRadius: 10, fontSize: 'var(--font-sm)', fontWeight: 600, cursor: 'pointer',
                  background: startTime === t ? 'var(--gold)' : 'var(--c2)',
                  color: startTime === t ? '#080706' : 'var(--cream)',
                  border: startTime === t ? '1px solid var(--gold)' : '1px solid var(--border)',
                }}>
                  {t}
                </button>
              ))}
            </div>

            <button onClick={() => { if (selectedService && startTime) setStep(2); else setError('Bitte Service und Uhrzeit wählen.') }} className="bgold">
              Weiter
            </button>
          </div>
        )}

        {/* STEP 2: Specialist */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 10 }}>Spezialist wählen</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
              {specs.length > 0 ? specs.map(spec => (
                <button key={spec.id} onClick={() => setSelectedSpec(spec)} style={{
                  flexShrink: 0, width: 106, padding: '13px 10px', borderRadius: 16, textAlign: 'center', cursor: 'pointer',
                  background: selectedSpec?.id === spec.id ? 'rgba(200,168,75,.08)' : 'var(--c2)',
                  border: selectedSpec?.id === spec.id ? '1.5px solid var(--gold)' : '1px solid var(--border)',
                }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: spec.col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, margin: '0 auto 6px', color: 'var(--cream)' }}>
                    {spec.ini}
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, color: 'var(--cream)' }}>{spec.nm}</p>
                  <p style={{ fontSize: 9, color: 'var(--stone)', marginBottom: 4 }}>{spec.role}</p>
                  <Stars rating={spec.rt} size={10} />
                </button>
              )) : (salon?.staff || []).map(m => (
                <button key={m.id} onClick={() => setSelectedSpec({ id: m.id, nm: m.name, role: m.title || '', rt: 0, cat: '', ini: m.name.split(' ').map(n => n[0]).join('').slice(0, 2), col: 'var(--c3)' })} style={{
                  flexShrink: 0, width: 106, padding: '13px 10px', borderRadius: 16, textAlign: 'center', cursor: 'pointer',
                  background: selectedSpec?.id === m.id ? 'rgba(200,168,75,.08)' : 'var(--c2)',
                  border: selectedSpec?.id === m.id ? '1.5px solid var(--gold)' : '1px solid var(--border)',
                }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--c3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, margin: '0 auto 6px', color: 'var(--cream)' }}>
                    {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, color: 'var(--cream)' }}>{m.name}</p>
                  {m.title && <p style={{ fontSize: 9, color: 'var(--stone)' }}>{m.title}</p>}
                </button>
              ))}
            </div>

            <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 16, textAlign: 'center' }}>
              {!selectedSpec ? 'Tippe auf einen Spezialisten oder überspringe' : `${selectedSpec.nm} ausgewählt`}
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} className="boutline" style={{ flex: 1, cursor: 'pointer' }}>Zurück</button>
              <button onClick={() => setStep(3)} className="bgold" style={{ flex: 1 }}>
                {selectedSpec ? 'Weiter' : 'Überspringen'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Contact + Promo */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 10 }}>Kontaktdaten</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <input className="inp" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
              <input className="inp" placeholder="E-Mail" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              <input className="inp" placeholder="Telefon" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
              <textarea className="inp" placeholder="Anmerkungen (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ resize: 'none' }} />
            </div>

            {/* Booking Summary */}
            <div className="card" style={{ padding: 14, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold2)', marginBottom: 8 }}>Zusammenfassung</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--stone)' }}>Service</span>
                <span style={{ color: 'var(--cream)' }}>{selectedService?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--stone)' }}>Datum</span>
                <span style={{ color: 'var(--cream)' }}>{days[selectedDay]?.full}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--stone)' }}>Uhrzeit</span>
                <span style={{ color: 'var(--cream)' }}>{startTime}</span>
              </div>
              {selectedSpec && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--stone)' }}>Spezialist</span>
                  <span style={{ color: 'var(--cream)' }}>{selectedSpec.nm}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                <span style={{ color: 'var(--stone)' }}>Preis</span>
                <span style={{ fontWeight: 700, color: 'var(--gold2)' }}>{basePrice.toFixed(0)} €</span>
              </div>
            </div>

            {/* Promo Code */}
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 8 }}>Promo-Code</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="inp" placeholder="Code eingeben" value={promoCode} onChange={e => { setPromoCode(e.target.value); setPromoValid(null) }} style={{ flex: 1 }} />
              <button onClick={checkPromo} className="boutline" style={{ padding: '10px 16px', fontSize: 12, cursor: 'pointer' }}>Prüfen</button>
            </div>
            {promoValid === true && (
              <p style={{ fontSize: 12, color: '#6ABF80', marginBottom: 16 }}>✓ Code gültig! Du sparst {discountAmount.toFixed(0)} €</p>
            )}
            {promoValid === false && (
              <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>✕ Ungültiger Code</p>
            )}

            {/* Final Price */}
            {promoDiscount && (
              <div className="card" style={{ padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: 'var(--stone)' }}>Zwischensumme</span>
                  <span style={{ color: 'var(--cream)' }}>{basePrice.toFixed(0)} €</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: '#6ABF80' }}>Rabatt</span>
                  <span style={{ color: '#6ABF80' }}>−{discountAmount.toFixed(0)} €</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--gold2)' }}>Gesamt</span>
                  <span style={{ fontWeight: 800, color: 'var(--gold2)' }}>{finalPrice.toFixed(0)} €</span>
                </div>
              </div>
            )}

            {/* Storno-Policy (AGB § 4a) */}
            <div style={{ marginBottom: 16, padding: 14, background: 'var(--c2)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 8 }}>Storno</p>
              <p style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.6, margin: 0 }}>
                Kostenlos bis 24h vorher · 50 % bei weniger als 24h · 100 % bei No-Show. <Link href="/agb" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>AGB</Link>
              </p>
            </div>

            {needsConsent && (
              <div style={{ marginBottom: 16, padding: 14, background: 'rgba(232,80,64,0.08)', border: '1px solid rgba(232,80,64,0.2)', borderRadius: 12 }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--cream)' }}>
                  <input type="checkbox" checked={consentGiven} onChange={e => setConsentGiven(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>Ich bestätige die Risikoaufklärung, Kontraindikationen und Datenschutz-Hinweise für diese Behandlung.</span>
                </label>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} className="boutline" style={{ flex: 1, cursor: 'pointer' }}>Zurück</button>
              <button type="button" onClick={handleSubmit} className="bgold" style={{ flex: 1 }} disabled={loading || !canSubmit}>
                {loading ? 'Wird gebucht...' : 'Jetzt buchen'}
              </button>
            </div>
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
