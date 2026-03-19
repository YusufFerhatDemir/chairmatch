'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, CreditCard, Store } from 'lucide-react'
import { generateGoogleCalendarUrl } from '@/lib/calendar'

const STORAGE_KEY = 'cm_booking_success'

interface SavedBooking {
  salonId?: string
  salonName: string
  serviceName: string
  durationMinutes: number
  dateFull: string
  bookingDate?: string
  startTime: string
  finalPrice: number
  discountAmount: number
  specName?: string
  hasPromo: boolean
  salonPhone?: string
  bookingId?: string
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
          {/* Payment Options */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--cream)', marginBottom: 10 }}>Zahlungsoptionen</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/stripe/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: 'booking',
                        bookingId: data.bookingId || data.salonId,
                        amount: Math.round(data.finalPrice * 100),
                        serviceName: data.serviceName,
                        salonName: data.salonName,
                      }),
                    })
                    if (res.ok) {
                      const { url } = await res.json()
                      if (url) window.location.href = url
                    }
                  } catch {}
                }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '14px 16px', borderRadius: 14, fontSize: 13, fontWeight: 700,
                  background: 'linear-gradient(135deg,#BF953F,#FCF6BA,#B38728)', color: '#1a1000',
                  border: 'none', cursor: 'pointer',
                }}
              >
                <CreditCard size={16} />
                Jetzt bezahlen
              </button>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 16px', borderRadius: 14, fontSize: 13, fontWeight: 600,
                background: 'var(--c2)', color: 'var(--stone)',
                border: '1px solid var(--border)',
              }}>
                <Store size={16} />
                Vor Ort bezahlen
              </div>
            </div>
            <p style={{ fontSize: 10, color: 'var(--stone)', marginTop: 6, textAlign: 'center' }}>
              Keine Buchungsgebühren · Sichere Zahlung via Stripe
            </p>
          </div>

          {/* Calendar buttons */}
          {(() => {
            const bookingDate = data.bookingDate || ''
            const timeParts = data.startTime.split(':')
            const startH = parseInt(timeParts[0] || '0', 10)
            const startM = parseInt(timeParts[1] || '0', 10)
            const endTotalMin = startH * 60 + startM + data.durationMinutes
            const endH = String(Math.floor(endTotalMin / 60)).padStart(2, '0')
            const endM = String(endTotalMin % 60).padStart(2, '0')
            const endTime = `${endH}:${endM}`

            const calendarBooking = {
              id: data.salonId || 'booking',
              booking_date: bookingDate,
              start_time: data.startTime,
              end_time: endTime,
              salon: { name: data.salonName },
              service: { name: data.serviceName },
            }

            const googleUrl = bookingDate ? generateGoogleCalendarUrl(calendarBooking) : ''
            const icsUrl = data.salonId ? `/api/calendar?bookingId=${encodeURIComponent(data.salonId)}` : ''

            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, justifyContent: 'center' }}>
                <CalendarPlus size={16} style={{ color: 'var(--gold2)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', marginRight: 4 }}>Zum Kalender hinzufügen</span>
                {googleUrl && (
                  <a
                    href={googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                      background: 'var(--c2)', border: '1px solid var(--border)',
                      color: 'var(--gold)', textDecoration: 'none',
                    }}
                  >
                    Google Calendar
                  </a>
                )}
                {icsUrl && (
                  <a
                    href={icsUrl}
                    download
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                      background: 'var(--c2)', border: '1px solid var(--border)',
                      color: 'var(--gold)', textDecoration: 'none',
                    }}
                  >
                    .ics herunterladen
                  </a>
                )}
              </div>
            )
          })()}

          <a href={`https://wa.me/${data.salonPhone ? data.salonPhone.replace(/[^0-9]/g, '') : ''}?text=${waMsg}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: 14, background: '#25D366', color: '#fff', borderRadius: 14, fontSize: 14, fontWeight: 700, textDecoration: 'none', marginBottom: 10 }}>
            💬 {data.salonPhone ? 'Per WhatsApp kontaktieren' : 'Per WhatsApp teilen'}
          </a>
          <button type="button" onClick={handleFertig} className="bgold">Fertig</button>
        </div>
      </div>
    </div>
  )
}
