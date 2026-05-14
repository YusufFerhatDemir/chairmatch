/**
 * Strukturierter Logger für Chairmatch.
 *
 * Drei Modi:
 * - Production (NODE_ENV=production): JSON-Logs, von Vercel-Log-Viewer parsbar
 * - Development: bunte, lesbare Logs
 * - Test: Stumm (außer Errors)
 *
 * API:
 *   import { logger } from '@/lib/logger'
 *   logger.info('user.signin', { email, ip })
 *   logger.warn('rate_limit', { ip, count })
 *   logger.error('payment.failed', err, { bookingId })
 *
 * Vorteil gegenüber console.log:
 * - Strukturierte Felder (in Vercel filterbar)
 * - Konsistente Event-Names ('module.action')
 * - Stack-Traces korrekt geparsed
 * - Sensitive Felder werden automatisch redacted (Passwörter, Tokens)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const REDACT_KEYS = new Set([
  'password', 'newPassword', 'oldPassword', 'token', 'access_token',
  'refresh_token', 'apikey', 'api_key', 'secret', 'authorization',
  'cookie', 'csrf', 'creditCard', 'cvv', 'iban',
])

function redact(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(redact)

  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (REDACT_KEYS.has(k.toLowerCase())) {
      result[k] = '[REDACTED]'
    } else if (typeof v === 'object' && v !== null) {
      result[k] = redact(v)
    } else {
      result[k] = v
    }
  }
  return result
}

function errorToFields(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      err_name: err.name,
      err_message: err.message,
      err_stack: err.stack?.split('\n').slice(0, 8).join('\n'),
    }
  }
  if (typeof err === 'object' && err !== null) {
    return { err: String(err) }
  }
  return { err: String(err) }
}

const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

function emit(level: LogLevel, event: string, fields: Record<string, unknown>) {
  if (isTest && level !== 'error') return

  const ts = new Date().toISOString()
  const payload = { ts, level, event, ...redact(fields) as Record<string, unknown> }

  if (isDev) {
    const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : level === 'debug' ? '\x1b[90m' : '\x1b[36m'
    const reset = '\x1b[0m'
    // eslint-disable-next-line no-console
    console.log(`${color}[${level.toUpperCase()}]${reset} ${event}`, fields)
    return
  }

  // Production: JSON auf stdout/stderr (Vercel parsed das)
  const out = JSON.stringify(payload)
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(out)
  } else {
    // eslint-disable-next-line no-console
    console.log(out)
  }
}

export const logger = {
  debug(event: string, fields: Record<string, unknown> = {}) {
    emit('debug', event, fields)
  },
  info(event: string, fields: Record<string, unknown> = {}) {
    emit('info', event, fields)
  },
  warn(event: string, fields: Record<string, unknown> = {}) {
    emit('warn', event, fields)
  },
  error(event: string, err: unknown, fields: Record<string, unknown> = {}) {
    emit('error', event, { ...fields, ...errorToFields(err) })
  },
}

// Default-Export für convenience
export default logger
