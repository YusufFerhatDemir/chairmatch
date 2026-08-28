import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { MAX_ABOS_PRO_KONTO, saveSubscription } from '@/lib/push'
import { MAX_ENDPOINT_LAENGE } from '@/lib/push-endpoint'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

/**
 * POST /api/push/subscribe
 * Speichert ein Push-Abonnement fuer das angemeldete Konto.
 * Body: { endpoint: string, p256dh: string, auth: string }
 *
 * Der `endpoint` ist eine URL, die der Server spaeter selbst abruft. Was hier
 * durchgeht, bestimmt also ein Ziel fuer eine ausgehende Anfrage aus unserem
 * Netz — die Pruefung steht in src/lib/push-endpoint.ts.
 */
const RATE = { scope: 'push-subscribe', max: 10, windowMs: 60 * 60 * 1000 }

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Je Konto, nicht je IP: die Route ist angemeldet, das Konto ist die
    // teurere Kennung.
    const limit = checkRateLimit(session.user.id, RATE)
    if (limit.limited) {
      return rateLimitResponse(limit, 'Zu viele Anmeldungen.')
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Ungueltiger JSON-Body' }, { status: 400 })
    }
    const { endpoint, p256dh, auth } = body as Record<string, unknown>

    if (!endpoint || typeof endpoint !== 'string' || endpoint.length > MAX_ENDPOINT_LAENGE) {
      return NextResponse.json(
        { error: `endpoint ist erforderlich (max. ${MAX_ENDPOINT_LAENGE} Zeichen)` },
        { status: 400 },
      )
    }

    if (!p256dh || typeof p256dh !== 'string' || p256dh.length > 500) {
      return NextResponse.json({ error: 'p256dh ist erforderlich (max. 500 Zeichen)' }, { status: 400 })
    }

    if (!auth || typeof auth !== 'string' || auth.length > 500) {
      return NextResponse.json({ error: 'auth ist erforderlich (max. 500 Zeichen)' }, { status: 400 })
    }

    const ergebnis = await saveSubscription(session.user.id, { endpoint, p256dh, auth })

    if (!ergebnis.ok) {
      switch (ergebnis.grund) {
        case 'endpoint_ungueltig':
          return NextResponse.json(
            { error: 'endpoint ist kein Push-Endpunkt eines bekannten Dienstes' },
            { status: 400 },
          )
        case 'fremdes_abo':
          // Kein 200. Ein Endpunkt gehoert zu genau einem Geraet; wer ihn
          // beansprucht, obwohl er auf einem anderen Konto liegt, bekommt ihn
          // nicht umgehaengt.
          return NextResponse.json(
            { error: 'Dieser Endpunkt ist bereits einem anderen Konto zugeordnet' },
            { status: 409 },
          )
        case 'limit':
          return NextResponse.json(
            { error: `Maximal ${MAX_ABOS_PRO_KONTO} Geraete pro Konto` },
            { status: 409 },
          )
        default:
          console.error('[push-subscribe]', ergebnis.detail)
          return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, created: ergebnis.angelegt })
  } catch (err) {
    console.error('[push-subscribe]', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
