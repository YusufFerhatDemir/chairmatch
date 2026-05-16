import { getSupabaseAdmin } from '@/lib/supabase-server'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

interface ErrorLogEntry {
  message: string
  stack?: string | null
  url?: string | null
  user_agent?: string | null
  ip?: string | null
  user_id?: string | null
  severity: ErrorSeverity
  component?: string | null
  context?: Record<string, unknown> | null
}

/**
 * Log an error to the Supabase `error_logs` table.
 * Safe to call in any server context — swallows its own failures
 * so it never masks the original error.
 */
export async function logError(
  error: unknown,
  context?: {
    url?: string
    user_agent?: string
    ip?: string
    user_id?: string
    severity?: ErrorSeverity
    component?: string
    extra?: Record<string, unknown>
  }
): Promise<void> {
  try {
    const err = error instanceof Error ? error : new Error(String(error))
    const supabase = getSupabaseAdmin()

    const entry: ErrorLogEntry = {
      message: err.message.slice(0, 2000),
      stack: err.stack?.slice(0, 5000) ?? null,
      url: context?.url ?? null,
      user_agent: context?.user_agent?.slice(0, 500) ?? null,
      ip: context?.ip ?? null,
      user_id: context?.user_id ?? null,
      severity: context?.severity ?? 'medium',
      component: context?.component ?? null,
      context: context?.extra ?? null,
    }

    await supabase.from('error_logs').insert(entry)
  } catch {
    // Intentionally swallowed — never let error tracking break the app
    console.error('[error-tracking] Failed to log error:', error)
  }
}

/**
 * Log an API-level error with request metadata.
 * Extracts IP, user-agent, and URL from the incoming request.
 */
export async function logApiError(
  req: Request,
  error: unknown,
  statusCode: number
): Promise<void> {
  const headers = req.headers
  const ip =
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null
  const userAgent = headers.get('user-agent')?.slice(0, 500) || null
  const url = req.url

  const severity: ErrorSeverity =
    statusCode >= 500 ? 'high' : statusCode >= 400 ? 'medium' : 'low'

  await logError(error, {
    url,
    user_agent: userAgent ?? undefined,
    ip: ip ?? undefined,
    severity,
    extra: { statusCode },
  })
}
/**
 * Returns true when Sentry is configured via NEXT_PUBLIC_SENTRY_DSN.
 * Used by callers to gate Sentry-specific logic (e.g. captureException).
 * Kept as a function — not a const — so server/client evaluations stay
 * dynamic and bundlers don't inline a stale value.
 */
export function isSentryConfigured(): boolean {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  return typeof dsn === 'string' && dsn.length > 0 && dsn.startsWith('https://')
}

/**
 * Capture an exception to Sentry if configured.
 * Lazy-loads @sentry/nextjs so the bundle stays slim when Sentry is not set.
 * Falls back to console.error.
 */
export async function captureException(error: unknown, context?: Record<string, unknown>): Promise<void> {
  if (!isSentryConfigured()) {
    console.error('[error-tracking] captureException (no Sentry):', error, context)
    return
  }
  try {
    const Sentry = await import('@sentry/nextjs')
    if (context) {
      Sentry.withScope((scope) => {
        for (const [k, v] of Object.entries(context)) {
          scope.setExtra(k, v)
        }
        Sentry.captureException(error)
      })
    } else {
      Sentry.captureException(error)
    }
  } catch {
    console.error('[error-tracking] Sentry capture failed:', error)
  }
}

