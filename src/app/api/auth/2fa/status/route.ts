import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * POST /api/auth/2fa/status
 *
 * Gibt zurueck ob fuer eine E-Mail-Adresse 2FA aktiviert ist.
 *
 * Der Endpunkt laeuft VOR dem Login: das Login-Formular fragt ihn, um bei
 * Bedarf das Code-Feld einzublenden. Ohne Rueckmeldung muesste der Nutzer
 * sein Passwort absenden, eine generische Fehlermeldung lesen und raten,
 * dass das Code-Feld fehlt.
 *
 * Kein Konto-Orakel: die Antwort ist fuer unbekannte Adressen identisch
 * mit der fuer Adressen ohne 2FA (`{ required: false }`). Nur wenn
 * Supabase-Auth die Adresse als existierend bestaetigt UND `user_2fa`
 * `enabled = true` fuehrt, kommt `{ required: true }` zurueck.
 */

const RATE = { scope: '2fa-status', max: 10, windowMs: 60_000 }

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(clientIp(req), RATE)
  if (limit.limited) return rateLimitResponse(limit, 'Zu viele Anfragen.')

  let email: unknown
  try {
    const body = await req.json()
    email = body.email
  } catch {
    return NextResponse.json({ required: false })
  }
  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ required: false })
  }

  const normalized = email.trim().toLowerCase()

  try {
    const admin = getSupabaseAdmin()

    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', normalized)
      .maybeSingle()

    if (!profile) return NextResponse.json({ required: false })

    const { data: twoFa } = await admin
      .from('user_2fa')
      .select('enabled')
      .eq('user_id', profile.id)
      .maybeSingle()

    return NextResponse.json({ required: twoFa?.enabled === true })
  } catch {
    return NextResponse.json({ required: false })
  }
}
