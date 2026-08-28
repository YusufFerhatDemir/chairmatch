import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createConnectAccount, createConnectAccountLink } from '@/lib/stripe'
import { isProviderOrAbove, isBusinessOwnerOrAbove } from '@/lib/rbac'
import { appOriginFromRequest } from '@/lib/app-origin'
import { stripeUnavailable } from '@/lib/stripe-availability'

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
    // Kein Schluessel → kein Connect-Account. Ohne diesen Riegel wirft
    // `createConnectAccount` und der Anbieter liest „Interner Fehler".
    const nichtVerfuegbar = stripeUnavailable()
    if (nichtVerfuegbar) return nichtVerfuegbar

    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    if (!hasProviderRole(session)) {
      return NextResponse.json({ error: 'Nur für Anbieter verfügbar' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()
    const userId = session.user.id

    // Bestehenden Connect-Account wiederverwenden.
    //
    // Vorher `.maybeSingle()`, und der Fehler daneben wurde nicht angesehen.
    // Zwei Dinge steckten darin:
    //
    //  1. Gibt es zu einem Anbieter MEHRERE Zeilen, antwortet PostgREST mit
    //     PGRST116 und `data: null`. Fuer den Code sah das aus wie „noch kein
    //     Account" — er legte bei Stripe einen WEITEREN Express-Account an,
    //     bei jedem Aufruf erneut. Und der Payout-Cron las dieselbe Tabelle
    //     mit demselben `.maybeSingle()`, bekam denselben Fehler und
    //     ueberwies diesem Anbieter ab da nichts mehr.
    //  2. Ein echter Lesefehler (Datenbank kurz weg) fuehrte zum selben
    //     Ergebnis: neuer Stripe-Account statt Wiederverwendung.
    //
    // Zwei Zeilen entstehen ganz ohne Zutun — zwei parallele Klicks auf
    // „Stripe verbinden". Der UNIQUE-Index dagegen
    // (`uq_provider_stripe_user`) steht in Migration
    // 20260705_rental_booking_constraints.sql; ob sie live angewendet ist,
    // laesst sich von hier nicht pruefen. Deshalb faellt der Riegel jetzt im
    // Code: Lesefehler und Mehrdeutigkeit fuehren zu KEINEM neuen Account.
    const { data: vorhandene, error: leseFehler } = await supabase
      .from('provider_stripe_accounts')
      .select('stripe_account_id, payouts_enabled, details_submitted')
      .eq('user_id', userId)
      .limit(2)

    if (leseFehler) {
      console.error('provider_stripe_accounts lookup failed:', leseFehler)
      return NextResponse.json(
        { error: 'Stripe-Konto konnte nicht geprüft werden. Bitte später erneut versuchen.' },
        { status: 503 },
      )
    }
    if (vorhandene && vorhandene.length > 1) {
      console.error(`provider_stripe_accounts: ${vorhandene.length}+ Zeilen fuer ${userId}`)
      return NextResponse.json(
        {
          error:
            'Für dieses Konto sind mehrere Stripe-Konten hinterlegt. Bitte wende dich an den Support — es wird kein weiteres angelegt.',
        },
        { status: 409 },
      )
    }

    const existing = vorhandene?.[0]
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

    const origin = appOriginFromRequest(req)
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
    const { data: zeilen, error } = await supabase
      .from('provider_stripe_accounts')
      .select('stripe_account_id, charges_enabled, payouts_enabled, details_submitted, onboarding_completed_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })
      .limit(2)

    if (error) {
      // Nicht „nicht verbunden" melden, wenn wir es schlicht nicht wissen —
      // sonst bietet die Oberflaeche ein Onboarding an, das ein zweites
      // Konto anlegen wuerde.
      console.error('Connect-Status nicht lesbar:', error)
      return NextResponse.json({ error: 'Status konnte nicht geladen werden' }, { status: 503 })
    }

    const data = zeilen?.[0]
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
