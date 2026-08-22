import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createNotification } from '@/lib/notifications'

/**
 * Status einer Miet-/Besichtigungsanfrage ändern.
 *
 * Wer darf was:
 *   Vermieter (recipient) : accepted | declined
 *   Anfragender (requester): withdrawn
 *
 * Jede Änderung benachrichtigt die jeweils andere Seite — ohne das bliebe der
 * Anfragende bei „open" hängen und würde nie erfahren, dass zugesagt wurde.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const patchSchema = z.object({
  status: z.enum(['accepted', 'declined', 'withdrawn']),
})

interface RequestRow {
  id: string
  requester_id: string
  recipient_id: string | null
  equipment_id: string | null
  request_type: string
  preferred_date: string
  status: string
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Anfrage nicht gefunden' }, { status: 404 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültiger Status', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }
    const nextStatus = parsed.data.status

    const supabase = getSupabaseAdmin()
    const { data: rows, error: loadError } = await supabase
      .from('rental_requests')
      .select('id, requester_id, recipient_id, equipment_id, request_type, preferred_date, status')
      .eq('id', id)
      .limit(1)

    if (loadError) {
      console.error('rental-request load failed:', loadError)
      return NextResponse.json({ error: 'Anfrage konnte nicht geladen werden' }, { status: 500 })
    }

    const request = rows?.[0] as RequestRow | undefined
    if (!request) {
      return NextResponse.json({ error: 'Anfrage nicht gefunden' }, { status: 404 })
    }

    const isRecipient = request.recipient_id === session.user.id
    const isRequester = request.requester_id === session.user.id
    if (!isRecipient && !isRequester) {
      return NextResponse.json({ error: 'Kein Zugriff auf diese Anfrage' }, { status: 403 })
    }
    if (nextStatus === 'withdrawn' ? !isRequester : !isRecipient) {
      return NextResponse.json(
        { error: 'Für diesen Statuswechsel fehlt dir die Berechtigung' },
        { status: 403 },
      )
    }
    if (request.status !== 'open') {
      return NextResponse.json(
        { error: `Anfrage ist bereits „${request.status}" — Status nicht mehr änderbar` },
        { status: 409 },
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('rental_requests')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError || !updated) {
      console.error('rental-request update failed:', updateError)
      return NextResponse.json({ error: 'Status konnte nicht geändert werden' }, { status: 500 })
    }

    const kind = request.request_type === 'besichtigung' ? 'Besichtigungsanfrage' : 'Mietanfrage'
    if (nextStatus === 'withdrawn') {
      if (request.recipient_id) {
        await createNotification(
          request.recipient_id,
          `${kind} zurückgezogen`,
          `Die ${kind} für den ${request.preferred_date} wurde zurückgezogen.`,
          'message',
          request.id,
          'rental_request',
        )
      }
    } else {
      const accepted = nextStatus === 'accepted'
      await createNotification(
        request.requester_id,
        accepted ? `${kind} bestätigt` : `${kind} abgelehnt`,
        accepted
          ? `Deine ${kind} für den ${request.preferred_date} wurde bestätigt.`
          : `Deine ${kind} für den ${request.preferred_date} wurde leider abgelehnt.`,
        accepted ? 'booking' : 'message',
        request.id,
        'rental_request',
      )
    }

    return NextResponse.json({ request: updated })
  } catch (err) {
    console.error('rental-request PATCH error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
