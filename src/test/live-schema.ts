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

/** Verifiziert am 2026-08-24 gegen die Produktionsdatenbank. */
export const LIVE_SCHEMA_VERIFIED_AT = '2026-08-24'

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

  /**
   * `deleted_at`, `delete_requested_at`, `is_active` und `avatar_url` sind
   * live vorhanden (Spaltensonde 2026-08-27). Sie stehen hier, weil der
   * Nachrichten-Versand den Empfaenger gegen sie prueft: an ein
   * geloeschtes oder zur Loeschung angemeldetes Konto geht keine Nachricht
   * mehr.
   */
  profiles: [
    'id',
    'email',
    'full_name',
    'avatar_url',
    'role',
    'is_active',
    'deleted_at',
    'delete_requested_at',
  ],

  payout_accounts: ['user_id', 'context', 'account_holder'],

  /**
   * Live vorhanden: `last_message_at` — NICHT `updated_at`. Der Code hat bis
   * 2026-08-24 nach `updated_at` sortiert und geschrieben; GET /api/messages
   * antwortete deshalb jedem eingeloggten Nutzer mit 500, und eine neue
   * Konversation liess sich gar nicht anlegen.
   *
   * `customer_id` und `provider_id` standen bis 2026-08-27 nicht in dieser
   * Liste — nicht, weil es sie nicht gibt, sondern weil der Code sie nicht
   * anfasste und die Liste nur aufzaehlte, was er anfasst. Beide sind live
   * vorhanden (Spaltensonde 2026-08-27) und laut der Migration, die die
   * Tabelle angelegt hat, NOT NULL. Siehe LIVE_NOT_NULL.
   */
  conversations: [
    'id',
    'customer_id',
    'provider_id',
    'salon_id',
    'created_at',
    'last_message_at',
  ],

  conversation_participants: ['id', 'conversation_id', 'user_id'],

  /** `receiver_id` — dieselbe Geschichte wie oben. Siehe LIVE_NOT_NULL. */
  messages: [
    'id',
    'conversation_id',
    'sender_id',
    'receiver_id',
    'content',
    'is_read',
    'created_at',
  ],

  /**
   * Live vorhanden: `severity` — NICHT `level`. `logError()` schreibt
   * korrekt nach `severity`; nur das MIS las `level` und bekam deshalb
   * dauerhaft eine leere Fehlerliste.
   */
  error_logs: ['id', 'message', 'stack', 'url', 'user_agent', 'ip', 'user_id',
               'severity', 'component', 'context', 'created_at'],

  /**
   * ACHTUNG — hier steht bewusst die ALTE Fassung.
   *
   * Die Tabelle existiert live, aber mit `is_active` (boolean) statt
   * `status` (text), und ohne `name`, `tags`, `unsubscribe_token`,
   * `last_sent_at`, `is_confirmed`. Der gesamte Newsletter-Code ist gegen
   * die neue Fassung geschrieben — er lief live also in 42703, von der
   * oeffentlichen Anmeldung bis zur Abmeldeseite.
   *
   * Erhoben am 2026-08-24 per Spaltenprobe. Sobald
   * supabase/migrations/20260824_newsletter_schema_repair.sql eingespielt
   * ist, wird diese Liste durch NEWSLETTER_SUBSCRIBERS_AFTER_REPAIR ersetzt
   * — und erst dann, nicht vorher.
   */
  newsletter_subscribers: [
    'id',
    'email',
    'source',
    'user_id',
    'subscribed_at',
    'unsubscribed_at',
    'is_active',
  ],
}

