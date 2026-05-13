import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'
import { withApi, apiError } from '@/lib/api-wrapper'

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
    .min(10, 'Mindestens 10 Zeichen')
    .regex(/[A-Z]/, 'Mindestens 1 Großbuchstabe')
    .regex(/[0-9]/, 'Mindestens 1 Zahl')
    .regex(/[^A-Za-z0-9]/, 'Mindestens 1 Sonderzeichen'),
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
    console.error('[change-password] auth.admin failed:', authErr.message)
    return apiError('Passwort konnte nicht geändert werden', 500)
  }

  // 2. Flag entfernen
  await admin
    .from('profiles')
    .update({ password_must_change: false })
    .eq('id', userId)

  return NextResponse.json({ success: true })
})
