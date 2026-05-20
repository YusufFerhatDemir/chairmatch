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
}

const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const DAY_NAMES = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']

function getDateKey(b: Booking): string {
  if (!b.date) return ''
  return `${b.date.y}-${String(b.date.m + 1).padStart(2, '0')}-${String(b.date.d).padStart(2, '0')}`
}

function dateLabel(b: Booking): string {
  if (!b.date) return ''
  const d = new Date(b.date.y, b.date.m, b.date.d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const dayName = DAY_NAMES[d.getDay()]
  if (diff === 0) return `Heute · ${dayName}, ${b.date.d}. ${MONTHS[b.date.m]}`
  if (diff === 1) return `Morgen · ${dayName}, ${b.date.d}. ${MONTHS[b.date.m]}`
  if (diff < 0) return `Vor ${Math.abs(diff)} Tagen · ${dayName}, ${b.date.d}. ${MONTHS[b.date.m]}`
  if (diff < 7) return `In ${diff} Tagen · ${dayName}, ${b.date.d}. ${MONTHS[b.date.m]}`
  return `${dayName}, ${b.date.d}. ${MONTHS[b.date.m]} ${b.date.y}`
}

function isUpcoming(b: Booking): boolean {
  if (!b.date) return false
  const d = new Date(b.date.y, b.date.m, b.date.d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d >= today && b.status !== 'cancelled'
}

function isPast(b: Booking): boolean {
  if (!b.date) return false
  const d = new Date(b.date.y, b.date.m, b.date.d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today && b.status !== 'cancelled'
}

export default function TermineKundePage() {
  const router = useRouter()
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming')
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cm_bookings')
      if (raw) setBookings(JSON.parse(raw))
    } catch {}
  }, [])

  const filtered = bookings.filter(b => {
    if (filter === 'upcoming') return isUpcoming(b)
    if (filter === 'past') return isPast(b)
    return b.status === 'cancelled'
  })

  // Sort: upcoming ascending, past descending
  filtered.sort((a, b) => {
    if (!a.date || !b.date) return 0
    const aT = new Date(a.date.y, a.date.m, a.date.d).getTime()
    const bT = new Date(b.date.y, b.date.m, b.date.d).getTime()
    return filter === 'past' ? bT - aT : aT - bT
  })

  // Group by date
  const groups = new Map<string, Booking[]>()
  for (const b of filtered) {
    const k = getDateKey(b)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(b)
  }

  function cancelBooking(idx: number) {
    if (!confirm('Termin wirklich absagen?')) return
    try {
      const all = JSON.parse(localStorage.getItem('cm_bookings') || '[]')
      const targetBooking = filtered[idx]
      const realIdx = all.findIndex((x: Booking) => x.bookedAt === targetBooking.bookedAt)
      if (realIdx >= 0) {
        all[realIdx].status = 'cancelled'
        localStorage.setItem('cm_bookings', JSON.stringify(all))
        setBookings(all)
      }
    } catch {}
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
          <h2 className="cinzel text-gold-metallic" style={{ fontSize: 24, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>Meine Buchungen</h2>
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>Deine kommenden &amp; vergangenen Termine</p>
        </div>

        <div style={{ padding: '0 16px 14px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {[
            { k: 'upcoming', l: 'Kommend' },
            { k: 'past', l: 'Vergangen' },
            { k: 'cancelled', l: 'Abgesagt' },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => setFilter(k as 'upcoming' | 'past' | 'cancelled')}
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
            <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6 }}>
              {filter === 'upcoming' && 'Du hast noch keinen Termin gebucht.'}
              {filter === 'past' && 'Noch keine vergangenen Termine.'}
              {filter === 'cancelled' && 'Keine abgesagten Termine.'}
            </p>
          </div>
        ) : (
          Array.from(groups.entries()).map(([dateKey, items]) => (
            <div key={dateKey}>
              <div style={{ padding: '8px 20px', fontFamily: 'Cinzel', fontSize: 13, fontWeight: 600, color: 'var(--gold2)', letterSpacing: 2, textTransform: 'uppercase', background: 'rgba(196,168,106,0.04)', borderTop: '1px solid rgba(196,168,106,0.08)', borderBottom: '1px solid rgba(196,168,106,0.08)' }}>
                {items[0] && dateLabel(items[0])}
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
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{b.slug ? `Salon (${b.slug})` : 'Salon'}</p>
                      <p style={{ fontSize: 11.5, color: 'var(--stone)', marginTop: 2 }}>{b.service?.name || '—'}</p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 9, letterSpacing: 1, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: filter === 'cancelled' ? 'rgba(232,80,64,0.15)' : 'rgba(74,138,90,0.18)', color: filter === 'cancelled' ? '#FF8888' : '#6ABF80' }}>
                          {filter === 'cancelled' ? 'ABGESAGT' : 'BESTÄTIGT'}
                        </span>
                        <span className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, marginLeft: 'auto' }}>{b.service?.price ?? '—'} €</span>
                      </div>
                      {filter === 'upcoming' && (
                        <button onClick={() => cancelBooking(filtered.indexOf(b))}
                          style={{ marginTop: 8, fontSize: 11, color: '#FF8888', background: 'transparent', border: '1px solid rgba(232,80,64,0.3)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                        >✕ Absagen</button>
                      )}
                      {filter === 'past' && b.slug && (
                        <button onClick={() => router.push(\ as never)}
                          style={{ marginTop: 8, fontSize: 11, color: 'var(--gold2)', background: 'transparent', border: '1px solid rgba(196,168,106,0.3)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                        >★ Bewerten</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        <BottomNav role="mieter" />
      </div>
    </div>
  )
}
