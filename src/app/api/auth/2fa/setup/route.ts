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
 */
export async function POST(req: NextRequest) {
  try {
    const limit = checkRateLimit(clientIp(req), RATE)
    if (limit.limited) return rateLimitResponse(limit, 'Zu viele Anfragen. Bitte spaeter erneut versuchen.')

    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
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
