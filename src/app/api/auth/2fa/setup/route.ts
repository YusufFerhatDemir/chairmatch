import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { generateSecret } from '@/lib/totp'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit'
import { dbError } from '@/lib/api-wrapper'

/**
 * GET /api/auth/2fa/setup
 * Check if 2FA is enabled for the current user.
 */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('user_2fa')
      .select('enabled')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (error) {
      return dbError('2fa-setup-GET', error)
    }

    return NextResponse.json({
      enabled: data?.enabled ?? false,
    })
  } catch {
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

const RATE = { scope: '2fa-setup', max: 10, windowMs: 3600_000 } // 10 per hour

/**
 * POST /api/auth/2fa/setup
 * Generate a new TOTP secret and return the QR code URL.
 * Stores the secret (not yet enabled) so it can be verified.
 *
 * TRACK 21: EIN AUFRUF HAT AKTIVE 2FA ABGESCHALTET.
 *
 * Der Upsert unten schreibt `enabled: false`. Auf einer Zeile, die
 * `enabled = true` trug, war das keine Einrichtung, sondern eine
 * Abschaltung — und zwar ohne jeden Nachweis: kein aktueller TOTP-Code, kein
 * Passwort, nur das Sitzungs-Cookie. Wer ein Cookie hat (XSS, mitgelesenes
 * Geraet, fremder Rechner), schaltete damit den zweiten Faktor mit einem
 * einzigen POST ab; die Anmeldung fragte danach wieder nur nach dem Passwort,
 * das bei einem Konto mit 2FA gerade der Teil ist, den man als kompromittiert
 * annehmen muss. Eine Route zum ABSICHTLICHEN Deaktivieren gibt es in der
 * ganzen Anwendung nicht — das hier war eine versehentliche.
 *
 * Zweiter, leiserer Schaden: wer aus Neugier ein zweites Mal auf
 * „Aktivieren" tippte und den neuen Code nie bestaetigte, stand ohne 2FA da
 * und ohne Hinweis darauf.
 *
 * Jetzt: eine aktive 2FA wird von dieser Route nicht mehr angefasst (409).
 * Der Wechsel des Geheimnisses oder das Abschalten braucht einen eigenen
 * Endpunkt, der den AKTUELLEN Code prueft — und dafuer eine Spalte fuer das
 * noch unbestaetigte Geheimnis, die `user_2fa` live nicht hat. Ein Riegel,
 * der nichts kaputt macht, ist der bessere Zwischenstand als eine Rotation,
 * die bei Abbruch ohne zweiten Faktor endet.
 */
export async function POST(req: NextRequest) {
  try {
    const limit = checkRateLimit(clientIp(req), RATE)
    if (limit.limited) return rateLimitResponse(limit, 'Zu viele Anfragen. Bitte spaeter erneut versuchen.')

    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const supabaseVorab = getSupabaseAdmin()
    const { data: bestehend, error: leseFehler } = await supabaseVorab
      .from('user_2fa')
      .select('enabled')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (leseFehler) {
      // Fail closed: ist der Zustand unbekannt, darf hier nichts geschrieben
      // werden — der Upsert wuerde eine womoeglich aktive 2FA abschalten.
      return dbError('2fa-setup-POST-lookup', leseFehler)
    }
    if (bestehend?.enabled === true) {
      return NextResponse.json(
        {
          error:
            'Zwei-Faktor-Authentifizierung ist für dieses Konto bereits aktiv. Zum Wechseln des Geräts wende dich an den Support.',
          enabled: true,
        },
        { status: 409 },
      )
    }

    const email = session.user.email || ''
    const { secret, qrUrl } = generateSecret(email)

    const supabase = getSupabaseAdmin()

    // Upsert a pending 2FA record (not yet enabled until verified)
    const { error } = await supabase
      .from('user_2fa')
      .upsert(
        {
          user_id: session.user.id,
          secret,
          enabled: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      return dbError('2fa-setup-POST', error)
    }

    return NextResponse.json({ secret, qrUrl })
  } catch {
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
