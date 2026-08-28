import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/totp'
import { dbError } from '@/lib/api-wrapper'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * POST /api/auth/2fa/verify
 * Verify a TOTP code and enable 2FA for the user.
 * Body: { code: string }
 */
const RATE = { scope: '2fa-verify', max: 5, windowMs: 300_000 } // 5 attempts per 5 minutes

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req)
    const limit = checkRateLimit(ip, RATE)
    if (limit.limited) return rateLimitResponse(limit, 'Zu viele Versuche. Bitte spaeter erneut.')

    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await req.json()
    const { code } = body

    if (typeof code !== 'string' || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Ungültiger Code. Bitte 6-stelligen Code eingeben.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Fetch the stored secret for this user
    const { data: twoFa, error: fetchError } = await supabase
      .from('user_2fa')
      .select('secret, enabled')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (fetchError) {
      return dbError('2fa-verify', fetchError)
    }

    if (!twoFa || !twoFa.secret) {
      return NextResponse.json(
        { error: '2FA wurde noch nicht eingerichtet. Bitte zuerst /api/auth/2fa/setup aufrufen.' },
        { status: 400 }
      )
    }

    // Verify the TOTP code
    const valid = verifyToken(twoFa.secret, code)

    if (!valid) {
      return NextResponse.json(
        { error: 'Ungültiger Code. Bitte erneut versuchen.' },
        { status: 400 }
      )
    }

    // Enable 2FA
    const { error: updateError } = await supabase
      .from('user_2fa')
      .update({
        enabled: true,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', session.user.id)

    if (updateError) {
      return dbError('2fa-verify', updateError)
    }

    return NextResponse.json({
      success: true,
      message: '2FA erfolgreich aktiviert.',
    })
  } catch {
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
