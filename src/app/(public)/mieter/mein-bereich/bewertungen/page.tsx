'use client'

import MeinBereichSubPage from '@/components/MeinBereichSubPage'
import { useEffect, useState } from 'react'

/* ── Typen ──────────────────────────────────────────────────── */

type ReceivedReview = {
  id: string
  rating: number
  comment: string | null
  reviewType: string
  visibleAt: string | null
  createdAt: string
}

type OpenBooking = {
  bookingId: string
  role: 'mieter' | 'anbieter'
  equipmentName: string
  salonName: string
  startDate: string
  endDate: string
  totalCents: number
}

type Loaded = {
  demo: boolean
  avgRating: number | null
  reviewCount: number
  received: ReceivedReview[]
  open: OpenBooking[]
}

type Feedback = { type: 'ok' | 'err'; msg: string }

/* ── Demo-Daten (Fallback, damit die Seite nie leer wirkt) ──── */

function buildDemoData(): Loaded {
  const now = new Date()
  const iso = (daysAgo: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo)
    return d.toISOString()
  }
  return {
    demo: true,
    avgRating: 4.8,
    reviewCount: 12,
    received: [
      { id: 'demo-r1', rating: 5, comment: 'Sehr zuverlässig, hinterlässt den Platz top gepflegt. Jederzeit wieder!', reviewType: 'provider_to_tenant', visibleAt: iso(6), createdAt: iso(6) },
      { id: 'demo-r2', rating: 5, comment: 'Pünktlich, professionell und super im Umgang mit Kundinnen.', reviewType: 'provider_to_tenant', visibleAt: iso(21), createdAt: iso(21) },
      { id: 'demo-r3', rating: 4, comment: 'Angenehme Zusammenarbeit, klare Kommunikation.', reviewType: 'provider_to_tenant', visibleAt: iso(48), createdAt: iso(48) },
    ],
    open: [
      {
        bookingId: 'demo-b1',
        role: 'mieter',
        equipmentName: 'Friseurstuhl am Fenster',
        salonName: 'Salon Anna · Köln',
        startDate: iso(9).slice(0, 10),
        endDate: iso(8).slice(0, 10),
        totalCents: 8500,
      },
    ],
  }
}

/* ── Formatierung ───────────────────────────────────────────── */

function fmtRating(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function fmtDate(s: string): string {
  const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

/* ── Kleine UI-Bausteine ────────────────────────────────────── */

const GOLD = '#C4A86A'

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span aria-label={`${rating} von 5 Sternen`} style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ fontSize: size, lineHeight: 1, color: i <= rating ? GOLD : 'rgba(196,168,106,0.25)' }}>★</span>
      ))}
    </span>
  )
}

function StarPicker({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Bewertung wählen" style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} Sterne`}
          disabled={disabled}
          onClick={() => onChange(i)}
          style={{
            background: 'transparent', border: 'none', padding: 2,
            cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
            fontSize: 26, lineHeight: 1,
            color: i <= value ? GOLD : 'rgba(196,168,106,0.25)',
            textShadow: i <= value ? '0 0 10px rgba(196,168,106,0.4)' : 'none',
            transition: 'color 0.15s',
          }}
        >★</button>
      ))}
    </div>
  )
}

function DemoBadge() {
  return (
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
      Beispieldaten
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, letterSpacing: 2, color: 'var(--stone)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
      {children}
    </p>
  )
}

/* ── Offene Bewertung (Inline-Formular) ─────────────────────── */

