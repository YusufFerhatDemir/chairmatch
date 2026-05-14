/**
 * SMS-Versand für Phone-Auth & Booking-Reminders.
 *
 * Sendet via Twilio wenn TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER
 * gesetzt sind. Andernfalls fail-soft: console.log und return ok=true, damit
 * Development ohne SMS-Provider funktioniert. Dev-Codes können dann aus dem
 * Vercel-Log abgegriffen werden.
 */

import { logger } from '@/lib/logger'

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER
const SMS_ENABLED = !!(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM)

export interface SmsResult {
  ok: boolean
  error?: string
  devCode?: string  // Nur in Development gesetzt, damit Tests den Code haben
}

/**
 * Schickt eine SMS an die Zielnummer.
 *
 * @param to Zielnummer im E.164-Format (z.B. +491701234567)
 * @param body Textinhalt (max 160 Zeichen empfohlen, sonst werden mehrere SMS berechnet)
 */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  // Telefonnummer normalisieren auf E.164 (Deutsche Default falls keine Vorwahl)
  const normalized = normalizeE164(to)
  if (!normalized) {
    return { ok: false, error: 'Ungültige Telefonnummer' }
  }

  if (!SMS_ENABLED) {
    logger.warn('sms.dev_fallback', { to: normalized, body })
    return { ok: true, devCode: extractCodeFromBody(body) }
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`
    const params = new URLSearchParams({
      To: normalized,
      From: TWILIO_FROM as string,
      Body: body,
    })

    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      logger.error('sms.twilio_failed', new Error(errText || `HTTP ${res.status}`), { to: normalized, status: res.status })
      return { ok: false, error: `SMS-Versand fehlgeschlagen (${res.status})` }
    }
    logger.info('sms.sent', { to: normalized })
    return { ok: true }
  } catch (e) {
    logger.error('sms.exception', e, { to: normalized })
    return { ok: false, error: 'SMS-Service nicht erreichbar' }
  }
}

/**
 * Konvertiert deutsche Nummerformate auf E.164.
 * Akzeptiert: 0170..., 0049170..., +49170..., +49 170 ..., 0170 ...
 */
export function normalizeE164(raw: string): string | null {
  if (!raw) return null
  // Nur Ziffern und + behalten
  let cleaned = raw.replace(/[\s\-().]/g, '')
  if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2)
  if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
    // Deutsche Default-Länder-Vorwahl
    cleaned = '+49' + cleaned.slice(1)
  }
  if (!cleaned.startsWith('+')) cleaned = '+' + cleaned
  // E.164: + gefolgt von 8-15 Ziffern
  if (!/^\+\d{8,15}$/.test(cleaned)) return null
  return cleaned
}

function extractCodeFromBody(body: string): string | undefined {
  const m = body.match(/\b(\d{4,8})\b/)
  return m ? m[1] : undefined
}

/**
 * 6-stelligen Zahlencode generieren — kryptographisch zufällig.
 */
export function generateOtpCode(): string {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const num = (bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3]) >>> 0
  return String(num % 1_000_000).padStart(6, '0')
}
