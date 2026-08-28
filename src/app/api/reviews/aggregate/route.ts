import { NextRequest, NextResponse } from 'next/server'
import { getAggregateRatings } from '@/modules/reviews/review.service'
import { isUuid } from '@/lib/uuid'

/**
 * Oeffentlicher Bewertungs-Schnitt eines Salons.
 *
 * Zwei Dinge, die hier bis Track 20 falsch waren, und beide sagten dasselbe
 * Falsche: „dieser Salon hat keine Bewertungen".
 *
 *  1. `salonId` wurde nicht geprueft. `salons.id` ist eine `uuid`-Spalte;
 *     eine Nicht-UUID beantwortet PostgREST mit 22P02. Der Fehler wurde
 *     nicht gelesen (siehe review.service.ts), die Antwort war ein 200 mit
 *     Schnitt 0 aus 0 Bewertungen.
 *  2. Auch ein echter Ausfall der Datenbank kam als dieselbe Null heraus.
 *
 * Jetzt: 400 fuer eine kaputte ID, 503 fuer einen Ausfall, und eine Zahl nur
 * dann, wenn sie wirklich gezaehlt wurde.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const salonId = searchParams.get('salonId')

    if (!salonId) {
      return NextResponse.json({ error: 'salonId erforderlich' }, { status: 400 })
    }
    if (!isUuid(salonId)) {
      return NextResponse.json({ error: 'Ungültige salonId' }, { status: 400 })
    }

    const ratings = await getAggregateRatings(salonId)
    if (!ratings) {
      return NextResponse.json(
        { error: 'Bewertungen konnten nicht geladen werden' },
        { status: 503 },
      )
    }
    return NextResponse.json(ratings)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
