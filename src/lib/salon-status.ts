/**
 * Darf ein Salon ueberhaupt noch Geschaefte annehmen?
 *
 * `salons.is_active` ist der EINZIGE Hebel, mit dem die Plattform einen
 * Anbieter anhalten kann. Er hat ZWEI Quellen, und beide bedeuten dasselbe —
 * „dieser Salon ist von der Plattform nicht freigegeben":
 *
 *   1. /admin/anbieter: „Sperren" (`salon-status` mit `suspended`) und
 *      „Offline setzen" (`salon-toggle-active`) setzen `is_active = false`.
 *      Die Reaktion auf Betrug, Beschwerden, fehlende Gewerbeanmeldung.
 *   2. /api/register-provider legt JEDEN selbst registrierten Salon mit
 *      `is_active: false, is_verified: false` an. Das Admin-Dashboard zeigt
 *      ihn als „suspended" und bietet „Freischalten" an, was beide Flags auf
 *      true setzt.
 *
 * Quelle 2 ist der Grund, warum dieser Riegel eine spuerbare Aenderung ist:
 * er schaltet das Freischalt-Tor scharf, das bisher als Spalte existierte,
 * aber nicht als Verhalten. Ein nie freigeschalteter Anbieter war aus den
 * oeffentlichen Listen ohnehin schon ausgeschlossen (die filtern alle
 * `.eq('is_active', true)`) — geblieben waren ihm die Mietsuche und jeder
 * Direktlink, und ueber die nahm er echtes Geld entgegen.
 *
 * Die Strecken, an denen Geld und Verpflichtungen entstehen, haben `salons`
 * bis Track 15 ueberhaupt nicht angefasst:
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
 * abzuschalten. Beide Quellen oben schreiben einen echten Boolean.
 *
 * `is_verified` sperrt hier NICHT — es waere die zweite Sperre auf dieselbe
 * Frage. Beide Flags laufen im Normalfall gleich: die Registrierung setzt
 * beide auf false, „Freischalten" setzt beide auf true. Auseinander laufen
 * sie nur in zwei vom Admin ausdruecklich gewaehlten Zustaenden —
 * `salon-status: 'pending'` (verified zurueck, active bleibt) und
 * `salon-toggle-active` (active zurueck, verified bleibt). In beiden gilt
 * `is_active` als das Wort, das der Admin zuletzt zum Arbeiten gesagt hat.
 * Ob ein Salon zusaetzlich verifiziert sein MUSS, um Geld einzunehmen, ist
 * eine Produktentscheidung und keine, die ein Haerte-Track still trifft.
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

/**
 * Ist der Salon oeffentlich sichtbar?
 *
 * Track 20. Track 15 hat die GELDSTRECKEN eines nicht freigegebenen Salons
 * geschlossen und den Direktlink ausdruecklich stehen lassen. Genau der ist
 * der Rest des Problems: `/salon/<slug>` und `GET /api/salons/<slug>` haben
 * `is_active` nie angesehen. Damit war die oeffentliche Profilseite —
 * Geschaeftsname, Strasse, Telefonnummer, Leistungen mit Preisen,
 * Mitarbeitende, Mietobjekte, dazu ein LocalBusiness-JSON-LD fuer
 * Suchmaschinen — fuer JEDEN Salon erreichbar, auch fuer den, der gerade
 * gesperrt wurde, und fuer den, den noch nie ein Admin angesehen hat.
 *
 * Die zweite Haelfte ist die wichtigere: /api/register-provider ist
 * oeffentlich und braucht kein Konto. Wer das Formular abschickt, bekam
 * sofort eine dauerhafte, von aussen verlinkbare Seite auf chairmatch.de mit
 * einem selbst gewaehlten Geschaeftsnamen (bis 200 Zeichen) und einer selbst
 * gewaehlten Adresse. Die Freischaltung durch einen Admin war damit eine
 * Formalitaet NACH der Veroeffentlichung, nicht davor.
 *
 * Dieselbe Konvention wie `salonAcceptsBusiness`: nur ein ausdrueckliches
 * `false` verbirgt. `null` ist kein Urteil (siehe Kopfkommentar).
 */
export function salonIsPubliclyVisible(
  salon: { is_active?: boolean | null } | null | undefined,
): boolean {
  return salonAcceptsBusiness(salon)
}
