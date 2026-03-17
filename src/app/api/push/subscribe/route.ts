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

    const body = await req.json()
    const { endpoint, p256dh, auth } = body

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ error: 'endpoint ist erforderlich' }, { status: 400 })
    }

    if (!p256dh || typeof p256dh !== 'string') {
      return NextResponse.json({ error: 'p256dh ist erforderlich' }, { status: 400 })
    }

    if (!auth || typeof auth !== 'string') {
      return NextResponse.json({ error: 'auth ist erforderlich' }, { status: 400 })
    }

    await saveSubscription(session.user.id, { endpoint, p256dh, auth })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Interner Serverfehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
