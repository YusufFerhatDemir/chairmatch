'use client'

import { useEffect, useState } from 'react'
import MeinBereichSubPage from '@/components/MeinBereichSubPage'
import { useTranslations } from '@/i18n/client'
import { apiGet, ApiError } from '@/lib/client-api'

/**
 * Buchungsverlauf (Mieter) — /mieter/mein-bereich/verlauf
 *
 * Hier standen bis 2026-08-27 drei erfundene Mietvorgaenge mit erfundenen
 * Betraegen und Daten in der Vergangenheit ("Salon Anna · Köln, 12. April
 * 2026 · 1 Tag, €85"). Fuer jeden Besucher dieselben — auch fuer jemanden,
 * der noch nie etwas gemietet hat. Es sah aus wie ein Kontoauszug und war
 * eine Erfindung.
 *
 * Jetzt: GET /api/rental-bookings — die eigenen Miet-Buchungen aus
 * `rental_bookings` (Filter `renter_id`), Betraege aus `total_cents`.
 */

interface RentalBooking {
  id: string
  start_date: string | null
  end_date: string | null
  total_cents: number | null
  status: string | null
  payment_status: string | null
  rental_equipment?: { name?: string; salons?: { name?: string; city?: string } | null } | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'offen',
  confirmed: 'bestätigt',
  active: 'laufend',
  completed: 'abgeschlossen',
  cancelled: 'storniert',
  canceled: 'storniert',
}

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: 'nicht bezahlt',
  pending: 'Zahlung offen',
  paid: 'bezahlt',
  refunded: 'erstattet',
}

function datum(iso: string | null): string {
  if (!iso) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso
}

/** Miettage inklusive Start- und Endtag — dieselbe Zaehlung wie im Preis. */
function tage(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const a = Date.parse(`${start.slice(0, 10)}T12:00:00Z`)
  const b = Date.parse(`${end.slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null
  return Math.round((b - a) / 86_400_000) + 1
}

function euro(cents: number): string {
  return `${(cents / 100).toLocaleString('de-DE', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} €`
}

export default function Page() {
  const t = useTranslations()
  const [bookings, setBookings] = useState<RentalBooking[]>([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiGet<{ bookings: RentalBooking[] }>('/api/rental-bookings')
        if (cancelled) return
        setBookings(res.bookings ?? [])
        setFehler(null)
      } catch (err) {
        if (cancelled) return
        setBookings([])
        setFehler(
          err instanceof ApiError && err.status === 401
            ? 'Bitte melde dich an, um deinen Verlauf zu sehen.'
            : err instanceof Error ? err.message : 'Verlauf konnte nicht geladen werden',
        )
      } finally {
        if (!cancelled) setLaedt(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel={t('meinBereich.title')}
      title={t('subVerlauf.title')}
      subtitle={t('subVerlauf.subtitle')}
      showSave={false}
      role="mieter"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {laedt && <p style={{ fontSize: 12, color: 'var(--stone)' }}>Wird geladen…</p>}

        {!laedt && fehler && (
          <p role="alert" style={{ fontSize: 12.5, color: '#FF8888', lineHeight: 1.5 }}>{fehler}</p>
        )}

        {!laedt && !fehler && bookings.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.6 }}>
            Noch keine Miet-Buchung. Sobald du einen Platz gebucht hast, findest du ihn hier —
            mit dem Betrag, der wirklich abgerechnet wurde.
          </p>
        )}

        {!laedt && !fehler && bookings.map(b => {
          const salon = b.rental_equipment?.salons
          const titel = [b.rental_equipment?.name, salon?.name].filter(Boolean).join(' · ')
          const d = tage(b.start_date, b.end_date)
          const status = b.status ? (STATUS_LABELS[b.status.toLowerCase()] ?? b.status) : null
          const zahlung = b.payment_status ? (PAYMENT_LABELS[b.payment_status.toLowerCase()] ?? b.payment_status) : null
          return (
            <div key={b.id} style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{titel || 'Mietobjekt'}</span>
                <span className="text-gold-metallic" style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {euro(b.total_cents ?? 0)}
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--stone)' }}>
                {datum(b.start_date)} – {datum(b.end_date)}
                {d !== null ? ` · ${d} ${d === 1 ? 'Tag' : 'Tage'}` : ''}
                {salon?.city ? ` · ${salon.city}` : ''}
              </p>
              {(status || zahlung) && (
                <p style={{ fontSize: 10.5, color: 'var(--stone)', marginTop: 4, letterSpacing: 0.5 }}>
                  {[status, zahlung].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </MeinBereichSubPage>
  )
}
