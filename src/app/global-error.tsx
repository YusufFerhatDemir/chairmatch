'use client'

import { useEffect } from 'react'

/**
 * Next.js global error handler.
 * Catches errors that escape the root layout.
 * Shows a full-page error with ChairMatch branding and reports to /api/errors.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report the error to our tracking endpoint
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        component: 'global-error',
      }),
    }).catch(() => {
      // Reporting failure must not break the error page
    })
  }, [error])

  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ChairMatch - Fehler</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .cinzel { font-family: 'Cinzel', serif; }
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
            padding: 24,
            textAlign: 'center',
          }}
        >
          {/* ChairMatch branding */}
          <div
            style={{
              marginBottom: 32,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(200,168,75,0.2), rgba(200,168,75,0.05))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(200,168,75,0.3)',
                marginBottom: 12,
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgb(200,168,75)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h1
              className="cinzel"
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 3,
                color: '#c8a84b',
              }}
            >
              CHAIR<span style={{ color: '#e8d06a' }}>MATCH</span>
            </h1>
          </div>

          <h2
            className="cinzel"
            style={{
              fontSize: 20,
              color: '#c8a84b',
              marginBottom: 12,
              fontWeight: 700,
            }}
          >
            Etwas ist schiefgelaufen
          </h2>

          <p
            style={{
              color: '#999',
              fontSize: 15,
              marginBottom: 28,
              maxWidth: 400,
              lineHeight: 1.6,
            }}
          >
            Ein kritischer Fehler ist aufgetreten. Bitte versuche es erneut oder kehre zur
            Startseite zurück.
          </p>

          {error.digest && (
            <p
              style={{
                fontSize: 12,
                color: '#666',
                marginBottom: 20,
                fontFamily: 'monospace',
              }}
            >
              Fehler-ID: {error.digest}
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                padding: '12px 28px',
                background: 'linear-gradient(135deg, #c8a84b, #e8d06a)',
                color: '#0a0a0a',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: 0.5,
              }}
            >
              Erneut versuchen
            </button>
            <a
              href="/"
              style={{
                padding: '12px 28px',
                background: 'transparent',
                color: '#c8a84b',
                border: '1.5px solid rgba(200,168,75,0.4)',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: 0.5,
              }}
            >
              Startseite
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
