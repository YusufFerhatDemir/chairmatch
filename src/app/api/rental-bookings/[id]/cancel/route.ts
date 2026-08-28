import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createRefund, isStripeConfigured } from '@/lib/stripe'
import { createNotification } from '@/lib/notifications'
import { berlinToday } from '@/lib/berlin-time'

/**
 * POST /api/rental-bookings/[id]/cancel — Miet-Buchung stornieren.
 *
 * WARUM ES DIESE ROUTE BIS TRACK 12 NICHT GAB, UND WARUM DAS SCHLIMM WAR:
 *
 * Der Payout-Cron beschreibt das Geschaeftsmodell so:
 *
 *     „Bezahlte Miet-Transaktionen werden NICHT sofort an den Anbieter
 *      transferiert, sondern erst wenn der Mietbeginn erreicht ist — das
 *      schuetzt Mieter bei No-Show/Storno vor Mietantritt."
 *
 * Die Zurueckhaltung des Geldes gab es wirklich. Den Storno, fuer den sie da
 * ist, gab es nicht: unter /api/rental-bookings lagen nur POST (anlegen) und
 * GET (auflisten), ein `[id]`-Handler existierte ueberhaupt nicht. Wer eine
 * Miete bezahlt hatte, kam aus ihr nicht mehr heraus — weder als Mieter noch
 * als Vermieter. Am Mietbeginn zahlte der Cron dann aus, und der Schutz, der
 * im Kommentar stand, war nie erreichbar.
 *
 * WAS DIESE ROUTE BEWUSST NICHT TUT:
 *
 *  - Sie erfindet keine Stornogebuehr. `rental_bookings` hat keine Spalte
 *    dafuer (Spaltensonde 2026-08-28: `cancelled_at`, `cancellation_reason`
 *    und `refund_cents` gibt es alle NICHT), und einen Prozentsatz gaebe es
 *    nirgends nachzulesen. Erstattet wird der volle Betrag oder gar nichts.
 *  - Sie storniert nichts, was bereits begonnen hat. Was in einem laufenden
 *    oder abgelaufenen Mietverhaeltnis anteilig zurueckzugeben waere, ist
 *    eine kaufmaennische Entscheidung mit einer Zahl darin — die gehoert
 *    nicht in eine Route, die sie sich ausdenken muesste. Ab dem Starttag
 *    verweist die Antwort auf den Support.
 *  - Sie erstattet nichts, was der Anbieter schon hat. Steht an der
 *    Plattform-Transaktion eine `stripe_transfer_id`, ist das Geld bereits
 *    auf dem Connect-Konto. Ein Refund aus dem Plattformguthaben wuerde die
 *    Zahlung dann faktisch aus unserer Tasche leisten. Der Fall ist bei einem
 *    Storno vor Mietbeginn nicht zu erwarten (der Cron zahlt erst ab dem
 *    Starttag aus), wird aber geprueft statt vorausgesetzt.
 *
 * Der Storno-Grund landet im Audit-Log, nicht an der Buchung: eine Spalte
 * dafuer gibt es live nicht, und `audit_logs.details` ist jsonb.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Wer darf diese Miet-Buchung stornieren? */
