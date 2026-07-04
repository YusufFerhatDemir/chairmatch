/**
 * Indexing-Notifier: pingt Suchmaschinen sobald neue/aktualisierte URLs
 * verfügbar sind. Beschleunigt Erst-Indexierung dramatisch (Stunden statt
 * Wochen).
 *
 * Implementiert:
 * - IndexNow (Bing, Yandex, Seznam) — sofort, kein API-Key-Setup auf
 *   Google-Seite nötig. Nur Key-File public bereitstellen.
 * - Google Indexing API — für Job-Postings + Live-Stream. Andere URLs
 *   werden von Google in der API zwar akzeptiert, aber laut Doku nur
 *   für die zwei Typen aktiv verarbeitet. Wir senden trotzdem, weil
 *   Google das Crawl-Hint nutzt.
 *
 * Aufruf:
 *   import { notifyIndexers } from '@/lib/indexing'
 *   await notifyIndexers(['https://www.chairmatch.de/listings/abc'])
 *
 * Failure-Mode: alle Calls sind fire-and-forget mit Try/Catch.
 * Niemals einen Hot-Path blockieren wenn ein Indexer down ist.
 */

import { logger } from './logger'
import { INDEXNOW_FALLBACK_KEY } from './indexnow-key'

const INDEXNOW_HOST = 'www.chairmatch.de'

interface NotifyResult {
  indexnow: { ok: boolean; status?: number; error?: string }
  google: { ok: boolean; status?: number; error?: string; skipped?: boolean }
}

/**
 * IndexNow Protocol: https://www.indexnow.org/
 *
 * Key muss als File unter https://www.chairmatch.de/<INDEXNOW_KEY>.txt
 * erreichbar sein. Wir generieren ihn aus ENV.
 */
async function pingIndexNow(urls: string[]): Promise<NotifyResult['indexnow']> {
  // ENV hat Vorrang (Rotation ohne Deploy); Fallback ist der im Repo
  // committete öffentliche Key (public/<KEY>.txt) — so funktioniert
  // IndexNow auch ohne Vercel-ENV-Konfiguration.
  const key = process.env.INDEXNOW_KEY || INDEXNOW_FALLBACK_KEY
  if (!key) {
    return { ok: false, error: 'INDEXNOW_KEY nicht konfiguriert' }
  }

  if (urls.length === 0) return { ok: true, status: 200 }

  try {
    const body = {
      host: INDEXNOW_HOST,
      key,
      keyLocation: `https://${INDEXNOW_HOST}/${key}.txt`,
      urlList: urls,
    }

    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    })

    return { ok: res.ok, status: res.status }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

/**
 * Google Indexing API: https://developers.google.com/search/apis/indexing-api/v3
 *
 * Voraussetzung: Service-Account mit "Indexing API" + Verifizierung als
 * Site-Owner in Search Console. ENV: GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON
 * (komplettes JSON als String).
 *
 * Funktioniert offiziell nur für JobPosting + BroadcastEvent — aber
 * Google nutzt es trotzdem als Crawl-Hint für andere URLs.
 */
async function pingGoogleIndexing(urls: string[]): Promise<NotifyResult['google']> {
  const serviceAccountJson = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) {
    return { ok: false, skipped: true, error: 'GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON nicht konfiguriert' }
  }

  if (urls.length === 0) return { ok: true, status: 200 }

  try {
    const sa = JSON.parse(serviceAccountJson) as {
      client_email: string
      private_key: string
    }

    // OAuth2 JWT-Bearer flow
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'RS256', typ: 'JWT' }
    const claim = {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/indexing',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }

    // Base64URL
    const b64 = (s: string) => Buffer.from(s).toString('base64url')

    const headerB64 = b64(JSON.stringify(header))
    const claimB64 = b64(JSON.stringify(claim))
    const unsigned = `${headerB64}.${claimB64}`

    // Sign with private key
    const crypto = await import('node:crypto')
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(unsigned)
    sign.end()
    const signature = sign.sign(sa.private_key).toString('base64url')
    const jwt = `${unsigned}.${signature}`

    // Token-Tausch
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }).toString(),
    })

    if (!tokenRes.ok) {
      return { ok: false, status: tokenRes.status, error: 'token_exchange_failed' }
    }

    const { access_token } = await tokenRes.json() as { access_token: string }

    // Pro URL ein Call (Google Indexing API hat kein Batch für unsere Plan)
    let okCount = 0
    for (const url of urls) {
      const r = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, type: 'URL_UPDATED' }),
      })
      if (r.ok) okCount++
    }

    return { ok: okCount === urls.length, status: 200 }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

/**
 * Public API: notify all configured indexers for one or many URLs.
 *
 * Niemals throwen — alle Indexer sind Best-Effort. Bei Fehler nur loggen.
 */
export async function notifyIndexers(urls: string[]): Promise<NotifyResult> {
  // Validate + dedupe
  const cleanUrls = Array.from(new Set(
    urls
      .map(u => u.trim())
      .filter(u => u.startsWith('https://www.chairmatch.de/'))
  ))

  if (cleanUrls.length === 0) {
    return {
      indexnow: { ok: true },
      google: { ok: true, skipped: true },
    }
  }

  // Beide parallel
  const [indexnow, google] = await Promise.all([
    pingIndexNow(cleanUrls).catch((e): NotifyResult['indexnow'] => ({ ok: false, error: String(e) })),
    pingGoogleIndexing(cleanUrls).catch((e): NotifyResult['google'] => ({ ok: false, error: String(e) })),
  ])

  if (!indexnow.ok && !(indexnow.error || '').includes('nicht konfiguriert')) {
    logger.warn('indexing.indexnow_failed', { error: indexnow.error, status: indexnow.status })
  }
  if (!google.ok && !google.skipped) {
    logger.warn('indexing.google_failed', { error: google.error, status: google.status })
  }

  return { indexnow, google }
}
