import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'
import { withApi, apiError } from '@/lib/api-wrapper'
import { logger } from '@/lib/logger'

/**
 * POST /api/auth/change-password
 *
 * Setzt ein neues Passwort fuer den eingeloggten User.
 * Loescht das `password_must_change`-Flag bei Erfolg.
 *
 * Zwei Modi:
 *
 *  (A) ERZWUNGENER WECHSEL (`passwordMustChange` in der Session).
 *      Der Nutzer kennt sein Passwort nicht — es wurde bei der Registrierung
 *      per Zufall gesetzt oder vom Admin zurueckgesetzt. `currentPassword`
 *      ist weder gefragt noch sinnvoll.
 *
 *  (B) FREIWILLIGER WECHSEL (Account-Einstellungen).
 *      Hier MUSS das aktuelle Passwort mitgeschickt und geprueft werden.
 *      Ohne die Pruefung genuegt ein gestohlenes Session-Cookie (XSS,
 *      physischer Zugriff, Session-Hijacking), um das Passwort zu aendern
 *      und den echten Inhaber auszusperren. Die Pruefung laeuft ueber
 *      `signInWithPassword` — derselbe Weg wie der Login selbst.
 */
const schema = z.object({
  newPassword: z.string().min(8, 'Mindestens 8 Zeichen'),
  currentPassword: z.string().optional(),
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const POST = withApi(async (req: Request) => {
  const session = await getServerSession()
  if (!session?.user?.id) return apiError('Nicht angemeldet', 401)

  const body = await (req as NextRequest).json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400)

  const admin = getSupabaseAdmin()
  const userId = session.user.id
  const isForcedChange =
    (session.user as { passwordMustChange?: boolean }).passwordMustChange === true

  // Im freiwilligen Modus: altes Passwort pruefen.
  if (!isForcedChange) {
    if (!parsed.data.currentPassword) {
      return apiError('Aktuelles Passwort erforderlich', 400)
    }
    const email = session.user.email
    if (!email) return apiError('Session ohne E-Mail', 400)

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.currentPassword,
    })
    if (verifyErr) {
      logger.warn('auth.change_password.wrong_current', { userId })
      return apiError('Aktuelles Passwort ist falsch', 403)
    }
  }

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
