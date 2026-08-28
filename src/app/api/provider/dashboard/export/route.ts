import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { toCsv } from '@/lib/csv'
import { attachmentDisposition } from '@/lib/content-disposition'

/**
 * CSV-Export aller Plattform-Transaktionen für den eingeloggten Anbieter.
 * Format: für deutsche Steuerberater (Semikolon-getrennt, Komma als Dezimaltrenner).
 *
 * Optionale Query-Params:
 *   ?from=YYYY-MM-DD
 *   ?to=YYYY-MM-DD
 */

/**
 * `csvEscape` lag bis Track 19 hier und quotete `\n`, aber nicht `\r`: ein
 * einzelner Wagenruecklauf in einem Wert zerlegte die Zeile, und ab dort war
 * die Datei um eine Spalte verschoben. Ausserdem fehlte die Absicherung gegen
 * Zellen, die eine Tabellenkalkulation als Formel liest. Beides steckt jetzt
 * in @/lib/csv.
 */
const SEMI = ';'

function formatEur(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/
    if (from && !ISO_DATE.test(from)) return NextResponse.json({ error: 'Ungueltiges Startdatum' }, { status: 400 })
    if (to && !ISO_DATE.test(to)) return NextResponse.json({ error: 'Ungueltiges Enddatum' }, { status: 400 })

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('platform_transactions')
      .select('id, type, amount_cents, platform_fee_cents, provider_share_cents, currency, status, stripe_payment_intent_id, booking_id, created_at')
      .eq('provider_user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)

    const { data: txs } = await query

    const header = [
      'Datum',
      'Transaktions-ID',
      'Typ',
      'Status',
      'Brutto (EUR)',
      'Plattform-Gebuehr (EUR)',
      'Anbieter-Anteil (EUR)',
      'Waehrung',
      'Stripe-PaymentIntent',
      'Buchungs-ID',
    ]

    const rows = (txs ?? []).map((t) => [
      new Date(t.created_at).toISOString().slice(0, 10),
      t.id,
      t.type,
      t.status,
      formatEur(t.amount_cents),
      formatEur(t.platform_fee_cents),
      formatEur(t.provider_share_cents),
      (t.currency ?? 'eur').toUpperCase(),
      t.stripe_payment_intent_id,
      t.booking_id,
    ])

    // UTF-8-BOM voranstellen, damit Excel die Umlaute korrekt liest.
    const csv = toCsv(header, rows, { delimiter: SEMI, bom: true })

    const filename = `chairmatch-umsaetze-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': attachmentDisposition(filename),
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
