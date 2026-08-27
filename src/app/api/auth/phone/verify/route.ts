import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { normalizeE164 } from '@/lib/sms'
import { withApi, apiError } from '@/lib/api-wrapper'
import { getServerSession } from '@/modules/auth/session'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * POST /api/auth/phone/verify
 *
 * Prüft einen 6-stelligen SMS-Code. Wenn gültig & user eingeloggt:
 * trägt die Nummer als verifizierte Phone-Nr auf das Profil.
 *
 * Nicht-eingeloggte Verifikationen sind möglich (z.B. für Registrierungs-
 * Flow) — dann gibt's nur "verified=true" zurück, ohne Profil-Update.
 */
const schema = z.object({
  phone: z.string().min(5).max(40),
  code: z.string().regex(/^\d{6}$/, 'Code muss 6 Ziffern sein'),
})

/**
 * Brute-Force-Riegel.
 *
 * Hier stand bis Track 9 eine Abfrage, die sich als solcher las und keiner
 * war:
 *
 *     count(*) FROM phone_verifications
 *     WHERE phone = ? AND verified = false AND created_at >= vor 10 Min
 *     ... if (count > MAX_ATTEMPTS_PER_WINDOW * 3) -> 429
 *
 * Gezaehlt wurden damit NICHT die Fehlversuche, sondern die noch nicht
 * eingeloesten Codes. Fehlversuche schreibt niemand irgendwohin. Und
 * /api/auth/phone/send laesst hoechstens DREI Codes je Nummer und
 * Zehnminutenfenster zu — der Zaehler konnte also nie ueber 3 steigen,
 * die Schwelle lag bei 15. Der Riegel hat in keinem einzigen Fall gegriffen.
 *
 * Was jetzt greift: ein echter Zaehler ueber die tatsaechlichen Versuche.
 * Er liegt im Speicher der Instanz (siehe src/lib/rate-limit.ts) und haelt
 * damit die Schleife aus einer Quelle auf, nicht den verteilten Angriff.
 *
 * Der verbleibende Rest ist bekannt und hier nicht geschlossen: ein
 * ausgegebener Code erlaubt weiterhin beliebig viele Versuche, wenn sie ueber
 * genug Instanzen gestreut werden. Ein harter Deckel braucht einen Zaehler
 * PRO CODE in der Datenbank — `phone_verifications` hat live keine solche
 * Spalte (Sonde 2026-08-27: `attempts`, `attempt_count`, `failed_attempts`
 * antworten alle mit 42703). Das ist eine Migration, keine Codeaenderung,
 * und dieser Track legt keine weitere unangewendete Migration nach.
 *
 * Der Schaden bleibt derweil klein: ein erratener Code setzt `profiles.phone`
 * des ANRUFENDEN Kontos, es gibt keinen Login ueber die Telefonnummer.
 */
const MAX_ATTEMPTS_PER_WINDOW = 10
const ATTEMPT_WINDOW_MIN = 10

export const POST = withApi(async (req: Request) => {
  const body = await (req as NextRequest).json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error?.issues[0]?.message || 'Ungültige Eingabe', 400)

  const phone = normalizeE164(parsed.data.phone)
  if (!phone) return apiError('Telefonnummer-Format ungültig', 400)
  const code = parsed.data.code

  const admin = getSupabaseAdmin()

  // Jeder Versuch zaehlt — der richtige wie der falsche.
  const limit = checkRateLimit(phone, {
    scope: 'phone-verify',
    max: MAX_ATTEMPTS_PER_WINDOW,
    windowMs: ATTEMPT_WINDOW_MIN * 60_000,
  })
  if (limit.limited) {
    return rateLimitResponse(limit, 'Zu viele Versuche. Bitte später erneut.')
  }

  // Aktuellsten gültigen, nicht-verbrauchten Code für diese Nummer holen
  const { data: rows, error: selectError } = await admin
    .from('phone_verifications')
    .select('id, code, verified, expires_at')
    .eq('phone', phone)
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(1)

  if (selectError) {
    logger.error('phone.verify.db_select_failed', selectError, { phone })
    return apiError('Verifizierung nicht möglich', 500)
  }

  const row = rows?.[0] as { id: string; code: string; expires_at: string } | undefined
  if (!row) return apiError('Kein gültiger Code gefunden — bitte neu anfordern', 400)
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return apiError('Code abgelaufen — bitte neu anfordern', 400)
  }

  // Timing-Safe-Compare (gegen Timing-Attacken)
  if (!safeStringEquals(row.code, code)) {
    return apiError('Falscher Code', 400)
  }

  // Code als verbraucht markieren
  await admin
    .from('phone_verifications')
    .update({ verified: true })
    .eq('id', row.id)

  // Wenn User eingeloggt → Nummer auf Profil speichern
  const session = await getServerSession()
  if (session?.user?.id) {
    await admin
      .from('profiles')
      .update({ phone })
      .eq('id', session.user.id)
  }

  return NextResponse.json({ success: true, verified: true, phone })
})

/**
 * Vergleicht zwei Strings in konstanter Zeit — verhindert dass ein Angreifer
 * über die Antwort-Latenz die richtigen Ziffern erraten kann.
 */
function safeStringEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