type Actor = 'renter' | 'owner' | 'admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    if (!UUID.test(id)) return NextResponse.json({ error: 'Ungueltige ID' }, { status: 400 })
    const body = await req.json().catch(() => ({}))
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 500) : null

    const supabase = getSupabaseAdmin()

    const { data: rental, error } = await supabase
      .from('rental_bookings')
      .select(
        'id, renter_id, equipment_id, start_date, end_date, total_cents, status, payment_status, stripe_payment_intent, rental_equipment(name, salons(name, owner_id))',
      )
      .eq('id', id)
      .single()

    if (error || !rental) {
      return NextResponse.json({ error: 'Miet-Buchung nicht gefunden' }, { status: 404 })
    }

    // --- Berechtigung: aus der echten Beziehung, nicht aus „ist nicht fremd" ---
    const equipment = (rental as Record<string, unknown>).rental_equipment as
      | { name?: string; salons?: { name?: string; owner_id?: string } | null }
      | null
    const ownerId = equipment?.salons?.owner_id ?? null
    const role = (session.user as { role?: string }).role || ''

    let actor: Actor | null = null
    if (rental.renter_id === userId) actor = 'renter'
    else if (ownerId && ownerId === userId) actor = 'owner'
    else if (['admin', 'super_admin'].includes(role)) actor = 'admin'

    if (!actor) {
      return NextResponse.json({ error: 'Keine Berechtigung fuer diese Buchung' }, { status: 403 })
    }

    // --- Zustand ---
    if (rental.status === 'cancelled') {
      return NextResponse.json({ error: 'Buchung ist bereits storniert' }, { status: 409 })
    }
    if (['completed', 'active'].includes(String(rental.status))) {
      return NextResponse.json(
        {
          error:
            'Die Miete laeuft bereits oder ist abgeschlossen. Bitte wende dich an den Support — eine anteilige Rueckabwicklung wird von Hand geprueft.',
        },
        { status: 409 },
      )
    }

    // Ab dem Starttag nicht mehr per Selbstbedienung. Der Vergleich laeuft auf
    // ISO-Datumszeichenketten (YYYY-MM-DD), die sich lexikografisch wie Daten
    // sortieren — dieselbe Form, in der `start_date` gespeichert ist.
    const today = berlinToday()
    if (String(rental.start_date) <= today) {
      return NextResponse.json(
        {
          error:
            'Der Mietzeitraum hat bereits begonnen. Eine Stornierung ist ab dem Starttag nur ueber den Support moeglich.',
        },
        { status: 409 },
      )
    }

    // --- Erstattung, sofern wirklich bezahlt wurde ---
    let refunded = false
    let refundNote: string | null = null

    if (rental.payment_status === 'paid') {
      const { data: transfers } = await supabase
        .from('platform_transactions')
        .select('id, stripe_transfer_id')
        .eq('rental_id', id)
        .not('stripe_transfer_id', 'is', null)
        .limit(1)

      if (transfers && transfers.length > 0) {
        return NextResponse.json(
          {
            error:
              'Die Auszahlung an den Anbieter ist bereits erfolgt. Diese Buchung kann nur ueber den Support rueckabgewickelt werden.',
          },
          { status: 409 },
        )
      }

      const paymentIntent = (rental as { stripe_payment_intent?: string | null }).stripe_payment_intent

      if (!paymentIntent) {
        // Bezahlt laut Datenbank, aber ohne Zahlungsbezug — hier waere jede
        // automatische Erstattung geraten. Storniert wird trotzdem, der
        // Zahlungsstatus bleibt unveraendert und der Fall sichtbar.
        refundNote = 'Keine Zahlungsreferenz hinterlegt — Erstattung muss von Hand erfolgen.'
      } else if (!isStripeConfigured()) {
        refundNote = 'Stripe ist in dieser Umgebung nicht konfiguriert — keine Erstattung ausgeloest.'
      } else {
        try {
          await createRefund(paymentIntent)
          refunded = true
        } catch (err) {
          // Nicht stornieren, wenn die Erstattung scheitert: eine stornierte
          // Buchung ohne Geld zurueck ist der schlechteste aller Zustaende.
          console.error(`rental ${id}: Refund fehlgeschlagen`, err)
          return NextResponse.json(
            {
              error:
                'Die Erstattung konnte nicht ausgeloest werden. Die Buchung wurde NICHT storniert. Bitte spaeter erneut versuchen.',
            },
            { status: 502 },
          )
        }
      }
    }

    // --- Storno schreiben ---
    // `.neq('status', 'cancelled')` schliesst das Rennen mit einem parallelen
    // Storno und mit dem `charge.refunded`-Webhook, der nach der Erstattung
    // oben ohnehin gleich dieselben Werte setzt.
    const { data: updated, error: updateError } = await supabase
      .from('rental_bookings')
      .update({
        status: 'cancelled',
        ...(refunded ? { payment_status: 'refunded' } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .neq('status', 'cancelled')
      .select('id')

    if (updateError) {
      console.error(`rental ${id}: Storno-Update fehlgeschlagen`, updateError)
      return NextResponse.json(
        {
          error: refunded
            ? 'Die Erstattung ist ausgeloest, der Storno konnte aber nicht gespeichert werden. Der Support klaert das.'
            : 'Buchung konnte nicht storniert werden.',
        },
        { status: 500 },
      )
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Buchung ist bereits storniert' }, { status: 409 })
    }

    // Offene Plattform-Transaktion mitziehen — sonst bleibt sie als
    // auszahlungsfaehiger Kandidat im Payout-Cron liegen.
    if (refunded) {
      const { error: txError } = await supabase
        .from('platform_transactions')
        .update({ status: 'refunded' })
        .eq('rental_id', id)
        .is('stripe_transfer_id', null)
      if (txError) console.error(`rental ${id}: platform_transactions nicht nachgezogen:`, txError.message)
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'rental_booking_cancelled',
      entity: 'rental_booking',
      entity_id: id,
      details: {
        actor,
        reason,
        refunded,
        refund_note: refundNote,
        total_cents: rental.total_cents,
        start_date: rental.start_date,
        end_date: rental.end_date,
      },
    })

    // Beide Seiten informieren — wer storniert hat, weiss es; die andere Seite
    // erfaehrt es sonst gar nicht.
    const period = `${rental.start_date} – ${rental.end_date}`
    const objectName = equipment?.name || 'Mietobjekt'
    const refundText = refunded
      ? ` Der Betrag wird erstattet (${(rental.total_cents / 100).toFixed(2)} €).`
      : ''

    if (rental.renter_id) {
      await createNotification(
        rental.renter_id,
        'Mietbuchung storniert',
        `Die Buchung fuer ${objectName} (${period}) wurde storniert.${refundText}`,
        'booking',
        id,
        'rental_booking',
      )
    }
    if (ownerId && ownerId !== rental.renter_id) {
      await createNotification(
        ownerId,
        'Mietbuchung storniert',
        `Die Buchung fuer ${objectName} (${period}) wurde storniert. Der Zeitraum ist wieder frei.`,
        'booking',
        id,
        'rental_booking',
      )
    }

    return NextResponse.json({
      success: true,
      cancelled: true,
      refunded,
      refundNote,
      actor,
    })
  } catch (err) {
    console.error('rental cancel error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
