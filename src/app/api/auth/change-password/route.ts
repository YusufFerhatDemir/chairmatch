import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  SESSION_REVOKED_ACTION,
  getServerSession,
  invalidateAccountState,
} from '@/modules/auth/session'
import { withApi, apiError } from '@/lib/api-wrapper'
import { logger } from '@/lib/logger'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit'

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

/**
 * Drosselung — dieser Endpunkt ist das einzige Passwort-Orakel der Plattform.
 *
 * Im freiwilligen Modus prueft er `currentPassword` per
 * `signInWithPassword` und antwortet unterscheidbar: 403 „Aktuelles Passwort
 * ist falsch" gegen alles andere. Wer ein Sitzungscookie erbeutet hat — der
 * Fall, fuer den es den Sitzungswiderruf weiter unten ueberhaupt gibt —
 * konnte damit das echte Passwort erraten, beliebig oft. Genau dieses
 * Passwort ist die Beute, die das Cookie nicht hergibt: es ueberlebt den
 * Widerruf und wird anderswo wiederverwendet.
 *
 * Gezaehlt wird am KONTO, nicht nur an der IP. Der Riegel in `middleware.ts`
 * (10/min fuer /api/auth/*) zaehlt ausschliesslich pro IP — gegen einen
 * Angreifer mit wechselnden Adressen ist er wirkungslos, und angegriffen
 * wird ohnehin ein bestimmtes Konto. Beide Zaehler laufen nebeneinander, wie
 * schon bei forgot-password (IP + Adresse).
 *
 * Die Grenze richtet sich nach 2fa-verify (5 Versuche je 5 Minuten): auch
 * dort wird ein Geheimnis geraten. Wer sein eigenes Passwort tippt, braucht
 * keine zehn Anlaeufe je Viertelstunde.
 *
 * Der erzwungene Wechsel (`passwordMustChange`) prueft kein altes Passwort
 * und ist deshalb kein Orakel — er faellt nur unter das IP-Limit.
 */
const RATE_PER_IP = { scope: 'change-password-ip', max: 10, windowMs: 15 * 60_000 }
const RATE_PER_ACCOUNT = { scope: 'change-password-account', max: 5, windowMs: 15 * 60_000 }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const POST = withApi(async (req: Request) => {
  const ipLimit = checkRateLimit(clientIp(req), RATE_PER_IP)
  if (ipLimit.limited) {
    return rateLimitResponse(ipLimit, 'Zu viele Versuche. Bitte später erneut versuchen.')
  }

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

    // Erst hier — der Zaehler soll Rateversuche zaehlen, nicht Aufrufe ohne
    // Passwort im Body. Sonst sperrt sich ein Formularfehler das Konto selbst.
    const accountLimit = checkRateLimit(userId, RATE_PER_ACCOUNT)
    if (accountLimit.limited) {
      logger.warn('auth.change_password.rate_limited', { userId })
      return rateLimitResponse(
        accountLimit,
        'Zu viele Versuche mit falschem Passwort. Bitte später erneut versuchen.',
      )
    }

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

  // 3. Alle offenen Sitzungen dieses Kontos fuer ungueltig erklaeren.
  //
  // Ohne diesen Schritt war der Passwortwechsel gegen den haeufigsten Grund
  // fuer einen Passwortwechsel wirkungslos: das Cookie laeuft 365 Tage, und
  // wer es hat, behaelt es. Der Widerruf wirkt ueber `getServerSession`, das
  // jeden Token gegen diesen Zeitstempel haelt (siehe
  // SESSION_REVOKED_ACTION in src/modules/auth/session.ts).
  //
  // Er schliesst die EIGENE Sitzung ein — /auth/change-password meldet nach
  // Erfolg ohnehin ab, und ein Wechsel, der die aufrufende Sitzung
  // ausnimmt, waere fuer den Angreiferfall die falsche Ausnahme.
  const { error: widerrufError } = await admin.from('audit_logs').insert({
    user_id: userId,
    action: SESSION_REVOKED_ACTION,
    entity: 'profile',
    entity_id: userId,
    details: { reason: isForcedChange ? 'password_change_forced' : 'password_change' },
  })
  if (widerrufError) {
    // Das Passwort ist bereits geaendert — das laesst sich nicht
    // zurueckdrehen. Aber der Nutzer darf nicht glauben, seine anderen
    // Sitzungen seien beendet, wenn sie es nicht sind.
    logger.error('auth.change_password.revoke_failed', widerrufError, { userId })
    return NextResponse.json(
      {
        success: true,
        sessionsRevoked: false,
        warning:
          'Das Passwort wurde geändert. Andere offene Sitzungen konnten NICHT beendet werden — bitte melde dich in den anderen Geräten manuell ab.',
      },
      { status: 200 },
    )
  }

  invalidateAccountState(userId)

  return NextResponse.json({ success: true, sessionsRevoked: true })
})
