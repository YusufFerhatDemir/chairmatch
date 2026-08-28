import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { salonIsPubliclyVisible } from '@/lib/salon-status'

/**
 * Oeffentliche Salon-Detailsicht (Slug oder ID).
 *
 * Diese Route steht in `publicPrefixes` (`/api/salons/`) und laeuft mit dem
 * Service-Client — sie umgeht RLS also mit Absicht, weil `salons` fuer die
 * Rolle `anon` gar nicht lesbar ist (42501 aus `is_admin_or_super`, siehe
 * src/__tests__/anon-exposure-and-mock-residue.test.ts). Genau deshalb ist
 * `select('*')` hier kein Detail: was die Spaltenliste hergibt, liegt ohne
 * Anmeldung offen.
 *
 * Bis Track 9 stand hier dreimal `select('*')`. Live enthaelt `salons` unter
 * anderem `email` (Kontaktadresse des Betreibers) und `owner_id` (die
 * auth.users-ID des Inhabers, also der Schluessel, an dem Buchungen,
 * Inserate und Auszahlungen haengen). Beides ging an jeden anonymen Aufruf
 * von `/api/salons/<slug>` — und `staff` lieferte zusaetzlich `user_id`
 * jedes Mitarbeitenden mit.
 *
 * Jetzt entscheidet eine Positivliste, was oeffentlich ist. Neue Spalten
 * sind damit standardmaessig NICHT oeffentlich: wer eine braucht, traegt sie
 * hier ein und sieht dabei, was er tut.
 */

/**
 * Was von einem Salon oeffentlich ist — das, was auch auf der Detailseite
 * steht. Ausdruecklich NICHT dabei: `owner_id`, `email`, `status`
 * (Moderationszustand), `gewerbe_check`.
 */
const SALON_PUBLIC_COLUMNS = [
  'id',
  'name',
  'slug',
  'description',
  'tagline',
  'category',
  'city',
  'state',
  'street',
  'house_number',
  'postal_code',
  'phone',
  'website',
  'logo_url',
  'gallery',
  'opening_hours',
  'avg_rating',
  'review_count',
  'is_verified',
  'is_active',
  'subscription_tier',
  'chair_rental',
  'chair_price_day',
  'created_at',
].join(', ')

/** Nur die Felder, auf die diese Route selbst zugreift — der Rest geht durch. */
type PublicSalon = { id: string } & Record<string, unknown>

/** Mitarbeitende: Anzeigename und Rolle. `user_id` ist ein Kontoschluessel. */
const STAFF_PUBLIC_COLUMNS = 'id, salon_id, name, title, is_active'

/**
 * Leistungen und Mietobjekte standen hier bis Track 20 auf `select('*')`.
 *
 * Beide Tabellen fuehren live nichts Schuetzenswertes (Spaltensonde
 * 2026-08-27, siehe src/test/live-schema.ts) — das ist also KEIN Leck, das
 * hier zugemacht wird. Es ist dieselbe Vorsorge, die Track 9 fuer `salons`
 * getroffen hat: mit `*` ist jede kuenftige Spalte automatisch oeffentlich,
 * mit einer Positivliste muss sie jemand eintragen und sieht dabei, was er
 * tut.
 */
const SERVICE_PUBLIC_COLUMNS =
  'id, salon_id, name, description, category, duration_minutes, price_cents, currency, is_active, sort_order, risk_level, slug'

const EQUIPMENT_PUBLIC_COLUMNS =
  'id, salon_id, type, name, description, features, images, price_per_day_cents, ' +
  'price_per_hour_cents, price_per_week_cents, price_per_month_cents, ' +
  'available_days, available_from, available_to, is_available'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    // Find salon by slug first, fallback to id
    let salon: PublicSalon | null = null
    const { data: bySlug } = await supabase
      .from('salons')
      .select(SALON_PUBLIC_COLUMNS)
      .eq('slug', id)
      .limit(1)
      .maybeSingle()
    if (bySlug) {
      salon = bySlug as unknown as PublicSalon
    } else {
      const { data: byId } = await supabase
        .from('salons')
        .select(SALON_PUBLIC_COLUMNS)
        .eq('id', id)
        .limit(1)
        .maybeSingle()
      salon = (byId as unknown as PublicSalon | null) ?? null
    }

    if (!salon) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    // Ein nicht freigegebener Salon hat keine oeffentliche Seite.
    //
    // Bewusst 404 und nicht 403: dass es unter diesem Slug ueberhaupt einen
    // Eintrag gibt, ist selbst schon eine Auskunft. Wer den Salon fuehrt,
    // sieht seinen Stand im Anbieter-Bereich, nicht auf der Kundensicht.
    if (!salonIsPubliclyVisible(salon as { is_active?: boolean | null })) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    const salonId = salon.id

    // Fetch related data in parallel
    const [servicesResult, staffResult, rentalEquipmentResult] = await Promise.all([
      supabase
        .from('services')
        .select(SERVICE_PUBLIC_COLUMNS)
        .eq('salon_id', salonId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('staff')
        .select(STAFF_PUBLIC_COLUMNS)
        .eq('salon_id', salonId)
        .eq('is_active', true),
      supabase
        .from('rental_equipment')
        .select(EQUIPMENT_PUBLIC_COLUMNS)
        .eq('salon_id', salonId)
        .eq('is_available', true),
    ])

    const result = {
      ...salon,
      services: servicesResult.data || [],
      staff: staffResult.data || [],
      rentalEquipment: rentalEquipmentResult.data || [],
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