function OpenBookingCard({
  booking, demo, onDone,
}: {
  booking: OpenBooking
  demo: boolean
  onDone: () => void
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [done, setDone] = useState(false)

  async function submit() {
    if (submitting || done) return
    if (rating < 1) {
      setFeedback({ type: 'err', msg: 'Bitte wähle zuerst 1 bis 5 Sterne.' })
      return
    }
    setSubmitting(true)
    setFeedback(null)
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 450))
        setDone(true)
        setFeedback({ type: 'ok', msg: 'Beispielmodus — deine Bewertung wurde nicht gespeichert. Melde dich an, um echte Bewertungen abzugeben.' })
        onDone()
        return
      }
      const res = await fetch('/api/reviews/rental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.bookingId,
          rating,
          comment: comment.trim() || undefined,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as { hinweis?: string; error?: string }
      if (res.status === 201) {
        setDone(true)
        setFeedback({ type: 'ok', msg: body.hinweis || 'Danke für deine Bewertung!' })
        onDone()
      } else if (res.status === 409) {
        setDone(true)
        setFeedback({ type: 'err', msg: body.error || 'Du hast diese Buchung bereits bewertet.' })
      } else {
        setFeedback({ type: 'err', msg: body.error || 'Das hat leider nicht geklappt. Bitte versuche es erneut.' })
      }
    } catch {
      setFeedback({ type: 'err', msg: 'Netzwerkfehler — bitte versuche es erneut.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(191,149,63,0.05) 0%, var(--c1) 50%, rgba(179,135,40,0.03) 100%)',
      border: '1px solid rgba(191,149,63,0.22)',
      borderRadius: 16, padding: 14,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)' }}>{booking.salonName}</p>
          <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>
            {booking.equipmentName} · bis {fmtDate(booking.endDate)}
          </p>
        </div>
        <span className="text-gold-metallic" style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          {(booking.totalCents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
        </span>
      </div>

      {!done && (
        <>
          <StarPicker value={rating} onChange={(v) => { setRating(v); setFeedback(null) }} disabled={submitting} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={booking.role === 'mieter' ? 'Wie war der Salon? (optional)' : 'Wie war der Mieter? (optional)'}
            rows={2}
            maxLength={2000}
            disabled={submitting}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical',
              background: 'rgba(0,0,0,0.25)', color: 'var(--cream)',
              border: '1px solid rgba(196,168,106,0.18)', borderRadius: 12,
              padding: '10px 12px', fontSize: 12.5, fontFamily: 'inherit', lineHeight: 1.4,
              outline: 'none',
            }}
          />
          <button
            onClick={submit}
            disabled={submitting}
            style={{
              padding: '12px 14px', borderRadius: 12,
              background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 50%, #B38728 100%)',
              color: '#1a1000', border: 'none',
              fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              boxShadow: '0 0 14px rgba(196,168,106,0.2)',
            }}
          >
            {submitting ? 'Wird gesendet …' : 'Bewertung abschicken'}
          </button>
        </>
      )}

      {feedback && (
        <div style={{
          borderRadius: 10, padding: '9px 12px', fontSize: 11.5, lineHeight: 1.45,
          background: feedback.type === 'ok' ? 'rgba(74,138,90,0.14)' : 'rgba(232,80,64,0.12)',
          border: `1px solid ${feedback.type === 'ok' ? 'rgba(74,138,90,0.4)' : 'rgba(232,80,64,0.35)'}`,
          color: feedback.type === 'ok' ? '#8FCF9F' : '#F0968B',
        }}>
          {feedback.type === 'ok' ? '✓ ' : ''}{feedback.msg}
        </div>
      )}
    </div>
  )
}

/* ── Seite ──────────────────────────────────────────────────── */

