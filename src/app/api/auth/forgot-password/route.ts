import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Passwort-Reset anfordern — Supabase sendet E-Mail mit Link (1h Ablauf).
 *
 * Zwei Riegel, die vorher fehlten:
 *
 *   1. Rate-Limit. Der Endpunkt loest fremden Mailversand aus. Ohne Limit
 *      genuegte eine Schleife, um eine beliebige Adresse zuzumuellen und
 *      nebenbei das Mailkontingent des Supabase-Projekts aufzubrauchen —
 *      danach kaeme auch keine Bestaetigungsmail mehr durch.
 *
 *   2. Immer dieselbe Antwort. Die Route gab `error.message` von Supabase
 *      weiter und machte damit unterscheidbar, ob eine Adresse registriert
 *      ist. Die Erfolgsmeldung sagte bereits "Falls ein Konto existiert" —
 *      der Fehlerzweig hat das ausgehebelt.
 */

const RATE = { scope: 'forgot-password', max: 3, windowMs: 15 * 60_000 }
/** Zusaetzlich pro Adresse, damit ein IP-Wechsel die Mailflut nicht neu startet. */
const RATE_PER_EMAIL = { scope: 'forgot-password-email', max: 3, windowMs: 60 * 60_000 }

const GENERIC_OK = {
  ok: true,
  message: 'Falls ein Konto existiert, wurde ein Link zum Zurücksetzen gesendet.',
}

export async function POST(req: NextRequest) {
  try {
    const ipLimit = checkRateLimit(clientIp(req), RATE)
    if (ipLimit.limited) {
      return rateLimitResponse(ipLimit, 'Zu viele Anfragen. Bitte später erneut versuchen.')
    }

    const { email } = await req.json()
    if (!email || typeof email !== 'string' || email.length > 255 || !email.includes('@')) {
      return NextResponse.json({ error: 'E-Mail erforderlich' }, { status: 400 })
    }
    const normalized = email.trim().toLowerCase()

    const emailLimit = checkRateLimit(normalized, RATE_PER_EMAIL)
    if (emailLimit.limited) {
      // Bewusst dieselbe generische Antwort wie im Erfolgsfall: ein 429 nur
      // fuer existierende Adressen waere wieder ein Konto-Orakel.
      return NextResponse.json(GENERIC_OK)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.chairmatch.de'}/auth/reset-password`,
    })

    if (error) {
      console.error('[Forgot-Password] Supabase:', error.message)
    }

    // Erfolg wie Fehler: identische Antwort.
    return NextResponse.json(GENERIC_OK)
  } catch {
    return NextResponse.json({ error: 'Anfrage fehlgeschlagen' }, { status: 500 })
  }
}
