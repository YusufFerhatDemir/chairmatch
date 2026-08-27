import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'
import {
  sendBookingConfirmation,
  sendBookingReminder,
  sendWelcomeEmail,
  sendPasswordReset,
  sendProviderNotification,
  sendComplianceAlert,
  type EmailType,
} from '@/lib/email'

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

const bookingDataSchema = z.object({
  bookingId: z.string().min(1),
  salonName: z.string().min(1),
  serviceName: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  customerName: z.string().optional(),
  staffName: z.string().optional(),
  notes: z.string().optional(),
})

const welcomeDataSchema = z.object({
  name: z.string().min(1),
})

const passwordResetDataSchema = z.object({
  resetUrl: z.string().url(),
})

const providerNotificationDataSchema = z.object({
  type: z.enum(['new_booking', 'cancellation', 'review', 'payout', 'general']),
  salonName: z.string().optional(),
  customerName: z.string().optional(),
  bookingId: z.string().optional(),
  message: z.string().optional(),
})

const complianceAlertDataSchema = z.object({
  documentType: z.string().min(1),
  status: z.enum(['expired', 'expiring_soon', 'rejected', 'approved', 'action_required']),
})

const emailRequestSchema = z.object({
  type: z.enum([
    'booking_confirmation',
    'booking_reminder',
    'welcome',
    'password_reset',
    'provider_notification',
    'compliance_alert',
  ]),
  to: z.string().email(),
  data: z.record(z.string(), z.unknown()),
})

// ---------------------------------------------------------------------------
// Roles allowed to send each email type
// ---------------------------------------------------------------------------

/**
 * Wer welchen Mail-Typ ueber diesen Endpunkt ausloesen darf.
 *
 * `booking_confirmation` stand hier bis Track 12 auch fuer die Rolle
 * `anbieter` offen. Das war der gefaehrlichste Eintrag der Datei, aus drei
 * Gruenden zusammen:
 *
 *   1. Die Anbieter-Rolle ist oeffentlich selbst zu beschaffen — POST auf
 *      /api/register-provider legt sie an, ohne dass jemand prueft.
 *   2. `to` ist frei waehlbar. Die Route verlangt keinerlei Bezug zwischen
 *      Empfaenger und Absender.
 *   3. Der Inhalt kommt vollstaendig aus dem Request. Bis Track 12 setzten
 *      die Vorlagen `bookingId`, `startTime` und `endTime` ROH ins HTML —
 *      damit liess sich beliebiges Markup samt Link in eine Mail schreiben,
 *      die von `noreply@chairmatch.de` kommt, DKIM-signiert ist und das
 *      ChairMatch-Layout traegt. Also Phishing mit unserer Absenderreputation,
 *      an jede beliebige Adresse.
 *
 * Das Escaping ist repariert (src/lib/email.ts), aber es allein waere der
 * falsche Riegel: auch reiner Text an beliebige Empfaenger von unserer
 * Domain ist Missbrauch, und die Zustellbarkeit der Domain haengt daran.
 * Der Endpunkt bleibt deshalb Admins vorbehalten.
 *
 * Wenn Anbieter einmal eine Bestaetigung nachsenden koennen sollen, gehoert
 * das in eine eigene Route, die die Buchung ueber ihre ID NACHSCHLAEGT, den
 * Besitz prueft und den Empfaenger aus der Buchung nimmt — nicht aus dem
 * Request. Diese Route hier kann das konstruktionsbedingt nicht.
 */
const ALLOWED_ROLES: Record<EmailType, string[]> = {
  booking_confirmation: ['admin', 'super_admin'],
  booking_reminder: ['admin', 'super_admin'],
  welcome: ['admin', 'super_admin'],
  password_reset: ['admin', 'super_admin'],
  provider_notification: ['admin', 'super_admin'],
  compliance_alert: ['admin', 'super_admin'],
}

/**
 * Eigener Zaehler, unterhalb des generischen 60/min der Middleware.
 *
 * Jeder Aufruf hier kostet einen Resend-Versand und belastet die
 * Zustellreputation der Absenderdomain. Ein durchgedrehtes Skript mit
 * gueltiger Admin-Session soll nicht 60 Mails pro Minute verschicken koennen.
 */
const RATE = { scope: 'email-send', max: 10, windowMs: 60_000 }

// ---------------------------------------------------------------------------
// POST /api/email
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 },
      )
    }

    const role = (session.user as { role?: string }).role || 'kunde'

    const limit = checkRateLimit(clientIp(request), RATE)
    if (limit.limited) {
      return rateLimitResponse(limit, 'Zu viele E-Mail-Anfragen. Bitte kurz warten.')
    }

    // Parse request body
    const body = await request.json()
    const parsed = emailRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Anfrage', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { type, to, data } = parsed.data

    // Role-based authorization
    const allowed = ALLOWED_ROLES[type]
    if (!allowed.includes(role)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung für diesen E-Mail-Typ' },
        { status: 403 },
      )
    }

    // Dispatch to the appropriate email function
    let result: { success: boolean; id?: string; error?: string }

    switch (type) {
      case 'booking_confirmation': {
        const details = bookingDataSchema.safeParse(data)
        if (!details.success) {
          return NextResponse.json(
            { error: 'Ungültige Buchungsdaten', details: details.error.flatten() },
            { status: 400 },
          )
        }
        result = await sendBookingConfirmation(to, details.data)
        break
      }

      case 'booking_reminder': {
        const details = bookingDataSchema.safeParse(data)
        if (!details.success) {
          return NextResponse.json(
            { error: 'Ungültige Buchungsdaten', details: details.error.flatten() },
            { status: 400 },
          )
        }
        result = await sendBookingReminder(to, details.data)
        break
      }

      case 'welcome': {
        const details = welcomeDataSchema.safeParse(data)
        if (!details.success) {
          return NextResponse.json(
            { error: 'Ungültige Daten', details: details.error.flatten() },
            { status: 400 },
          )
        }
        result = await sendWelcomeEmail(to, details.data.name)
        break
      }

      case 'password_reset': {
        const details = passwordResetDataSchema.safeParse(data)
        if (!details.success) {
          return NextResponse.json(
            { error: 'Ungültige Daten', details: details.error.flatten() },
            { status: 400 },
          )
        }
        result = await sendPasswordReset(to, details.data.resetUrl)
        break
      }

      case 'provider_notification': {
        const details = providerNotificationDataSchema.safeParse(data)
        if (!details.success) {
          return NextResponse.json(
            { error: 'Ungültige Daten', details: details.error.flatten() },
            { status: 400 },
          )
        }
        const { type: notifType, ...rest } = details.data
        result = await sendProviderNotification(to, notifType, rest)
        break
      }

      case 'compliance_alert': {
        const details = complianceAlertDataSchema.safeParse(data)
        if (!details.success) {
          return NextResponse.json(
            { error: 'Ungültige Daten', details: details.error.flatten() },
            { status: 400 },
          )
        }
        result = await sendComplianceAlert(to, details.data.documentType, details.data.status)
        break
      }

      default: {
        return NextResponse.json(
          { error: 'Unbekannter E-Mail-Typ' },
          { status: 400 },
        )
      }
    }

    if (!result.success) {
      return NextResponse.json(
        { error: 'E-Mail konnte nicht gesendet werden', details: result.error },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true, id: result.id })
  } catch (err) {
    console.error('[API /email] Unhandled error:', err)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 },
    )
  }
}
