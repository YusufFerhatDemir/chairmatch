'use client'

/**
 * Schmaler fetch-Wrapper für die Client-Komponenten.
 *
 * Zweck: die Fehlermeldung des Servers (`{ error: "..." }`) landet als
 * Error.message beim Aufrufer. Ohne das zeigt die UI bei jedem Problem
 * dasselbe generische „Fehler beim Speichern" und der Nutzer erfährt nie,
 * dass z.B. seine IBAN eine falsche Prüfziffer hat.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { credentials: 'same-origin', ...init })
  } catch {
    throw new ApiError('Keine Verbindung zum Server. Bitte Internetverbindung prüfen.', 0)
  }

  const raw = await res.text()
  let body: unknown = null
  if (raw) {
    try {
      body = JSON.parse(raw)
    } catch {
      body = null
    }
  }

  if (!res.ok) {
    const message =
      (body as { error?: string } | null)?.error ??
      (res.status === 401
        ? 'Bitte zuerst anmelden.'
        : `Serverfehler (${res.status}). Bitte später erneut versuchen.`)
    throw new ApiError(message, res.status)
  }

  return body as T
}

export function apiGet<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'GET', headers: { Accept: 'application/json' } })
}

export function apiSend<T>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  payload?: unknown,
): Promise<T> {
  return request<T>(url, {
    method,
    headers: payload === undefined ? { Accept: 'application/json' } : {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })
}

/** Multipart-Upload (Datei); Content-Type setzt der Browser selbst. */
export function apiUpload<T>(url: string, form: FormData): Promise<T> {
  return request<T>(url, { method: 'POST', body: form, headers: { Accept: 'application/json' } })
}
