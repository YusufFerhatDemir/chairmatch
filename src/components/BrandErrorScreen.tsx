'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'

interface BrandErrorScreenProps {
  error: Error & { digest?: string }
  reset: () => void
  /** Identifies which route group / section this came from. */
  source: string
  /** Optional headline override. */
  title?: string
  /** Optional body override. */
  description?: string
}

/**
 * Shared error screen for Next.js page-level error.tsx files.
 * - Goldener Pin (BrandLogo) im Brand-Design
 * - "Erneut versuchen" + "Zur Startseite" buttons
 * - Reports to /api/errors with the route-group source tag
 */
export function BrandErrorScreen({
  error,
  reset,
  source,
  title = 'Etwas ist schiefgelaufen',
  description = 'Bitte versuche es erneut. Wenn das Problem bestehen bleibt, kehre zur Startseite zurück.',
}: BrandErrorScreenProps) {
  useEffect(() => {
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        component: source,
      }),
      keepalive: true,
    }).catch(() => {
      /* swallow */
    })
  }, [error, source])

  return (
    <div className="shell">
      <div
        className="screen"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
          padding: 'var(--pad, 20px)',
          textAlign: 'center',
          gap: 16,
        }}
      >
        <BrandLogo size={72} variant="glow" animateStar priority />

        <h1
          className="cinzel"
          style={{
            fontSize: 'var(--font-xl, 22px)',
            color: 'var(--gold2, #c8a84b)',
            margin: '8px 0 4px',
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {title}
        </h1>

        <p
          style={{
            color: 'var(--stone, #999)',
            fontSize: 'var(--font-md, 15px)',
            maxWidth: 380,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {description}
        </p>

        {error.digest && (
          <p
            style={{
              fontSize: 11,
              color: 'var(--stone, #666)',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              marginTop: 4,
            }}
          >
            Fehler-ID: {error.digest}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: 12,
          }}
        >
          <button type="button" onClick={reset} className="bgold" style={{ padding: '12px 24px' }}>
            Erneut versuchen
          </button>
          <Link
            href="/"
            className="boutline"
            style={{ padding: '12px 24px', textDecoration: 'none' }}
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  )
}
