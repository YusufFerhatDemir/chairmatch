import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { sendPushNotification } from '@/lib/push'

/**
 * POST /api/push/send
 * Send a push notification to a user (admin only).
 * Body: { userId: string, title: string, body: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Admin-only check
    const role = (session.user as { role?: string }).role
    if (!role || !['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Ungueltiger JSON-Body' }, { status: 400 })
    }
    const { userId, title, body: notificationBody } = body as Record<string, unknown>

    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!userId || typeof userId !== 'string' || !UUID.test(userId)) {
      return NextResponse.json({ error: 'userId ist erforderlich (UUID)' }, { status: 400 })
    }

    if (!title || typeof title !== 'string' || title.length > 200) {
      return NextResponse.json({ error: 'title ist erforderlich (max. 200 Zeichen)' }, { status: 400 })
    }

    if (!notificationBody || typeof notificationBody !== 'string' || notificationBody.length > 2000) {
      return NextResponse.json({ error: 'body ist erforderlich (max. 2000 Zeichen)' }, { status: 400 })
    }

    const result = await sendPushNotification(userId, title, notificationBody)

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
    })
  } catch (err) {
    console.error('[push-send]', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
