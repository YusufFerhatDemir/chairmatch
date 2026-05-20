'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'

interface Booking {
  slug?: string
  service?: { id: string; name: string; duration: number; price: number; sub: string }
  date?: { y: number; m: number; d: number }
  timeSlot?: string
  bookedAt?: string
  status?: 'open' | 'confirmed' | 'cancelled' | 'past'
  customer?: string
}

// Demo-Daten für Anbieter-Sicht
const DEMO_BOOKINGS: Booking[] = [
  { customer: 'Anna Mustermann', service: { id: 'damen', name: 'Damenschnitt & Föhnen', duration: 60, price: 45, sub: '' }, timeSlot: '09:00', status: 'confirmed' },
  { customer: 'Max Schmidt', service: { id: 'herren', name: 'Herrenschnitt', duration: 30, price: 25, sub: '' }, timeSlot: '11:30', status: 'confirmed' },
  { customer: 'Lisa Bauer', service: { id: 'damen', name: 'Damenschnitt & Föhnen', duration: 60, price: 45, sub: '' }, timeSlot: '14:30', status: 'confirmed' },
  { customer: 'Sarah Klein', service: { id: 'faerben', name: 'Färben (kurz)', duration: 90, price: 60, sub: '' }, timeSlot: '16:00', status: 'open' },
]

const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const DAY_NAMES = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']

