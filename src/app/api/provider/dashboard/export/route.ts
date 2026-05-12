import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * CSV-Export aller Plattform-Transaktionen für den eingeloggten Anbieter.
 * Format: für deutsche Steuerberater (Semikolon-getrennt, Komma als Dezimaltrenner).
 *
 * Optionale Query-Params:
 *   ?from=YYYY-MM-DD
 *   ?to=YYYY-MM-DD
 */

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

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
    ].join(';')

    const rows = (txs ?? []).map((t) =>
      [
        csvEscape(new Date(t.created_at).toISOString().slice(0, 10)),
        csvEscape(t.id),
        csvEscape(t.type),
        csvEscape(t.status),
        csvEscape(formatEur(t.amount_cents)),
        csvEscape(formatEur(t.platform_fee_cents)),
        csvEscape(formatEur(t.provider_share_cents)),
        csvEscape((t.currency ?? 'eur').toUpperCase()),
        csvEscape(t.stripe_payment_intent_id),
        csvEscape(t.booking_id),
      ].join(';'),
    )

    // UTF-8 BOM voranstellen, damit Excel die Umlaute korrekt liest
    const csv = '﻿' + [header, ...rows].join('\r\n')

    const filename = `chairmatch-umsaetze-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
