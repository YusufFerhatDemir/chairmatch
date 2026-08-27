'use client'

import MeinBereichSubPage, { TippsBox } from '@/components/MeinBereichSubPage'
import { useEffect, useState } from 'react'
import { apiGet, ApiError } from '@/lib/client-api'
import type { RentalRevenueResponse } from '@/modules/rentals/rental-listing.types'

/**
 * Umsatz & Auslastung (Vermieter) — /vermieter/mein-inserat/umsatz
 *
 * Diese Seite hat bis 2026-08-27 JEDEM Vermieter erfundene Zahlen als seine
 * eigenen vorgelegt: Monatsbalken, "Einnahmen gesamt", eine Auslastung und
 * daraus abgeleitet den Rat, den Tagessatz zu erhoehen — alles aus
 * `buildDemoData`.
 *
 * Der Grund war ein einziger Aufruf: `supabase.auth.getSession()`. Angemeldet
 * wird bei ChairMatch aber ueber NextAuth (`signIn('credentials')` in /auth);
 * der Browser-Supabase-Client bekommt dabei NIE eine Session. Der Aufruf gab
 * also ausnahmslos `null` zurueck, die Ladefunktion warf "keine Session", und
 * der `catch`-Zweig setzte die Demo-Daten. Der kleine Hinweis
 * "Beispieldaten — verbinde dein Inserat" stand zwar darueber, aber die
 * Kacheln darunter lasen sich wie ein Kontoauszug.
 *
 * Zweiter, unabhaengiger Grund: `rental_bookings` ist mit dem ANON-Key
 * ueberhaupt nicht lesbar. Selbst MIT Supabase-Session waere die Abfrage an
 * RLS gescheitert.
 *
 * Jetzt: GET /api/me/rental-revenue (Server-Session, Service-Client,
 * Eigentuemerpruefung ueber salons.owner_id). Gerechnet wird nur mit echten
 * Buchungen. Gibt es keine, sagt die Seite genau das.
 */

/* ── Typen ──────────────────────────────────────────────────── */

type Booking = {
  id: string
  equipmentId: string
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD
  totalCents: number
  status: string
}

type Equipment = { id: string; name: string }

type Loaded = { bookings: Booking[]; equipment: Equipment[] }

/** Was der Nutzer sieht, wenn es (noch) nichts zu rechnen gibt. */
type LeerGrund = 'kein-salon' | 'kein-objekt' | 'keine-buchung'

type MonthBar = { label: string; euros: number; isCurrent: boolean }

type PerEquipment = { name: string; days: number; euros: number }

type Stats = {
  monthly: MonthBar[]
  revenueThisMonthEuros: number
  revenueTotalEuros: number
  occupancyPct: number
  avgDailyEuros: number
  perEquipment: PerEquipment[]
  forecastEuros: number
  forecastMonthLabel: string
  avg3Euros: number
}

/* ── Formatierung ───────────────────────────────────────────── */

const eur0 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const eur2 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
const num0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 })

/* ── Datums-Helfer ──────────────────────────────────────────── */

const DAY_MS = 86400000
const CANCELLED = new Set(['cancelled', 'canceled', 'declined', 'rejected'])

function parseDay(s: string): Date {
  const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Buchungstage inklusive Start- und Endtag */
function bookingDays(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1)
}

/** Überlappungstage einer Buchung mit einem Monat */
function overlapDays(start: Date, end: Date, monthStart: Date, monthEnd: Date): number {
  const s = start > monthStart ? start : monthStart
  const e = end < monthEnd ? end : monthEnd
  if (e < s) return 0
  return Math.round((e.getTime() - s.getTime()) / DAY_MS) + 1
}

/* ── Statistik ──────────────────────────────────────────────── */

