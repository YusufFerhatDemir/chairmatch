import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { sendPushNotification } from '@/lib/push'

/**
 * POST /api/push/send
 * Schickt eine Push-Benachrichtigung an ein Konto (nur Admin).
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

    // Ein Konfigurationsfehler ist kein Teilergebnis: dann ist NICHTS
    // rausgegangen und wird auch mit Wiederholen nicht rausgehen. Vorher
    // antwortete die Route auf jeden Verlauf mit `success: true` — auch auf
    // „null zugestellt, null versucht".
    if (result.konfigurationsfehler) {
      return NextResponse.json(
        { success: false, error: 'Push ist nicht einsatzbereit (VAPID)', ...result },
        { status: 503 },
      )
    }

    return NextResponse.json({
      // Ehrlich heisst hier: zugestellt ist zugestellt. Ein Konto ohne
      // angemeldetes Geraet ergibt `sent: 0` — und dann ist `success: false`
      // die richtige Auskunft, nicht „gesendet".
      success: result.sent > 0,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
    })
  } catch (err) {
    console.error('[push-send]', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
