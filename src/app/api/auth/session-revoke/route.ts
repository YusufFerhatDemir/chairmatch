import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { SESSION_REVOKED_ACTION, invalidateAccountState } from '@/modules/auth/session'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * POST /api/auth/session-revoke — serverseitiges Ende des Passwort-Resets.
 *
 * WARUM ES DIESE ROUTE BRAUCHT
 *
 * ChairMatch hat zwei Anmeldesysteme nebeneinander: NextAuth stellt das
 * Sitzungs-Cookie aus, Supabase-Auth haelt das Passwort. Der Reset ueber
 * „Passwort vergessen" laeuft VOLLSTAENDIG im Browser gegen Supabase —
 * /auth/reset-password loest den Link ein und ruft
 * `supabase.auth.updateUser({ password })` mit dem oeffentlichen Anon-Key auf.
 * Der Server erfaehrt davon nichts.
 *
 * Damit war der Reset genau in dem Fall wirkungslos, fuer den es ihn gibt:
 * wer sein Passwort zuruecksetzt, WEIL jemand anderes Zugriff auf sein Konto
 * hat, sperrte diesen Jemand nicht aus. Das NextAuth-Cookie laeuft 365 Tage
 * und haengt am Passwort nicht — die fremde Sitzung lief unveraendert weiter.
 *
 * WIE SICH DER AUFRUFER AUSWEIST
 *
 * Nicht ueber das NextAuth-Cookie: wer gerade sein Passwort zurueckgesetzt
 * hat, ist bei NextAuth typischerweise gar nicht angemeldet. Der Ausweis ist
 * das Supabase-Zugangstoken aus der Reset-Sitzung. Es wird hier NICHT
 * geglaubt, sondern gegen Supabase geprueft (`auth.getUser(jwt)`), und die
 * Nutzer-ID kommt aus der Antwort — nie aus dem Request. Ein selbst
 * geschriebenes Token faellt durch, eine fremde ID laesst sich nicht
 * mitschicken.
 */

/** Der Reset kommt einmal. Fuenf Versuche je Viertelstunde decken Wiederholungen. */
const RATE = { scope: 'session-revoke', max: 5, windowMs: 15 * 60_000 }

function readAccessToken(req: NextRequest, body: unknown): string | null {
  const header = req.headers.get('authorization') ?? ''
  const ausHeader = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim()
  if (ausHeader) return ausHeader
  const ausBody = (body as { accessToken?: unknown } | null)?.accessToken
  return typeof ausBody === 'string' && ausBody.length > 0 ? ausBody.trim() : null
}

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(clientIp(req), RATE)
  if (limit.limited) return rateLimitResponse(limit, 'Zu viele Anfragen.')

  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    /* Body optional — das Token darf auch im Header stehen. */
  }

  const accessToken = readAccessToken(req, body)
  if (!accessToken) {
    return NextResponse.json({ error: 'Zugangstoken fehlt' }, { status: 401 })
  }
  // Ein JWT ist nie so lang; alles darueber ist kein Ausweis, sondern Last.
  if (accessToken.length > 4096) {
    return NextResponse.json({ error: 'Zugangstoken ungültig' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  let userId: string
  try {
    const { data, error } = await admin.auth.getUser(accessToken)
    if (error || !data?.user?.id) {
      return NextResponse.json({ error: 'Zugangstoken ungültig' }, { status: 401 })
    }
    userId = data.user.id
  } catch (e) {
    console.error('[session-revoke] Token-Pruefung abgebrochen:', String(e))
    return NextResponse.json(
      { error: 'Sitzungen konnten nicht beendet werden. Bitte später erneut versuchen.' },
      { status: 503 },
    )
  }

  const { error } = await admin.from('audit_logs').insert({
    user_id: userId,
    action: SESSION_REVOKED_ACTION,
    entity: 'profile',
    entity_id: userId,
    details: { reason: 'password_reset' },
  })

  if (error) {
    // Kein stiller Erfolg: „deine anderen Geraete sind abgemeldet" ist eine
    // Zusage, die nicht gegeben werden darf, wenn sie nicht gilt.
    console.error('[session-revoke] Widerruf nicht gespeichert:', error.code, error.message)
    return NextResponse.json(
      { error: 'Sitzungen konnten nicht beendet werden. Bitte später erneut versuchen.' },
      { status: 503 },
    )
  }

  invalidateAccountState(userId)
  return NextResponse.json({ success: true, sessionsRevoked: true })
}
