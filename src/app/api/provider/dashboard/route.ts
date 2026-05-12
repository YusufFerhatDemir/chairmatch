import { NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { DashboardResponse, DashboardTransaction } from '@/modules/provider/dashboard.types'

// Re-export für Backwards-Compat (alte Importer)
export type { DashboardResponse, DashboardTransaction }

function emptyDashboard(stripeConnected = false): DashboardResponse {
  return {
    earnings: { today: 0, month: 0, total: 0, currency: 'EUR' },
    pending: 0,
    transactions: [],
    payoutSchedule: stripeConnected
      ? 'Tägliche Auszahlung über Stripe Connect'
      : 'Stripe noch nicht aktiv',
    stripeConnected,
  }
}

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const userId = session.user.id

    // Stripe Connect aktiv?
    const { data: stripeAccount } = await supabase
      .from('provider_stripe_accounts')
      .select('charges_enabled, payouts_enabled')
      .eq('user_id', userId)
      .maybeSingle()

    const stripeConnected = Boolean(
      stripeAccount?.charges_enabled && stripeAccount?.payouts_enabled,
    )

    // Transaktionen laden — wenn Tabelle leer oder keine, Mock zurückgeben
    const { data: txs, error: txError } = await supabase
      .from('platform_transactions')
      .select('id, type, amount_cents, platform_fee_cents, provider_share_cents, currency, status, created_at')
      .eq('provider_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (txError || !txs || txs.length === 0) {
      return NextResponse.json(emptyDashboard(stripeConnected))
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    let todayCents = 0
    let monthCents = 0
    let totalCents = 0
    let pendingCents = 0

    const transactions: DashboardTransaction[] = txs.map((t) => {
      const createdAt = new Date(t.created_at).getTime()
      const share = t.provider_share_cents ?? 0

      if (t.status === 'succeeded') {
        totalCents += share
        if (createdAt >= startOfMonth) monthCents += share
        if (createdAt >= startOfDay) todayCents += share
      } else if (t.status === 'pending') {
        pendingCents += share
      }

      return {
        id: t.id,
        type: t.type,
        amountCents: t.amount_cents,
        platformFeeCents: t.platform_fee_cents,
        providerShareCents: t.provider_share_cents,
        currency: (t.currency ?? 'eur').toUpperCase(),
        status: t.status,
        createdAt: t.created_at,
      }
    })

    const response: DashboardResponse = {
      earnings: {
        today: todayCents / 100,
        month: monthCents / 100,
        total: totalCents / 100,
        currency: 'EUR',
      },
      pending: pendingCents / 100,
      transactions,
      payoutSchedule: stripeConnected
        ? 'Tägliche Auszahlung über Stripe Connect'
        : 'Stripe noch nicht aktiv',
      stripeConnected,
    }

    return NextResponse.json(response)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