/**
 * Spalten, die live NOT NULL sind und keinen DEFAULT haben — ein INSERT ohne
 * sie scheitert mit 23502.
 *
 * Warum es diese Liste braucht: LIVE_SCHEMA faengt die erfundene Spalte
 * (42703), aber nicht die vergessene. Die Nachrichten-Kette lief genau
 * dagegen. `messages.receiver_id`, `conversations.customer_id` und
 * `.provider_id` werden im Code nirgends geschrieben, obwohl die Migration,
 * die die Tabellen angelegt hat (20260317_payments_and_compliance.sql,
 * identisch in _BUNDLED_FOR_PROD.sql), sie als NOT NULL fuehrt. Damit war
 * jedes POST /api/messages ein 23502 → 500, und das ChatWidget verschluckt
 * den Fehlschlag wortlos.
 *
 * Zur Belastbarkeit, ehrlich: dass die drei Spalten LIVE EXISTIEREN, ist per
 * Spaltensonde am 2026-08-27 belegt. Dass sie live auch NOT NULL sind, ist
 * NICHT direkt geprueft — der Service-Role-Key ist tot, der ANON-Key hat auf
 * diesen Tabellen kein Leserecht (42501), und die OpenAPI-Beschreibung
 * antwortet mit 401. Belegt ist der Migrationstext, und keine Migration im
 * Repo lockert das NOT NULL wieder.
 *
 * Der Fix haengt an dieser Unsicherheit nicht: die Spalten zu schreiben ist
 * in beiden Faellen richtig. Waeren sie nullable, blieben `receiver_id` und
 * `customer_id`/`provider_id` leer — und damit sowohl der Index
 * `idx_messages_receiver_unread` als auch die RLS-Policies `messages_select`
 * (`receiver_id = auth.uid()`) und `conversations_select`
 * (`customer_id = auth.uid() OR provider_id = auth.uid()`) dauerhaft
 * wirkungslos.
 */
export const LIVE_NOT_NULL: Record<string, readonly string[]> = {
  conversations: ['customer_id', 'provider_id'],
  conversation_participants: ['conversation_id', 'user_id'],
  messages: ['conversation_id', 'sender_id', 'receiver_id', 'content'],
}

/**
 * Zielzustand von `newsletter_subscribers` nach
 * supabase/migrations/20260824_newsletter_schema_repair.sql.
 *
 * Steht hier, damit die Ketten-Tests BEIDE Zustaende belegen koennen: dass
 * der Code heute ehrlich scheitert, und dass er nach der Migration
 * durchlaeuft. Ein Test, der nur den Zielzustand kennt, haette den Ausfall
 * nicht gefunden — genau das ist hier passiert.
 */
export const NEWSLETTER_SUBSCRIBERS_AFTER_REPAIR: readonly string[] = [
  'id',
  'email',
  'name',
  'source',
  'status',
  'tags',
  'unsubscribe_token',
  'last_sent_at',
  'is_confirmed',
  'user_id',
  'subscribed_at',
  'unsubscribed_at',
  'is_active',
]

/**
 * Tabellen, die der Code anspricht, die es in der Produktionsdatenbank aber
 * NICHT gibt (Stand 2026-08-24, per Spaltenprobe ueber alle 63 im Code
 * referenzierten Tabellen bestaetigt — nur diese drei fehlen).
 *
 * `notifications` fehlt bewusst in dieser Liste: der Code spricht sie seit
 * dem Fix nicht mehr an.
 *
 * Migrationen dafuer liegen im Repo und muessen im Supabase-SQL-Editor
 * eingespielt werden:
 *   analytics_events      → 20260525_analytics_events.sql
 *   newsletter_campaigns  → 20260824_newsletter_schema_repair.sql
 *   newsletter_sends      → 20260824_newsletter_schema_repair.sql
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
  defineNotNull?: (table: string, columns: readonly string[]) => unknown
}): void {
  for (const [table, columns] of Object.entries(LIVE_SCHEMA)) {
    db.defineSchema(table, columns)
  }
  // Optional, weil es zwei Fake-Implementierungen gibt und nur eine das
  // heute kann (src/test/fake-supabase.ts). Wer die andere benutzt, verliert
  // die 23502-Pruefung — nicht mehr und nicht weniger.
  if (db.defineNotNull) {
    for (const [table, columns] of Object.entries(LIVE_NOT_NULL)) {
      db.defineNotNull(table, columns)
    }
  }
}
