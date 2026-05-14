'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BackButton } from '@/components/BackButton'

interface PendingItem {
  bookingId: string
  reviewType: string
}

interface ReceivedReview {
  id: string
  rating: number
  comment: string | null
  review_type: string
  created_at: string
  visible_at: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reviewer?: any
}

interface Props {
  pending: PendingItem[]
  asTenant: ReceivedReview[]
  asProvider: ReceivedReview[]
}

export function ReviewsPageClient({ pending, asTenant, asProvider }: Props) {
  const [submitting, setSubmitting] = useState<string | null>(null)

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 14 }}>
          <BackButton href="/account" label="Zurück zum Konto" />
        </div>
        <h1 className="cinzel" style={{ color: 'var(--gold2)', fontSize: 24, marginBottom: 8 }}>
          Meine Bewertungen
        </h1>

        {/* OFFENE BEWERTUNGEN */}
        <section style={{ marginTop: 24 }}>
          <h2 className="cinzel" style={{
            fontSize: 16, color: 'var(--gold2)', marginBottom: 12,
            borderBottom: '1px solid var(--border)', paddingBottom: 6,
          }}>
            Offene Bewertungen ({pending.length})
          </h2>

          {pending.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--stone)', padding: 16 }}>
              Keine offenen Bewertungen. Sobald eine Buchung abgeschlossen ist, kannst du hier bewerten.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {pending.map((p) => (
                <ReviewSubmitCard
                  key={`${p.bookingId}-${p.reviewType}`}
                  pending={p}
                  submitting={submitting === `${p.bookingId}-${p.reviewType}`}
                  onSubmit={() => setSubmitting(`${p.bookingId}-${p.reviewType}`)}
                  onDone={() => setSubmitting(null)}
                />
              ))}
            </div>
          )}
        </section>

        {/* AS TENANT */}
        {asTenant.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <h2 className="cinzel" style={{
              fontSize: 16, color: 'var(--gold2)', marginBottom: 12,
              borderBottom: '1px solid var(--border)', paddingBottom: 6,
            }}>
              Bewertungen als Mieter ({asTenant.length})
            </h2>
            <p style={{ fontSize: 11, color: 'var(--stone2)', marginBottom: 10 }}>
              Was Salon-Anbieter über dich als Mieter geschrieben haben.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {asTenant.map((r) => <ReceivedReviewCard key={r.id} review={r} />)}
            </div>
          </section>
        )}

        {/* AS PROVIDER */}
        {asProvider.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <h2 className="cinzel" style={{
              fontSize: 16, color: 'var(--gold2)', marginBottom: 12,
              borderBottom: '1px solid var(--border)', paddingBottom: 6,
            }}>
              Bewertungen als Anbieter ({asProvider.length})
            </h2>
            <p style={{ fontSize: 11, color: 'var(--stone2)', marginBottom: 10 }}>
              Was Mieter über dich als Stuhl-Anbieter geschrieben haben.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {asProvider.map((r) => <ReceivedReviewCard key={r.id} review={r} />)}
            </div>
          </section>
        )}

        {/* HINWEIS Double-Blind */}
        <section style={{
          background: 'var(--c2)', borderRadius: 12, padding: 16, marginTop: 32,
          border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 12, color: 'var(--stone)', margin: 0, lineHeight: 1.6 }}>
            ℹ️ <strong style={{ color: 'var(--cream)' }}>Wie Bewertungen funktionieren:</strong> Du und die andere Seite haben 14 Tage Zeit zu bewerten. Beide Bewertungen werden <strong>gleichzeitig</strong> freigeschaltet — niemand sieht die Bewertung der anderen Seite vorher. Das verhindert „Rache-Bewertungen" und sorgt für ehrliches Feedback.
          </p>
        </section>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <BackButton href="/account" label="Zurück zum Konto" />
        </div>
      </div>
    </div>
  )
}

