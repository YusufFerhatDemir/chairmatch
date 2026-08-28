import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { dbError } from '@/lib/api-wrapper'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit'
import { hashIp, requestIp } from '@/lib/ip-hash'

/**
 * POST /api/cookies/consent — Einwilligung nach TTDSG festhalten.
 *
 * Die Route ist absichtlich ohne Anmeldung erreichbar: die Entscheidung
 * faellt, bevor sich jemand anmeldet. Drei Dinge fehlten dafuer:
 *
 *  1. Die rohe DB-Meldung ging als `error.message` an den Aufrufer zurueck —
 *     auf einer unangemeldeten Route. Das ist der letzte Nachzuegler der
 *     Aufraeumarbeit aus Track 18/19.
 *  2. Kein eigener Deckel. Ein unangemeldeter INSERT ohne Limit ist eine
 *     Tabelle, die eine einzelne Quelle beliebig fuellen kann.
 *  3. Die Zeile trug keinerlei Zuordnung. `cookie_consents` fuehrt live eine
 *     Spalte `ip_hash` (Sonde 28.08.2026) — genau fuer diesen Zweck, und sie
 *     blieb leer. Ein Einwilligungsnachweis, der niemandem zuzuordnen ist,
 *     ist als Nachweis wertlos; die `session_id` kommt aus dem Browser und
 *     ist frei waehlbar. Gespeichert wird der HMAC, nicht die IP (wie in
 *     visit_logs, error_logs und login_attempts seit Track 19).
 */
const RATE = { scope: 'cookie-consent', max: 20, windowMs: 60 * 60 * 1000 }

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  try {
    const limit = checkRateLimit(clientIp(req), RATE)
    if (limit.limited) {
      return rateLimitResponse(limit, 'Zu viele Aufrufe.')
    }

    const body = await req.json()
    const { sessionId, choices } = body as { sessionId: string; choices: Record<string, boolean> }
    if (typeof sessionId !== 'string' || sessionId.length < 1 || sessionId.length > 128) {
      return NextResponse.json({ error: 'Ungueltige Session-ID' }, { status: 400 })
    }
    if (!choices || typeof choices !== 'object') {
      return NextResponse.json({ error: 'sessionId and choices required' }, { status: 400 })
    }

    const { error } = await supabase.from('cookie_consents').insert({
      session_id: sessionId,
      // `requestIp` statt `clientIp`: letzteres liefert ersatzweise die
      // Zeichenkette 'unknown', und die zu hashen ergaebe fuer alle Aufrufer
      // ohne Proxy-Header denselben Wert — eine Zuordnung, die keine ist.
      ip_hash: hashIp(requestIp(req)),
      choices: {
        necessary: true,
        statistics: choices.statistics ?? false,
        marketing: choices.marketing ?? false,
      },
    })
    if (error) return dbError('cookies-consent', error)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
