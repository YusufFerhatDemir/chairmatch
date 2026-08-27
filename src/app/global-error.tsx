'use client'

import { useEffect, useState } from 'react'
import { GLOBAL_ERROR_CSS } from '@/lib/inline-css'

/**
 * Next.js 15 global error handler.
 * Renders OUTSIDE the root layout (provides its own <html>/<body>) so it
 * works even when the layout itself crashes. No CSS modules or providers
 * are available here — everything is inline.
 *
 * Catches anything that escapes the root layout: shows a full-page
 * brand-themed error with the gold pin logo and reports to /api/errors.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [reportSent, setReportSent] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  useEffect(() => {
    // Auto-report on mount.
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        component: 'global-error',
      }),
      keepalive: true,
    }).catch(() => {
      /* swallow — never let reporting break the error UI */
    })
  }, [error])

  async function sendManualReport() {
    if (reportSent === 'sending' || reportSent === 'sent') return
    setReportSent('sending')
    try {
      const res = await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[user-reported] ${error.message}`,
          stack: error.stack,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          component: 'global-error-manual',
        }),
      })
      setReportSent(res.ok ? 'sent' : 'failed')
    } catch {
      setReportSent('failed')
    }
  }

  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>ChairMatch — Fehler</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=DM+Sans:wght@400;600&display=swap"
          rel="stylesheet"
        />
        {/* Inhalt liegt in src/lib/inline-css.ts, damit next.config.ts denselben
            String hashen kann — style-src-elem laesst dieses Element nur ueber
            seinen SHA-256-Hash zu. dangerouslySetInnerHTML statt {`…`}, weil
            der Browser exakt den Textinhalt hasht und JSX sonst Whitespace
            einbauen koennte. */}
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_ERROR_CSS }} />
      </head>
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            textAlign: 'center',
            maxWidth: 480,
          }}
        >
          {/* Brand pin logo */}
          <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/chairmatch_logo_pin_symbol_gradient_512.png"
              alt="ChairMatch"
              width={88}
              height={88}
              className="cm-pin"
              style={{ display: 'block' }}
              onError={(e) => {
                // Fallback: gold circle if asset is missing
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
            <h1
              className="cinzel"
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#c8a84b',
                marginTop: 4,
              }}
            >
              CHAIR<span style={{ color: '#e8d06a' }}>MATCH</span>
            </h1>
          </div>

          <h2
            className="cinzel"
            style={{
              fontSize: 22,
              color: '#c8a84b',
              marginBottom: 12,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            Etwas ist schiefgelaufen
          </h2>

          <p
            style={{
              color: '#aaa',
              fontSize: 15,
              marginBottom: 24,
              maxWidth: 420,
              lineHeight: 1.6,
            }}
          >
            Ein unerwarteter Fehler ist aufgetreten. Du kannst es erneut versuchen oder zur
            Startseite zurückkehren.
          </p>

          {error.digest && (
            <p
              style={{
                fontSize: 11,
                color: '#666',
                marginBottom: 20,
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              }}
            >
              Fehler-ID: {error.digest}
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
            <button type="button" onClick={reset} className="cm-btn cm-btn-gold">
              Erneut versuchen
            </button>
            <a href="/" className="cm-btn cm-btn-outline">
              Startseite
            </a>
          </div>

          <button
            type="button"
            onClick={sendManualReport}
            disabled={reportSent === 'sending' || reportSent === 'sent'}
            className="cm-btn cm-btn-ghost"
            style={{ fontSize: 12, padding: '8px 18px' }}
          >
            {reportSent === 'idle' && 'Fehler melden'}
            {reportSent === 'sending' && 'Wird gesendet…'}
            {reportSent === 'sent' && 'Danke — gemeldet'}
            {reportSent === 'failed' && 'Erneut melden'}
          </button>
        </div>
      </body>
    </html>
  )
}
