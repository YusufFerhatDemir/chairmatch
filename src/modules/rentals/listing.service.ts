/**
 * Listing-Service — Auflösung „eingeloggter Nutzer → sein Salon → sein Inserat".
 *
 * Die Vermieter-Seiten (Preise, Verfügbarkeit, Ausstattung, Fotos) bearbeiten
 * alle dasselbe Objekt: den Haupt-Eintrag in `rental_equipment`. Damit die
 * Seiten nicht jede für sich raten, welcher Datensatz gemeint ist, liegt die
 * Auflösung hier an genau einer Stelle.
 */

import type { getSupabaseAdmin } from '@/lib/supabase-server'

export type AdminClient = ReturnType<typeof getSupabaseAdmin>

export interface OwnedSalon {
  id: string
  name: string
  owner_id: string
}

export interface ListingRow {
  id: string
  salon_id: string
  type: string
  name: string
  description: string | null
  price_per_day_cents: number
  price_per_month_cents: number | null
  price_per_hour_cents: number | null
  price_per_week_cents: number | null
  available_days: string[] | null
  available_from: string | null
  available_to: string | null
  features: string[] | null
  is_available: boolean
  images: unknown[] | null
}

const LISTING_COLUMNS =
  'id, salon_id, type, name, description, price_per_day_cents, price_per_month_cents, ' +
  'price_per_hour_cents, price_per_week_cents, available_days, available_from, ' +
  'available_to, features, is_available, images'

/** Fachlicher Fehler mit HTTP-Status — die Routen mappen ihn 1:1 auf die Antwort. */
export class ListingError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ListingError'
  }
}

/**
 * Salon des eingeloggten Nutzers. Mehrere Salons pro Owner sind erlaubt —
 * maßgeblich ist der älteste, weil das der beim Onboarding angelegte ist.
 */
export async function getOwnedSalon(
  supabase: AdminClient,
  userId: string,
): Promise<OwnedSalon | null> {
  const { data, error } = await supabase
    .from('salons')
    .select('id, name, owner_id')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) throw new ListingError(`Salon konnte nicht geladen werden: ${error.message}`, 500)
  return (data?.[0] as OwnedSalon | undefined) ?? null
}

/** Wie getOwnedSalon, wirft aber statt `null` zurückzugeben. */
export async function requireOwnedSalon(
  supabase: AdminClient,
  userId: string,
): Promise<OwnedSalon> {
  const salon = await getOwnedSalon(supabase, userId)
  if (!salon) {
    throw new ListingError(
      'Kein Salon hinterlegt. Bitte zuerst das Anbieter-Onboarding abschließen.',
      404,
    )
  }
  return salon
}

/** Haupt-Inserat des Nutzers (ältester rental_equipment-Eintrag seines Salons). */
export async function getPrimaryListing(
  supabase: AdminClient,
  userId: string,
): Promise<ListingRow | null> {
  const salon = await getOwnedSalon(supabase, userId)
  if (!salon) return null

  const { data, error } = await supabase
    .from('rental_equipment')
    .select(LISTING_COLUMNS)
    .eq('salon_id', salon.id)
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) throw new ListingError(`Inserat konnte nicht geladen werden: ${error.message}`, 500)
  return (data?.[0] as unknown as ListingRow | undefined) ?? null
}

/**
 * Haupt-Inserat holen oder anlegen.
 *
 * Beim ersten Speichern auf einer der Vermieter-Seiten existiert noch kein
 * rental_equipment-Datensatz. Ihn hier anzulegen ist die Alternative dazu,
 * den Nutzer mit „Lege zuerst ein Inserat an" wegzuschicken — die Seiten
 * sind fachlich genau der Inserats-Editor.
 */
export async function ensurePrimaryListing(
  supabase: AdminClient,
  userId: string,
): Promise<ListingRow> {
  const existing = await getPrimaryListing(supabase, userId)
  if (existing) return existing

  const salon = await requireOwnedSalon(supabase, userId)

  const { data, error } = await supabase
    .from('rental_equipment')
    .insert({
      salon_id: salon.id,
      type: 'stuhl',
      name: `${salon.name} · Stuhl`,
      price_per_day_cents: 0,
      is_available: false, // erst sichtbar, wenn ein Preis gesetzt wurde
    })
    .select(LISTING_COLUMNS)
    .single()

  if (error || !data) {
    throw new ListingError(
      `Inserat konnte nicht angelegt werden: ${error?.message ?? 'unbekannter Fehler'}`,
      500,
    )
  }
  return data as unknown as ListingRow
}

/**
 * Prüft, ob `userId` das Equipment besitzt (über den Salon).
 * Gibt die Equipment-Zeile zurück, wirft sonst 404/403.
 */
export async function requireOwnedEquipment(
  supabase: AdminClient,
  equipmentId: string,
  userId: string,
): Promise<ListingRow> {
  const { data, error } = await supabase
    .from('rental_equipment')
    .select(`${LISTING_COLUMNS}, salons(owner_id)`)
    .eq('id', equipmentId)
    .limit(1)

  if (error) throw new ListingError(`Mietobjekt konnte nicht geladen werden: ${error.message}`, 500)

  const row = data?.[0] as (ListingRow & { salons?: { owner_id?: string } | null }) | undefined
  if (!row) throw new ListingError('Mietobjekt nicht gefunden', 404)
  if (row.salons?.owner_id !== userId) {
    throw new ListingError('Kein Zugriff auf dieses Mietobjekt', 403)
  }
  return row
}

/** Owner-ID zu einem Equipment — für Benachrichtigungen an den Vermieter. */
export async function getEquipmentOwnerId(
  supabase: AdminClient,
  equipmentId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('rental_equipment')
    .select('id, salon_id, salons(owner_id)')
    .eq('id', equipmentId)
    .limit(1)

  const row = data?.[0] as { salons?: { owner_id?: string } | null } | undefined
  return row?.salons?.owner_id ?? null
}

export { LISTING_COLUMNS }
