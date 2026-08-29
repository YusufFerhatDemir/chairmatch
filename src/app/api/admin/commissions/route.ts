import { NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * Admin: Provisions-Uebersicht — GET /api/admin/commissions
 *
 * Die Route gab es seit langem, eine Oberflaeche dazu nicht: sie hatte im
 * gesamten Repository keinen Aufrufer. Beim Bau der Seite (/admin/provisionen)
 * fielen zwei Dinge auf, die beide dieselbe Richtung haben — sie melden zu
 * WENIG, und zwar lautlos:
 *
 *  1. KEIN FEHLER WURDE ANGESEHEN. Beide Abfragen destrukturierten nur `data`.
 *     Faellt die Abfrage aus, ist `data` null, und die Route antwortete
 *     `{ commissions: [], summary: { total: 0 } }` mit Status 200. Auf dem
 *     Bildschirm eines Admins steht dann „0 €" — die Aussage „die Plattform
 *     hat nichts verdient", wo „wir konnten es nicht lesen" gemeint war. Das
 *     ist dieselbe Klasse Fehler, die dieses Projekt in Track 15, 18 und 20
 *     schon an anderen Stellen ausgeraeumt hat, hier auf der Umsatzzahl.
 *
 *  2. DIE SUMME LAS UNGEDECKELT. `select('type, commission_cents')` ohne
 *     `range()` bekommt von PostgREST hoechstens `db-max-rows` Zeilen
 *     (Supabase-Voreinstellung: 1000). Ab der 1001. Provisionszeile war die
 *     Gesamtsumme schlicht zu klein — ohne jeden Hinweis darauf. Jetzt wird
 *     seitenweise gelesen; wird die Obergrenze erreicht, sagt die Antwort das
 *     mit `truncated: true`, statt eine zu kleine Zahl als Tatsache
 *     auszugeben.
 */

/** Seitengroesse der Summenabfrage — unter jeder ueblichen `db-max-rows`. */
const SEITE = 1000

/**
 * Harte Obergrenze der Summenbildung. Erreicht sie jemand, ist die Antwort
 * `truncated: true` — eine gedeckelte Zahl, die sich als gedeckelt zu
 * erkennen gibt, ist brauchbar; eine, die es nicht tut, ist es nicht.
 */
const MAX_ZEILEN = 50_000

interface StatZeile {
  type: string
  commission_cents: number
}

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const role = (session.user as { role?: string }).role
    if (!role || !['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()

    const { data: commissions, error: listenFehler } = await supabase
      .from('commissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (listenFehler) {
      console.error('admin/commissions: Liste nicht lesbar:', listenFehler)
      return NextResponse.json(
        { error: 'Provisionen konnten nicht geladen werden.' },
        { status: 503 },
      )
    }

    // --- Summe, seitenweise ---
    const summary = {
      total: 0,
      count: 0,
      byType: {} as Record<string, { count: number; totalCents: number }>,
    }
    let truncated = false

    for (let von = 0; von < MAX_ZEILEN; von += SEITE) {
      const { data: stats, error: summenFehler } = await supabase
        .from('commissions')
        .select('type, commission_cents')
        .order('created_at', { ascending: false })
        .range(von, von + SEITE - 1)

      if (summenFehler) {
        console.error('admin/commissions: Summe nicht lesbar:', summenFehler)
        return NextResponse.json(
          { error: 'Provisionen konnten nicht geladen werden.' },
          { status: 503 },
        )
      }

      const zeilen = (stats ?? []) as StatZeile[]
      for (const s of zeilen) {
        const cents = Number(s.commission_cents) || 0
        summary.total += cents
        summary.count++
        const typ = s.type || 'unbekannt'
        if (!summary.byType[typ]) summary.byType[typ] = { count: 0, totalCents: 0 }
        summary.byType[typ].count++
        summary.byType[typ].totalCents += cents
      }

      if (zeilen.length < SEITE) break
      if (von + SEITE >= MAX_ZEILEN) truncated = true
    }

    return NextResponse.json({
      commissions: commissions ?? [],
      summary,
      truncated,
    })
  } catch (err) {
    console.error('admin/commissions error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
