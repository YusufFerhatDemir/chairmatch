import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { replyToReview } from '@/modules/reviews/review.actions'

/**
 * POST /api/reviews/[id]/reply — Antwort des Saloninhabers.
 *
 * Die Autorisierung steht bewusst in `replyToReview` und nicht hier: die
 * Action ist als Server Action ohnehin direkt aufrufbar, eine zweite Pruefung
 * an dieser Stelle waere die, die irgendwann auseinanderlaeuft (siehe
 * chairmatch-authz-lives-in-actions). Was hier fehlte, war der STATUS: die
 * Route machte aus jedem Fehlschlag eine 400 — auch aus „nicht angemeldet"
 * und „keine Berechtigung". Die frueh gezogene Session-Pruefung spart
 * ausserdem die DB-Abfrage fuer einen anonymen Aufruf.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
    }

    const reply = (body as { reply?: unknown } | null)?.reply
    const result = await replyToReview({ reviewId: id, reply })

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: (result as { status?: number }).status ?? 400 },
      )
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
