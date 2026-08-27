import { NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * DSGVO Art. 15/20: Daten-Export (JSON).
 *
 * Der Export umfasste bis 2026-08-27 nur Profil, Termine und Consent-Logs.
 * Alles andere, was die Plattform ueber eine Person haelt, fehlte:
 * Nachrichten, Bewertungen, Shop-Bestellungen, Miet-Buchungen und -Anfragen,
 * Zahlungen, Uploads, Merkliste, Benachrichtigungen, Newsletter-Anmeldung.
 * Das sind ohne Ausnahme personenbezogene Daten — eine Auskunft, die sie
 * auslaesst, ist keine vollstaendige Auskunft.
 *
 * Aufbau bewusst als Liste: eine fehlende oder umbenannte Tabelle darf den
 * gesamten Export nicht kippen. Was nicht geladen werden konnte, steht am
 * Ende unter `nichtVerfuegbar` — Schweigen waere hier die schlechtere
 * Antwort, weil die Auskunft dann still unvollstaendig bliebe.
 */

/** Eine Datenquelle des Exports: Tabelle, Spalte und Wert des Personenbezugs. */
interface Quelle {
  /** Schluessel im JSON-Export */
  name: string
  table: string
  column: string
  value: string
}

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const userId = session.user.id

  try {
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('Export profile error:', profileError)
      return NextResponse.json({ error: 'Daten konnten nicht geladen werden' }, { status: 500 })
    }

    const email = (profileRow as { email?: string | null } | null)?.email ?? null

    const quellen: Quelle[] = [
      { name: 'bookings', table: 'bookings', column: 'customer_id', value: userId },
      { name: 'consentLogs', table: 'consent_logs', column: 'user_id', value: userId },
      { name: 'consents', table: 'consents', column: 'user_id', value: userId },
      { name: 'reviews', table: 'reviews', column: 'customer_id', value: userId },
      { name: 'reviewsWritten', table: 'reviews', column: 'reviewer_id', value: userId },
      { name: 'messages', table: 'messages', column: 'sender_id', value: userId },
      { name: 'orders', table: 'orders', column: 'customer_id', value: userId },
      { name: 'cartItems', table: 'cart_items', column: 'customer_id', value: userId },
      { name: 'rentalBookings', table: 'rental_bookings', column: 'renter_id', value: userId },
      { name: 'rentalRequests', table: 'rental_requests', column: 'requester_id', value: userId },
      { name: 'payments', table: 'payments', column: 'user_id', value: userId },
      { name: 'uploads', table: 'user_uploads', column: 'user_id', value: userId },
      { name: 'favorites', table: 'favorites', column: 'customer_id', value: userId },
      { name: 'notifications', table: 'notification_log', column: 'user_id', value: userId },
    ]

    if (email) {
      quellen.push({
        name: 'newsletterSubscription',
        table: 'newsletter_subscribers',
        column: 'email',
        value: email,
      })
    }

    const ergebnisse = await Promise.all(
      quellen.map(async q => {
        const { data, error } = await supabase.from(q.table).select('*').eq(q.column, q.value)
        return { quelle: q, data: data ?? [], error }
      }),
    )

    const datensaetze: Record<string, unknown[]> = {}
    const nichtVerfuegbar: { bereich: string; grund: string }[] = []

    for (const { quelle, data, error } of ergebnisse) {
      if (error) {
        console.error(`Export ${quelle.table} error:`, error.message)
        nichtVerfuegbar.push({ bereich: quelle.name, grund: error.message })
        continue
      }
      datensaetze[quelle.name] = data
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId,
      profile: profileRow ?? null,
      ...datensaetze,
      ...(nichtVerfuegbar.length > 0 ? { nichtVerfuegbar } : {}),
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="chairmatch-export-${userId.slice(0, 8)}.json"`,
      },
    })
  } catch (err) {
    console.error('Export failed:', err)
    return NextResponse.json({ error: 'Export fehlgeschlagen' }, { status: 500 })
  }
}
