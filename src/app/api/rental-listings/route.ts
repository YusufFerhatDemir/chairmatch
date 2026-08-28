import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { RentalListing } from '@/modules/rentals/rental-listing.types'

/**
 * Oeffentliche Inseratssuche — GET /api/rental-listings
 *
 * Warum es diese Route ueberhaupt gibt: /mieter/mein-bereich/suchen hat die
 * Inserate bis 2026-08-27 im BROWSER geladen, mit dem ANON-Key und einem
 * eingebetteten Join auf `salons`. Live beantwortet PostgREST jede Abfrage
 * auf `salons` mit
 *
 *   42501  permission denied for function is_admin_or_super
 *
 * — die RLS-Policy ruft eine Funktion auf, die die Rolle `anon` nicht
 * ausfuehren darf. Der Fehler traf also nicht nur den Join, sondern die
 * gesamte Abfrage. Im Browser lief das in den `catch`-Zweig, und der legte
 * sechs erfundene Inserate vor ("Salon Anna · Stuhl, 90 €/Tag", "Premium
 * OP-Raum, 500 €/Tag"). Ergebnis: die Suche des Marktplatzes zeigte
 * ausschliesslich Erfundenes, waehrend die echten Inserate unsichtbar
 * blieben. Verifiziert am 2026-08-27 gegen die Produktionsdatenbank.
 *
 * Serverseitig mit dem Service-Client gibt es das Problem nicht. Bewusst
 * oeffentlich (keine Session noetig): Inserate sind oeffentliche Ware, und
 * die Route liefert ausschliesslich Felder, die auch auf der Detailseite
 * stehen — keine Besitzer-IDs, keine Kontaktdaten.
 *
 * Erfunden wird hier NICHTS: gibt es keinen Stundenpreis, ist das Feld null
 * und die Oberflaeche zeigt keinen. Merkmale kommen aus `features`, nicht
 * aus einer Wunschliste.
 */

export const dynamic = 'force-dynamic'

