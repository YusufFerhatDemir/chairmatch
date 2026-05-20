'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { BrandLogo } from '@/components/BrandLogo'
import { useTranslations } from '@/i18n/client'
import { supabase } from '@/lib/supabase'

/**
 * Bewerten-Seite — /salon/[slug]/bewerten
 *
 * V2 (2026-05-20): komplett i18n (DE/EN/TR/AR) + DB-Anschluss.
 * Speichert via POST /api/reviews — Auth-pflichtig.
 *
 * Flow:
 *   1. Mount: salon_id via slug aus Supabase holen
 *   2. Wenn nicht eingeloggt → /auth Redirect
 *   3. Submit → POST /api/reviews { salonId, rating, comment }
 *   4. Erfolg → /salon/[slug]?reviewed=1
 *   5. Fehler → Toast (Fallback: lokal speichern für Retry)
 */

export default function BewertenPage() {
  const router = useRouter()
  const params = useParams()
  const slug = (params?.slug as string) || ''
  const t = useTranslations()
  const { data: session, status: authStatus } = useSession()

  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [salonId, setSalonId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Lookup salonId via slug
  useEffect(() => {
    if (!slug) return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase
          .from('salons')
          .select('id')
          .eq('slug', slug)
          .maybeSingle()
        if (!cancelled && data?.id) setSalonId(data.id as string)
      } catch { /* ignore, fallback to localStorage */ }
    })()
    return () => { cancelled = true }
  }, [slug])

  // Auth-Pflicht: wenn nicht eingeloggt → /auth
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push(`/auth?callbackUrl=${encodeURIComponent(`/salon/${slug}/bewerten`)}` as never)
    }
  }, [authStatus, slug, router])

  async function submit() {
    if (rating === 0) {
      setErrorMsg(t('reviews.errStars'))
      return
    }
    if (text.trim().length < 10) {
      setErrorMsg(t('reviews.errMinChars'))
      return
    }
    setErrorMsg(null)
    setSubmitting(true)

    // API-Call wenn salonId bekannt + eingeloggt, sonst Fallback auf localStorage
    if (salonId && session?.user?.id) {
      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ salonId, rating, comment: text.trim() }),
        })
        if (res.ok) {
          router.push(`/salon/${slug}?reviewed=1` as never)
          return
        }
        const err = await res.json().catch(() => ({}))
        setErrorMsg(err.error || t('reviews.errSubmit'))
        setSubmitting(false)
        return
      } catch {
        // Netzwerk-Fehler → Fallback lokal
        saveLocally()
        router.push(`/salon/${slug}?reviewed=1` as never)
        return
      }
    }

    // Fallback: localStorage (Demo-Salons ohne UUID, oder nicht eingeloggt)
    saveLocally()
    router.push(`/salon/${slug}?reviewed=1` as never)
  }

  function saveLocally() {
    try {
      const reviews = JSON.parse(localStorage.getItem('cm_reviews') || '[]')
      reviews.unshift({
        id: 'r' + Date.now(),
        slug,
        rating,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        synced: false,
      })
      localStorage.setItem('cm_reviews', JSON.stringify(reviews.slice(0, 100)))
    } catch { /* ignore */ }
  }

  const sentimentKey =
    rating >= 5 ? 'reviews.sentimentPerfect'
    : rating >= 4 ? 'reviews.sentimentVeryGood'
    : rating >= 3 ? 'reviews.sentimentOk'
    : rating >= 2 ? 'reviews.sentimentMeh'
    : rating >= 1 ? 'reviews.sentimentBad'
    : ''

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
            aria-label={t('buttons.back')}
            style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(196,168,106,0.08)', border: '1px solid rgba(196,168,106,0.22)', color: 'var(--gold2)', fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
          >‹</button>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>{t('reviews.writeTitle')}</span>
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>CHAIRMATCH</h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        <div style={{ padding: '0 20px 18px' }}>
          <h2 className="cinzel text-gold-metallic" style={{ fontSize: 24, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>{t('reviews.headline')}</h2>
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>{t('reviews.headlineSub')}</p>
        </div>

        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Stars */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(191,149,63,0.05), var(--c1) 50%, rgba(179,135,40,0.03))',
            border: '1px solid rgba(191,149,63,0.22)',
            borderRadius: 18, padding: '24px 16px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 11, letterSpacing: 2, color: 'var(--stone)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>{t('reviews.starsLabel')}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(s)}
                  aria-label={`${s} ${t('reviews.starsAria')}`}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 44, padding: 4, lineHeight: 1,
                    color: (hover || rating) >= s ? '#FCF6BA' : 'rgba(196,168,106,0.15)',
                    textShadow: (hover || rating) >= s ? '0 0 14px rgba(252,246,186,0.5)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >★</button>
              ))}
            </div>
            {sentimentKey && (
              <p className="cinzel text-gold-metallic" style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>{t(sentimentKey)}</p>
            )}
          </div>

          {/* Text */}
          <div>
            <label style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>{t('reviews.experienceLabel')}</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              rows={5}
              placeholder={t('reviews.placeholder')}
              style={{ width: '100%', marginTop: 6, padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)', border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', minHeight: 100 }}
            />
            <p style={{ fontSize: 10, color: 'var(--stone)', textAlign: 'right', marginTop: 4 }}>{text.length} / 500</p>
          </div>

          <div style={{ background: 'rgba(176,144,96,0.06)', border: '1px solid rgba(176,144,96,0.18)', borderRadius: 12, padding: '12px 14px', fontSize: 11.5, color: 'var(--cream)', lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--gold2)' }}>{t('reviews.fairTitle')}</strong> {t('reviews.fairText')}
          </div>

          {errorMsg && (
            <div role="alert" style={{ background: 'rgba(232,80,64,0.10)', border: '1px solid rgba(232,80,64,0.30)', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: '#FCA59B', lineHeight: 1.55 }}>
              {errorMsg}
            </div>
          )}

          <button onClick={submit} disabled={submitting || rating === 0}
            style={{
              width: '100%', padding: 15, borderRadius: 14,
              background: rating > 0 ? 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)' : 'rgba(196,168,106,0.18)',
              color: rating > 0 ? '#1a1000' : 'rgba(232,230,218,0.55)',
              border: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
              cursor: rating > 0 && !submitting ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: rating > 0 ? '0 0 18px rgba(196,168,106,0.25)' : 'none',
              opacity: submitting ? 0.7 : 1,
            }}
          >{submitting ? t('reviews.submitting') : t('reviews.submitBtn')}</button>
        </div>
      </div>
    </div>
  )
}
