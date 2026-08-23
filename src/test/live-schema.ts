/**
 * Spalten der Produktionstabellen, gegen die die Ketten-Tests laufen.
 *
 * Warum das hier steht statt in den Migrationen: `supabase/migrations/*` ist
 * fuer ChairMatch nicht die Wahrheit. Mehrere Tabellen (`salons`,
 * `rental_equipment`, `notification_log`, …) haben im Repo kein
 * `CREATE TABLE`, andere weichen live vom Migrationstext ab. Wer Tests gegen
 * die Migrationen schreibt, testet gegen eine Datenbank, die es nicht gibt.
 *
 * Genau daran sind zwei Fehler durchgerutscht, die in Produktion Tag fuer Tag
 * still ausgefallen sind — beide von einer gruenen Testsuite gedeckt:
 *
 *   1. Der Code schrieb In-App-Benachrichtigungen nach `notifications`. Diese
 *      Tabelle existiert live nicht (nur `notification_log`). Jede
 *      Benachrichtigung lief in PGRST205.
 *   2. Der Code schrieb `email_delivery_log.recipient_user_id` und `.error`.
 *      Live heissen die Spalten anders bzw. gibt es sie nicht — der INSERT
 *      lief in 42703, wodurch Zustelllog UND Doppelversand-Schutz ausfielen.
 *
 * Die Listen unten sind am 2026-08-23 gegen `pwdbjqfpgumyfktbfswg` per
 * PostgREST-Spaltenprobe erhoben (`?select=<spalte>` → 42703, wenn die Spalte
 * fehlt; der Fehler kommt vor der Rechtepruefung, deshalb reicht der
 * ANON-Key). Reproduzierbar mit `./scripts/schema-probe.sh`.
 *
 * Bewusst nur die Tabellen der hier getesteten Ketten: eine Liste, die
 * niemand prueft, ist schlechter als keine.
 */

/** Verifiziert am 2026-08-23 gegen die Produktionsdatenbank. */
export const LIVE_SCHEMA_VERIFIED_AT = '2026-08-23'

export const LIVE_SCHEMA: Record<string, readonly string[]> = {
  rental_requests: [
    'id',
    'equipment_id',
    'salon_id',
    'requester_id',
    'recipient_id',
    'request_type',
    'preferred_date',
    'preferred_time',
    'duration_unit',
    'units',
    'message',
    'estimated_cents',
    'status',
    'created_at',
    'updated_at',
  ],

  rental_request_dedupe: [
    'fingerprint',
    'requester_id',
    'equipment_id',
    'request_id',
    'claimed_at',
    'expires_at',
  ],

  // Achtung: KEIN `recipient_user_id`, und der Fehlertext heisst
  // `error_message`. Siehe Kopfkommentar.
  email_delivery_log: [
    'id',
    'email_type',
    'reference_id',
    'recipient_email',
    'status',
    'provider_message_id',
    'error_message',
    'subject',
    'created_at',
    'updated_at',
  ],

  rental_equipment: [
    'id',
    'salon_id',
    'type',
    'name',
    'description',
    'price_per_day_cents',
    'price_per_hour_cents',
    'price_per_week_cents',
    'price_per_month_cents',
    'available_days',
    'available_from',
    'available_to',
    'features',
    'is_available',
    'images',
    'created_at',
    'updated_at',
  ],

  // Der Code sprach diese Tabelle bis 2026-08-23 als `notifications` an.
  // KEIN `read_at` — das Lesedatum wird nirgends ausgewertet.
  notification_log: [
    'id',
    'user_id',
    'title',
    'body',
    'type',
    'reference_id',
    'reference_type',
    'is_read',
    'created_at',
  ],

  user_uploads: [
    'id',
    'user_id',
    'target',
    'salon_id',
    'equipment_id',
    'doc_key',
    'bucket',
    'storage_path',
    'mime_type',
    'size_bytes',
    'is_public',
    'created_at',
  ],

  salons: ['id', 'owner_id', 'name', 'city', 'slug', 'gallery', 'logo_url', 'created_at', 'updated_at'],

  rental_bookings: ['id', 'equipment_id', 'status', 'created_at'],

  profiles: ['id', 'email', 'full_name'],

  payout_accounts: ['user_id', 'context', 'account_holder'],
}

/**
 * Tabellen, die der Code anspricht, die es in der Produktionsdatenbank aber
 * NICHT gibt (Stand 2026-08-23). Kein Test deckt sie ab — sie stehen hier,
 * damit der Befund nicht nur in einem Report verschwindet.
 *
 * `notifications` fehlt bewusst in dieser Liste: der Code spricht sie seit
 * dem Fix nicht mehr an.
 */
export const MISSING_IN_PRODUCTION: readonly string[] = [
  'analytics_events',
  'newsletter_campaigns',
  'newsletter_sends',
]

/**
 * Registriert das Produktionsschema auf einer Fake-Datenbank.
 *
 * Danach scheitert jeder Schreibzugriff auf eine Spalte, die es live nicht
 * gibt, mit 42703 — statt stillschweigend zu funktionieren. Gehoert in jeden
 * Ketten-Test, der eine Route bis in die Datenbank durchlaeuft.
 */
export function applyLiveSchema(db: {
  defineSchema: (table: string, columns: readonly string[]) => unknown
}): void {
  for (const [table, columns] of Object.entries(LIVE_SCHEMA)) {
    db.defineSchema(table, columns)
  }
}
