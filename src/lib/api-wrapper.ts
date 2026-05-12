/**
 * api-wrapper: defensive HOF for Next.js App Router route handlers.
 *
 * Wraps a handler so that it:
 *  - Always returns a JSON response (no raw HTML 500s)
 *  - Hard-times out after `timeoutMs` (default 10s) — never hangs the client
 *  - Logs server errors to /api/errors (via logApiError) without leaking stack
 *
 * Usage:
 *   export const GET = withApi(async (req) => {
 *     const data = await doStuff()
 *     return NextResponse.json(data)
 *   })
 *
 *   // with context (e.g. route params)
 *   export const POST = withApi<{ params: { id: string } }>(async (req, ctx) => {
 *     ...
 *   })
 */

import { NextResponse } from 'next/server'
import { logApiError } from './error-tracking'

export interface ApiWrapperOptions {
  /** Hard timeout in ms. Default 10 000. */
  timeoutMs?: number
  /** Custom error message returned to client. Default 'Interner Fehler'. */
  errorMessage?: string
  /** HTTP status for unhandled errors. Default 500. */
  errorStatus?: number
}

type Handler<Ctx = unknown> = (req: Request, ctx: Ctx) => Promise<Response> | Response

/**
 * Wrap an API route handler with timeout + error JSON guarantees.
 */
export function withApi<Ctx = unknown>(
  handler: Handler<Ctx>,
  options: ApiWrapperOptions = {}
): (req: Request, ctx: Ctx) => Promise<Response> {
  const {
    timeoutMs = 10_000,
    errorMessage = 'Interner Fehler',
    errorStatus = 500,
  } = options

  return async function wrapped(req: Request, ctx: Ctx): Promise<Response> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    try {
      const timeoutPromise = new Promise<Response>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('api_timeout'))
        }, timeoutMs)
      })

      const handlerPromise = Promise.resolve().then(() => handler(req, ctx))

      const result = await Promise.race([handlerPromise, timeoutPromise])
      if (timeoutId) clearTimeout(timeoutId)
      return result
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId)

      const isTimeout = err instanceof Error && err.message === 'api_timeout'
      const status = isTimeout ? 504 : errorStatus
      const message = isTimeout
        ? 'Anfrage hat zu lange gedauert. Bitte versuche es erneut.'
        : errorMessage

      // Best-effort logging — must not throw.
      try {
        await logApiError(req, err, status)
      } catch {
        /* swallow */
      }

      return NextResponse.json(
        { error: message, ...(isTimeout ? { timeout: true } : {}) },
        { status }
      )
    }
  }
}

/**
 * Convenience: build a JSON error response with consistent shape.
 */
export function apiError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status })
}

/**
 * Convenience: build a JSON success response.
 */
export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}
