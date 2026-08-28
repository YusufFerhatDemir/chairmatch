import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * Oeffentliche Kennzahlen — ohne Anmeldung abrufbar (`/api/public-stats`
 * steht in `publicPrefixes`).
 *
 * Track 20. Die Route lief mit dem Service-Client, umging RLS also mit
 * Absicht, und zaehlte danach ALLE Zeilen der vier grossen Tabellen. Was
 * dabei herauskam, war zweierlei falsch:
 *
 *  1. ES WAR NICHT WAHR. `profiles` enthaelt zur Loeschung angemeldete und
 *     bereits hart geloeschte Konten (`deleted_at`), `salons` enthaelt jeden
 *     selbst registrierten Salon, den nie ein Admin freigeschaltet hat
 *     (`is_active = false`, siehe /api/register-provider). Beides wurde
 *     mitgezaehlt. Die Zahl „Nutzer" war damit hoeher als die Zahl der
 *     Nutzer, und `cityList` nannte Staedte, in denen ChairMatch keinen
 *     einzigen sichtbaren Salon hat.
 *
 *  2. ES WAR MEHR, ALS DIE FRAGE HERGIBT. `cityList` war eine Liste der
 *     Staedte ALLER Salons — auch der gesperrten und der noch nicht
 *     geprueften. Wer wissen wollte, wo ChairMatch gerade Anbieter anwirbt,
 *     musste diese Route aufrufen, sonst nichts.
 *
 * Jetzt zaehlt jede Zahl genau das, was ihr Name sagt: sichtbare Salons,
 * nicht geloeschte Konten, und Staedte, in denen tatsaechlich ein
 * freigeschalteter Salon steht.
 *
 * Die Antwort darf zwischengespeichert werden — sie aendert sich langsam,
 * und ohne Cache ist sie sechs Zaehlabfragen pro Aufruf auf einem Endpunkt,
 * der kein Konto verlangt.
 */
export async function GET() {
  const supabase = getSupabaseAdmin()

  const [
    { count: userCount },
    { count: salonCount },
    { count: bookingCount },
    { count: reviewCount },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .is('delete_requested_at', null),
    supabase.from('salons').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }),
  ])

  // Staedte und Kategorien: nur freigeschaltete Salons.
  const { data: salonRows } = await supabase
    .from('salons')
    .select('city, category')
    .eq('is_active', true)

  const cities = new Set<string>()
  const catCounts: Record<string, number> = {}
  for (const s of salonRows || []) {
    if (s.city) cities.add(s.city as string)
    if (s.category) catCounts[s.category as string] = (catCounts[s.category as string] || 0) + 1
  }

  return NextResponse.json(
    {
      users: userCount ?? 0,
      salons: salonCount ?? 0,
      bookings: bookingCount ?? 0,
      reviews: reviewCount ?? 0,
      cities: cities.size,
      cityList: Array.from(cities).sort().slice(0, 20),
      categories: catCounts,
    },
    {
      headers: {
        // `vercel.json` setzt fuer /api/* pauschal `no-store`; dieser Header
        // steht hier trotzdem, damit die Absicht am Code ablesbar ist und
        // eine spaetere Ausnahme fuer diese Route sie nicht versehentlich
        // ungecacht laesst.
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    },
  )
}
