import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'
import { withApi, apiError } from '@/lib/api-wrapper'
import { logger } from '@/lib/logger'

/**
 * POST /api/auth/change-password
 *
 * Setzt ein neues Passwort für den eingeloggten User.
 * Löscht das `password_must_change`-Flag bei Erfolg.
 *
 * Verwendet vom Force-Password-Change-Screen (für Provider mit Initial-Passwort)
 * und vom Standard-Account-Settings-Bereich.
 */
const schema = z.object({
  newPassword: z
    .string()
    .min(8, 'Mindestens 8 Zeichen'),
})

export const POST = withApi(async (req: Request) => {
  const session = await getServerSession()
  if (!session?.user?.id) return apiError('Nicht angemeldet', 401)

  const body = await (req as NextRequest).json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400)

  const admin = getSupabaseAdmin()
  const userId = session.user.id

  // 1. Passwort in auth.users updaten (via Admin-API)
  const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
    password: parsed.data.newPassword,
  })
  if (authErr) {
    logger.error('auth.change_password.failed', authErr, { userId })
    return apiError('Passwort konnte nicht geändert werden', 500)
  }
  logger.info('auth.change_password.success', { userId })

  // 2. Flag entfernen
  await admin
    .from('profiles')
    .update({ password_must_change: false })
    .eq('id', userId)

  return NextResponse.json({ success: true })
})
