import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/modules/auth/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createRefund } from '@/lib/stripe'

/**
 * Admin Refund endpoint.
 * POST /api/admin/refund  { "transaction_id": "<uuid>" }
 *
 * Hat die Transaktion einen stripe_payment_intent_id, wird ein ECHTER
 * Stripe-Refund ausgelöst; der Webhook (charge.refunded) markiert dann
 * payments/rental_bookings/platform_transactions als refunded.
 * Ohne Payment-Intent (Alt-/Testdaten) wird nur der Status gesetzt.
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
    .select('id, status, type, amount_cents, platform_fee_cents, provider_user_id, customer_user_id, stripe_payment_intent_id, stripe_transfer_id, rental_id')
    .eq('id', txId)
    .single()

  if (findErr || !existing) {
    return NextResponse.json({ error: 'Transaktion nicht gefunden' }, { status: 404 })
  }

  if (existing.status === 'refunded') {
    return NextResponse.json({ error: 'Transaktion wurde bereits refunded' }, { status: 409 })
  }

  // Bereits an den Anbieter transferiert? Dann ist ein einfacher Refund nicht
  // mehr korrekt (Geld liegt beim Connect-Account) — manueller Reversal-Fall.
  if (existing.stripe_transfer_id) {
    return NextResponse.json(
      {
        error:
          'Auszahlung an Anbieter ist bereits erfolgt (Transfer existiert). ' +
          'Bitte Transfer-Reversal manuell im Stripe-Dashboard prüfen.',
        transfer_id: existing.stripe_transfer_id,
      },
      { status: 409 },
    )
  }

  // Echter Stripe-Refund, wenn ein Payment-Intent vorhanden ist
  let stripeRefundId: string | null = null
  if (existing.stripe_payment_intent_id) {
    try {
      const refund = await createRefund(existing.stripe_payment_intent_id)
      stripeRefundId = refund.id
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json(
        { error: `Stripe-Refund fehlgeschlagen: ${msg}` },
        { status: 502 },
      )
    }
  }

  // Status auf 'refunded' setzen (Webhook charge.refunded zieht payments/rental nach)
  const { error: updErr } = await supabase
    .from('platform_transactions')
    .update({ status: 'refunded' })
    .eq('id', txId)

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  // Zugehörige Miet-Buchung direkt mitziehen (nicht auf Webhook-Latenz warten)
  if (existing.rental_id) {
    await supabase
      .from('rental_bookings')
      .update({
        status: 'cancelled',
        payment_status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.rental_id)
  }

  // Audit-Log — Schema nutzt entity/entity_id/details (NICHT resource_*/metadata;
  // der alte Insert schlug still fehl, weil supabase-js Fehler zurückgibt statt wirft).
  const adminUserId = (session.user as { id?: string }).id
  const { error: auditErr } = await supabase.from('audit_logs').insert({
    user_id: adminUserId ?? null,
    action: 'refund.created',
    entity: 'platform_transaction',
    entity_id: txId,
    details: {
      previous_status: existing.status,
      amount_cents: existing.amount_cents,
      platform_fee_cents: existing.platform_fee_cents,
      type: existing.type,
      stripe_refund_id: stripeRefundId,
    },
  })
  if (auditErr) console.error('refund audit_logs insert failed:', auditErr.message)

  return NextResponse.json({
    success: true,
    transaction_id: txId,
    previous_status: existing.status,
    new_status: 'refunded',
    stripe_refund_id: stripeRefundId,
    note: stripeRefundId
      ? 'Stripe-Refund ausgelöst — Webhook bestätigt die Rückerstattung.'
      : 'Kein Payment-Intent vorhanden — nur interner Status gesetzt.',
  })
}
