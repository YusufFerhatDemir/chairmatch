'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'

const DURATIONS = [
  { id: 'hour', label: 'Stundenweise', mult: 1 },
  { id: 'day',  label: 'Tag', mult: 8 },
  { id: 'week', label: 'Woche', mult: 40 },
  { id: 'month',label: 'Monat', mult: 160 },
]

const PRICE_PER_HOUR = 15

export default function MietanfrageFormPage() {
  const router = useRouter()
  const params = useParams()
  const id = (params?.id as string) || ''
  const [duration, setDuration] = useState('hour')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [units, setUnits] = useState('4')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const dur = DURATIONS.find(d => d.id === duration)!
  const totalHours = Number(units || 0) * dur.mult
  const totalPrice = totalHours * PRICE_PER_HOUR

  function send() {
    if (!date) return alert('Bitte Datum wählen')
    if (!message.trim()) return alert('Bitte Nachricht schreiben')
    setSubmitting(true)
    setTimeout(() => {
      try {
        const reqs = JSON.parse(localStorage.getItem('cm_mietanfragen') || '[]')
        reqs.unshift({
          id: 'r' + Date.now(),
          inseratId: id,
          duration: dur.label, date, time, units, message,
          total: totalPrice,
          sentAt: new Date().toISOString(),
          status: 'open',
        })
        localStorage.setItem('cm_mietanfragen', JSON.stringify(reqs.slice(0, 30)))
      } catch {}
      router.push('/nachrichten' as never)
    }, 600)
  }

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
          <button onClick={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(196,168,106,0.08)', border: '1px solid rgba(196,168,106,0.22)', color: 'var(--gold2)', fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
          >‹</button>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>Mietanfrage</span>
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>CHAIRMATCH</h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        <div style={{ padding: '0 20px 18px' }}>
          <h2 className="cinzel text-gold-metallic" style={{ fontSize: 24, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>Anfrage senden</h2>
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>An: Salon Anna · Stuhl</p>
        </div>

        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Mietdauer</label>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)', border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit' }}>
              {DURATIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Datum & Start-Zeit</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)', border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit' }} />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)', border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Anzahl {duration === 'hour' ? 'Stunden' : duration === 'day' ? 'Tage' : duration === 'week' ? 'Wochen' : 'Monate'}</label>
            <input type="number" value={units} onChange={(e) => setUnits(e.target.value)} min="1" style={{ padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)', border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Nachricht an Vermieter</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Hallo, ich bin Friseurin und möchte deinen Stuhl mieten. Ich habe 5 Jahre Berufserfahrung..."
              style={{ width: '100%', padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)', border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', minHeight: 100 }} />
          </div>

          <div style={{ background: 'rgba(176,144,96,0.06)', border: '1px solid rgba(176,144,96,0.18)', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: 'var(--cream)', lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--gold2)' }}>Geschätzte Kosten:</strong>{' '}
            {totalHours > 0 ? <>{totalHours} Std × {PRICE_PER_HOUR} € = <span className="cinzel" style={{ fontWeight: 700, fontSize: 14 }}>{totalPrice} €</span></> : '—'}
            <br/><span style={{ color: 'var(--stone)' }}>Erst nach Bestätigung wird gezahlt. 0 % Provision.</span>
          </div>

          <button onClick={send} disabled={submitting}
            style={{ width: '100%', padding: 15, borderRadius: 14, background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)', color: '#1a1000', border: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 0 18px rgba(196,168,106,0.25)', opacity: submitting ? 0.7 : 1 }}
          >
            <span>{submitting ? 'Wird gesendet…' : 'Anfrage senden →'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
