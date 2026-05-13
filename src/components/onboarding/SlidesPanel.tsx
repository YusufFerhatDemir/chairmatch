'use client'

import Link from 'next/link'
import { OnboardingLogo, GoldGradientDefs } from './helpers'

export interface Slide {
  title: string
  subtitle: string
  icon: string | null
  imageUrl: string | null
}

export interface SlidesPanelProps {
  slides: Slide[]
  step: number
  onStepChange: (newStep: number) => void
  onLastSlideContinue: () => void
  onSkip: () => void
  /** Bezeichnungen aus i18n */
  labels: {
    back: string
    next: string
    letsGo: string
    skipDiscover: string
  }
}

/**
 * Welcome-Slides-Panel des Onboardings.
 *
 * Eigene Komponente, damit OnboardingGate kürzer wird. Hat keinen eigenen State —
 * alle Übergänge werden über Callbacks an den Parent gemeldet. Push-History-State
 * macht weiterhin der Parent.
 */
export function SlidesPanel({ slides, step, onStepChange, onLastSlideContinue, onSkip, labels }: SlidesPanelProps) {
  const rawSlide = slides[step] || { title: 'Willkommen', subtitle: '', icon: null, imageUrl: null }
  const slide = (() => {
    if (rawSlide.title === 'Entdecken') {
      return {
        ...rawSlide,
        subtitle: 'ChairMatch verbindet dich mit Friseuren, Kosmetikstudios, Massagen & mehr in deiner Nähe – buche Termine in Sekunden, ohne Telefonstress.',
      }
    }
    return rawSlide
  })()
  const isFirst = step === 0
  const isLast = step === slides.length - 1

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg)', width: '100%', maxWidth: 'var(--shell-max)', margin: '0 auto' }}>
      <GoldGradientDefs />
      <div id="ob-scroll" style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'max(env(safe-area-inset-top, 30px), 30px) 30px max(env(safe-area-inset-bottom, 30px), 30px)',
      }}>
        {isFirst ? <OnboardingLogo /> : <SlideIcon slide={slide} />}

        <p className="cinzel" style={{ fontSize: 22, fontWeight: 600, marginBottom: 10, lineHeight: 1.3, color: 'var(--gold2)' }}>
          {slide.title}
        </p>
        <p style={{ fontSize: 14, color: 'var(--stone)', lineHeight: 1.7, marginBottom: 44 }}>
          {slide.subtitle}
        </p>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 22 : 8, height: 8, borderRadius: 4,
              background: i === step ? 'var(--gold)' : 'var(--c4)', transition: 'all 0.3s',
            }} />
          ))}
        </div>

        {/* Sofort-Registrieren Shortcut */}
        <Link
          href="/auth?tab=register"
          style={{
            display: 'block', width: '100%', marginBottom: 14, textDecoration: 'none',
            padding: '14px 24px', borderRadius: 'var(--btn-radius)',
            background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
            color: '#1a1000', textAlign: 'center', fontWeight: 800, fontSize: 14, letterSpacing: '0.05em',
          }}
        >
          ✦ Jetzt registrieren
        </Link>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'center' }}>
          {!isFirst && (
            <button type="button" onClick={() => onStepChange(step - 1)} className="boutline" style={{ padding: '15px 24px', fontSize: 14 }}>
              {labels.back}
            </button>
          )}
          <button
            type="button"
            className="bgold"
            style={{ width: 'auto', padding: '15px 36px', fontSize: 14 }}
            onClick={() => {
              if (isLast) onLastSlideContinue()
              else onStepChange(step + 1)
            }}
          >
            {isLast ? labels.letsGo : labels.next}
          </button>
        </div>

        {/* Skip */}
        <button
          type="button"
          onClick={onSkip}
          style={{ marginTop: 18, background: 'none', border: 'none', color: 'var(--stone)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          {labels.skipDiscover}
        </button>

        <div style={{ flexShrink: 0, height: 30 }} />
      </div>
    </div>
  )
}

/** Slide-spezifisches Icon im Premium-Look. */
function SlideIcon({ slide }: { slide: Slide }) {
  return (
    <div style={{
      marginBottom: 28,
      width: 110,
      height: 110,
      borderRadius: 30,
      border: '1px solid rgba(176,144,96,0.25)',
      background: 'transparent',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {(slide.imageUrl?.includes('termin') || slide.icon === 'booking') ? (
        <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
          <rect x="10" y="14" width="44" height="42" rx="6" stroke="url(#caticon-gold)" strokeWidth="2.2" fill="rgba(191,149,63,0.04)"/>
          <rect x="10" y="14" width="44" height="10" rx="6" fill="url(#caticon-gold)" opacity="0.55"/>
          <line x1="22" y1="8" x2="22" y2="20" stroke="url(#caticon-gold)" strokeWidth="2.8" strokeLinecap="round"/>
          <line x1="42" y1="8" x2="42" y2="20" stroke="url(#caticon-gold)" strokeWidth="2.8" strokeLinecap="round"/>
          <path d="M20 38L28 46L46 28" stroke="url(#caticon-gold)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <circle cx="16" cy="19" r="1" fill="rgba(252,246,186,0.85)"/>
          <circle cx="48" cy="19" r="1" fill="rgba(252,246,186,0.85)"/>
        </svg>
      ) : (slide.imageUrl?.includes('stuhl') || slide.icon === 'chair') ? (
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 11V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v5" stroke="url(#caticon-gold)" strokeWidth="1.8"/>
          <path d="M4 11h16a1 1 0 0 1 1 1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1z" stroke="url(#caticon-gold)" strokeWidth="1.8" fill="rgba(191,149,63,0.06)"/>
          <path d="M6 15v4" stroke="url(#caticon-gold)" strokeWidth="2"/>
          <path d="M18 15v4" stroke="url(#caticon-gold)" strokeWidth="2"/>
          <path d="M8 19h8" stroke="url(#caticon-gold)" strokeWidth="1.8"/>
        </svg>
      ) : (
        <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
          <circle cx="28" cy="28" r="18" stroke="url(#caticon-gold)" strokeWidth="2.5" fill="rgba(191,149,63,0.06)"/>
          <path d="M28 14L31 25L42 28L31 31L28 42L25 31L14 28L25 25Z" fill="url(#caticon-gold)" opacity="0.9"/>
          <line x1="42" y1="42" x2="55" y2="55" stroke="url(#caticon-gold)" strokeWidth="4" strokeLinecap="round"/>
          <circle cx="52" cy="14" r="1.5" fill="rgba(252,246,186,0.95)"/>
          <circle cx="10" cy="48" r="1" fill="rgba(252,246,186,0.85)"/>
          <circle cx="20" cy="10" r="1" fill="rgba(252,246,186,0.7)"/>
        </svg>
      )}
    </div>
  )
}
