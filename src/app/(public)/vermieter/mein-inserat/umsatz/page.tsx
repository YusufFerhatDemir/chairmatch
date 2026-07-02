'use client'

import MeinBereichSubPage, { TippsBox } from '@/components/MeinBereichSubPage'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

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

type Loaded = { demo: boolean; bookings: Booking[]; equipment: Equipment[] }

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

function toIso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/* ── Demo-Daten (Fallback) ──────────────────────────────────── */

function buildDemoData(now: Date): Loaded {
  // Pro Objekt: Tagessatz + gebuchte Tage je Monat (ältester → aktueller Monat)
  const plan: { id: string; name: string; daily: number; days: number[] }[] = [
    { id: 'demo-1', name: 'Friseurstuhl am Fenster', daily: 90, days: [12, 14, 15, 17, 18, 16] },
    { id: 'demo-2', name: 'Beauty-Platz hinten', daily: 75, days: [6, 9, 8, 11, 12, 13] },
    { id: 'demo-3', name: 'Nagel-Arbeitsplatz', daily: 55, days: [3, 4, 6, 5, 7, 8] },
  ]
  const bookings: Booking[] = []
  plan.forEach((eq) => {
    eq.days.forEach((d, i) => {
      const monthOffset = -(eq.days.length - 1 - i)
      const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 2)
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + d - 1)
      bookings.push({
        id: `${eq.id}-m${i}`,
        equipmentId: eq.id,
        start: toIso(start),
        end: toIso(end),
        totalCents: d * eq.daily * 100,
        status: monthOffset === 0 ? 'confirmed' : 'completed',
      })
    })
  })
  return { demo: true, bookings, equipment: plan.map((p) => ({ id: p.id, name: p.name })) }
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

  useEffect(() => {
    let cancelled = false
    const today = new Date()

    async function load() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const userId = sessionData.session?.user.id
        if (!userId) throw new Error('keine Session')

        const { data: salonsRaw, error: salonErr } = await supabase
          .from('salons').select('id').eq('owner_id', userId)
        const salons = (salonsRaw ?? []) as Array<{ id: string }>
        if (salonErr || salons.length === 0) throw new Error('kein Salon')

        const { data: equipmentRaw, error: eqErr } = await supabase
          .from('rental_equipment').select('id, name')
          .in('salon_id', salons.map((s) => s.id))
        const equipment = (equipmentRaw ?? []) as Array<{ id: string; name: string | null }>
        if (eqErr || equipment.length === 0) throw new Error('kein Equipment')

        const { data: bookingsRaw, error: bkErr } = await supabase
          .from('rental_bookings')
          .select('id, equipment_id, start_date, end_date, total_cents, status')
          .in('equipment_id', equipment.map((e) => e.id))
        const bookings = (bookingsRaw ?? []) as Array<{
          id: string
          equipment_id: string
          start_date: string
          end_date: string
          total_cents: number | null
          status: string | null
        }>
        if (bkErr || bookings.length === 0) throw new Error('keine Buchungen')

        if (cancelled) return
        setData({
          demo: false,
          equipment: equipment.map((e) => ({ id: e.id, name: e.name ?? 'Objekt' })),
          bookings: bookings.map((b) => ({
            id: b.id,
            equipmentId: b.equipment_id,
            start: b.start_date,
            end: b.end_date,
            totalCents: b.total_cents ?? 0,
            status: b.status ?? 'pending',
          })),
        })
      } catch {
        if (!cancelled) setData(buildDemoData(today))
      } finally {
        if (!cancelled) setNow(today)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

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
      {!stats && (
        <div style={{
          background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
          borderRadius: 14, padding: '28px 16px', textAlign: 'center',
          fontSize: 12, color: 'var(--stone)', letterSpacing: 1,
        }}>
          Lade Umsatzdaten …
        </div>
      )}

      {stats && data && (
        <>
          {data.demo && (
            <div style={{
              alignSelf: 'flex-start',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(196,168,106,0.10)',
              border: '1px solid rgba(196,168,106,0.3)',
              borderRadius: 999, padding: '5px 12px',
              fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
              color: 'var(--gold2)', textTransform: 'uppercase',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold2)', flexShrink: 0 }} />
              Beispieldaten — verbinde dein Inserat
            </div>
          )}

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

          {/* Prognose */}
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

          {/* Tipp */}
          <TippsBox title="Tipp zur Auslastung" tipps={[tip]} />
        </>
      )}
    </MeinBereichSubPage>
  )
}
