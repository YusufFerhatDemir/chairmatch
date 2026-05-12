'use client'

import { useEffect, useState } from 'react'
import { BrandLogo } from '@/components/BrandLogo'

interface BrandLoadingScreenProps {
  /** ms before showing the slow-load hint. Default 5000. */
  slowAfterMs?: number
  /** Minimum height for the screen. Default 60vh. */
  minHeight?: string
}

/**
 * Brand-themed loading screen with the gold pin logo (pulse animation).
 * If load takes longer than `slowAfterMs`, surfaces a "Lädt ungewöhnlich
 * lange…" hint with a manual Reload button. Pure client UX — does NOT
 * trigger a reload automatically.
 */
export function BrandLoadingScreen({
  slowAfterMs = 5000,
  minHeight = '60vh',
}: BrandLoadingScreenProps) {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), slowAfterMs)
    return () => clearTimeout(t)
  }, [slowAfterMs])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        padding: 'var(--pad, 24px)',
        gap: 18,
        textAlign: 'center',
      }}
    >
      <BrandLogo size={64} variant="glow" animateStar priority />

      <div
        style={{
          width: 32,
          height: 32,
          border: '3px solid rgba(200,168,75,0.18)',
          borderTopColor: 'var(--gold2, #c8a84b)',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }}
      />

      <div
        style={{
          color: 'var(--stone, #999)',
          fontSize: 'var(--font-sm, 13px)',
          letterSpacing: 0.3,
        }}
      >
        Wird geladen…
      </div>

      {slow && (
        <div
          style={{
            marginTop: 8,
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(200,168,75,0.06)',
            border: '1px solid rgba(200,168,75,0.18)',
            color: 'var(--stone, #999)',
            fontSize: 12,
            maxWidth: 360,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <span>Lädt ungewöhnlich lange…</span>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') window.location.reload()
            }}
            className="boutline"
            style={{ padding: '6px 16px', fontSize: 12 }}
          >
            Seite neu laden
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
