import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { sendSms, normalizeE164, generateOtpCode } from '@/lib/sms'
import { withApi, apiError } from '@/lib/api-wrapper'
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

export const POST = withApi(async (req: Request) => {
  const body = await (req as NextRequest).json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError('Ungültige Telefonnummer', 400)

  const phone = normalizeE164(parsed.data.phone)
  if (!phone) return apiError('Telefonnummer-Format ungültig (z.B. +491701234567)', 400)

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
