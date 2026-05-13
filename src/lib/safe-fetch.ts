/**
 * safe-fetch: hardened fetch wrapper with timeout, retries (exponential backoff),
 * and consistent error semantics. Never throws on user-facing UI paths if
 * you call it via `safeFetchJson` — instead returns a tagged result.
 *
 * Designed so that the UI can NEVER hang on a network call:
 *  - AbortController times out the request after `timeoutMs` (default 8s)
 *  - Failed network attempts retry with exponential backoff (default 1 retry)
 *  - JSON parsing failures degrade gracefully
 *
 * Usage:
 *   const res = await safeFetch('/api/bookings')              // throws on failure
 *   const data = await safeFetchJson<MyType>('/api/bookings') // returns { ok, data, error }
 */

export interface SafeFetchOptions extends RequestInit {
  /** Hard timeout for the whole request, in milliseconds. Default 8000. */
  timeoutMs?: number
  /** Number of retry attempts on network failure (NOT on 4xx). Default 1. */
  retries?: number
  /** Base delay between retries, in ms (exponential backoff). Default 300. */
  retryDelayMs?: number
  /** If true, retry on 5xx responses as well. Default true. */
  retryOn5xx?: boolean
}

export type SafeFetchResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number; timeout?: boolean; offline?: boolean }

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isOffline(): boolean {
  if (typeof navigator === 'undefined') return false
  // navigator.onLine is best-effort but a reliable hint
  return navigator.onLine === false
}

/**
 * Core fetch wrapper with timeout + retry.
 * Throws on the last failed attempt — use `safeFetchJson` for non-throwing UI calls.
 */
export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {}
): Promise<Response> {
  const {
    timeoutMs = 8000,
    retries = 1,
    retryDelayMs = 300,
    retryOn5xx = true,
    signal: externalSignal,
    ...init
  } = options

  let lastError: unknown = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    // M7-Fix: Listener-Leak verhindern. Vorher wurde bei jedem Retry ein
    // weiterer abort-Listener am externalSignal angehängt — harmlos, aber
    // unschön und Speicher-Drift bei sehr vielen Retries.
    let externalAbortHandler: (() => void) | null = null
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timer)
        controller.abort()
      } else {
        externalAbortHandler = () => controller.abort()
        externalSignal.addEventListener('abort', externalAbortHandler, { once: true })
      }
    }
    const cleanup = () => {
      clearTimeout(timer)
      if (externalAbortHandler && externalSignal) {
        externalSignal.removeEventListener('abort', externalAbortHandler)
      }
    }

    try {
      const res = await fetch(url, { ...init, signal: controller.signal })
      cleanup()

      // 5xx → retry if allowed (but don't retry 4xx, those are client errors)
      if (retryOn5xx && res.status >= 500 && attempt < retries) {
        lastError = new Error(`HTTP ${res.status}`)
        await sleep(retryDelayMs * Math.pow(2, attempt))
        continue
      }

      return res
    } catch (err) {
      cleanup()
      lastError = err
      // No retry on the last attempt — throw below.
      if (attempt < retries) {
        await sleep(retryDelayMs * Math.pow(2, attempt))
        continue
      }
    }
  }

  throw lastError ?? new Error('safeFetch: unknown error')
}

/**
 * Non-throwing JSON fetcher. Always returns a tagged result so the UI can
 * branch without try/catch boilerplate. Network errors, timeouts, JSON
 * failures, and non-OK responses all map to `{ ok: false, error }`.
 */
export async function safeFetchJson<T = unknown>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  if (isOffline()) {
    return { ok: false, error: 'offline', status: 0, offline: true }
  }

  try {
    const res = await safeFetch(url, options)

    let data: unknown = null
    // Try JSON, but tolerate empty body / non-JSON gracefully.
    try {
      const text = await res.text()
      data = text ? JSON.parse(text) : null
    } catch {
      data = null
    }

    if (!res.ok) {
      const errMsg =
        (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
          ? (data as { error: string }).error
          : `HTTP ${res.status}`)
      return { ok: false, error: errMsg, status: res.status }
    }

    return { ok: true, data: data as T, status: res.status }
  } catch (err) {
    const isAbort =
      err instanceof Error &&
      (err.name === 'AbortError' || err.message.toLowerCase().includes('abort'))
    return {
      ok: false,
      error: isAbort ? 'timeout' : err instanceof Error ? err.message : 'network_error',
      status: 0,
      timeout: isAbort,
      offline: isOffline(),
    }
  }
}
