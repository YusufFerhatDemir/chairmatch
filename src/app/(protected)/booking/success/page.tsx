'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const STORAGE_KEY = 'cm_booking_success'

interface SavedBooking {
  salonName: string
  serviceName: string
  durationMinutes: number
  dateFull: string
  startTime: string
  finalPrice: number
  discountAmount: number
  specName?: string
  hasPromo: boolean
}

export default function BookingSuccessPage() {
  const router = useRouter()
  const [data, setData] = useState<SavedBooking | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) {
        router.replace('/')
        return
      }
      const parsed = JSON.parse(raw) as SavedBooking
      setData(parsed)
    } catch {
      router.replace('/')
    }
  }, [router])

  function handleFertig() {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {}
    router.push('/')
  }

  if (!data) {
    return (
      <div className="shell">
        <div className="screen" style={{ padding: 'var(--pad)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <p style={{ color: 'var(--stone)', fontSize: 'var(--font-md)' }}>Wird geladen…</p>
        </div>
      </div>
    )
  }

  const waMsg = encodeURIComponent(
    `Mein Termin bei ${data.salonName}:\n${data.serviceName} · ${data.durationMinutes} min\n${data.dateFull} · ${data.startTime}\n${data.finalPrice.toFixed(0)} €\n\nGebucht über ChairMatch`
  )

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <div style={{ padding: '36px 22px', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(74,138,90,.15)', border: '1px solid rgba(74,138,90,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px' }}>✓</div>
          <h2 className="cinzel" style={{ fontSize: 22, marginBottom: 6, color: 'var(--gold2)' }}>BESTÄTIGT!</h2>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 18 }}>
            {data.salonName} · {data.serviceName} · {data.durationMinutes} min · {data.dateFull} · {data.startTime}
          </p>
          <div className="card" style={{ padding: 14, marginBottom: 16, textAlign: 'left' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>Buchungsdetails</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--stone)' }}>Service</span>
              <span style={{ color: 'var(--cream)' }}>{data.serviceName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--stone)' }}>Datum</span>
              <span style={{ color: 'var(--cream)' }}>{data.dateFull}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--stone)' }}>Uhrzeit</span>
              <span style={{ color: 'var(--cream)' }}>{data.startTime}</span>
            </div>
            {data.specName && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--stone)' }}>Spezialist</span>
                <span style={{ color: 'var(--cream)' }}>{data.specName}</span>
              </div>
            )}
            {data.hasPromo && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--stone)' }}>Rabatt</span>
                <span style={{ color: '#6ABF80' }}>−{data.discountAmount.toFixed(0)} €</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 15 }}>
              <span style={{ color: 'var(--gold2)', fontWeight: 700 }}>Gesamt</span>
              <span style={{ fontWeight: 800, color: 'var(--gold2)' }}>{data.finalPrice.toFixed(0)} €</span>
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--stone)', marginBottom: 16 }}>Keine Buchungsgebühren · Bezahlung vor Ort</p>
          <a href={`https://wa.me/?text=${waMsg}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: 14, background: '#25D366', color: '#fff', borderRadius: 14, fontSize: 14, fontWeight: 700, textDecoration: 'none', marginBottom: 10 }}>
            💬 Per WhatsApp teilen
          </a>
          <button type="button" onClick={handleFertig} className="bgold">Fertig</button>
        </div>
      </div>
    </div>
  )
}
