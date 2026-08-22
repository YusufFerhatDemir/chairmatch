'use client'

/**
 * Miet-Buchung — der bisher fehlende Aufrufer für `POST /api/rental-bookings`.
 *
 * Die Route war fertig und getestet, hatte aber null Aufrufer: die /rentals-
 * Karten verlinkten auf die Termin-Buchung (`/booking/{salonId}`), also auf
 * den Friseurtermin statt auf die Stuhlmiete.
 *
 * Ablauf hier: Zeitraum wählen → POST → Stripe-Checkout. Der angezeigte Preis
 * ist eine Vorschau; verbindlich rechnet der Server.
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'
import { apiGet, apiSend, ApiError } from '@/lib/client-api'

interface Equipment {
  id: string
  name: string
  type: string
  description: string | null
  price_per_day_cents: number
  price_per_month_cents: number | null
  is_available: boolean
  salons?: { id: string; name: string; city: string | null; slug: string | null } | null
}

const TYPE_LABELS: Record<string, string> = {
  stuhl: 'Stuhl',
  liege: 'Liege',
  raum: 'Raum',
  opraum: 'OP-Raum',
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Miettage inklusive Start- und Endtag — identisch zur Server-Formel. */
function rentalDays(start: string, end: string): number {
  if (!start || !end || end < start) return 0
  const s = new Date(start + 'T12:00:00Z').getTime()
  const e = new Date(end + 'T12:00:00Z').getTime()
  return Math.round((e - s) / 86_400_000) + 1
}

/** Preisvorschau — spiegelt computeTotalCents() der API. */
function previewCents(days: number, perDay: number, perMonth: number | null): number {
  if (days <= 0) return 0
  if (perMonth && perMonth < perDay * 30) {
    const months = Math.floor(days / 30)
    const rest = days % 30
    return months * perMonth + Math.min(rest * perDay, perMonth)
  }
  return days * perDay
}

const inputStyle: React.CSSProperties = {
  padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)',
  border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12,
  fontSize: 14, fontFamily: 'inherit', width: '100%',
}

export default function RentalBookingPage() {
  const params = useParams()
  const router = useRouter()
  const id = (params?.id as string) || ''

  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(todayIso())
  const [endDate, setEndDate] = useState(todayIso())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ equipment: Equipment }>(`/api/rental-equipment/${id}`)
      setEquipment(res.equipment)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Mietobjekt konnte nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  const days = rentalDays(startDate, endDate)
  const total = equipment
    ? previewCents(days, equipment.price_per_day_cents, equipment.price_per_month_cents)
    : 0

  async function submit() {
    if (!equipment || submitting) return
    setSubmitError(null)

    if (!startDate || !endDate) { setSubmitError('Bitte Zeitraum wählen'); return }
    if (endDate < startDate) { setSubmitError('Das Enddatum liegt vor dem Startdatum'); return }
    if (startDate < todayIso()) { setSubmitError('Das Startdatum liegt in der Vergangenheit'); return }

    setSubmitting(true)
    try {
      const res = await apiSend<{ checkoutUrl: string | null }>('/api/rental-bookings', 'POST', {
        equipmentId: equipment.id,
        startDate,
        endDate,
      })
      if (res.checkoutUrl) {
        window.location.assign(res.checkoutUrl)
        return
      }
      // Buchung liegt an, nur die Weiterleitung fehlt — nicht als Fehler
      // verkaufen, sonst bucht der Nutzer ein zweites Mal.
      router.push('/termine')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push(`/auth?next=${encodeURIComponent(`/rentals/${id}/buchen`)}`)
        return
      }
      setSubmitError(err instanceof Error ? err.message : 'Buchung fehlgeschlagen')
      setSubmitting(false)
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
          <button onClick={() => router.back()} aria-label="Zurück"
            style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(196,168,106,0.08)', border: '1px solid rgba(196,168,106,0.22)', color: 'var(--gold2)', fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
          >‹</button>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>Stuhlmiete</span>
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>CHAIRMATCH</h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        {loading && (
          <p style={{ padding: '0 20px 24px', fontSize: 13, color: 'var(--stone)' }}>Mietobjekt wird geladen…</p>
        )}

        {!loading && loadError && (
          <div style={{ padding: '0 20px 24px' }}>
            <p role="alert" style={{ fontSize: 13, color: '#FF8888', marginBottom: 14 }}>{loadError}</p>
            <Link href="/rentals" style={{ color: 'var(--gold2)', fontSize: 13, textDecoration: 'none' }}>
              ← Zurück zur Übersicht
            </Link>
          </div>
        )}

        {!loading && equipment && (
          <>
            <div style={{ padding: '0 20px 18px' }}>
              <h2 className="cinzel text-gold-metallic" style={{ fontSize: 24, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>
                {equipment.name}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--stone)' }}>
                {TYPE_LABELS[equipment.type] ?? equipment.type}
                {equipment.salons ? ` · ${equipment.salons.name}` : ''}
                {equipment.salons?.city ? ` · ${equipment.salons.city}` : ''}
              </p>
            </div>

            <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!equipment.is_available && (
                <div role="alert" style={{ background: 'rgba(232,80,64,0.08)', border: '1px solid rgba(232,80,64,0.28)', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#FF9090' }}>
                  Dieses Mietobjekt ist derzeit nicht buchbar.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label htmlFor="rental-start" style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Von</label>
                <input
                  id="rental-start" type="date" value={startDate} min={todayIso()}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    if (endDate < e.target.value) setEndDate(e.target.value)
                  }}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label htmlFor="rental-end" style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Bis</label>
                <input
                  id="rental-end" type="date" value={endDate} min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ background: 'rgba(176,144,96,0.06)', border: '1px solid rgba(176,144,96,0.18)', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: 'var(--cream)', lineHeight: 1.55 }}>
                <strong style={{ color: 'var(--gold2)' }}>Preis:</strong>{' '}
                {days > 0 ? (
                  <>
                    {days} {days === 1 ? 'Tag' : 'Tage'} ×{' '}
                    {(equipment.price_per_day_cents / 100).toFixed(0)} € ={' '}
                    <span className="cinzel" style={{ fontWeight: 700, fontSize: 14 }}>
                      {(total / 100).toFixed(2)} €
                    </span>
                  </>
                ) : '—'}
                <br />
                <span style={{ color: 'var(--stone)' }}>
                  Zahlung über Stripe. Der endgültige Betrag wird beim Checkout server-seitig berechnet.
                </span>
              </div>

              {submitError && (
                <p role="alert" style={{ fontSize: 12, color: '#FF8888', lineHeight: 1.5 }}>{submitError}</p>
              )}

              <button
                onClick={submit}
                disabled={submitting || !equipment.is_available || days <= 0}
                style={{
                  width: '100%', padding: 15, borderRadius: 14,
                  background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
                  color: '#1a1000', border: 'none',
                  fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
                  cursor: submitting ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 0 18px rgba(196,168,106,0.25)',
                  opacity: submitting || !equipment.is_available || days <= 0 ? 0.6 : 1,
                }}
              >
                <span>{submitting ? 'Wird vorbereitet…' : 'Verbindlich mieten →'}</span>
              </button>

              <Link
                href={`/inserat/${equipment.id}/anfragen`}
                style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--gold2)', textDecoration: 'none' }}
              >
                Lieber erst unverbindlich anfragen?
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