function computeStats(bookings: Booking[], equipment: Equipment[], now: Date): Stats {
  const active = bookings.filter((b) => !CANCELLED.has(b.status.toLowerCase()))

  // Letzte 6 Monate (inkl. aktueller)
  const months: { start: Date; end: Date; label: string; isCurrent: boolean }[] = []
  for (let k = 5; k >= 0; k--) {
    const start = new Date(now.getFullYear(), now.getMonth() - k, 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    months.push({
      start,
      end,
      label: start.toLocaleDateString('de-DE', { month: 'short' }).replace('.', ''),
      isCurrent: k === 0,
    })
  }

  const monthlyRevenue = new Array<number>(months.length).fill(0)
  const bookedDaysThisMonthPerEq = new Map<string, number>()
  const perEqDays = new Map<string, number>()
  const perEqEuros = new Map<string, number>()
  let totalEuros = 0
  let totalDays = 0

  active.forEach((b) => {
    const start = parseDay(b.start)
    const end = parseDay(b.end)
    const days = bookingDays(start, end)
    const dailyEuros = b.totalCents / 100 / days

    totalEuros += b.totalCents / 100
    totalDays += days
    perEqDays.set(b.equipmentId, (perEqDays.get(b.equipmentId) ?? 0) + days)
    perEqEuros.set(b.equipmentId, (perEqEuros.get(b.equipmentId) ?? 0) + b.totalCents / 100)

    months.forEach((m, i) => {
      const ov = overlapDays(start, end, m.start, m.end)
      if (ov > 0) monthlyRevenue[i] += ov * dailyEuros
      if (m.isCurrent && ov > 0) {
        bookedDaysThisMonthPerEq.set(b.equipmentId, (bookedDaysThisMonthPerEq.get(b.equipmentId) ?? 0) + ov)
      }
    })
  })

  // Auslastung: gebuchte Tage / verfügbare Tage im aktuellen Monat
  const current = months[months.length - 1]
  const daysInMonth = current.end.getDate()
  const eqCount = Math.max(1, equipment.length)
  let bookedThisMonth = 0
  equipment.forEach((eq) => {
    bookedThisMonth += Math.min(daysInMonth, bookedDaysThisMonthPerEq.get(eq.id) ?? 0)
  })
  const occupancyPct = Math.min(100, Math.round((bookedThisMonth / (eqCount * daysInMonth)) * 100))

  // Pro Objekt (absteigend nach Umsatz)
  const perEquipment: PerEquipment[] = equipment
    .map((eq) => ({
      name: eq.name,
      days: perEqDays.get(eq.id) ?? 0,
      euros: perEqEuros.get(eq.id) ?? 0,
    }))
    .sort((a, b) => b.euros - a.euros)

  // Prognose: Ø der letzten 3 Monate × Trendfaktor
  const last3 = monthlyRevenue.slice(-3)
  const avg3 = last3.reduce((a, v) => a + v, 0) / 3
  const prior2Avg = (last3[0] + last3[1]) / 2
  const rawTrend = prior2Avg > 0 ? last3[2] / prior2Avg : 1
  const trend = Math.min(1.25, Math.max(0.75, rawTrend))
  const forecastEuros = avg3 * trend
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  return {
    monthly: months.map((m, i) => ({ label: m.label, euros: monthlyRevenue[i], isCurrent: m.isCurrent })),
    revenueThisMonthEuros: monthlyRevenue[monthlyRevenue.length - 1],
    revenueTotalEuros: totalEuros,
    occupancyPct,
    avgDailyEuros: totalDays > 0 ? totalEuros / totalDays : 0,
    perEquipment,
    forecastEuros,
    forecastMonthLabel: nextMonth.toLocaleDateString('de-DE', { month: 'long' }),
    avg3Euros: avg3,
  }
}

/* ── Balkendiagramm (pure SVG) ──────────────────────────────── */

function RevenueChart({ monthly }: { monthly: MonthBar[] }) {
  const W = 390
  const H = 190
  const top = 26
  const bottom = 158
  const labelY = 178
  const slot = W / monthly.length
  const barW = 34
  const max = Math.max(1, ...monthly.map((m) => m.euros))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Umsatz der letzten 6 Monate">
      <defs>
        <linearGradient id="cm-gold-bar" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FCF6BA" />
          <stop offset="35%" stopColor="#D4AF37" />
          <stop offset="70%" stopColor="#B38728" />
          <stop offset="100%" stopColor="#AA771C" />
        </linearGradient>
      </defs>
      {/* Grundlinie */}
      <line x1={8} y1={bottom + 0.5} x2={W - 8} y2={bottom + 0.5} stroke="rgba(196,168,106,0.25)" strokeWidth="1" />
      {monthly.map((m, i) => {
        const h = Math.max(m.euros > 0 ? 4 : 2, ((bottom - top) * m.euros) / max)
        const x = slot * i + (slot - barW) / 2
        const y = bottom - h
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={h} rx={6}
              fill="url(#cm-gold-bar)"
              opacity={m.isCurrent ? 1 : 0.45}
              stroke={m.isCurrent ? 'rgba(252,246,186,0.7)' : 'none'}
              strokeWidth={m.isCurrent ? 1 : 0}
            />
            <text
              x={x + barW / 2} y={y - 7} textAnchor="middle"
              fontSize="9.5" fontWeight={m.isCurrent ? 700 : 500}
              fill={m.isCurrent ? 'var(--gold2)' : 'var(--stone)'}
              fontFamily="inherit"
            >
              {num0.format(Math.round(m.euros))} €
            </text>
            <text
              x={slot * i + slot / 2} y={labelY} textAnchor="middle"
              fontSize="10" letterSpacing="1"
              fill={m.isCurrent ? 'var(--gold2)' : 'var(--stone)'}
              fontWeight={m.isCurrent ? 700 : 500}
              fontFamily="inherit"
            >
              {m.label.toUpperCase()}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── Seite ──────────────────────────────────────────────────── */

export default function Page() {
  const [data, setData] = useState<Loaded | null>(null)
  const [now, setNow] = useState<Date | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [leer, setLeer] = useState<LeerGrund | null>(null)

  useEffect(() => {
    let cancelled = false
    const today = new Date()

    async function load() {
      try {
        const res = await apiGet<RentalRevenueResponse>('/api/me/rental-revenue')
        if (cancelled) return

        if (!res.hasSalon) {
          setLeer('kein-salon')
        } else if (res.equipment.length === 0) {
          setLeer('kein-objekt')
        } else if (res.bookings.length === 0) {
          setLeer('keine-buchung')
        } else {
          setLeer(null)
          setData({
            equipment: res.equipment.map((e) => ({ id: e.id, name: e.name })),
            // Stornierte und erstattete Buchungen fliegen schon hier raus —
            // die Route markiert sie, und was kein Umsatz ist, soll auch in
            // keiner Auslastung auftauchen.
            bookings: res.bookings
              .filter((b) => b.countsAsRevenue && b.startDate && b.endDate)
              .map((b) => ({
                id: b.id,
                equipmentId: b.equipmentId,
                start: b.startDate as string,
                end: b.endDate as string,
                totalCents: b.totalCents,
                status: b.status,
              })),
          })
        }
        setFehler(null)
      } catch (err) {
        if (cancelled) return
        // KEIN Ersatzbestand. Vorher stand hier buildDemoData() — erfundene
        // Einnahmen, die der Vermieter fuer seine eigenen halten musste.
        setData(null)
        setFehler(
          err instanceof ApiError && err.status === 401
            ? 'Bitte melde dich an, um deine Einnahmen zu sehen.'
            : err instanceof Error
              ? err.message
              : 'Umsatzdaten konnten nicht geladen werden',
        )
      } finally {
        if (!cancelled) {
          setNow(today)
          setLaedt(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const LEER_TEXTE: Record<LeerGrund, { title: string; body: string }> = {
    'kein-salon': {
      title: 'Noch kein Salon hinterlegt',
      body: 'Lege zuerst deinen Salon an. Danach erscheinen hier die Einnahmen deiner Mietobjekte.',
    },
    'kein-objekt': {
      title: 'Noch kein Mietobjekt',
      body: 'Stelle unter „Meine Inserate" einen Platz ein — sobald er gebucht wird, steht der Umsatz hier.',
    },
    'keine-buchung': {
      title: 'Noch keine Miet-Buchung',
      body: 'Deine Inserate sind online, aber es hat noch niemand gebucht. Sobald die erste Buchung bezahlt ist, erscheinen hier echte Zahlen.',
    },
  }

  const stats = data && now ? computeStats(data.bookings, data.equipment, now) : null

  const tip = stats
    ? stats.occupancyPct < 40
      ? 'Tipp: Senke deinen Tagessatz um 10 % oder aktiviere Wochenpakete, um mehr Buchungen anzuziehen.'
      : stats.occupancyPct <= 75
        ? 'Solide Auslastung! Biete Wochen- und Monatspakete mit leichtem Rabatt an — so sicherst du dir längere Buchungen und planbare Einnahmen.'
        : 'Deine Auslastung ist top — Zeit, den Preis zu erhöhen. Schon 5–10 % mehr pro Tag steigern deinen Umsatz spürbar.'
    : ''

  const kpis = stats
    ? [
        { label: 'Einnahmen diesen Monat', value: eur0.format(stats.revenueThisMonthEuros) },
        { label: 'Einnahmen gesamt', value: eur0.format(stats.revenueTotalEuros) },
        { label: 'Auslastung', value: `${stats.occupancyPct} %` },
        { label: 'Ø Tagessatz', value: eur2.format(stats.avgDailyEuros) },
      ]
    : []

  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel="Mein Inserat"
      title="Umsatz & Auslastung"
      subtitle="Deine Einnahmen und Auslastung im Überblick"
      showSave={false}
      role="vermieter"
    >
      {laedt && (
        <div style={{
          background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
          borderRadius: 14, padding: '28px 16px', textAlign: 'center',
          fontSize: 12, color: 'var(--stone)', letterSpacing: 1,
        }}>
          Lade Umsatzdaten …
        </div>
      )}

      {!laedt && fehler && (
        <div role="alert" style={{
          background: 'rgba(232,80,64,0.06)', border: '1px solid rgba(232,80,64,0.25)',
          borderRadius: 14, padding: '22px 16px', textAlign: 'center',
          fontSize: 13, color: '#FF8888', lineHeight: 1.6,
        }}>
          {fehler}
        </div>
      )}

      {!laedt && !fehler && leer && (
        <div style={{
          background: 'var(--c1)', border: '1px dashed rgba(196,168,106,0.28)',
          borderRadius: 16, padding: '28px 18px', textAlign: 'center',
        }}>
          <p className="cinzel text-gold-metallic" style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
            {LEER_TEXTE[leer].title}
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.6 }}>
            {LEER_TEXTE[leer].body}
          </p>
        </div>
      )}

      {stats && data && (
        <>
          {/* KPI-Karten */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            {kpis.map((k) => (
              <div key={k.label} style={{
                background: 'linear-gradient(145deg, rgba(191,149,63,0.05) 0%, var(--c1) 50%, rgba(179,135,40,0.03) 100%)',
                border: '1px solid rgba(191,149,63,0.22)',
                borderRadius: 16, padding: '14px 12px', textAlign: 'center',
                boxShadow: '0 0 8px rgba(191,149,63,0.05), 0 12px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(252,246,186,0.04)',
              }}>
                <div className="cinzel text-gold-metallic" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.1 }}>
                  {k.value}
                </div>
                <div style={{ fontSize: 9, letterSpacing: 1.2, color: 'var(--stone)', marginTop: 5, textTransform: 'uppercase' }}>
                  {k.label}
                </div>
              </div>
            ))}
          </div>

          {/* 6-Monats-Diagramm */}
          <div style={{
            background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
            borderRadius: 16, padding: '14px 8px 6px',
          }}>
            <p style={{ fontSize: 10, letterSpacing: 2, color: 'var(--stone)', textTransform: 'uppercase', fontWeight: 600, padding: '0 10px', marginBottom: 4 }}>
              Umsatz — letzte 6 Monate
            </p>
            <RevenueChart monthly={stats.monthly} />
          </div>

          {/* Pro Objekt */}
          <div>
            <p style={{ fontSize: 10, letterSpacing: 2, color: 'var(--stone)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
              Pro Objekt
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.perEquipment.map((eq) => (
                <div key={eq.name} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
                  borderRadius: 12, padding: '12px 14px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {eq.name}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--stone)', marginTop: 2 }}>
                      {eq.days} {eq.days === 1 ? 'Tag' : 'Tage'} gebucht
                    </div>
                  </div>
                  <div className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 600, flexShrink: 0 }}>
                    {eur0.format(eq.euros)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prognose — nur, wenn es ueberhaupt etwas zu extrapolieren gibt.
              Eine "Prognose: 0 €" aus drei leeren Monaten ist keine Prognose,
              sondern eine leere Zeile mit Anspruch. */}
          {stats.avg3Euros > 0 && (
            <div style={{
              background: 'linear-gradient(145deg, rgba(191,149,63,0.05) 0%, var(--c1) 50%, rgba(179,135,40,0.03) 100%)',
              border: '1px solid rgba(191,149,63,0.22)',
              borderRadius: 18, padding: '18px 16px', textAlign: 'center',
            }}>
              <p style={{ fontSize: 10, letterSpacing: 2, color: 'var(--stone)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                Prognose nächster Monat
              </p>
              <div className="cinzel text-gold-metallic" style={{ fontSize: 26, fontWeight: 600 }}>
                {eur0.format(stats.forecastEuros)}
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--stone)', lineHeight: 1.5, marginTop: 8 }}>
                Basierend auf dem Durchschnitt der letzten drei Monate ({eur0.format(stats.avg3Euros)}) und deinem aktuellen Trend
                erwarten wir für {stats.forecastMonthLabel} rund {eur0.format(stats.forecastEuros)}.
              </p>
            </div>
          )}

          {/* Tipp */}
          <TippsBox title="Tipp zur Auslastung" tipps={[tip]} />
        </>
      )}
    </MeinBereichSubPage>
  )
}
