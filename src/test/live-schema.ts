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
export const LIVE_SCHEMA_VERIFIED_AT = '2026-08-27'

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

  /**
   * Um die Spalten erweitert, die der Buchungspfad liest (Sonde
   * 2026-08-27): `category` fuer die Terminliste, `opening_hours` und
   * `state` fuer die Slot-Berechnung, die Adressfelder fuer den
   * ICS-Export, `is_active` fuer die Frage, ob ein Salon ueberhaupt noch
   * Termine annimmt.
   */
  salons: ['id', 'owner_id', 'name', 'city', 'slug', 'gallery', 'logo_url', 'created_at', 'updated_at',
           'category', 'is_active', 'opening_hours', 'state', 'street', 'house_number', 'postal_code',
           'avg_rating', 'review_count', 'description', 'phone'],

  /**
   * Termin-Buchungen — Spaltensonde 2026-08-27.
   *
   * Diese Liste ist der Grund, warum Track 6 ueberhaupt eine Sonde gefahren
   * hat: `supabase-setup.sql` fuehrt eine voellig ANDERE `bookings`-Tabelle
   * (`user_id`, `provider_id`, `service_name`, `date`, `time_slot`,
   * `price NUMERIC`). Waere das der Live-Stand, liefe jede einzelne Buchung
   * in 42703. Die Sonde sagt: es ist die Fassung aus dem Modulcode
   * (`customer_id`, `salon_id`, `booking_date`, `start_time`, `end_time`,
   * `price_cents`). `supabase-setup.sql` beschreibt einen Zustand, den es
   * live nicht (mehr) gibt.
   *
   * Ausdruecklich NICHT vorhanden (42703 bei der Sonde) — hier steht, was
   * fehlt, damit niemand es "einfach schreibt":
   *   user_id, cancelled_at, cancelled_by, cancellation_fee_cents,
   *   fee_cents, deposit_cents, service_name, date, time_slot
   *
   * Die letzten drei sind die Legacy-Namen aus supabase-setup.sql, die
   * ersten sechs sind Spalten, die eine Stornogebuehr aufnehmen wuerden. Es
   * gibt sie nicht: eine Gebuehr laesst sich heute nirgends festschreiben.
   * Die Frist-Logik in `cancelBooking` meldet deshalb nur, OB die Frist
   * gerissen ist — sie beziffert nichts.
   *
   * `provider_id`, `resource_id`, `booking_type` und `is_first_visit` sind
   * live vorhanden (aus 20260311_spec_v2 / 20260321_marketplace), werden vom
   * Code aber nirgends geschrieben. Alle vier kamen per
   * `ADD COLUMN IF NOT EXISTS` ohne NOT NULL dazu — sie stehen deshalb NICHT
   * in LIVE_NOT_NULL, und ihr Fehlen im INSERT ist kein 23502.
   */
  bookings: [
    'id',
    'customer_id',
    'salon_id',
    'service_id',
    'staff_id',
    'booking_date',
    'start_time',
    'end_time',
    'status',
    'price_cents',
    'notes',
    'cancellation_reason',
    'created_at',
    'updated_at',
    'provider_id',
    'resource_id',
    'booking_type',
    'payment_status',
    'stripe_session_id',
    'stripe_payment_intent',
    'is_first_visit',
  ],

  /**
   * Leistungen — Spaltensonde 2026-08-27, zusaetzlich per anon-Lesezugriff
   * vollstaendig bestaetigt (die Tabelle ist oeffentlich lesbar).
   */
  services: [
    'id',
    'salon_id',
    'name',
    'description',
    'category',
    'duration_minutes',
    'price_cents',
    'currency',
    'is_active',
    'sort_order',
    'created_at',
    'risk_level',
    'slug',
  ],

  /**
   * Stornofrist und Anzahlung je Salon — Spaltensonde 2026-08-27.
   *
   * ACHTUNG: `cancellation_fee_cents` und `late_cancel_fee_cents` gibt es
   * NICHT (beide 42703). Die einzige Gebuehr, die hier festgeschrieben
   * werden kann, ist `no_show_fee_cents` — und die gilt fuer Nichterscheinen,
   * nicht fuer eine verspaetete Absage. Wer eine Storno-Gebuehr betragsmaessig
   * ausweisen will, braucht zuerst eine Migration.
   */
  booking_policies: [
    'id',
    'salon_id',
    'deposit_percent',
    'cancellation_hours',
    'no_show_fee_cents',
    'created_at',
    'updated_at',
  ],

  staff: ['id', 'salon_id', 'name', 'title', 'is_active'],

  consents: ['id', 'user_id', 'booking_id', 'type', 'given', 'created_at'],

  audit_logs: ['id', 'user_id', 'action', 'entity', 'entity_id', 'details', 'created_at'],

  promo_codes: [
    'id',
    'code',
    'discount',
    'type',
    'is_active',
    'expires_at',
    'max_uses',
    'used_count',
  ],

  /**
   * Miet-Buchungen — Spaltensonde 2026-08-27.
   *
   * Die Liste stand bis dahin auf vier Spalten, weil nur so viele angefasst
   * wurden. Track 7 liest sie fuer die Umsatzseite des Vermieters komplett,
   * deshalb hier der volle Ist-Zustand.
   *
   * Ausdruecklich NICHT vorhanden (42703 bei der Sonde): `salon_id`,
   * `user_id`, `customer_id`, `price_cents`, `days`. Der Mieter heisst
   * `renter_id`, und ein Salonbezug existiert NUR ueber
   * `equipment_id -> rental_equipment.salon_id`. Wer die Buchungen eines
   * Salons will, muss erst dessen Mietobjekte holen — ein direkter Filter
   * auf `salon_id` laeuft in 42703.
   */
  rental_bookings: [
    'id',
    'equipment_id',
    'renter_id',
    'start_date',
    'end_date',
    'total_cents',
    'status',
    'payment_status',
    'stripe_session_id',
    'created_at',
    'updated_at',
  ],

  /**
   * Merkliste — Spaltensonde 2026-08-27.
   *
   * ACHTUNG: `equipment_id` gibt es NICHT (42703). Die Merkliste kann
   * ausschliesslich SALONS aufnehmen, keine einzelnen Mietobjekte. Die
   * Mieter-Merkliste unter /mieter/mein-bereich/favoriten arbeitet deshalb
   * geraetelokal weiter und sagt das auch — serverseitig speicherbar waere
   * sie erst nach einer Migration.
   */
  favorites: ['id', 'customer_id', 'salon_id', 'created_at'],

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
 *
 * `bookings` steht hier BEWUSST NICHT drin. Die Spaltensonde belegt, welche
 * Spalten es gibt, nicht welche NOT NULL sind — und fuer `bookings` gibt es
 * im Repo kein `CREATE TABLE`, aus dem sich das ableiten liesse
 * (`supabase-setup.sql` beschreibt eine andere Tabelle, siehe LIVE_SCHEMA).
 * Eine geratene NOT-NULL-Liste waere schlimmer als keine: sie wuerde Tests
 * gruen oder rot faerben, ohne dass irgendetwas davon belegt ist. Der
 * INSERT in `createBooking` setzt ohnehin jede fachlich noetige Spalte.
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
 * NICHT gibt.
 *
 * Stand 2026-08-27: KEINE mehr. Die Sonde beantwortet alle drei frueher hier
 * gefuehrten Tabellen ohne PGRST205 — sie existieren also inzwischen live:
 *
 *   analytics_events      vorhanden, und NICHT mehr anon-lesbar
 *                         (42501 "permission denied for table
 *                         analytics_events"). Der frueher belegte
 *                         DSGVO-Lesezugriff ist damit zu.
 *   newsletter_campaigns  vorhanden, anon lesbar, 0 Zeilen
 *   newsletter_sends      vorhanden, anon lesbar, 0 Zeilen
 *
 * Die beiden Newsletter-Tabellen sind heute harmlos, weil sie leer sind.
 * `newsletter_sends` verknuepft aber Kampagne und Abonnent — sobald dort
 * Zeilen stehen, ist das ein oeffentlich lesbares Zustellprotokoll.
 * `newsletter_subscribers` selbst ist zu (42501), die Adressen liegen also
 * nicht offen. Aufraeumen gehoert in einen eigenen Track, nicht hierher.
 *
 * Die Liste bleibt als leeres Array stehen: sie ist die Stelle, an der ein
 * neuer Fund notiert wird.
 *
 * Bis Track 10 stand hier
 *
 *     export const MISSING_IN_PRODUCTION: readonly string[] = [] = [
 *       'analytics_events', 'newsletter_campaigns', 'newsletter_sends',
 *     ]
 *
 * — ein doppeltes `=`. Das ist gueltiges JavaScript und bedeutet etwas
 * anderes, als es aussieht: `[] = [...]` ist eine Destrukturierung ins Leere,
 * und der Wert dieses Ausdrucks ist die RECHTE Seite. Die Konstante trug
 * damit genau die drei Tabellennamen, die der Kommentar darueber und die
 * Sonde vom 27.08.2026 fuer erledigt erklaeren. Kein Test las sie, also fiel
 * es nur ESLint auf (`no-empty-pattern`).
 */
export const MISSING_IN_PRODUCTION: readonly string[] = []

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