/** Obergrenze pro Abfrage — auch wenn der Client mehr verlangt. */
const MAX_LIMIT = 100
const DEFAULT_LIMIT = 50

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface EquipmentRow {
  id: string
  salon_id: string | null
  type: string | null
  name: string | null
  description: string | null
  features: unknown
  images: unknown
  price_per_day_cents: number | null
  price_per_hour_cents: number | null
  price_per_week_cents: number | null
  price_per_month_cents: number | null
  available_days: unknown
  available_from: string | null
  available_to: string | null
  salons?: { id?: string; name?: string; city?: string; slug?: string; is_active?: boolean | null } | null
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

function toListing(row: EquipmentRow): RentalListing {
  const salon = row.salons ?? null
  const salonId = salon?.id ?? row.salon_id ?? null
  return {
    id: row.id,
    name: row.name ?? '',
    type: row.type ?? 'stuhl',
    description: row.description ?? null,
    features: stringArray(row.features),
    images: stringArray(row.images),
    pricePerDayCents: row.price_per_day_cents ?? 0,
    pricePerHourCents: row.price_per_hour_cents ?? null,
    pricePerWeekCents: row.price_per_week_cents ?? null,
    pricePerMonthCents: row.price_per_month_cents ?? null,
    availableDays: Array.isArray(row.available_days) ? stringArray(row.available_days) : null,
    availableFrom: row.available_from ?? null,
    availableTo: row.available_to ?? null,
    salon: salonId
      ? {
          id: salonId,
          name: salon?.name ?? null,
          city: salon?.city ?? null,
          slug: salon?.slug ?? null,
        }
      : null,
  }
}

/**
 * Filterung in JS statt in PostgREST — bewusst.
 *
 * Ort und Suchbegriff greifen ueber ZWEI Tabellen (Objektname hier,
 * Salonname/Stadt dort). Ein `or=`-Ausdruck ueber eine eingebettete
 * Ressource filtert in PostgREST nur die Einbettung, nicht die Trefferzeilen
 * — genau der Fehler, an dem das Postfach zuletzt gescheitert ist. Bei einem
 * Limit von hoechstens 100 Zeilen ist der Filter hier ehrlicher und billiger
 * als eine Abfrage, die etwas anderes tut als sie behauptet.
 */
function matchesQuery(listing: RentalListing, needle: string): boolean {
  if (!needle) return true
  const hay = [listing.name, listing.description, listing.salon?.name, listing.salon?.city]
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join(' ')
    .toLowerCase()
  return hay.includes(needle)
}

function matchesCity(listing: RentalListing, needle: string): boolean {
  if (!needle) return true
  const hay = [listing.salon?.city, listing.salon?.name]
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join(' ')
    .toLowerCase()
  return hay.includes(needle)
}

export async function GET(req: NextRequest) {
  try {
    const params = new URL(req.url).searchParams

    const query = (params.get('q') ?? '').trim().toLowerCase()
    const city = (params.get('city') ?? '').trim().toLowerCase()
    const type = (params.get('type') ?? '').trim().toLowerCase()

    const maxDayRaw = Number(params.get('maxDayCents'))
    const maxDayCents = Number.isFinite(maxDayRaw) && maxDayRaw > 0 ? Math.floor(maxDayRaw) : null

    const limitRaw = Number(params.get('limit'))
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), MAX_LIMIT) : DEFAULT_LIMIT

    // `ids` bedient die geraetelokale Merkliste: sie kennt nur IDs und
    // braucht die echten Daten dazu. Ungueltige IDs fliegen raus, statt in
    // einer 22P02-Antwort zu enden, die die ganze Liste killt.
    const idsParam = (params.get('ids') ?? '').trim()
    const ids = idsParam
      ? idsParam.split(',').map((s) => s.trim()).filter((s) => UUID_RE.test(s)).slice(0, MAX_LIMIT)
      : null
    if (ids && ids.length === 0) {
      return NextResponse.json({ listings: [] })
    }

    const supabase = getSupabaseAdmin()
    let builder = supabase
      .from('rental_equipment')
      .select(
        'id, salon_id, type, name, description, features, images, price_per_day_cents, ' +
          'price_per_hour_cents, price_per_week_cents, price_per_month_cents, ' +
          'available_days, available_from, available_to, salons(id, name, city, slug, is_active)',
      )
      .eq('is_available', true)

    if (ids) builder = builder.in('id', ids)
    if (type) builder = builder.eq('type', type)

    const { data, error } = await builder.order('created_at', { ascending: false }).limit(limit)

    if (error) {
      console.error('rental-listings query failed:', error)
      return NextResponse.json({ error: 'Inserate konnten nicht geladen werden' }, { status: 500 })
    }

    // Gesperrte Anbieter fliegen aus der Mietsuche.
    //
    // Das war bis Track 15 die EINZIGE oeffentliche Liste ohne diesen Filter:
    // Startseite, Suche, Stadt- und Kategorieseiten fragen alle mit
    // `.eq('is_active', true)`, die Inserate hier gar nicht. Ein von
    // /admin/anbieter gesperrter Salon blieb damit im Marktplatz sichtbar und
    // von dort aus buchbar.
    //
    // Bewusst nur bei einem AUSDRUECKLICHEN `false` — anders als auf den
    // Geldstrecken (rental-bookings, rental-requests, createBooking), die
    // fail closed sind. Hier wuerde ein „im Zweifel raus" bei einem Ausfall
    // der Einbettung den halben Marktplatz stillegen, ohne dass jemand etwas
    // gesperrt haette. Siehe src/lib/salon-status.ts.
    const listings = ((data ?? []) as unknown as EquipmentRow[])
      .filter((row) => row.salons?.is_active !== false)
      .map(toListing)
      .filter((l) => matchesQuery(l, query))
      .filter((l) => matchesCity(l, city))
      .filter((l) => (maxDayCents === null ? true : l.pricePerDayCents <= maxDayCents))

    return NextResponse.json({ listings })
  } catch (err) {
    console.error('rental-listings GET error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
