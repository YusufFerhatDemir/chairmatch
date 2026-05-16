// Next.js Client-Side Instrumentation — Sentry-Init im Browser.
// Wird automatisch von Next.js 15+ vor dem ersten Render geladen.

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05,       // 5% aller Sessions aufzeichnen
    replaysOnErrorSampleRate: 1.0,        // 100% wenn Fehler passiert
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,                  // PII-Schutz: alle Texte maskieren
        blockAllMedia: true,                // Bilder/Videos nicht aufzeichnen
      }),
    ],
    ignoreErrors: [
      'AbortError',
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      'TypeError: NetworkError when attempting to fetch resource',
    ],
  })
}

// Required Hook für Next.js Router-Transitions-Tracing
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
