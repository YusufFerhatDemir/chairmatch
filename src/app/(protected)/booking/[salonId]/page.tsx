'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Service {
  id: string
  name: string
  durationMinutes: number
  priceCents: number
  sortOrder: number
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
  services: Service[]
  staff: Staff[]
}

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const salonId = params.salonId as string

  const [step, setStep] = useState(1)
  const [salon, setSalon] = useState<SalonData | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<string | undefined>(undefined)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [notes, setNotes] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch(`/api/salons/${salonId}`)
      .then(r => r.json())
      .then(data => setSalon(data))
      .catch(() => {})
  }, [salonId])

  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00']

  async function handleSubmit() {
    if (!selectedService || !date || !startTime) {
      setError('Bitte alle Pflichtfelder ausfüllen.')
      return
    }

    setLoading(true)
    setError(null)

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salonId,
        serviceId: selectedService.id,
        staffId: selectedStaff || undefined,
        date,
        startTime,
        notes: notes || undefined,
        promoCode: promoCode || undefined,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Buchung fehlgeschlagen.')
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="shell">
        <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 'var(--pad)', textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginBottom: 8 }}>Buchung bestätigt!</h2>
          <p style={{ color: 'var(--stone)', marginBottom: 24 }}>Du erhältst eine Bestätigung per E-Mail.</p>
          <button onClick={() => router.push('/')} className="bgold" style={{ maxWidth: 200 }}>Zur Startseite</button>
        </div>
      </div>
    )
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href={`/salon/${salonId}`} style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
          ← Zurück
        </Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 12, marginBottom: 4 }}>
          Termin buchen
        </h1>
        {salon && <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginBottom: 20 }}>{salon.name}</p>}

        {error && (
          <div style={{ background: 'rgba(232,80,64,0.1)', border: '1px solid rgba(232,80,64,0.3)', borderRadius: 12, padding: 12, marginBottom: 16, color: 'var(--red)', fontSize: 'var(--font-sm)' }}>
            {error}
          </div>
        )}

        {/* Step 1: Service */}
        {step >= 1 && (
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>1. Dienstleistung wählen</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(salon?.services || []).map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedService(s); setStep(2) }}
                  className="card"
                  style={{
                    textAlign: 'left', cursor: 'pointer', border: selectedService?.id === s.id ? '1px solid var(--gold)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--cream)' }}>{s.name}</div>
                      <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)' }}>{s.durationMinutes} Min.</div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{(s.priceCents / 100).toFixed(0)} €</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Step 2: Date & Time */}
        {step >= 2 && (
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>2. Datum & Uhrzeit</h3>
            <input
              className="inp"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={{ marginBottom: 12 }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {timeSlots.map(t => (
                <button
                  key={t}
                  onClick={() => { setStartTime(t); setStep(3) }}
                  style={{
                    padding: '10px 0', borderRadius: 10, fontSize: 'var(--font-sm)', fontWeight: 600, cursor: 'pointer',
                    background: startTime === t ? 'var(--gold)' : 'var(--c2)',
                    color: startTime === t ? '#080706' : 'var(--cream)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Step 3: Optional details + submit */}
        {step >= 3 && (
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>3. Zusätzliche Angaben</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(salon?.staff || []).length > 0 && (
                <select
                  className="inp"
                  value={selectedStaff || ''}
                  onChange={e => setSelectedStaff(e.target.value || undefined)}
                >
                  <option value="">Mitarbeiter (egal)</option>
                  {salon!.staff.map(m => (
                    <option key={m.id} value={m.id}>{m.name}{m.title ? ` – ${m.title}` : ''}</option>
                  ))}
                </select>
              )}
              <input className="inp" placeholder="Anmerkungen (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
              <input className="inp" placeholder="Promo-Code (optional)" value={promoCode} onChange={e => setPromoCode(e.target.value)} />
            </div>
            <button onClick={handleSubmit} className="bgold" disabled={loading} style={{ marginTop: 16 }}>
              {loading ? 'Wird gebucht...' : 'Jetzt buchen'}
            </button>
          </section>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
