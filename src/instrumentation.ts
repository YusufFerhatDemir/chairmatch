// Next.js Instrumentation Hook — wird beim Server-Start aufgerufen.
// Hier laden wir Sentry je nach Runtime (nodejs oder edge).
// Doku: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

export async function register() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) {
    // Ohne DSN: Sentry idle lassen, App startet normal weiter.
    return
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      // Filter: Health-Checks etc. nicht melden
      ignoreErrors: [
        'AbortError',
        'NetworkError',
      ],
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    })
  }
}

// onRequestError-Hook für Server-Component-Errors in Next.js 15+
export const onRequestError = Sentry.captureRequestError
