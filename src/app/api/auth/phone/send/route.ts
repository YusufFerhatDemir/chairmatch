import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { sendSms, normalizeE164, generateOtpCode } from '@/lib/sms'
import { withApi, apiError } from '@/lib/api-wrapper'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * POST /api/auth/phone/send
 *
 * Sendet einen 6-stelligen SMS-Code an die übergebene Nummer.
 * Rate-Limit: 3 SMS pro Nummer pro 10 Minuten (gegen Missbrauch + Twilio-Kosten).
 * Codes laufen nach 10 Min ab.
 */
const schema = z.object({
  phone: z.string().min(5).max(40),
})

const RATE_LIMIT_PER_PHONE = 3
const RATE_WINDOW_MIN = 10
const CODE_TTL_MIN = 10

/**
 * Track 20: der Deckel lag nur auf der ZIELNUMMER.
 *
 * „3 SMS pro Nummer pro 10 Minuten" begrenzt, wie oft EINE Person belaestigt
 * werden kann. Es begrenzt nicht, wie viele Nummern ein Aufrufer
 * durchprobiert. Genau darauf beruht SMS-Pumping: der Angreifer besitzt
 * (oder mietet) Nummernbloecke bei einem Netzbetreiber, der ihn am
 * Zustellentgelt beteiligt, und laesst eine fremde Anwendung die SMS
 * bezahlen. Jeder Aufruf hier kostet ChairMatch echtes Geld bei Twilio,
 * ohne dass ein Konto noetig waere.
 *
 * Was uebrig blieb, war das Rate-Limit der Middleware: 10 Requests pro
 * Minute und IP auf /api/auth/phone/ — also bis zu 14.400 SMS pro Tag aus
 * einer einzigen Quelle.
 *
 * Zwei Riegel dagegen:
 *
 *  1. Ein Kontingent pro IP, das in Stunden statt in Minuten rechnet.
 *  2. Eine Laendervorwahl-Positivliste. ChairMatch ist ein deutschsprachiger
 *     Marktplatz; die Nummernbereiche, ueber die Pumping abgerechnet wird,
 *     liegen typischerweise ausserhalb. Wer eine Nummer aus einem anderen
 *     Land verifizieren will, kann das heute ohnehin nicht — die Anwendung
 *     hat keine Strecke dafuer.
 */
const RATE_IP = { scope: 'phone-send-ip', max: 10, windowMs: 60 * 60_000 }

/** Deutschland, Oesterreich, Schweiz. */
const ALLOWED_COUNTRY_PREFIXES = ['+49', '+43', '+41'] as const

export const POST = withApi(async (req: Request) => {
  const body = await (req as NextRequest).json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError('Ungültige Telefonnummer', 400)

  const phone = normalizeE164(parsed.data.phone)
  if (!phone) return apiError('Telefonnummer-Format ungültig (z.B. +491701234567)', 400)

  if (!ALLOWED_COUNTRY_PREFIXES.some(prefix => phone.startsWith(prefix))) {
    return apiError('Nur Nummern aus DE, AT und CH können verifiziert werden.', 400)
  }

  const ipLimit = checkRateLimit(clientIp(req), RATE_IP)
  if (ipLimit.limited) {
    logger.warn('phone.send.ip_limited', { remaining: ipLimit.remaining })
    return apiError('Zu viele Anforderungen. Bitte später erneut versuchen.', 429)
  }

  const admin = getSupabaseAdmin()

  // Rate-Limit pro Nummer
  const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString()
  const { count } = await admin
    .from('phone_verifications')
    .select('*', { count: 'exact', head: true })
    .eq('phone', phone)
    .gte('created_at', since)

  if ((count ?? 0) >= RATE_LIMIT_PER_PHONE) {
    return apiError(`Zu viele Codes für diese Nummer. Bitte in ${RATE_WINDOW_MIN} Min erneut versuchen.`, 429)
  }

  // Code erzeugen + speichern
  const code = generateOtpCode()
  const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString()

  const { error: insertError } = await admin.from('phone_verifications').insert({
    phone,
    code,
    verified: false,
    expires_at: expiresAt,
  })
  if (insertError) {
    logger.error('phone.send.db_insert_failed', insertError, { phone })
    return apiError('Code konnte nicht erzeugt werden', 500)
  }
  logger.info('phone.send.code_created', { phone })

  // SMS verschicken
  const smsBody = `Dein ChairMatch-Code: ${code}\n\nGültig für ${CODE_TTL_MIN} Min. Niemals weitergeben.`
  const smsRes = await sendSms(phone, smsBody)
  if (!smsRes.ok) {
    return apiError(smsRes.error || 'SMS konnte nicht versendet werden', 500)
  }

  return NextResponse.json({
    success: true,
    expiresIn: CODE_TTL_MIN * 60,
    ...(smsRes.devCode ? { devNote: 'SMS-Provider nicht konfiguriert — Code aus Vercel-Logs holen' } : {}),
  })
})
