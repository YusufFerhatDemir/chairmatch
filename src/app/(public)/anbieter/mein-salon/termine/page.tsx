'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'
import { berlinToday } from '@/lib/berlin-time'

/**
 * Meine Termine (Anbieter) — /anbieter/mein-salon/termine
 *
 * Der Terminkalender des Salons war bis Track 6 doppelt erfunden:
 *
 *  1. `DEMO_BOOKINGS` — vier feste Kundinnen ("Anna Mustermann", "Max
 *     Schmidt", …) mit erfundenen Preisen, jedem Saloninhaber dieselben, immer
 *     auf den heutigen Tag gelegt. Daraus wurden auch die KPI-Kacheln
 *     gerechnet, inklusive "Umsatz Woche" — eine Zahl, die nie etwas mit dem
 *     Salon zu tun hatte.
 *  2. Der Rest kam aus `localStorage['cm_bookings']` — dem Browserspeicher
 *     des ANBIETERS. Dort landeten aber nur die Schein-Buchungen, die der
 *     Buchen-Flow im Browser des KUNDEN abgelegt hat. Ein echter Kundentermin
 *     konnte hier also gar nicht ankommen: die beiden Geraete teilen keinen
 *     localStorage.
 *
 * Der Kalender zeigte damit garantiert nie einen echten Termin — und ein
 * Salon, der ihm glaubte, hat Doppelbuchungen angenommen, weil die wirklich
 * belegten Zeiten nirgends zu sehen waren.
 *
 * Jetzt: `GET /api/bookings?salonId=…` mit den echten Buchungen des eigenen
 * Salons. Die Eigentuemerpruefung sitzt in `getBookings` — ein fremder
 * `salonId` liefert dort eine leere Liste.
 */

interface ApiBooking {
  id: string
  booking_date: string
  start_time: string
  status: string
  price_cents: number | null
  service?: { name?: string; duration_minutes?: number } | null
  customer?: { full_name?: string } | null
}

const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const DAY_NAMES = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']

function hhmm(time: string | null | undefined): string {
  if (!time) return '--:--'
  const m = /^(\d{1,2}):(\d{2})/.exec(time)
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '--:--'
}

/** YYYY-MM-DD + Tage -> YYYY-MM-DD (ueber UTC, damit keine Zeitzone hineinrutscht). */
function plusDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
}