export default function Page() {
  const [data, setData] = useState<Loaded | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/reviews/rental?me=1', { cache: 'no-store' })
        if (!res.ok) throw new Error('nicht angemeldet oder Fehler')
        const body = (await res.json()) as {
          ok?: boolean
          reputation?: { avgRatingAsTenant: number | null; reviewCountAsTenant: number }
          receivedReviews?: ReceivedReview[]
          openBookings?: OpenBooking[]
        }
        if (!body.ok) throw new Error('API-Fehler')
        if (cancelled) return
        setData({
          demo: false,
          avgRating: body.reputation?.avgRatingAsTenant ?? null,
          reviewCount: body.reputation?.reviewCountAsTenant ?? 0,
          received: body.receivedReviews ?? [],
          open: body.openBookings ?? [],
        })
      } catch {
        if (!cancelled) setData(buildDemoData())
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel="Mein Bereich"
      title="Meine Reputation"
      subtitle="Deine Bewertungen als Mieterin oder Mieter"
      showSave={false}
      role="mieter"
    >
      {!data && (
        <div style={{
          background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
          borderRadius: 14, padding: '28px 16px', textAlign: 'center',
          fontSize: 12, color: 'var(--stone)', letterSpacing: 1,
        }}>
          Lade deine Reputation …
        </div>
      )}

      {data && (
        <>
          {data.demo && <DemoBadge />}

          {/* Hero-Karte */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            background: 'linear-gradient(145deg, rgba(191,149,63,0.07) 0%, var(--c1) 50%, rgba(179,135,40,0.04) 100%)',
            border: '1px solid rgba(191,149,63,0.25)',
            borderRadius: 18, padding: '24px 20px', textAlign: 'center',
            boxShadow: '0 0 8px rgba(191,149,63,0.05), 0 12px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(252,246,186,0.04)',
          }}>
            {data.avgRating !== null && data.reviewCount > 0 ? (
              <>
                <div className="cinzel text-gold-metallic" style={{ fontSize: 44, fontWeight: 600, lineHeight: 1 }}>
                  {fmtRating(data.avgRating)} <span style={{ fontSize: 30 }}>★</span>
                </div>
                <div style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase', fontWeight: 600 }}>
                  {data.reviewCount} {data.reviewCount === 1 ? 'Bewertung' : 'Bewertungen'}
                </div>
              </>
            ) : (
              <>
                <div className="cinzel text-gold-metallic" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.15 }}>
                  Neu dabei
                </div>
                <div style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Noch keine Bewertungen
                </div>
              </>
            )}
            <p style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.55, maxWidth: 320, marginTop: 4 }}>
              Deine Reputation als Mieter — Salons sehen das bei deiner Anfrage.
              Eine starke Reputation = bessere Plätze.
            </p>
          </div>

          {/* Offene Bewertungen */}
          {data.open.length > 0 && (
            <div>
              <SectionLabel>Offene Bewertungen</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.open.map((b) => (
                  <OpenBookingCard key={b.bookingId} booking={b} demo={data.demo} onDone={() => {}} />
                ))}
              </div>
              <p style={{ fontSize: 10.5, color: 'var(--stone)', lineHeight: 1.5, marginTop: 8 }}>
                Bewertungen werden erst sichtbar, wenn beide Seiten bewertet haben —
                spätestens 14 Tage nach Ende der Buchung.
              </p>
            </div>
          )}

          {/* Erhaltene Bewertungen */}
          <div>
            <SectionLabel>Erhaltene Bewertungen</SectionLabel>
            {data.received.length === 0 ? (
              <div style={{
                background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
                borderRadius: 14, padding: '20px 16px', textAlign: 'center',
                fontSize: 12, color: 'var(--stone)', lineHeight: 1.5,
              }}>
                Noch keine Bewertungen erhalten. Nach deiner ersten abgeschlossenen
                Buchung kann der Salon dich bewerten.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.received.map((r) => (
                  <div key={r.id} style={{
                    background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
                    borderRadius: 12, padding: 14,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Stars rating={r.rating} />
                      <span style={{ fontSize: 10.5, color: 'var(--stone)' }}>
                        {fmtDate(r.visibleAt || r.createdAt)}
                      </span>
                    </div>
                    {r.comment && (
                      <p style={{ fontSize: 12.5, color: 'var(--cream)', lineHeight: 1.5, marginBottom: 6 }}>
                        „{r.comment}“
                      </p>
                    )}
                    <p style={{ fontSize: 10.5, color: 'var(--gold2)', fontWeight: 600 }}>
                      {r.reviewType === 'provider_to_tenant' ? 'von Salon-Inhaber' : 'von Mieter'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </MeinBereichSubPage>
  )
}
