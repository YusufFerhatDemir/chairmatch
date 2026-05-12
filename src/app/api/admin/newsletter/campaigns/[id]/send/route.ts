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
  return NextResponse.json({
    ...result,
    resendActive: isResendActive(),
  })
}