export default function TermineAnbieterPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'week' | 'month' | 'all'>('today')
  const [allBookings, setAllBookings] = useState<Booking[]>(DEMO_BOOKINGS)

  useEffect(() => {
    // Merge customer's bookings (from localStorage) with demo bookings
    try {
      const raw = localStorage.getItem('cm_bookings')
      if (raw) {
        const userBookings: Booking[] = JSON.parse(raw)
        const today = new Date()
        const todayDate = { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() }
        // Add today's demo bookings as if they were on today
        const demosToday = DEMO_BOOKINGS.map(b => ({ ...b, date: todayDate, status: b.status }))
        setAllBookings([...userBookings.filter(b => b.status !== 'cancelled').map(b => ({ ...b, customer: 'Kunde' })), ...demosToday])
      } else {
        const today = new Date()
        const todayDate = { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() }
        setAllBookings(DEMO_BOOKINGS.map(b => ({ ...b, date: todayDate })))
      }
    } catch {
      const today = new Date()
      const todayDate = { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() }
      setAllBookings(DEMO_BOOKINGS.map(b => ({ ...b, date: todayDate })))
    }
  }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const monthEnd = new Date(today)
  monthEnd.setMonth(monthEnd.getMonth() + 1)

  const filtered = allBookings.filter(b => {
    if (!b.date) return false
    const d = new Date(b.date.y, b.date.m, b.date.d)
    if (filter === 'today') return d.getTime() === today.getTime()
    if (filter === 'tomorrow') return d.getTime() === tomorrow.getTime()
    if (filter === 'week') return d >= today && d < weekEnd
    if (filter === 'month') return d >= today && d < monthEnd
    return true
  }).sort((a, b) => {
    if (!a.date || !b.date) return 0
    const aD = new Date(a.date.y, a.date.m, a.date.d).getTime()
    const bD = new Date(b.date.y, b.date.m, b.date.d).getTime()
    if (aD !== bD) return aD - bD
    return (a.timeSlot || '').localeCompare(b.timeSlot || '')
  })

  // KPIs
  const todayCount = allBookings.filter(b => {
    if (!b.date) return false
    const d = new Date(b.date.y, b.date.m, b.date.d)
    return d.getTime() === today.getTime() && b.status !== 'cancelled'
  }).length
  const weekCount = allBookings.filter(b => {
    if (!b.date) return false
    const d = new Date(b.date.y, b.date.m, b.date.d)
    return d >= today && d < weekEnd && b.status !== 'cancelled'
  }).length
  const weekRevenue = allBookings.filter(b => {
    if (!b.date) return false
    const d = new Date(b.date.y, b.date.m, b.date.d)
    return d >= today && d < weekEnd && b.status !== 'cancelled'
  }).reduce((sum, b) => sum + (b.service?.price || 0), 0)

  // Group by date
  const groups = new Map<string, Booking[]>()
  for (const b of filtered) {
    if (!b.date) continue
    const k = `${b.date.y}-${b.date.m}-${b.date.d}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(b)
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
          <button onClick={() => router.push('/anbieter/mein-salon')}
            style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(196,168,106,0.08)', border: '1px solid rgba(196,168,106,0.22)', color: 'var(--gold2)', fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
          >‹</button>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>Termine</span>
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>CHAIRMATCH</h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        <div style={{ padding: '0 20px 14px' }}>
          <h2 className="cinzel text-gold-metallic" style={{ fontSize: 24, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>Meine Termine</h2>
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>Übersicht aller Buchungen</p>
        </div>

        {/* KPI Strip */}
        <div style={{ margin: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 14, padding: '12px 6px', textAlign: 'center' }}>
            <div className="cinzel text-gold-metallic" style={{ fontSize: 19, fontWeight: 600 }}>{todayCount}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 3, textTransform: 'uppercase' }}>Heute</div>
          </div>
          <div style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 14, padding: '12px 6px', textAlign: 'center' }}>
            <div className="cinzel text-gold-metallic" style={{ fontSize: 19, fontWeight: 600 }}>{weekCount}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 3, textTransform: 'uppercase' }}>Diese Woche</div>
          </div>
          <div style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 14, padding: '12px 6px', textAlign: 'center' }}>
            <div className="cinzel text-gold-metallic" style={{ fontSize: 19, fontWeight: 600 }}>€{weekRevenue}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 3, textTransform: 'uppercase' }}>Umsatz Woche</div>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ padding: '0 16px 14px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {[
            { k: 'today', l: 'Heute' },
            { k: 'tomorrow', l: 'Morgen' },
            { k: 'week', l: 'Diese Woche' },
            { k: 'month', l: 'Diesen Monat' },
            { k: 'all', l: 'Alle' },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => setFilter(k as 'today' | 'tomorrow' | 'week' | 'month' | 'all')}
              style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 20,
                fontSize: 11, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase',
                background: filter === k ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)' : 'rgba(176,144,96,0.08)',
                border: filter === k ? 'none' : '1px solid rgba(176,144,96,0.22)',
                color: filter === k ? '#1a1000' : 'var(--gold2)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{l}</button>
          ))}
        </div>

        {groups.size === 0 ? (
          <div style={{ margin: '20px 16px 30px', padding: 40, textAlign: 'center', background: 'rgba(176,144,96,0.04)', border: '1px dashed rgba(176,144,96,0.25)', borderRadius: 18 }}>
            <p className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 8 }}>Keine Termine</p>
            <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6 }}>Aktuell keine Buchungen in diesem Zeitraum.</p>
          </div>
        ) : (
          Array.from(groups.entries()).map(([dateKey, items]) => {
            const [y, m, d] = dateKey.split('-').map(Number)
            const date = new Date(y, m, d)
            const dayName = DAY_NAMES[date.getDay()]
            return (
              <div key={dateKey}>
                <div style={{ padding: '8px 20px', fontFamily: 'Cinzel', fontSize: 13, fontWeight: 600, color: 'var(--gold2)', letterSpacing: 2, textTransform: 'uppercase', background: 'rgba(196,168,106,0.04)', borderTop: '1px solid rgba(196,168,106,0.08)', borderBottom: '1px solid rgba(196,168,106,0.08)' }}>
                  {dayName}, {d}. {MONTHS[m]}
                </div>
                <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((b, i) => (
                    <div key={i} style={{
                      background: 'linear-gradient(145deg, rgba(191,149,63,0.04), var(--c1) 50%, rgba(179,135,40,0.02))',
                      border: '1px solid rgba(191,149,63,0.18)',
                      borderRadius: 14, padding: 14,
                      display: 'flex', gap: 12,
                    }}>
                      <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 54, paddingRight: 12, borderRight: '1px solid rgba(196,168,106,0.15)' }}>
                        <div className="cinzel text-gold-metallic" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1 }}>{b.timeSlot || '--:--'}</div>
                        <div style={{ fontSize: 11, color: 'var(--stone)', fontWeight: 500, marginTop: 3 }}>{b.service?.duration} min</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700 }}>{b.customer || 'Kunde'}</p>
                        <p style={{ fontSize: 11.5, color: 'var(--stone)', marginTop: 2 }}>{b.service?.name || '—'}</p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 9, letterSpacing: 1, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                            background: b.status === 'open' ? 'rgba(232,80,64,0.15)' : 'rgba(74,138,90,0.18)',
                            color: b.status === 'open' ? '#FF8888' : '#6ABF80',
                          }}>
                            {b.status === 'open' ? 'NEU · BESTÄTIGEN' : 'BESTÄTIGT'}
                          </span>
                          <span className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, marginLeft: 'auto' }}>{b.service?.price ?? '—'} €</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}

        <BottomNav role="anbieter" />
      </div>
    </div>
  )
}
