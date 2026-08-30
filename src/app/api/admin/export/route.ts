import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { toCsv } from '@/lib/csv'
import { attachmentDisposition } from '@/lib/content-disposition'

async function requireAdmin() {
  const session = await getServerSession()
  const role = (session?.user as { role?: string })?.role
  if (!['admin', 'super_admin'].includes(role || '')) {
    return null
  }
  return session
}

/**
 * Der lokale CSV-Bauer stand bis Track 19 hier und hatte zwei Luecken: er
 * quotete `\n`, aber nicht `\r`, und er kannte den zweiten Leser einer
 * CSV-Datei nicht — die Tabellenkalkulation, die eine Zelle ab `=` als Formel
 * ausfuehrt. `profiles.full_name` kommt aus der Registrierung und landet hier
 * unveraendert im Benutzer-Export. Beides steckt jetzt in @/lib/csv.
 */

/** Obergrenze je Abfrage. Wird sie erreicht, sagt der Dateiname es. */
const EXPORT_LIMIT = 10000

/** Wird geworfen, wenn eine Abfrage ausfaellt — siehe `leseOderWirf`. */
class ExportLeseFehler extends Error {
  constructor(readonly tabelle: string) {
    super(`Export-Abfrage auf ${tabelle} fehlgeschlagen`)
    this.name = 'ExportLeseFehler'
  }
}

/**
 * Ein Lesefehler ist kein leerer Export.
 *
 * Jede Abfrage in dieser Route hat bis hierher nur `data` destrukturiert.
 * Faellt sie aus, ist `data` gleich `null`, `(data ?? [])` gleich `[]` — und
 * die Route liefert mit Status 200 eine gueltige CSV-Datei mit KOPFZEILE UND
 * SONST NICHTS, unter dem Namen `chairmatch-buchungen-2026-08-30.csv`.
 *
 * Genau dieselbe Klasse wie der Provisionsbefund aus Track 25: auf dem
 * Bildschirm steht „keine Buchungen", gemeint war „wir konnten es nicht
 * lesen". Hier ist es teurer, weil die Datei den Bildschirm verlaesst — sie
 * geht in die Buchhaltung, in eine DSGVO-Auskunft oder an den Steuerberater,
 * und dort ist ihr nicht mehr anzusehen, dass sie nie Daten enthielt.
 *
 * Der Wurf landet im `catch` der Route und wird dort zu 503.
 */
function leseOderWirf<T>(
  ergebnis: { data: T[] | null; error: { message?: string; code?: string } | null },
  tabelle: string,
): T[] {
  if (ergebnis.error) {
    console.error(`[admin-export:${tabelle}]`, ergebnis.error.code, ergebnis.error.message)
    throw new ExportLeseFehler(tabelle)
  }
  return ergebnis.data ?? []
}

/**
 * Haengt einen Hinweis an den Dateinamen, wenn die Obergrenze gegriffen hat.
 *
 * Der Datei ist sonst nicht anzusehen, dass sie unvollstaendig ist: 10 000
 * Zeilen sehen aus wie ein vollstaendiger Export. Der Marker steht im
 * Dateinamen und nicht als Zusatzzeile in der CSV, damit die Datei fuer jeden
 * maschinellen Leser sauber bleibt.
 *
 * `count` kann `null` sein (aeltere Antworten ohne `count=exact`); dann wird
 * nichts behauptet.
 */
function mitKuerzungsmarke(name: string, zeilen: number, gesamt: number | null): string {
  if (zeilen < EXPORT_LIMIT) return name
  if (typeof gesamt === 'number' && gesamt > zeilen) {
    return `${name}-GEKUERZT-${zeilen}-von-${gesamt}`
  }
  return `${name}-GEKUERZT-${zeilen}`
}

