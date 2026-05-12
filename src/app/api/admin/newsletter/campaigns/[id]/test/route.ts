import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/modules/auth/session'
import { sendTestEmail, isResendActive } from '@/lib/newsletter-sender'

/**
 * POST /api/admin/newsletter/campaigns/[id]/test
 * Body: { email }
 *
 * Sendet eine [TEST]-Variante der Kampagne an die angegebene E-Mail.
 */

const schema = z.object({ email: z.string().email() })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(['admin', 'super_admin'])
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Keine Kampagnen-ID' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Ungültige E-Mail' }, { status: 400 })

  const result = await sendTestEmail(id, parsed.data.email)
  return NextResponse.json({ ...result, resendActive: isResendActive() })
}
