'use client'

import { useEffect, useState } from 'react'

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
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { background: #080706; }
          body {
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #e0e0e0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }
          .cinzel { font-family: 'Cinzel', serif; letter-spacing: 2px; }
          @keyframes cmPulse {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(200,168,75,0.25)); }
            50%      { transform: scale(1.04); filter: drop-shadow(0 0 18px rgba(200,168,75,0.45)); }
          }
          .cm-pin {
            animation: cmPulse 2.6s ease-in-out infinite;
          }
          .cm-btn {
            padding: 12px 28px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 0.5px;
            cursor: pointer;
            transition: transform 0.12s ease, box-shadow 0.18s ease;
            font-family: inherit;
          }
          .cm-btn:hover:not(:disabled) { transform: translateY(-1px); }
          .cm-btn:disabled { opacity: 0.6; cursor: default; }
          .cm-btn-gold {
            background: linear-gradient(135deg, #c8a84b, #e8d06a);
            color: #080706;
            border: none;
          }
          .cm-btn-outline {
            background: transparent;
            color: #c8a84b;
            border: 1.5px solid rgba(200,168,75,0.4);
            text-decoration: none;
            display: inline-block;
          }
          .cm-btn-ghost {
            background: transparent;
            color: #999;
            border: 1px solid rgba(255,255,255,0.08);
          }
        `}</style>
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
