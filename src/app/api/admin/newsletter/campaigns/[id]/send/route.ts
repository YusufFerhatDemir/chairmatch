import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/modules/auth/session'
import { sendCampaign, isResendActive } from '@/lib/newsletter-sender'

/**
 * POST /api/admin/newsletter/campaigns/[id]/send
 * Startet den Bulk-Versand der Kampagne.
 *
 * Hinweis: Bei sehr großen Listen blockiert das den Request — für Prod
 * sollte das in einen Background-Job / Edge-Function ausgelagert werden.
 * Für die aktuelle Größenordnung (< 5000 Empfänger) ist das OK.
 */

export const maxDuration = 300 // 5 Minuten (für Vercel Pro)

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(['admin', 'super_admin'])
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Keine Kampagnen-ID' }, { status: 400 })

  const result = await sendCampaign(id)
  // Ein zweiter Klick auf „Senden" ist ein Konflikt, kein Erfolg. Bis Track
  // 20 antwortete auch der abgelehnte Lauf mit 200 — die Oberflaeche konnte
  // gar nicht unterscheiden, ob gerade verschickt wurde oder nicht.
  const status =
    result.code === 'not_found' ? 404 : result.code === 'already_running' ? 409 : result.code === 'failed' ? 500 : 200
  return NextResponse.json(
    {
      ...result,
      resendActive: isResendActive(),
    },
    { status },
  )
}
