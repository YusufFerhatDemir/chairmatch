/**
 * Darf ein Salon ueberhaupt noch Geschaefte annehmen?
 *
 * `salons.is_active` ist der EINZIGE Hebel, mit dem die Plattform einen
 * Anbieter anhalten kann. /admin/anbieter schreibt ihn an zwei Stellen:
 * „Sperren" (`salon-status` mit `suspended`) und „Offline setzen"
 * (`salon-toggle-active`) setzen beide `is_active = false`. Genau das ist die
 * Reaktion auf Betrug, Beschwerden oder eine fehlende Gewerbeanmeldung.
 *
 * Bis Track 15 hat dieser Hebel nur die Schaufenster geschlossen. Die
 * oeffentlichen Listen filtern mit `.eq('is_active', true)` — Startseite,
 * Suche, Stadt- und Kategorieseiten. Die Strecken, an denen Geld und
 * Verpflichtungen entstehen, haben `salons` dagegen ueberhaupt nicht
 * angefasst:
 *
 *   - `createBooking` laedt `services`, nie den Salon. Ein gesperrter Salon
 *     nahm damit weiter Termine an.
 *   - `/api/availability` lieferte ihm weiter Slots.
 *   - `/api/rental-listings` fuehrte seine Inserate weiter in der
 *     Mietsuche — die eine oeffentliche Liste OHNE den Filter.
 *   - `/api/rental-bookings` legte eine Stripe-Checkout-Session an, zog also
 *     Geld ein; der Payout-Cron ueberweist es spaeter an genau den Anbieter,
 *     den die Plattform gesperrt hat.
 *   - `/api/rental-requests` stellte ihm weiter Anfragen zu.
 *
 * Ein gesperrter Anbieter war also nur schwerer zu finden, nicht angehalten:
 * jeder Direktlink (`/salon/<slug>`, `/inserat/<id>`) und jeder API-Aufruf
 * lief unveraendert durch.
 *
 * ABSICHTLICH NUR `is_active === false` SPERRT.
 * `null` gilt hier als „nicht gesperrt". Der Wert laesst sich mit dem
 * ANON-Key nicht auslesen (`salons` antwortet fuer `anon` mit 42501, siehe
 * chairmatch-salons-anon-read-dead), und aus „ich kenne den Default nicht"
 * eine Sperre zu machen hiesse, laufende Buchungen auf eine Vermutung hin
 * abzuschalten. Der Admin-Hebel schreibt immer einen echten Boolean.
 *
 * `is_verified` sperrt hier NICHT. Im heutigen Modell ist ein frisch
 * registrierter Salon `is_verified = false` UND `is_active = true` — das
 * Admin-Dashboard nennt diesen Zustand „pending" und zeigt ihn als normal
 * arbeitsfaehig. Die Pruefung an `is_verified` zu haengen wuerde jeden noch
 * nicht freigeschalteten Anbieter sofort vom Markt nehmen. Ob ein
 * unverifizierter Salon Geld einnehmen darf, ist eine Produktentscheidung
 * und keine, die ein Haerte-Track still trifft.
 */

import type { getSupabaseAdmin } from '@/lib/supabase-server'

type AdminClient = ReturnType<typeof getSupabaseAdmin>

/** Text, den Kunde und Mieter zu sehen bekommen. Nennt keinen Grund. */
export const SALON_SUSPENDED_MESSAGE =
  'Dieser Salon nimmt derzeit keine Buchungen an.'

/**
 * Nimmt der Salon Geschaefte an?
 *
 * Nimmt bewusst die rohe Zeile (oder `null`) entgegen, damit Aufrufer, die
 * `salons` ohnehin schon eingebettet haben, keine zweite Abfrage brauchen.
 * Ein FEHLENDER Salon ist kein arbeitsfaehiger Salon.
 */
export function salonAcceptsBusiness(
  salon: { is_active?: boolean | null } | null | undefined,
): boolean {
  if (!salon) return false
  return salon.is_active !== false
}

export type SalonGuardResult =
  | { ok: true }
  | { ok: false; status: number; error: string }

/**
 * Laedt den Salon und beantwortet die Frage in einem Schritt.
 *
 * Ein Lesefehler sperrt (`fail closed`): waere er ein Durchlauf, koennte ein
 * Datenbank-Aussetzer die Sperre aufheben — dieselbe Linie wie in
 * `getServerSession`.
 */
export async function checkSalonAcceptsBusiness(
  supabase: AdminClient,
  salonId: string,
): Promise<SalonGuardResult> {
  const { data, error } = await supabase
    .from('salons')
    .select('id, is_active')
    .eq('id', salonId)
    .limit(1)

  if (error) {
    console.error('salon-status lookup failed:', error)
    return { ok: false, status: 503, error: 'Salon konnte nicht geprüft werden' }
  }

  const salon = (data?.[0] as { is_active?: boolean | null } | undefined) ?? null
  if (!salon) {
    return { ok: false, status: 404, error: 'Salon nicht gefunden' }
  }
  if (!salonAcceptsBusiness(salon)) {
    return { ok: false, status: 409, error: SALON_SUSPENDED_MESSAGE }
  }
  return { ok: true }
}

/**
 * IDs der Salons aus `salonIds`, die Geschaefte annehmen.
 *
 * Fuer Listen (Mietsuche): eine Abfrage statt einer pro Zeile. Ein Lesefehler
 * liefert `null` — der Aufrufer entscheidet dann, ob er die Liste ganz
 * verwirft oder ungefiltert ausliefert.
 */
export async function activeSalonIds(
  supabase: AdminClient,
  salonIds: readonly string[],
): Promise<Set<string> | null> {
  const ids = Array.from(new Set(salonIds.filter(Boolean)))
  if (ids.length === 0) return new Set()

  const { data, error } = await supabase.from('salons').select('id, is_active').in('id', ids)

  if (error) {
    console.error('salon-status batch lookup failed:', error)
    return null
  }

  const erlaubt = new Set<string>()
  for (const row of (data ?? []) as Array<{ id: string; is_active?: boolean | null }>) {
    if (salonAcceptsBusiness(row)) erlaubt.add(row.id)
  }
  return erlaubt
}