export async function GET(request: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (!type || !['bookings', 'users', 'revenue', 'compliance'].includes(type)) {
    return NextResponse.json(
      { error: 'Ungültiger Exporttyp. Erlaubt: bookings, users, revenue, compliance' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdmin()

  try {
    let csv = ''
    let filename = ''

    if (type === 'bookings') {
      const res = await supabase
        .from('bookings')
        .select('id, salon_id, customer_id, status, price_cents, booking_date, start_time, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(EXPORT_LIMIT)
      const data = leseOderWirf(res, 'bookings')

      const headers = ['ID', 'Salon ID', 'Kunden ID', 'Status', 'Preis', 'Datum', 'Uhrzeit', 'Erstellt']
      const rows = data.map((b: Record<string, unknown>) => [
        String(b.id ?? ''),
        String(b.salon_id ?? ''),
        String(b.customer_id ?? ''),
        String(b.status ?? ''),
        ((Number(b.price_cents) || 0) / 100).toFixed(2),
        String(b.booking_date ?? ''),
        String(b.start_time ?? ''),
        String(b.created_at ?? ''),
      ])
      csv = toCsv(headers, rows)
      filename = mitKuerzungsmarke('buchungen', rows.length, res.count ?? null)
    }

    if (type === 'users') {
      const res = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(EXPORT_LIMIT)
      const data = leseOderWirf(res, 'profiles')

      const headers = ['ID', 'Email', 'Name', 'Rolle', 'Aktiv', 'Erstellt']
      const rows = data.map((u: Record<string, unknown>) => [
        String(u.id ?? ''),
        String(u.email ?? ''),
        String(u.full_name ?? ''),
        String(u.role ?? ''),
        String(u.is_active ?? ''),
        String(u.created_at ?? ''),
      ])
      csv = toCsv(headers, rows)
      filename = mitKuerzungsmarke('benutzer', rows.length, res.count ?? null)
    }

    if (type === 'revenue') {
      const res = await supabase
        .from('bookings')
        .select('id, salon_id, price_cents, status, created_at', { count: 'exact' })
        .in('status', ['completed', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(EXPORT_LIMIT)
      const data = leseOderWirf(res, 'bookings')

      const headers = ['ID', 'Salon ID', 'Preis', 'Status', 'Erstellt']
      const rows = data.map((b: Record<string, unknown>) => [
        String(b.id ?? ''),
        String(b.salon_id ?? ''),
        ((Number(b.price_cents) || 0) / 100).toFixed(2),
        String(b.status ?? ''),
        String(b.created_at ?? ''),
      ])
      csv = toCsv(headers, rows)
      filename = mitKuerzungsmarke('umsatz', rows.length, res.count ?? null)
    }

    if (type === 'compliance') {
      const salons = leseOderWirf(
        await supabase.from('salons').select('id, name, is_active, is_verified'),
        'salons',
      )

      /*
       * Der Dokumenten-Lesefehler wiegt hier am schwersten: faellt NUR diese
       * Abfrage aus, kommt die Datei vollstaendig aussehend zurueck — jeder
       * Salon mit „Dokumente eingereicht: 0". Das ist die Aussage „kein
       * einziger Anbieter hat je etwas eingereicht", und sie steht dann in
       * einem Compliance-Nachweis.
       */
      const documents = leseOderWirf(
        await supabase.from('compliance_documents').select('salon_id, document_type, status'),
        'compliance_documents',
      )

      const docsPerSalon: Record<string, { total: number; approved: number; types: string[] }> = {}
      for (const doc of documents) {
        const sid = (doc as { salon_id: string }).salon_id
        if (!docsPerSalon[sid]) docsPerSalon[sid] = { total: 0, approved: 0, types: [] }
        docsPerSalon[sid].total += 1
        if ((doc as { status?: string }).status === 'approved') {
          docsPerSalon[sid].approved += 1
        }
        docsPerSalon[sid].types.push((doc as { document_type?: string }).document_type || 'unknown')
      }

      const headers = ['Salon ID', 'Name', 'Aktiv', 'Verifiziert', 'Dokumente eingereicht', 'Dokumente genehmigt', 'Dokumenttypen']
      const rows = salons.map((s: Record<string, unknown>) => {
        const sid = String(s.id)
        const docs = docsPerSalon[sid] || { total: 0, approved: 0, types: [] }
        return [
          sid,
          String(s.name ?? ''),
          String(s.is_active ?? ''),
          String(s.is_verified ?? ''),
          String(docs.total),
          String(docs.approved),
          docs.types.join('; '),
        ]
      })
      csv = toCsv(headers, rows)
      filename = 'compliance'
    }

    const timestamp = new Date().toISOString().slice(0, 10)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': attachmentDisposition(
          `chairmatch-${filename}-${timestamp}.csv`,
        ),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    if (err instanceof ExportLeseFehler) {
      // 503 und KEINE Datei. Der Admin soll den Export wiederholen, nicht
      // eine leere Datei ablegen und sie fuer den Sachstand halten.
      return NextResponse.json(
        {
          error:
            'Der Export konnte nicht vollständig gelesen werden und wurde deshalb nicht erzeugt. Bitte erneut versuchen.',
        },
        { status: 503 },
      )
    }
    console.error('Export error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
