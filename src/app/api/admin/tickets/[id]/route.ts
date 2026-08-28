import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { dbError } from '@/lib/api-wrapper'
import { getServerSession } from '@/modules/auth/session'
import { isUuid } from '@/lib/uuid'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession()
  const role = (session?.user as { role?: string })?.role
  if (!['admin', 'super_admin'].includes(role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Ungültige Ticket-ID' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const status = body.status
  const admin_notes = body.admin_notes

  // Bis Track 19 wurde ein unbekannter Status wortlos verworfen: die Route
  // schrieb nur `updated_at` und antwortete `{ ok: true }`. Der Admin sah eine
  // erfolgreiche Aenderung und das Ticket stand unveraendert da — dieselbe
  // Bauart wie die stillen Fehlschlaege aus Track 6/7. Ein unbekannter Wert
  // ist jetzt eine 400, und eine Anfrage ganz ohne Feld auch: `ok: true` soll
  // heissen, dass etwas passiert ist.
  const ALLOWED_STATUS = ['OPEN', 'IN_PROGRESS', 'SUBMITTED', 'DONE']
  if (status !== undefined && !ALLOWED_STATUS.includes(status)) {
    return NextResponse.json(
      { error: `status muss einer von ${ALLOWED_STATUS.join(', ')} sein` },
      { status: 400 },
    )
  }
  if (admin_notes !== undefined && typeof admin_notes !== 'string') {
    return NextResponse.json({ error: 'admin_notes muss Text sein' }, { status: 400 })
  }
  if (status === undefined && admin_notes === undefined) {
    return NextResponse.json({ error: 'Keine Änderungen übermittelt' }, { status: 400 })
  }

  const updates: { status?: string; admin_notes?: string; updated_at?: string } = { updated_at: new Date().toISOString() }
  if (typeof status === 'string') updates.status = status
  if (typeof admin_notes === 'string') updates.admin_notes = admin_notes.slice(0, 2000)

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('submission_tickets')
    .update(updates)
    .eq('id', id)

  if (error) return dbError('admin-ticket-PATCH', error)
  return NextResponse.json({ ok: true })
}
