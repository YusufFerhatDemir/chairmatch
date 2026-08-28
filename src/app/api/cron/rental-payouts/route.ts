import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { getStripe, isStripeConfigured } from '@/lib/stripe'

// Zombie-Pendings freigeben. Regulär erledigt das der
// checkout.session.expired-Webhook nach 30 Min — dieser Fallback greift,
// falls der Webhook nicht zugestellt wurde. Ohne Cleanup blockiert eine
// nie bezahlte pending-Buchung den Zeitraum dauerhaft (EXCLUDE-Constraint).
// Braucht nur Supabase, kein Stripe — läuft deshalb auch ohne STRIPE_SECRET_KEY.
async function cleanupStalePendings(
  supabase: ReturnType<typeof getSupabaseAdmin>,
): Promise<{ expiredPendings: number; cleanupError?: string }> {
  const staleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: expired, error } = await supabase
    .from('rental_bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('status', 'pending')
    .in('payment_status', ['unpaid', 'pending'])
    .lt('created_at', staleCutoff)
    .select('id')
  if (error) return { expiredPendings: 0, cleanupError: `pending-cleanup fehlgeschlagen: ${error.message}` }
  return { expiredPendings: expired?.length ?? 0 }
}

/**
 * Cron: Rental-Payouts (Escrow-Modell)
 *
 * Bezahlte Miet-Transaktionen werden NICHT sofort an den Anbieter transferiert,
 * sondern erst wenn der Mietbeginn erreicht ist — das schützt Mieter bei
 * No-Show/Storno vor Mietantritt. Der Cron läuft täglich und transferiert
 * provider_share_cents an den Stripe-Connect-Account des Anbieters.
 *
 * Voraussetzungen pro Transaktion:
 *  - type chair_rental | opraum_rental, status 'succeeded', kein stripe_transfer_id
 *  - rental_bookings.start_date <= heute, Buchung nicht storniert
 *  - Anbieter hat Connect-Account mit payouts_enabled
 *
 * Vercel Cron: vercel.json "crons": [{ "path": "/api/cron/rental-payouts", "schedule": "0 4 * * *" }]
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const today = new Date().toISOString().slice(0, 10)

  // Ohne STRIPE_SECRET_KEY sind keine Transfers möglich — kontrolliert mit 503
  // antworten (Cron bleibt im Vercel-Dashboard als fehlgeschlagen sichtbar)
  // statt mit unhandled Exception zu crashen. Der Pending-Cleanup läuft trotzdem.
  if (!isStripeConfigured()) {
    const cleanup = await cleanupStalePendings(supabase)
    console.error('[cron/rental-payouts] STRIPE_SECRET_KEY fehlt — Payouts übersprungen, Cleanup ausgeführt')
    return NextResponse.json(
      {
        ok: false,
        date: today,
        error: 'STRIPE_SECRET_KEY ist nicht konfiguriert (Vercel → Settings → Environment Variables) — Payouts übersprungen',
        expiredPendings: cleanup.expiredPendings,
        errors: cleanup.cleanupError ? [cleanup.cleanupError] : [],
      },
      { status: 503 },
    )
  }

  // Fällige, noch nicht transferierte Miet-Transaktionen
  const { data: txs, error } = await supabase
    .from('platform_transactions')
    .select('id, provider_share_cents, stripe_payment_intent_id, provider_user_id, rental_id')
    .in('type', ['chair_rental', 'opraum_rental'])
    .eq('status', 'succeeded')
    .is('stripe_transfer_id', null)
    .not('provider_user_id', 'is', null)
    .not('stripe_payment_intent_id', 'is', null)
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const stripe = getStripe()
  let transferred = 0
  let skipped = 0
  const errors: string[] = []

  for (const tx of txs ?? []) {
    try {
      if (!tx.rental_id || tx.provider_share_cents <= 0) { skipped++; continue }

      // Mietbeginn erreicht? Buchung noch aktiv?
      const { data: rental } = await supabase
        .from('rental_bookings')
        .select('start_date, status, payment_status')
        .eq('id', tx.rental_id)
        .single()

      if (!rental || rental.start_date > today) { skipped++; continue }
      if (rental.status === 'cancelled' || rental.payment_status === 'refunded') { skipped++; continue }

      // Connect-Account des Anbieters (payouts aktiv?)
      //
      // Vorher `.maybeSingle()`. Das ist genau dann still falsch, wenn es zu
      // einem Anbieter MEHRERE Zeilen gibt: PostgREST antwortet dann mit
      // PGRST116, `data` ist null — und weil der Fehler nicht angesehen
      // wurde, sah das hier aus wie „kein Connect-Account" und der Anbieter
      // wurde ab da NIE wieder ausgezahlt, ohne dass irgendwo etwas stand.
      // Mehrere Zeilen sind kein Gedankenspiel: `/api/stripe/connect` legt
      // sie an (siehe dort), und der UNIQUE-Index dagegen liegt in einer
      // Migration, deren Live-Zustand von hier aus nicht pruefbar ist.
      const { data: accounts, error: accountError } = await supabase
        .from('provider_stripe_accounts')
        .select('stripe_account_id, payouts_enabled')
        .eq('user_id', tx.provider_user_id)
        .limit(2)

      if (accountError) {
        skipped++
        errors.push(`tx ${tx.id}: Connect-Account nicht lesbar: ${accountError.message}`)
        continue
      }
      if (accounts && accounts.length > 1) {
        // Auf welches der Konten? Das ist nicht zu raten, wenn Geld darauf
        // geht. Sichtbar machen, nicht zahlen.
        skipped++
        errors.push(
          `tx ${tx.id}: Anbieter ${tx.provider_user_id} hat ${accounts.length}+ Connect-Accounts — Auszahlung ausgesetzt`,
        )
        continue
      }
      const account = accounts?.[0]
      if (!account?.payouts_enabled || !account.stripe_account_id) { skipped++; continue }

      // Dedupe-Backstop: falls für dieselbe Miete bereits eine andere
      // Transaktion transferiert wurde (Re-Payment-Altfälle), nicht doppelt zahlen.
      const { data: alreadyPaid } = await supabase
        .from('platform_transactions')
        .select('id')
        .eq('rental_id', tx.rental_id)
        .not('stripe_transfer_id', 'is', null)
        .limit(1)
      if (alreadyPaid && alreadyPaid.length > 0) {
        skipped++
        errors.push(`tx ${tx.id}: rental ${tx.rental_id} bereits ausgezahlt (tx ${alreadyPaid[0].id}) — übersprungen`)
        continue
      }

      // Charge zur Zahlung ermitteln — Transfer mit source_transaction zieht
      // die Mittel direkt aus dieser Charge (keine Balance-Probleme).
      //
      // `expand: ['latest_charge']` liefert die Charge gleich mit, und mit
      // ihr die einzigen zwei Angaben, die wirklich beantworten, ob dieses
      // Geld noch da ist: `amount_refunded` und `disputed`. Bisher hat der
      // Cron ausschliesslich unsere eigenen Spalten gefragt
      // (`rental_bookings.status`, `payment_status`). Die sind aber nur so
      // gut wie das Ereignis, das sie zuletzt gesetzt hat: eine Rueckbuchung
      // wurde ueberhaupt nicht verarbeitet, und eine Teilerstattung setzt
      // sie seit Track 16 bewusst nicht mehr. In beiden Faellen haette die
      // Plattform Geld zurueckgegeben und den vollen Anbieteranteil trotzdem
      // ueberwiesen.
      const pi = await stripe.paymentIntents.retrieve(tx.stripe_payment_intent_id, {
        expand: ['latest_charge'],
      })
      const charge =
        pi.latest_charge && typeof pi.latest_charge === 'object'
          ? (pi.latest_charge as { id?: string; amount_refunded?: number; refunded?: boolean; disputed?: boolean })
          : null
      const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : charge?.id
      if (!chargeId) { skipped++; continue }

      if (charge && (charge.refunded === true || (charge.amount_refunded ?? 0) > 0)) {
        skipped++
        errors.push(
          `tx ${tx.id}: Charge ${chargeId} ist (teil-)erstattet (${charge.amount_refunded ?? 0} Cent) — Auszahlung ausgesetzt`,
        )
        continue
      }
      if (charge?.disputed === true) {
        skipped++
        errors.push(`tx ${tx.id}: Charge ${chargeId} ist angefochten (Chargeback) — Auszahlung ausgesetzt`)
        continue
      }

      // Idempotency-Key: schlägt das DB-Update nach dem Transfer fehl, erzeugt
      // der nächste Cron-Lauf KEINEN zweiten Transfer, sondern bekommt denselben.
      const transfer = await stripe.transfers.create(
        {
          amount: tx.provider_share_cents,
          currency: 'eur',
          destination: account.stripe_account_id,
          source_transaction: chargeId,
          transfer_group: `rental_${tx.rental_id}`,
          metadata: { platform_transaction_id: tx.id, rental_booking_id: tx.rental_id },
        },
        { idempotencyKey: `rental-payout-${tx.id}` },
      )

      const { error: markError } = await supabase
        .from('platform_transactions')
        .update({ stripe_transfer_id: transfer.id })
        .eq('id', tx.id)
      if (markError) {
        errors.push(`tx ${tx.id}: Transfer ${transfer.id} erstellt, aber DB-Update fehlgeschlagen: ${markError.message}`)
        continue
      }

      // Buchung auf 'active' setzen, wenn Miete gestartet ist
      if (rental.status === 'confirmed') {
        const { error: activeError } = await supabase
          .from('rental_bookings')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', tx.rental_id)
        if (activeError) {
          errors.push(`tx ${tx.id}: status→active fehlgeschlagen: ${activeError.message}`)
        }
      }

      transferred++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`tx ${tx.id}: ${msg}`)
    }
  }

  const cleanup = await cleanupStalePendings(supabase)
  if (cleanup.cleanupError) errors.push(cleanup.cleanupError)

  return NextResponse.json({
    ok: true,
    date: today,
    candidates: txs?.length ?? 0,
    transferred,
    skipped,
    expiredPendings: cleanup.expiredPendings,
    errors,
  })
}
