'use client'

import { useState } from 'react'

interface Booking {
  id: string; booking_date: string; start_time: string; status: string
  salon: { name: string } | null; service: { name: string } | null
  customer: { full_name: string; email: string } | null
}

export default function AdminBookingActions({ bookings: init }: { bookings: Booking[] }) {
  const [bookings, setBookings] = useState(init)
  const [loading, setLoading] = useState<string | null>(null)

  async function changeStatus(id: string, status: string) {
    setLoading(id)
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'booking-status', id, data: { status } }),
      })
      if (res.ok) setBookings(p => p.map(b => b.id === id ? { ...b, status } : b))
    } catch {
      // network error — don't leave UI stuck
    } finally {
      setLoading(null)
    }
  }

  const statusColor = (s: string) => {
    if (s === 'confirmed') return { bg: 'rgba(74,138,90,0.15)', c: '#6ABF80', bc: 'rgba(74,138,90,0.3)' }
    if (s === 'pending') return { bg: 'rgba(176,144,96,0.1)', c: 'var(--gold)', bc: 'rgba(176,144,96,0.2)' }
    if (s === 'cancelled') return { bg: 'rgba(232,80,64,0.1)', c: 'var(--red)', bc: 'rgba(232,80,64,0.2)' }
    return { bg: 'var(--c3)', c: 'var(--stone)', bc: 'var(--c4)' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {bookings.map(b => {
        const sc = statusColor(b.status)
        return (
          <div key={b.id} className="card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: 13 }}>{b.service?.name || 'Service'}</div>
                <div style={{ fontSize: 11, color: 'var(--stone)' }}>
                  {b.salon?.name} · {new Date(b.booking_date).toLocaleDateString('de-DE')} {b.start_time?.slice(0, 5)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>
                  {b.customer?.full_name || 'Gast'} · {b.customer?.email}
                </div>
              </div>
              <span className="badge" style={{ fontSize: 9, background: sc.bg, color: sc.c, border: `1px solid ${sc.bc}` }}>
                {b.status.toUpperCase()}
              </span>
            </div>
            {['pending', 'confirmed'].includes(b.status) && (
              <div style={{ display: 'flex', gap: 6 }}>
                {b.status === 'pending' && (
                  <button className="bgold" disabled={loading === b.id} style={{ fontSize: 11, padding: '5px 10px' }}
                    onClick={() => changeStatus(b.id, 'confirmed')}>Bestätigen</button>
                )}
                <button className="boutline" disabled={loading === b.id}
                  style={{ fontSize: 11, padding: '5px 10px', color: 'var(--red)', borderColor: 'rgba(232,80,64,0.3)' }}
                  onClick={() => changeStatus(b.id, 'cancelled')}>Stornieren</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
