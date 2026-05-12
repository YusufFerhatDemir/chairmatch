import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/modules/auth/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * Admin Refund endpoint.
 * POST /api/admin/refund  { "transaction_id": "<uuid>" }
 *
 * Phase 1 (kein Stripe-Live):
 *   - Setzt platform_transactions.status auf 'refunded'
 *   - Schreibt Audit-Eintrag (best effort)
 *
 * Phase 2 (Stripe-Live):
 *   - Hier später Stripe.refunds.create() integrieren
 */
async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role
  if (!['admin', 'super_admin'].includes(role || '')) {
    return null
  }
  return session
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { transaction_id?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const txId = body.transaction_id
  if (!txId || typeof txId !== 'string') {
    return NextResponse.json({ error: 'transaction_id erforderlich' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Bestehende Transaktion holen
  const { data: existing, error: findErr } = await supabase
    .from('platform_transactions')
    .select('id, status, type, amount_cents, platform_fee_cents, provider_user_id, customer_user_id')
    .eq('id', txId)
    .single()

  if (findErr || !existing) {
    return NextResponse.json({ error: 'Transaktion nicht gefunden' }, { status: 404 })
  }

  if (existing.status === 'refunded') {
    return NextResponse.json({ error: 'Transaktion wurde bereits refunded' }, { status: 409 })
  }

  // Status auf 'refunded' setzen
  const { error: updErr } = await supabase
    .from('platform_transactions')
    .update({ status: 'refunded' })
    .eq('id', txId)

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  // Audit-Log (best effort, falls Tabelle existiert)
  try {
    const adminUserId = (session.user as { id?: string }).id
    await supabase.from('audit_logs').insert({
      user_id: adminUserId,
      action: 'refund.created',
      resource_type: 'platform_transaction',
      resource_id: txId,
      metadata: {
        previous_status: existing.status,
        amount_cents: existing.amount_cents,
        platform_fee_cents: existing.platform_fee_cents,
        type: existing.type,
      },
    })
  } catch {
    // audit_logs evtl. nicht vorhanden — best-effort
  }

  return NextResponse.json({
    success: true,
    transaction_id: txId,
    previous_status: existing.status,
    new_status: 'refunded',
    note: 'Stripe-Refund wird mit Stripe-Live in Phase 2 integriert.',
  })
}
