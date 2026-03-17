import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
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

const ALLOWED_ROLES: Record<EmailType, string[]> = {
  booking_confirmation: ['admin', 'super_admin', 'anbieter'],
  booking_reminder: ['admin', 'super_admin'],
  welcome: ['admin', 'super_admin'],
  password_reset: ['admin', 'super_admin'],
  provider_notification: ['admin', 'super_admin'],
  compliance_alert: ['admin', 'super_admin'],
}

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