function euro(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`
}

const AKTIV = ['pending', 'confirmed']

export default function TermineAnbieterPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'week' | 'month' | 'all'>('today')
  const [bookings, setBookings] = useState<ApiBooking[]>([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [aendert, setAendert] = useState<string | null>(null)

  const laden = useCallback(async () => {
    setLaedt(true)
    setFehler(null)
    try {
      const salonRes = await fetch('/api/me/salon', { cache: 'no-store' })
      if (salonRes.status === 401) {
        setFehler('Bitte melde dich an.')
        setBookings([])
        return
      }
      if (!salonRes.ok) {
        setFehler('Für dieses Konto ist noch kein Salon hinterlegt.')
        setBookings([])
        return
      }
      const salon = await salonRes.json()
      const salonId = salon?.id ?? salon?.salon?.id
      if (!salonId) {
        setFehler('Für dieses Konto ist noch kein Salon hinterlegt.')
        setBookings([])
        return
      }

      const res = await fetch(`/api/bookings?salonId=${encodeURIComponent(salonId)}`, { cache: 'no-store' })
      if (!res.ok) {
        setFehler('Termine konnten nicht geladen werden.')
        setBookings([])
        return
      }
      const data = await res.json()
      setBookings(Array.isArray(data) ? data : [])
    } catch {
      setFehler('Verbindungsfehler — Termine konnten nicht geladen werden.')
      setBookings([])
    } finally {
      setLaedt(false)
    }
  }, [])

  useEffect(() => {
    void laden()
  }, [laden])

  const heute = berlinToday()
  const morgen = plusDays(heute, 1)
  const wocheEnde = plusDays(heute, 7)
  const monatEnde = plusDays(heute, 31)

  const imZeitraum = (b: ApiBooking): boolean => {
    const d = String(b.booking_date)
    if (filter === 'today') return d === heute
    if (filter === 'tomorrow') return d === morgen
    if (filter === 'week') return d >= heute && d < wocheEnde
    if (filter === 'month') return d >= heute && d < monatEnde
    return true
  }

  const filtered = bookings
    .filter(imZeitraum)
    .sort((a, b) => `${a.booking_date} ${a.start_time}`.localeCompare(`${b.booking_date} ${b.start_time}`))

  const aktiv = bookings.filter(b => AKTIV.includes(String(b.status).toLowerCase()))
  const todayCount = aktiv.filter(b => String(b.booking_date) === heute).length
  const weekCount = aktiv.filter(b => String(b.booking_date) >= heute && String(b.booking_date) < wocheEnde).length

  // Umsatz der Woche aus den tatsaechlich gespeicherten Preisen. Buchungen
  // ohne Preis fliessen mit 0 ein und werden separat ausgewiesen, statt die
  // Summe stillschweigend zu schoenen.
  const wocheBuchungen = aktiv.filter(b => String(b.booking_date) >= heute && String(b.booking_date) < wocheEnde)
  const weekRevenueCents = wocheBuchungen.reduce(
    (sum, b) => sum + (typeof b.price_cents === 'number' ? b.price_cents : 0),
    0,
  )
  const ohnePreis = wocheBuchungen.filter(b => typeof b.price_cents !== 'number').length

  const groups = new Map<string, ApiBooking[]>()
  for (const b of filtered) {
    const k = String(b.booking_date)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(b)
  }

  /** Termin bestaetigen — echter Statuswechsel ueber PATCH /api/bookings/[id]. */
  async function bestaetigen(id: string) {
    setAendert(id)
    setFehler(null)
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus: 'confirmed' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFehler(data?.error || 'Der Termin konnte nicht bestätigt werden.')
        return
      }
      await laden()
    } catch {
      setFehler('Verbindungsfehler — der Termin wurde nicht bestätigt.')
    } finally {
      setAendert(null)
    }
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

        {fehler && (
          <div style={{ margin: '0 16px 12px', padding: '10px 14px', borderRadius: 12, background: 'rgba(232,80,64,0.1)', border: '1px solid rgba(232,80,64,0.3)', color: '#FF8888', fontSize: 12.5, lineHeight: 1.5 }}>
            {fehler}
          </div>
        )}

        <div style={{ margin: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 14, padding: '12px 6px', textAlign: 'center' }}>
            <div className="cinzel text-gold-metallic" style={{ fontSize: 19, fontWeight: 600 }}>{laedt ? '–' : todayCount}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 3, textTransform: 'uppercase' }}>Heute</div>
          </div>
          <div style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 14, padding: '12px 6px', textAlign: 'center' }}>
            <div className="cinzel text-gold-metallic" style={{ fontSize: 19, fontWeight: 600 }}>{laedt ? '–' : weekCount}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 3, textTransform: 'uppercase' }}>Diese Woche</div>
          </div>
          <div style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 14, padding: '12px 6px', textAlign: 'center' }}>
            <div className="cinzel text-gold-metallic" style={{ fontSize: 17, fontWeight: 600 }}>{laedt ? '–' : euro(weekRevenueCents)}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 3, textTransform: 'uppercase' }}>
              Umsatz Woche{ohnePreis > 0 ? ` (${ohnePreis} o. Preis)` : ''}
            </div>
          </div>
        </div>

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

        {laedt ? (
          <div style={{ margin: '20px 16px 30px', padding: 40, textAlign: 'center', color: 'var(--stone)', fontSize: 13 }}>
            Termine werden geladen …
          </div>
        ) : groups.size === 0 ? (
          <div style={{ margin: '20px 16px 30px', padding: 40, textAlign: 'center', background: 'rgba(176,144,96,0.04)', border: '1px dashed rgba(176,144,96,0.25)', borderRadius: 18 }}>
            <p className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 8 }}>Keine Termine</p>
            <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6 }}>Aktuell keine Buchungen in diesem Zeitraum.</p>
          </div>
        ) : (
          Array.from(groups.entries()).map(([dateKey, items]) => {
            const [y, m, d] = dateKey.split('-').map(Number)
            const dayName = DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
            return (
              <div key={dateKey}>
                <div style={{ padding: '8px 20px', fontFamily: 'Cinzel', fontSize: 13, fontWeight: 600, color: 'var(--gold2)', letterSpacing: 2, textTransform: 'uppercase', background: 'rgba(196,168,106,0.04)', borderTop: '1px solid rgba(196,168,106,0.08)', borderBottom: '1px solid rgba(196,168,106,0.08)' }}>
                  {dayName}, {d}. {MONTHS[m - 1]}
                </div>
                <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(b => {
                    const status = String(b.status).toLowerCase()
                    const offen = status === 'pending'
                    const storniert = status === 'cancelled'
                    return (
                      <div key={b.id} style={{
                        background: 'linear-gradient(145deg, rgba(191,149,63,0.04), var(--c1) 50%, rgba(179,135,40,0.02))',
                        border: '1px solid rgba(191,149,63,0.18)',
                        borderRadius: 14, padding: 14,
                        display: 'flex', gap: 12,
                        opacity: storniert ? 0.6 : 1,
                      }}>
                        <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 54, paddingRight: 12, borderRight: '1px solid rgba(196,168,106,0.15)' }}>
                          <div className="cinzel text-gold-metallic" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1 }}>{hhmm(b.start_time)}</div>
                          {b.service?.duration_minutes ? (
                            <div style={{ fontSize: 11, color: 'var(--stone)', fontWeight: 500, marginTop: 3 }}>{b.service.duration_minutes} min</div>
                          ) : null}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 700 }}>{b.customer?.full_name || 'Kunde'}</p>
                          <p style={{ fontSize: 11.5, color: 'var(--stone)', marginTop: 2 }}>{b.service?.name || '—'}</p>
                          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: 9, letterSpacing: 1, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                              background: storniert ? 'rgba(232,80,64,0.15)' : offen ? 'rgba(232,80,64,0.15)' : 'rgba(74,138,90,0.18)',
                              color: storniert ? '#FF8888' : offen ? '#FF8888' : '#6ABF80',
                            }}>
                              {storniert ? 'ABGESAGT' : offen ? 'NEU · BESTÄTIGEN' : status.toUpperCase()}
                            </span>
                            <span className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, marginLeft: 'auto' }}>
                              {typeof b.price_cents === 'number' ? euro(b.price_cents) : '—'}
                            </span>
                          </div>
                          {offen && (
                            <button onClick={() => bestaetigen(b.id)} disabled={aendert === b.id}
                              style={{ marginTop: 8, fontSize: 11, color: '#6ABF80', background: 'transparent', border: '1px solid rgba(74,138,90,0.35)', borderRadius: 8, padding: '5px 10px', cursor: aendert === b.id ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: aendert === b.id ? 0.6 : 1 }}
                            >{aendert === b.id ? 'Bestätige …' : '✓ Bestätigen'}</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
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
