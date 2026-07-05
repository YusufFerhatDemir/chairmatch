import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createConnectAccount, createConnectAccountLink } from '@/lib/stripe'
import { isProviderOrAbove, isBusinessOwnerOrAbove } from '@/lib/rbac'

/**
 * Stripe Connect Onboarding für Anbieter (Vermieter).
 *
 * POST: legt (einmalig) einen Express-Account an und liefert den
 *       Stripe-hosted Onboarding-Link. Bei bestehendem, unfertigem
 *       Account wird ein frischer Link erzeugt (Links sind kurzlebig).
 * GET:  liefert den Connect-Status (charges/payouts/onboarding).
 *
 * Status-Updates (charges_enabled etc.) kommen über den Webhook
 * ('account.updated') — nicht über diese Route.
 */

function hasProviderRole(session: { user?: unknown } | null): boolean {
  const role = (session?.user as { role?: string } | undefined)?.role || ''
  return isProviderOrAbove(role) || isBusinessOwnerOrAbove(role)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    if (!hasProviderRole(session)) {
      return NextResponse.json({ error: 'Nur für Anbieter verfügbar' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()
    const userId = session.user.id

    // Bestehenden Connect-Account wiederverwenden
    const { data: existing } = await supabase
      .from('provider_stripe_accounts')
      .select('stripe_account_id, payouts_enabled, details_submitted')
      .eq('user_id', userId)
      .maybeSingle()

    let accountId = existing?.stripe_account_id

    if (!accountId) {
      const account = await createConnectAccount({
        email: session.user.email || '',
        userId,
      })
      accountId = account.id

      const { error: insError } = await supabase.from('provider_stripe_accounts').insert({
        user_id: userId,
        stripe_account_id: accountId,
        account_type: 'express',
      })
      if (insError) {
        console.error('provider_stripe_accounts insert failed:', insError)
        return NextResponse.json({ error: 'Account konnte nicht gespeichert werden' }, { status: 500 })
      }
    } else if (existing?.payouts_enabled && existing?.details_submitted) {
      return NextResponse.json({
        alreadyOnboarded: true,
        message: 'Stripe-Konto ist bereits vollständig eingerichtet.',
      })
    }

    const origin = req.headers.get('origin') || 'https://www.chairmatch.de'
    const link = await createConnectAccountLink({
      accountId,
      refreshUrl: `${origin}/provider?stripe=refresh`,
      returnUrl: `${origin}/provider?stripe=onboarded`,
    })

    return NextResponse.json({ url: link.url })
  } catch (err) {
    console.error('Stripe connect error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('provider_stripe_accounts')
      .select('stripe_account_id, charges_enabled, payouts_enabled, details_submitted, onboarding_completed_at')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (!data) {
      return NextResponse.json({ connected: false, onboarded: false })
    }

    return NextResponse.json({
      connected: true,
      onboarded: !!(data.charges_enabled && data.payouts_enabled),
      chargesEnabled: !!data.charges_enabled,
      payoutsEnabled: !!data.payouts_enabled,
      detailsSubmitted: !!data.details_submitted,
      onboardingCompletedAt: data.onboarding_completed_at,
    })
  } catch (err) {
    console.error('Stripe connect status error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
