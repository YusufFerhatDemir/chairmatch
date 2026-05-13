import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { normalizeE164 } from '@/lib/sms'
import { withApi, apiError } from '@/lib/api-wrapper'
import { getServerSession } from '@/modules/auth/session'

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

const MAX_ATTEMPTS_PER_WINDOW = 5
const ATTEMPT_WINDOW_MIN = 10

export const POST = withApi(async (req: Request) => {
  const body = await (req as NextRequest).json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error?.issues[0]?.message || 'Ungültige Eingabe', 400)

  const phone = normalizeE164(parsed.data.phone)
  if (!phone) return apiError('Telefonnummer-Format ungültig', 400)
  const code = parsed.data.code

  const admin = getSupabaseAdmin()

  // Brute-Force-Schutz: max 5 falsche Versuche pro Nummer/10 Min
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MIN * 60_000).toISOString()
  const { count: failCount } = await admin
    .from('phone_verifications')
    .select('*', { count: 'exact', head: true })
    .eq('phone', phone)
    .eq('verified', false)
    .gte('created_at', since)
  if ((failCount ?? 0) > MAX_ATTEMPTS_PER_WINDOW * 3) {
    return apiError('Zu viele fehlgeschlagene Versuche. Bitte später erneut.', 429)
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
    console.error('[phone/verify] DB-Select failed:', selectError.message)
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
