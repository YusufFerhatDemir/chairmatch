'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'

export default function BewertenPage() {
  const router = useRouter()
  const params = useParams()
  const slug = (params?.slug as string) || ''
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function submit() {
    if (rating === 0) return alert('Bitte Sterne wählen')
    if (text.trim().length < 10) return alert('Bitte schreibe mindestens 10 Zeichen')
    setSubmitting(true)
    setTimeout(() => {
      try {
        const reviews = JSON.parse(localStorage.getItem('cm_reviews') || '[]')
        reviews.unshift({
          id: 'r' + Date.now(),
          slug,
          rating,
          text: text.trim(),
          createdAt: new Date().toISOString(),
        })
        localStorage.setItem('cm_reviews', JSON.stringify(reviews.slice(0, 100)))
      } catch {}
      router.push(`/salon/${slug}?reviewed=1` as never)
    }, 600)
  }

  const sentiment = rating >= 5 ? 'Perfekt!' : rating >= 4 ? 'Sehr gut' : rating >= 3 ? 'OK' : rating >= 2 ? 'Geht so' : rating >= 1 ? 'Nicht gut' : ''

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
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>Bewertung schreiben</span>
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>CHAIRMATCH</h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        <div style={{ padding: '0 20px 18px' }}>
          <h2 className="cinzel text-gold-metallic" style={{ fontSize: 24, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>Wie war dein Termin?</h2>
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>Deine Bewertung hilft anderen Kunden</p>
        </div>

        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Stars */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(191,149,63,0.05), var(--c1) 50%, rgba(179,135,40,0.03))',
            border: '1px solid rgba(191,149,63,0.22)',
            borderRadius: 18, padding: '24px 16px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 11, letterSpacing: 2, color: 'var(--stone)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>Sterne vergeben</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(s)}
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
            {sentiment && (
              <p className="cinzel text-gold-metallic" style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>{sentiment}</p>
            )}
          </div>

          {/* Text */}
          <div>
            <label style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Deine Erfahrung</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              rows={5}
              placeholder="Was hat dir besonders gefallen? Wie war Service, Atmosphäre, Preis-Leistung?"
              style={{ width: '100%', marginTop: 6, padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)', border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', minHeight: 100 }}
            />
            <p style={{ fontSize: 10, color: 'var(--stone)', textAlign: 'right', marginTop: 4 }}>{text.length} / 500</p>
          </div>

          <div style={{ background: 'rgba(176,144,96,0.06)', border: '1px solid rgba(176,144,96,0.18)', borderRadius: 12, padding: '12px 14px', fontSize: 11.5, color: 'var(--cream)', lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--gold2)' }}>Fair bleiben:</strong> Schreibe ehrlich, höflich und konkret. Persönliche Angriffe oder Beleidigungen werden gelöscht.
          </div>

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
          >{submitting ? 'Wird gesendet…' : 'Bewertung senden ✓'}</button>
        </div>
      </div>
    </div>
  )
}
