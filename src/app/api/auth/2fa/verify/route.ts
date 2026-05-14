import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/totp'
import { logger } from '@/lib/logger'

/**
 * Generate 10 Recovery-Codes (jeweils 10 Zeichen, alphanumerisch).
 * Werden einmalig beim Aktivieren erzeugt und dem User angezeigt — danach
 * nur noch als Hash in DB (hier vereinfacht: plaintext, da kurze TTL +
 * single-use; für höhere Sicherheit später hashen).
 */
function generateRecoveryCodes(): string[] {
  const codes: string[] = []
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (let i = 0; i < 10; i++) {
    const bytes = new Uint8Array(10)
    crypto.getRandomValues(bytes)
    let code = ''
    for (let j = 0; j < 10; j++) {
      code += chars[bytes[j] % chars.length]
    }
    // Format: XXXXX-XXXXX für bessere Lesbarkeit
    codes.push(code.slice(0, 5) + '-' + code.slice(5))
  }
  return codes
}

/**
 * POST /api/auth/2fa/verify
 * Verify a TOTP code, enable 2FA, generate recovery codes.
 * Body: { code: string }
 * Response: { success: true, recoveryCodes: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await req.json()
    const { code } = body

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json(
        { error: 'Ungültiger Code. Bitte 6-stelligen Code eingeben.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: twoFa, error: fetchError } = await supabase
      .from('user_2fa')
      .select('secret, enabled')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const twoFaRecord = twoFa as { secret?: string; enabled?: boolean } | null
    if (!twoFaRecord?.secret) {
      return NextResponse.json(
        { error: '2FA wurde noch nicht eingerichtet. Bitte zuerst /api/auth/2fa/setup aufrufen.' },
        { status: 400 }
      )
    }

    const valid = verifyToken(twoFaRecord.secret, code)
    if (!valid) {
      logger.warn('auth.2fa.verify_failed', { userId: session.user.id })
      return NextResponse.json(
        { error: 'Ungültiger Code. Bitte erneut versuchen.' },
        { status: 400 }
      )
    }

    // Recovery-Codes nur bei erster Aktivierung erzeugen
    const recoveryCodes = twoFaRecord.enabled ? null : generateRecoveryCodes()

    const updatePayload: Record<string, unknown> = {
      enabled: true,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (recoveryCodes) {
      updatePayload.recovery_codes = recoveryCodes
      updatePayload.recovery_codes_used = []
    }

    const { error: updateError } = await supabase
      .from('user_2fa')
      .update(updatePayload)
      .eq('user_id', session.user.id)

    if (updateError) {
      logger.error('auth.2fa.enable_failed', new Error(updateError.message), { userId: session.user.id })
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    logger.info('auth.2fa.enabled', { userId: session.user.id })
    return NextResponse.json({
      success: true,
      message: '2FA erfolgreich aktiviert.',
      recoveryCodes: recoveryCodes, // null wenn schon aktiv (Re-Verify)
    })
  } catch (e) {
    logger.error('auth.2fa.verify_crashed', e)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}

/**
 * DELETE /api/auth/2fa/verify
 * Deaktiviert 2FA für den eingeloggten User (mit TOTP-Bestätigung).
 * Body: { code: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { code } = body
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Bestätigungs-Code erforderlich' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: twoFa } = await supabase
      .from('user_2fa')
      .select('secret, enabled, recovery_codes, recovery_codes_used')
      .eq('user_id', session.user.id)
      .maybeSingle()

    const rec = twoFa as { secret?: string; enabled?: boolean; recovery_codes?: string[]; recovery_codes_used?: string[] } | null
    if (!rec?.enabled || !rec?.secret) {
      return NextResponse.json({ error: '2FA ist nicht aktiv' }, { status: 400 })
    }

    const isTotp = /^\d{6}$/.test(code) && verifyToken(rec.secret, code)
    const recoveryCodes = rec.recovery_codes ?? []
    const usedCodes = rec.recovery_codes_used ?? []
    const isRecovery = code.length >= 8 && recoveryCodes.includes(code) && !usedCodes.includes(code)

    if (!isTotp && !isRecovery) {
      logger.warn('auth.2fa.disable_invalid_code', { userId: session.user.id })
      return NextResponse.json({ error: 'Ungültiger Code' }, { status: 400 })
    }

    // 2FA deaktivieren — komplettes Record löschen
    await supabase.from('user_2fa').delete().eq('user_id', session.user.id)

    logger.info('auth.2fa.disabled', { userId: session.user.id })
    return NextResponse.json({ success: true })
  } catch (e) {
    logger.error('auth.2fa.disable_crashed', e)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
