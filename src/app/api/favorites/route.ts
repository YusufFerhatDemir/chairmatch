import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'
import { isMissingColumn, isForeignKeyViolation, isUniqueViolation } from '@/lib/pg-errors'

/**
 * Merkliste — GET/POST /api/favorites
 *
 * Drei Dinge, die bis 2026-08-27 fehlten:
 *
 *  1. GET verschluckte jeden Datenbankfehler. Der Code las
 *     `const { data } = await …` ohne `error` anzufassen und antwortete dann
 *     `{ favorites: [] }` mit HTTP 200. Ein Ausfall war von "du hast nichts
 *     gemerkt" nicht zu unterscheiden — dieselbe Bauart, die in Track 6/7
 *     schon die Termine und die Anfragen unsichtbar gemacht hat. Wer daraufhin
 *     erneut auf das Herz tippt, entfernt in Wahrheit nichts und legt nichts
 *     an, weil er den Zustand gar nicht kennt.
 *
 *  2. Keine Pruefung der ID. `salonId` ging ungeprueft in die Abfrage: ein
 *     Nicht-UUID lief in 22P02, eine unbekannte UUID in 23503 — beides kam als
 *     nacktes 500 mit der rohen PostgreSQL-Meldung zurueck.
 *
 *  3. Miet-Inserate liessen sich gar nicht merken. `favorites` hat live nur
 *     `salon_id NOT NULL`; die Mieter-Merkliste weicht deshalb auf
 *     localStorage aus. `equipment_id` kommt mit
 *     supabase/migrations/20260827_favorites_equipment.sql. Die Route
 *     unterstuetzt sie ab sofort und sagt klar, wenn die Migration noch nicht
 *     eingespielt ist (42703) — statt mit einem 500 zu antworten, das wie ein
 *     Serverausfall aussieht.
 *
 * Autorisierung: der Besitzer steht NIE im Request. `customer_id` kommt
 * ausschliesslich aus der Session — eine fremde Merkliste laesst sich damit
 * weder lesen noch veraendern. Die RLS-Policy `Users manage own favorites`
 * (auth.uid() = customer_id) ist die zweite Schicht; sie greift hier nicht,
 * weil mit service_role gearbeitet wird, deshalb muss die Eingrenzung im Code
 * stehen und nicht nur in der Datenbank.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  let body: { salonId?: unknown; equipmentId?: unknown; action?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const { salonId, equipmentId, action } = body
  if (action !== 'add' && action !== 'remove') {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  // Genau ein Ziel — dieselbe Regel wie der CHECK-Constraint in der Datenbank.
  const hatSalon = typeof salonId === 'string' && salonId.length > 0
  const hatGeraet = typeof equipmentId === 'string' && equipmentId.length > 0
  if (hatSalon === hatGeraet) {
    return NextResponse.json(
      { error: 'Entweder salonId oder equipmentId angeben, nicht beides.' },
      { status: 400 },
    )
  }

  const zielId = (hatSalon ? salonId : equipmentId) as string
  if (!UUID.test(zielId)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 })
  }
  const spalte = hatSalon ? 'salon_id' : 'equipment_id'

  const supabase = getSupabaseAdmin()

  if (action === 'add') {
    const { error } = await supabase
      .from('favorites')
      .upsert(
        { customer_id: session.user.id, [spalte]: zielId },
        { onConflict: `customer_id,${spalte}` },
      )
    if (error) {
      if (isMissingColumn(error)) {
        return NextResponse.json(
          { error: 'Inserate lassen sich noch nicht dauerhaft merken — die Datenbank ist noch nicht umgestellt.' },
          { status: 503 },
        )
      }
      // Unbekannte Zielzeile ist ein Eingabefehler des Aufrufers, kein
      // Serverfehler.
      if (isForeignKeyViolation(error)) {
        return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
      }
      // Zweimal dasselbe gemerkt ist kein Fehlschlag — der Zustand stimmt.
      if (isUniqueViolation(error)) {
        return NextResponse.json({ success: true })
      }
      console.error('[favorites] add:', error)
      return NextResponse.json({ error: 'Konnte nicht gemerkt werden' }, { status: 500 })
    }
  } else {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('customer_id', session.user.id)
      .eq(spalte, zielId)
    if (error) {
      if (isMissingColumn(error)) {
        return NextResponse.json(
          { error: 'Inserate lassen sich noch nicht dauerhaft merken — die Datenbank ist noch nicht umgestellt.' },
          { status: 503 },
        )
      }
      console.error('[favorites] remove:', error)
      return NextResponse.json({ error: 'Konnte nicht entfernt werden' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    // Kein Fehler — nur niemand angemeldet. Der Aufrufer soll das aber
    // unterscheiden koennen und nicht "leere Merkliste" lesen.
    return NextResponse.json({ favorites: [], equipment: [], authenticated: false })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('favorites')
    .select('salon_id')
    .eq('customer_id', session.user.id)

  if (error) {
    // Frueher: stillschweigend `{ favorites: [] }`.
    console.error('[favorites] GET:', error)
    return NextResponse.json(
      { error: 'Merkliste konnte nicht geladen werden' },
      { status: 500 },
    )
  }

  const salons = (data ?? []).map((f) => f.salon_id).filter((id): id is string => Boolean(id))

  // equipment_id existiert erst nach 20260827_favorites_equipment.sql. Bis
  // dahin bleibt die Liste leer, statt die ganze Antwort scheitern zu lassen.
  const geraete = await supabase
    .from('favorites')
    .select('equipment_id')
    .eq('customer_id', session.user.id)

  const equipment = geraete.error
    ? []
    : (geraete.data ?? [])
        .map((f) => (f as { equipment_id?: string | null }).equipment_id)
        .filter((id): id is string => Boolean(id))

  if (geraete.error && !isMissingColumn(geraete.error)) {
    console.error('[favorites] GET equipment:', geraete.error)
  }

  return NextResponse.json({ favorites: salons, equipment, authenticated: true })
}
