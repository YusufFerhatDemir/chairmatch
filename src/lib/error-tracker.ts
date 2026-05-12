/**
 * error-tracker: thin abstraction over an external tracker (e.g. Sentry).
 *
 * Currently a no-op stub that logs to console in dev and forwards to our
 * existing /api/errors endpoint in production. When you later wire up
 * Sentry (or another vendor), implement the `report*` functions below.
 *
 * To finish Sentry wiring:
 *  1. `npm i @sentry/nextjs`
 *  2. Add SENTRY_DSN to environment
 *  3. Replace the body of `reportException` / `reportMessage` below with
 *     `Sentry.captureException(err, { extra: context })`.
 *  4. Add sentry.client.config.ts + sentry.server.config.ts per docs.
 */

export type TrackerSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug'

export interface TrackerContext {
  /** Where in the app this happened (component/route/api path). */
  component?: string
  /** Logged-in user id, if known. */
  userId?: string
  /** Current URL or API route. */
  url?: string
  /** Arbitrary extra data. */
  extra?: Record<string, unknown>
  /** Severity hint. */
  severity?: TrackerSeverity
}

const TRACKER_ENABLED = typeof process !== 'undefined' && process.env.NODE_ENV === 'production'

/**
 * Report an exception. Safe in any environment — never throws.
 */
export function reportException(error: unknown, context?: TrackerContext): void {
  try {
    if (!TRACKER_ENABLED) {
      // Dev: log to console for fast feedback.
      // eslint-disable-next-line no-console
      console.warn('[error-tracker]', error, context)
      return
    }

    // Production: ship to our /api/errors endpoint (already wired into Supabase).
    // Browser environment only — server code uses logError directly.
    if (typeof window === 'undefined') return

    const err = error instanceof Error ? error : new Error(String(error))
    void fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: err.message,
        stack: err.stack,
        url: context?.url ?? window.location.href,
        component: context?.component,
      }),
      keepalive: true,
    }).catch(() => {
      /* swallow — tracking must never break the app */
    })

    // TODO: when Sentry is enabled, call Sentry.captureException(err, { extra: context })
  } catch {
    /* never throw from tracker */
  }
}

/**
 * Report a plain message (e.g. an unexpected branch hit). Same guarantees.
 */
export function reportMessage(message: string, context?: TrackerContext): void {
  reportException(new Error(message), context)
}

/**
 * Tag the current user so subsequent reports include them.
 * No-op until a real tracker is wired in.
 */
export function setUser(_user: { id: string; email?: string } | null): void {
  // TODO: Sentry.setUser({ id, email }) when enabled
}

/**
 * Lightweight breadcrumb — useful for tracing user flow before a crash.
 * No-op until a real tracker is wired in.
 */
export function addBreadcrumb(_message: string, _data?: Record<string, unknown>): void {
  // TODO: Sentry.addBreadcrumb({ message, data }) when enabled
}
