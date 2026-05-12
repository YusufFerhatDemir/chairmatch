export const dynamic = 'force-dynamic'

import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/provider/DashboardClient'
import type { DashboardResponse, DashboardTransaction } from '@/modules/provider/dashboard.types'

export default async function ProviderDashboardPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect('/auth')

  const supabase = getSupabaseAdmin()
  const userId = session.user.id

  // ── Stripe Connect Status ──────────────────────────────
  const { data: stripeAccount } = await supabase
    .from('provider_stripe_accounts')
    .select('charges_enabled, payouts_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  const stripeConnected = Boolean(
    stripeAccount?.charges_enabled && stripeAccount?.payouts_enabled,
  )

  // ── Salon (für Subscription-Tier) ──────────────────────
  const { data: salon } = await supabase
    .from('salons')
    .select('id, name, subscription_tier')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle()

  // ── Transaktionen laden ────────────────────────────────
  const { data: txs } = await supabase
    .from('platform_transactions')
    .select('id, type, amount_cents, platform_fee_cents, provider_share_cents, currency, status, created_at')
    .eq('provider_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

  let todayCents = 0
  let monthCents = 0
  let totalCents = 0
  let pendingCents = 0

  const transactions: DashboardTransaction[] = (txs ?? []).map((t): DashboardTransaction => {
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
      type: t.type as DashboardTransaction['type'],
      amountCents: t.amount_cents ?? 0,
      platformFeeCents: t.platform_fee_cents ?? 0,
      providerShareCents: t.provider_share_cents ?? 0,
      currency: (t.currency ?? 'eur').toUpperCase(),
      status: t.status as DashboardTransaction['status'],
      createdAt: t.created_at,
    }
  })

  const dashboard: DashboardResponse = {
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

  return (
    <DashboardClient
      data={dashboard}
      subscriptionTier={(salon?.subscription_tier as 'starter' | 'premium' | 'gold' | null) ?? null}
      salonName={salon?.name ?? null}
    />
  )
}
