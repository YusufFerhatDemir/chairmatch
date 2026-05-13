'use client'

import { BrandLogo } from '@/components/BrandLogo'

/**
 * Shared UI-Bausteine für Onboarding.
 * Statische Helpers ohne eigenen State — sicher für sub-component Extraktion.
 */

/** Gold-Gradient SVG-Definitionen, die alle Onboarding-SVGs benutzen. */
export function GoldGradientDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden="true">
      <defs>
        <linearGradient id="caticon-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BF953F" />
          <stop offset="22%" stopColor="#FCF6BA" />
          <stop offset="45%" stopColor="#B38728" />
          <stop offset="67%" stopColor="#FBF5B7" />
          <stop offset="100%" stopColor="#AA771C" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** Volles Brand-Logo mit "CHAIRMATCH DEUTSCHLAND"-Schriftzug. */
export function OnboardingLogo() {
  return (
    <div style={{
      marginBottom: 24,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
    }}>
      <BrandLogo size={120} variant="glow" priority={true} />
      <div style={{ textAlign: 'center' }}>
        <p
          className="cinzel text-gold-metallic"
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 4,
            lineHeight: 1,
            marginBottom: 5,
          }}
        >
          CHAIRMATCH
        </p>
        <p
          style={{
            fontSize: 9,
            letterSpacing: 5,
            color: 'var(--stone)',
          }}
        >
          DEUTSCHLAND
        </p>
      </div>
    </div>
  )
}

/** Zurück-Button im Header — links oben. */
export function BackBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--stone)', fontSize: 14, cursor: 'pointer', marginBottom: 16, padding: 0 }}
    >
      {label}
    </button>
  )
}
