'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'
import { berlinToday, hoursUntilBooking } from '@/lib/berlin-time'

/**
 * Meine Buchungen — /termine
 *
 * Diese Seite las ihre Termine bis Track 6 aus `localStorage['cm_bookings']`
 * und sagte sie auch dort ab: `all[realIdx].status = 'cancelled'`, fertig.
 * Beides war eine Fassade.
 *
 *  - Gebucht wurde nie etwas: die Bezahlseite hat denselben localStorage-
 *    Eintrag geschrieben und dazu "Buchung wurde trotzdem gespeichert"
 *    gemeldet. In der Datenbank stand nichts, der Salon sah keinen Termin.
 *  - Abgesagt wurde nie etwas: der Salon erfuhr von der Absage nichts, der
 *    Slot blieb bei ihm belegt, und der Kunde sah "ABGESAGT".
 *  - Auf einem zweiten Geraet war beides unsichtbar, nach dem Leeren des
 *    Browserspeichers weg.
 *
 * Jetzt haengt die Seite an `GET /api/bookings` (nur eigene Termine, per
 * Session eingegrenzt) und sagt ueber `POST /api/bookings/[id]/cancel` ab —
 * derselbe Pfad, der Statusuebergang, Berechtigung und Stornofrist prueft.
 */

interface ApiBooking {
  id: string
  booking_date: string
  start_time: string
  end_time: string | null
  status: string
  price_cents: number | null
  salon?: { name?: string; city?: string; slug?: string } | null
  service?: { name?: string; duration_minutes?: number } | null
}

const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const DAY_NAMES = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']

/** "14:30:00" -> "14:30". Die Datenbank liefert TIME mit Sekunden. */
function hhmm(time: string | null | undefined): string {
  if (!time) return '--:--'
  const m = /^(\d{1,2}):(\d{2})/.exec(time)
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '--:--'
}

function dateLabel(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!m) return dateKey
  const [, y, mo, d] = m.map(Number)
  const datum = new Date(Date.UTC(y, mo - 1, d))
  const heute = berlinToday()
  const [hy, hm, hd] = heute.split('-').map(Number)
  const diff = Math.round(
    (datum.getTime() - Date.UTC(hy, hm - 1, hd)) / 86_400_000,
  )
  const dayName = DAY_NAMES[datum.getUTCDay()]
  if (diff === 0) return `Heute · ${dayName}, ${d}. ${MONTHS[mo - 1]}`
  if (diff === 1) return `Morgen · ${dayName}, ${d}. ${MONTHS[mo - 1]}`
  if (diff < 0) return `Vor ${Math.abs(diff)} Tagen · ${dayName}, ${d}. ${MONTHS[mo - 1]}`
  if (diff < 7) return `In ${diff} Tagen · ${dayName}, ${d}. ${MONTHS[mo - 1]}`
  return `${dayName}, ${d}. ${MONTHS[mo - 1]} ${y}`
}

