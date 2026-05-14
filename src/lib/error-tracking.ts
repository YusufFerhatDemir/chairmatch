import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

/**
 * Zentrales Error-Tracking. Schreibt jeden Fehler:
 *   1) in unsere `error_logs`-Tabelle (immer)
 *   2) an Sentry (wenn SENTRY_DSN gesetzt) — Push-Alerts aufs Handy
 *
 * Sentry-Setup: User braucht nur `SENTRY_DSN` in Vercel-ENV setzen.
 * Dann wird automatisch ein leichtgewichtiger HTTP-Push an Sentry geschickt.
 * Wir nutzen bewusst KEINE @sentry/nextjs-Dependency (~150KB) — nur die
 * öffentliche HTTP-API, gerade so viel wie nötig.
 */

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

const SENTRY_DSN = process.env.SENTRY_DSN
const SENTRY_ENABLED = !!SENTRY_DSN

/** Parsed DSN-Bestandteile aus dem Sentry-Dashboard-Format */
function parseSentryDsn(dsn: string): { url: string; publicKey: string } | null {
  // Format: https://<publicKey>@<host>/<projectId>
  const m = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/)
  if (!m) return null
  const [, publicKey, host, projectId] = m
  return {
    url: `https://${host}/api/${projectId}/store/`,
    publicKey,
  }
}

/** Fire-and-forget Sentry-Push. Schluckt eigene Fehler. */
async function sendToSentry(payload: Record<string, unknown>): Promise<void> {
  if (!SENTRY_ENABLED || !SENTRY_DSN) return
  const parsed = parseSentryDsn(SENTRY_DSN)
  if (!parsed) return

  try {
    await fetch(parsed.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=chairmatch/1.0`,
      },
      body: JSON.stringify(payload),
      // Sentry-Push darf den User-Request nicht blockieren
      signal: AbortSignal.timeout(2000),
    })
  } catch {
    /* Sentry-Auswertungs-Service nicht erreichbar — egal, error_logs hat ihn */
  }
}

/**
 * Log an error to the Supabase `error_logs` table and Sentry (if configured).
 * Safe to call in any server context — swallows its own failures.
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
  const err = error instanceof Error ? error : new Error(String(error))
  const severity = context?.severity ?? 'medium'

  // 1) Supabase error_logs (primary)
  try {
    const supabase = getSupabaseAdmin()
    const entry: ErrorLogEntry = {
      message: err.message.slice(0, 2000),
      stack: err.stack?.slice(0, 5000) ?? null,
      url: context?.url ?? null,
      user_agent: context?.user_agent?.slice(0, 500) ?? null,
      ip: context?.ip ?? null,
      user_id: context?.user_id ?? null,
      severity,
      component: context?.component ?? null,
      context: context?.extra ?? null,
    }
    await supabase.from('error_logs').insert(entry)
  } catch (e) {
    logger.error('error_tracking.db_insert_failed', e, { originalError: err.message })
  }

  // 2) Sentry (optional, fire-and-forget) — nur für high/critical errors
  if (SENTRY_ENABLED && (severity === 'high' || severity === 'critical')) {
    const sentryLevel = severity === 'critical' ? 'fatal' : 'error'
    const eventId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    void sendToSentry({
      event_id: eventId,
      timestamp: new Date().toISOString().replace('T', ' ').replace('Z', ''),
      level: sentryLevel,
      logger: 'chairmatch',
      platform: 'javascript',
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
      server_name: process.env.VERCEL_URL,
      user: context?.user_id ? { id: context.user_id, ip_address: context.ip } : undefined,
      request: context?.url ? { url: context.url, headers: { 'User-Agent': context.user_agent } } : undefined,
      tags: {
        component: context?.component,
        severity,
      },
      extra: context?.extra,
      exception: {
        values: [{
          type: err.name,
          value: err.message,
          stacktrace: err.stack ? {
            frames: err.stack.split('\n').slice(1, 20).map(line => ({ filename: line.trim() })),
          } : undefined,
        }],
      },
    })
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

/** Health-Check ob Sentry konfiguriert ist (für Admin-Dashboard) */
export function isSentryConfigured(): boolean {
  return SENTRY_ENABLED
}
