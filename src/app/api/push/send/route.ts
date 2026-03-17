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

    const body = await req.json()
    const { userId, title, body: notificationBody } = body

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId ist erforderlich' }, { status: 400 })
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title ist erforderlich' }, { status: 400 })
    }

    if (!notificationBody || typeof notificationBody !== 'string') {
      return NextResponse.json({ error: 'body ist erforderlich' }, { status: 400 })
    }

    const result = await sendPushNotification(userId, title, notificationBody)

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Interner Serverfehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