/** Preis nur anzeigen, wenn einer gespeichert ist — nie einen erfinden. */
function priceLabel(cents: number | null | undefined): string {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return '—'
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`
}

const AKTIV = ['pending', 'confirmed']

export default function TermineKundePage() {
  const router = useRouter()
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming')
  const [bookings, setBookings] = useState<ApiBooking[]>([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [sagtAb, setSagtAb] = useState<string | null>(null)

  const laden = useCallback(async () => {
    setLaedt(true)
    setFehler(null)
    try {
      const res = await fetch('/api/bookings', { cache: 'no-store' })
      if (res.status === 401) {
        setFehler('Bitte melde dich an, um deine Termine zu sehen.')
        setBookings([])
        return
      }
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

  const filtered = bookings.filter(b => {
    const storniert = String(b.status).toLowerCase() === 'cancelled'
    if (filter === 'cancelled') return storniert
    if (storniert) return false
    const kommend = String(b.booking_date) >= heute
    return filter === 'upcoming' ? kommend : !kommend
  })

  filtered.sort((a, b) => {
    const aK = `${a.booking_date} ${a.start_time}`
    const bK = `${b.booking_date} ${b.start_time}`
    return filter === 'past' ? bK.localeCompare(aK) : aK.localeCompare(bK)
  })

  const groups = new Map<string, ApiBooking[]>()
  for (const b of filtered) {
    const k = String(b.booking_date)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(b)
  }

  /**
   * Absagen — echt, ueber die API.
   *
   * Die Antwort sagt, ob die Frist gehalten wurde. Sie nennt bewusst keinen
   * Betrag: es gibt keine Spalte, in der eine Stornogebuehr stuende, und eine
   * erfundene Zahl waere schlimmer als der ehrliche Hinweis, dass der Salon
   * eine Gebuehr berechnen kann.
   */
  async function absagen(b: ApiBooking) {
    const stunden = hoursUntilBooking(b.booking_date, b.start_time)
    const spaet = Number.isFinite(stunden) && stunden < 24
    const frage = spaet
      ? 'Diesen Termin absagen? Er beginnt in weniger als 24 Stunden — je nach Salon kann dafür eine Gebühr anfallen.'
      : 'Termin wirklich absagen?'
    if (!confirm(frage)) return

    setSagtAb(b.id)
    setFehler(null)
    setHinweis(null)
    try {
      const res = await fetch(`/api/bookings/${b.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // Frueher verschwand jeder Fehlschlag in einem leeren catch und der
        // Termin sah trotzdem abgesagt aus.
        setFehler(data?.error || 'Absage fehlgeschlagen.')
        return
      }

      setHinweis(
        data?.freeOfCharge === false
          ? `Termin abgesagt. Die Frist des Salons (${data?.cancellationHours ?? 24} Std.) war bereits abgelaufen — der Salon kann dafür eine Gebühr berechnen.`
          : 'Termin abgesagt — fristgerecht und damit kostenfrei.',
      )
      await laden()
    } catch {
      setFehler('Verbindungsfehler — der Termin wurde nicht abgesagt.')
    } finally {
      setSagtAb(null)
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

        {fehler && (
          <div style={{ margin: '0 16px 12px', padding: '10px 14px', borderRadius: 12, background: 'rgba(232,80,64,0.1)', border: '1px solid rgba(232,80,64,0.3)', color: '#FF8888', fontSize: 12.5, lineHeight: 1.5 }}>
            {fehler}
          </div>
        )}
        {hinweis && (
          <div style={{ margin: '0 16px 12px', padding: '10px 14px', borderRadius: 12, background: 'rgba(74,138,90,0.1)', border: '1px solid rgba(74,138,90,0.3)', color: '#8FD6A2', fontSize: 12.5, lineHeight: 1.5 }}>
            {hinweis}
          </div>
        )}

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

        {laedt ? (
          <div style={{ margin: '20px 16px 30px', padding: 40, textAlign: 'center', color: 'var(--stone)', fontSize: 13 }}>
            Termine werden geladen …
          </div>
        ) : groups.size === 0 ? (
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
                {dateLabel(dateKey)}
              </div>
              <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(b => {
                  const storniert = String(b.status).toLowerCase() === 'cancelled'
                  const offen = AKTIV.includes(String(b.status).toLowerCase())
                  return (
                    <div key={b.id} style={{
                      background: 'linear-gradient(145deg, rgba(191,149,63,0.04), var(--c1) 50%, rgba(179,135,40,0.02))',
                      border: '1px solid rgba(191,149,63,0.18)',
                      borderRadius: 14, padding: 14,
                      display: 'flex', gap: 12,
                    }}>
                      <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 54, paddingRight: 12, borderRight: '1px solid rgba(196,168,106,0.15)' }}>
                        <div className="cinzel text-gold-metallic" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1 }}>{hhmm(b.start_time)}</div>
                        {b.service?.duration_minutes ? (
                          <div style={{ fontSize: 11, color: 'var(--stone)', fontWeight: 500, marginTop: 3 }}>{b.service.duration_minutes} min</div>
                        ) : null}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700 }}>{b.salon?.name || 'Salon'}</p>
                        <p style={{ fontSize: 11.5, color: 'var(--stone)', marginTop: 2 }}>{b.service?.name || '—'}</p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 9, letterSpacing: 1, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: storniert ? 'rgba(232,80,64,0.15)' : 'rgba(74,138,90,0.18)', color: storniert ? '#FF8888' : '#6ABF80' }}>
                            {storniert ? 'ABGESAGT'
                              : String(b.status).toLowerCase() === 'pending' ? 'ANGEFRAGT'
                              : String(b.status).toUpperCase()}
                          </span>
                          <span className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, marginLeft: 'auto' }}>{priceLabel(b.price_cents)}</span>
                        </div>
                        {filter === 'upcoming' && offen && (
                          <button onClick={() => absagen(b)} disabled={sagtAb === b.id}
                            style={{ marginTop: 8, fontSize: 11, color: '#FF8888', background: 'transparent', border: '1px solid rgba(232,80,64,0.3)', borderRadius: 8, padding: '5px 10px', cursor: sagtAb === b.id ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: sagtAb === b.id ? 0.6 : 1 }}
                          >{sagtAb === b.id ? 'Sage ab …' : '✕ Absagen'}</button>
                        )}
                        {filter === 'past' && b.salon?.slug && (
                          <button onClick={() => router.push(('/salon/' + b.salon?.slug + '/bewerten') as never)}
                            style={{ marginTop: 8, fontSize: 11, color: 'var(--gold2)', background: 'transparent', border: '1px solid rgba(196,168,106,0.3)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                          >★ Bewerten</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        <BottomNav role="mieter" />
      </div>
    </div>
  )
}
