import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { saveSubscription } from '@/lib/push'

/**
 * POST /api/push/subscribe
 * Save a push subscription for the authenticated user.
 * Body: { endpoint: string, p256dh: string, auth: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Ungueltiger JSON-Body' }, { status: 400 })
    }
    const { endpoint, p256dh, auth } = body as Record<string, unknown>

    if (!endpoint || typeof endpoint !== 'string' || endpoint.length > 2000) {
      return NextResponse.json({ error: 'endpoint ist erforderlich (max. 2000 Zeichen)' }, { status: 400 })
    }

    if (!p256dh || typeof p256dh !== 'string' || p256dh.length > 500) {
      return NextResponse.json({ error: 'p256dh ist erforderlich (max. 500 Zeichen)' }, { status: 400 })
    }

    if (!auth || typeof auth !== 'string' || auth.length > 500) {
      return NextResponse.json({ error: 'auth ist erforderlich (max. 500 Zeichen)' }, { status: 400 })
    }

    await saveSubscription(session.user.id, { endpoint, p256dh, auth })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[push-subscribe]', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