function ReviewSubmitCard({
  pending,
  submitting,
  onSubmit,
  onDone,
}: {
  pending: PendingItem
  submitting: boolean
  onSubmit: () => void
  onDone: () => void
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [hover, setHover] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const labels: Record<string, { title: string; subtitle: string }> = {
    customer_to_salon: {
      title: 'Salon bewerten',
      subtitle: 'Wie war dein Termin bei diesem Salon?',
    },
    tenant_to_provider: {
      title: 'Anbieter bewerten',
      subtitle: 'Wie war der Stuhl-Anbieter? (Sauberkeit, Ausstattung, Zuverlässigkeit)',
    },
    provider_to_tenant: {
      title: 'Mieter bewerten',
      subtitle: 'Wie war der Mieter? (Pünktlichkeit, Verhalten, Sauberkeit)',
    },
  }
  const meta = labels[pending.reviewType] || labels.customer_to_salon

  async function handleSubmit() {
    if (rating < 1) {
      setError('Bitte gib mindestens 1 Stern')
      return
    }
    setError(null)
    onSubmit()
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: pending.bookingId,
          reviewType: pending.reviewType,
          rating,
          comment: comment.trim() || undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error || 'Fehler beim Senden')
        return
      }
      setSuccess(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      onDone()
    }
  }

  if (success) {
    return (
      <div style={{
        background: 'rgba(74,138,90,0.08)', borderRadius: 12, padding: 16,
        border: '1px solid var(--green)',
      }}>
        <p style={{ fontSize: 13, color: 'var(--green)', margin: 0 }}>
          ✓ Bewertung gespeichert. Wird sichtbar sobald die andere Seite bewertet hat (oder nach 14 Tagen).
        </p>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--c2)', borderRadius: 12, padding: 16,
      border: '1px solid var(--border)',
    }}>
      <p style={{ fontSize: 14, color: 'var(--cream)', fontWeight: 600, margin: 0 }}>
        {meta.title}
      </p>
      <p style={{ fontSize: 11, color: 'var(--stone)', margin: '2px 0 12px' }}>
        {meta.subtitle}
      </p>

      {/* Sterne */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 28,
              padding: 0,
              color: (hover || rating) >= s ? 'var(--gold)' : 'var(--stone2)',
              transition: 'color .15s',
            }}
            aria-label={`${s} Sterne`}
          >
            ★
          </button>
        ))}
      </div>

      {/* Kommentar */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optionaler Kommentar (max 1000 Zeichen)"
        maxLength={1000}
        rows={3}
        style={{
          width: '100%',
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--c1)',
          color: 'var(--cream)',
          fontSize: 12,
          fontFamily: 'inherit',
          resize: 'vertical',
        }}
      />

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
        <p style={{ fontSize: 10, color: 'var(--stone2)', margin: 0 }}>
          {comment.length}/1000
        </p>
        <button
          onClick={handleSubmit}
          disabled={submitting || rating < 1}
          className="bgold"
          style={{
            padding: '8px 20px',
            fontSize: 12,
            opacity: submitting || rating < 1 ? 0.5 : 1,
            cursor: submitting || rating < 1 ? 'not-allowed' : 'pointer',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
          }}
        >
          {submitting ? 'Sende …' : 'Bewertung abgeben'}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 8 }}>{error}</p>
      )}
    </div>
  )
}

function ReceivedReviewCard({ review }: { review: ReceivedReview }) {
  const reviewerName = (review.reviewer as { full_name?: string } | null)?.full_name || 'Anonym'
  const date = new Date(review.created_at).toLocaleDateString('de-DE')

  return (
    <div style={{
      background: 'var(--c2)', borderRadius: 12, padding: 14,
      border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} style={{ color: s <= review.rating ? 'var(--gold)' : 'var(--stone2)', fontSize: 14 }}>
              ★
            </span>
          ))}
        </div>
        <p style={{ fontSize: 10, color: 'var(--stone2)', margin: 0 }}>
          {reviewerName} · {date}
        </p>
      </div>
      {review.comment && (
        <p style={{ fontSize: 12, color: 'var(--cream)', margin: 0, lineHeight: 1.5 }}>
          {review.comment}
        </p>
      )}
    </div>
  )
}
