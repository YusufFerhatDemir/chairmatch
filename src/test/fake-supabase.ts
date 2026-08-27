/**
 * In-Memory-Ersatz fuer den Supabase-Admin-Client.
 *
 * Gedacht fuer Route-Tests, die eine ganze Kette pruefen (Insert →
 * Folgeaktion → Log) und dafuer echten Tabellenzustand brauchen statt einer
 * Handvoll vorgefertigter Antworten. Der Fake kann genau das, was der
 * Produktivcode benutzt — und zwar mit den Eigenschaften, auf die er sich
 * verlaesst:
 *
 *  - UNIQUE-Indizes werden wirklich durchgesetzt (Fehlercode 23505 wie in
 *    Postgres). Nur so laesst sich Idempotenz ehrlich testen.
 *  - Fehler sind pro (Tabelle, Operation) injizierbar — inklusive
 *    „Tabelle fehlt" (PGRST205), also dem Zustand vor einer Migration.
 *  - Jeder Zugriff wird mitgeschrieben, damit ein Test auch belegen kann,
 *    dass etwas NICHT passiert ist.
 *
 *  - Ein optionales Spaltenschema pro Tabelle. Ist es gesetzt, laeuft ein
 *    Insert/Update auf eine unbekannte Spalte in 42703 — genau wie
 *    PostgREST. Ohne das war der Fake zu gutmuetig: er nahm jede Spalte an,
 *    und zwei Schema-Abweichungen (`notifications` statt `notification_log`,
 *    `email_delivery_log.recipient_user_id`/`.error`) blieben monatelang von
 *    einer gruenen Suite gedeckt, waehrend sie live jeden Tag fehlschlugen.
 *
 *  - Spalten-Projektion: `select('a, b')` liefert nur diese Spalten, damit
 *    ein Test belegen kann, dass eine Route interne Felder (Storage-Pfade,
 *    Fingerprints) NICHT mit ausliefert.
 *
 *  - NOT-NULL-Spalten pro Tabelle. Ein Insert, der eine davon auslaesst,
 *    scheitert mit 23502 — wie in Postgres. Ohne das war die Spaltenliste
 *    allein nicht genug: sie faengt eine ERFUNDENE Spalte, aber nicht eine
 *    VERGESSENE. Genau daran lief die Nachrichten-Kette. `messages` verlangt
 *    live `receiver_id`, `conversations` verlangt `customer_id` und
 *    `provider_id` — der Code schrieb keine davon, jeder INSERT lief in
 *    23502, und die Suite war trotzdem gruen.
 *
 *  - `order()` sortiert wirklich. Vorher merkte es sich nur die Spalte; ein
 *    Test konnte damit nicht belegen, dass eine Route deterministisch
 *    auswaehlt (`.order(...).limit(1)`) statt eine beliebige Zeile zu
 *    erwischen.
 *
 * Bewusst nicht abgebildet: der Join selbst (die eingebettete Zeile muss im
 * Seed stehen) und RLS. Wer Policies testen will, braucht eine echte
 * Datenbank. Die Projektion gilt seit Track 10 aber AUCH bei Einbettungen —
 * vorher schaltete jede Klammer sie ab, und genau dort liess sich nicht
 * belegen, dass eine Route Konto-IDs aus ihrer Antwort heraushaelt.
 */

export type Row = Record<string, unknown>

export interface FakeError {
  code?: string
  message: string
}

type Op = 'select' | 'insert' | 'update' | 'delete'

/**
 * Vergleichsoperatoren, die der Produktivcode benutzt. `lt`/`gt` vergleichen
 * lexikografisch — fuer ISO-8601-Zeitstempel (immer UTC, feste Breite) ist
 * das dieselbe Ordnung wie in Postgres.
 */
type FilterOp = 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'is' | 'in' | 'not'

interface Filter {
  column: string
  op: FilterOp
  value: unknown
  /** Nur bei `op: 'not'`: der negierte Operator, z. B. `is` in `.not(c,'is',null)`. */
  inner?: FilterOp
}

/**
 * Ein einzelner Zellvergleich. Ausgelagert, damit `.not()` denselben
 * Vergleich negieren kann, statt eine zweite Auslegung derselben Operatoren
 * zu fuehren.
 */
function compareCell(cell: unknown, op: FilterOp, value: unknown): boolean {
  switch (op) {
    case 'lt':
      return cell != null && value != null && String(cell) < String(value)
    case 'gt':
      return cell != null && value != null && String(cell) > String(value)
    case 'lte':
      return cell != null && value != null && String(cell) <= String(value)
    case 'gte':
      return cell != null && value != null && String(cell) >= String(value)
    case 'is':
      return value === null ? cell == null : cell === value
    case 'neq':
      return cell !== value
    case 'in':
      return Array.isArray(value) && value.includes(cell)
    default:
      return cell === value
  }
}

interface UniqueIndex {
  table: string
  columns: string[]
  name: string
}

export interface AccessLogEntry {
  table: string
  op: Op
  payload?: Row[]
}

interface RunResult {
  data: Row[] | null
  error: FakeError | null
}

/** Was PostgREST liefert, wenn eine Spalte nicht existiert. */
function undefinedColumn(table: string, column: string): FakeError {
  return { code: '42703', message: `column ${table}.${column} does not exist` }
}

/** Was Postgres liefert, wenn eine NOT-NULL-Spalte leer bleibt. */
function notNullViolation(table: string, column: string): FakeError {
  return {
    code: '23502',
    message: `null value in column "${column}" of relation "${table}" violates not-null constraint`,
  }
}

function uniqueViolation(index: UniqueIndex): FakeError {
  return {
    code: '23505',
    message: `duplicate key value violates unique constraint "${index.name}"`,
  }
}

/**
 * Zerlegt eine PostgREST-`select`-Liste in die Schluessel, die in der Antwort
 * stehen — eingebettete Ressourcen eingeschlossen.
 *
 * Bis Track 10 schaltete JEDE Klammer in der Liste die Projektion komplett ab
 * (`columns.includes('(') -> projection = null`). Damit lieferte der Fake bei
 * einer Abfrage wie
 *
 *     .select('id, rating, customer:profiles!fk(full_name)')
 *
 * die vollstaendige Zeile zurueck — inklusive `customer_id` und
 * `reported_by`. Ein Test konnte deshalb genau dort NICHT belegen, dass eine
 * Route Konto-IDs aus ihrer Antwort heraushaelt: an jeder Stelle, an der eine
 * Einbettung im Spiel ist. Das ist die haeufigste Stelle. Echtes PostgREST
 * wendet die Spaltenliste sehr wohl an.
 *
 * Abgebildet wird die Namensgebung der Antwort, nicht der Join:
 *   - `spalte`                        -> "spalte"
 *   - `alias:spalte`                  -> "alias"
 *   - `alias:tabelle!hinweis(a, b)`   -> "alias"
 *   - `tabelle(a, b)`                 -> "tabelle"
 * Der Inhalt der Klammer wird nicht weiter zugeschnitten — die eingebettete
 * Zeile kommt aus dem Seed, wie bisher.
 */
export interface SelectKey {
  /** Der Schluessel, unter dem der Wert in der Antwort steht. */
  key: string
  /**
   * Eingebettete Ressource? Die ist KEINE Spalte der abgefragten Tabelle und
   * darf deshalb nicht gegen das Spaltenschema laufen — sonst antwortet der
   * Fake auf `rental_equipment ... salons(id, name)` mit
   * "column rental_equipment.salons does not exist".
   */
  embedded: boolean
}

export function parseSelectColumns(columns: string): SelectKey[] {
  const keys: SelectKey[] = []
  let tiefe = 0
  let teil = ''

  const uebernehmen = () => {
    const roh = teil.trim()
    teil = ''
    if (!roh) return
    const embedded = roh.includes('(')
    // Alles ab der ersten Klammer gehoert zur Einbettung, nicht zum Namen.
    const ohneKlammer = roh.split('(')[0].trim()
    // `alias:ziel` -> der Schluessel in der Antwort ist der Alias.
    const name = (ohneKlammer.includes(':') ? ohneKlammer.split(':')[0] : ohneKlammer)
      // `tabelle!fk_hinweis` -> der Schluessel ist die Tabelle.
      .split('!')[0]
      .trim()
    if (name) keys.push({ key: name, embedded })
  }

  for (const zeichen of columns) {
    if (zeichen === '(') { tiefe++; teil += zeichen; continue }
    if (zeichen === ')') { tiefe--; teil += zeichen; continue }
    if (zeichen === ',' && tiefe === 0) { uebernehmen(); continue }
    teil += zeichen
  }
  uebernehmen()

  return keys
}

class FakeQuery implements PromiseLike<{ data: unknown; error: FakeError | null }> {
  private op: Op = 'select'
  private payload: Row[] = []
  private patch: Row = {}
  private filters: Filter[] = []
  private rowLimit: number | null = null
  private projection: SelectKey[] | null = null
  private orderBy: { column: string; ascending: boolean }[] = []

  constructor(
    private readonly db: FakeSupabase,
    private readonly table: string,
  ) {}

  insert(payload: Row | Row[]) {
    this.op = 'insert'
    this.payload = Array.isArray(payload) ? payload : [payload]
    return this
  }

  update(patch: Row) {
    this.op = 'update'
    this.patch = patch
    return this
  }

  delete() {
    this.op = 'delete'
    return this
  }

  /**
   * Merkt sich die Spaltenauswahl — Einbettungen eingeschlossen. `*` liefert
   * wie in PostgREST die ganze Zeile, auch neben einer Einbettung.
   */
  select(columns?: string) {
    if (!columns || columns.trim() === '*') {
      this.projection = null
      return this
    }
    this.projection = parseSelectColumns(columns)
    return this
  }

  /**
   * Schneidet die Antwort auf die ausgewaehlten Spalten zu — als Kopie, damit
   * die gespeicherte Zeile unangetastet bleibt.
   *
   * Ohne das lieferte jede Abfrage die volle Zeile, und ein Test konnte nicht
   * belegen, dass eine Route interne Felder (Storage-Pfade, Hashes) aus ihrer
   * Antwort heraushaelt.
   */
  private project(rows: Row[]): Row[] {
    const columns = this.projection
    if (!columns) return rows
    // `select('*, salons(name)')` ist erlaubt: der Stern steht fuer alle
    // Spalten der Tabelle, die Einbettung kommt dazu. Dann gibt es nichts
    // wegzuschneiden.
    if (columns.some(c => c.key === '*')) return rows
    return rows.map((row) => {
      const out: Row = {}
      for (const { key } of columns) {
        if (key in row) out[key] = row[key]
      }
      return out
    })
  }

  /** Nur fuer Tests der Projektion selbst — sonst nirgends gebraucht. */
  get selectedColumns(): string[] | null {
    return this.projection?.map(c => c.key) ?? null
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, op: 'eq', value })
    return this
  }

  /**
   * Kleiner-als. Gebraucht fuer die atomare Uebernahme abgelaufener
   * Dedupe-Claims (`… .eq('fingerprint', fp).lt('expires_at', now)`), wo der
   * Filter Teil der Korrektheit ist und nicht nur eine Projektion.
   */
  lt(column: string, value: unknown) {
    this.filters.push({ column, op: 'lt', value })
    return this
  }

  gt(column: string, value: unknown) {
    this.filters.push({ column, op: 'gt', value })
    return this
  }

  /**
   * Kleiner-gleich / groesser-gleich.
   *
   * Nachgetragen fuer die Zeitraum-Filter des Miet-Marktplatzes: die
   * Ueberschneidungspruefung in /api/rental-bookings und die Monatsfenster
   * der Umsatzseite bestehen ausschliesslich aus diesen beiden Operatoren.
   * Solange der Fake sie nicht kannte, war jeder Test, der sie braucht,
   * gar nicht erst schreibbar.
   */
  lte(column: string, value: unknown) {
    this.filters.push({ column, op: 'lte', value })
    return this
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, op: 'gte', value })
    return this
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, op: 'is', value })
    return this
  }

  /**
   * Negation eines Operators — `.not('stripe_transfer_id', 'is', null)`.
   *
   * Der Fake kannte sie bis Track 12 gar nicht, und das war teuer: der
   * Payout-Cron waehlt seine Kandidaten mit
   *
   *     .not('provider_user_id', 'is', null)
   *     .not('stripe_payment_intent_id', 'is', null)
   *
   * aus. Wer dafuer einen Test schreiben wollte, bekam
   * `…eq(...).not is not a function` — die Auszahlungsauswahl war also nicht
   * pruefbar, nicht weil sie zu schwer waere, sondern weil das Werkzeug
   * fehlte. (Eine `.not()` gab es im Repo, aber in der ZWEITEN
   * Fake-Implementierung, der inline in den e2e-Tests gebauten.)
   */
  not(column: string, operator: string, value: unknown) {
    this.filters.push({ column, op: 'not', value, inner: operator as FilterOp })
    return this
  }

  /** Ungleich. Gebraucht beim Aufraeumen alter Logo-Dateien. */
  neq(column: string, value: unknown) {
    this.filters.push({ column, op: 'neq', value })
    return this
  }

  /**
   * Mengenzugehoerigkeit. Traegt echte Korrektheit: der Loesch-Vorbehalt fuer
   * Mietobjekte haengt daran, ob eine Buchung in BLOCKING_STATUSES faellt.
   */
  in(column: string, values: unknown[]) {
    this.filters.push({ column, op: 'in', value: values })
    return this
  }

  /**
   * Sortiert das Ergebnis — und haelt die Spalte gegen das Schema.
   *
   * Beides zaehlt. Die Schemapruefung, weil PostgREST `?order=updated_at`
   * mit 42703 beantwortet, wenn es die Spalte nicht gibt: genau darauf lief
   * GET /api/messages (`conversations` heisst live `last_message_at`) und
   * lieferte jedem eingeloggten Nutzer 500 statt seines Postfachs, waehrend
   * hier alles gruen war.
   *
   * Und die Sortierung selbst, weil `.order(...).limit(1)` eine
   * Auswahlentscheidung ist. Solange der Fake nur die Spalte notierte,
   * konnte kein Test den Unterschied zwischen „nimmt die aelteste" und
   * „nimmt irgendeine" zeigen.
   *
   * NULL sortiert immer ans Ende — Postgres macht das bei ASC ebenso, bei
   * DESC nicht. Wo diese Unterscheidung die Korrektheit traegt, reicht der
   * Fake nicht; das ist bewusst so und gehoert dann in einen DB-Test.
   */
  order(column: string, opts?: { ascending?: boolean }) {
    this.orderBy.push({ column, ascending: opts?.ascending !== false })
    return this
  }

  limit(n: number) {
    this.rowLimit = n
    return this
  }

  async maybeSingle() {
    const { data, error } = this.run()
    if (error) return { data: null, error }
    return { data: data && data.length > 0 ? data[0] : null, error: null }
  }

  async single() {
    const { data, error } = this.run()
    if (error) return { data: null, error }
    if (!data || data.length !== 1) {
      return {
        data: null,
        error: {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
        } as FakeError,
      }
    }
    return { data: data[0], error: null }
  }

  then<TResult1 = { data: unknown; error: FakeError | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: FakeError | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run() as { data: unknown; error: FakeError | null }).then(
      onfulfilled,
      onrejected,
    )
  }

  private matches(row: Row): boolean {
    return this.filters.every((filter) => {
      const cell = row[filter.column]
      if (filter.op === 'not') {
        // `not.is.null` heisst „ist gesetzt". Ohne das Auswerten hier waere
        // `.not()` eine Attrappe, die jeden Filter durchwinkt — schlimmer
        // als gar keine Methode, weil der Test dann gruen luegt.
        return !compareCell(cell, filter.inner ?? 'eq', filter.value)
      }
      return compareCell(cell, filter.op, filter.value)
    })
  }

  private run(): RunResult {
    this.db.access.push({
      table: this.table,
      op: this.op,
      payload: this.op === 'insert' ? this.payload : this.op === 'update' ? [this.patch] : undefined,
    })

    const failure =
      this.db.failures.get(`${this.table}.${this.op}`) ?? this.db.failures.get(`${this.table}.*`)
    if (failure) return { data: null, error: failure }

    const rows = this.db.rows(this.table)

    if (this.op === 'select' || this.op === 'delete') {
      const unknownColumn = this.unknownReadColumn()
      if (unknownColumn) return { data: null, error: undefinedColumn(this.table, unknownColumn) }
    }

    if (this.op === 'insert') {
      const inserted: Row[] = []
      for (const raw of this.payload) {
        const unknownColumn = this.db.findUnknownColumn(this.table, raw)
        if (unknownColumn) return { data: null, error: undefinedColumn(this.table, unknownColumn) }
        // `id`/`created_at` vergibt sonst Postgres. Nur setzen, wenn die
        // Tabelle sie laut Schema ueberhaupt fuehrt — `rental_request_dedupe`
        // etwa hat weder das eine noch das andere.
        const row: Row = {
          ...(this.db.hasColumn(this.table, 'id') ? { id: this.db.nextId() } : {}),
          ...(this.db.hasColumn(this.table, 'created_at')
            ? { created_at: this.db.timestamp() }
            : {}),
          ...raw,
        }
        const missing = this.db.findMissingNotNull(this.table, row)
        if (missing) return { data: null, error: notNullViolation(this.table, missing) }
        const violated = this.db.findUniqueViolation(this.table, row)
        if (violated) return { data: null, error: uniqueViolation(violated) }
        rows.push(row)
        inserted.push(row)
      }
      return { data: this.project(inserted), error: null }
    }

    if (this.op === 'update') {
      const unknownColumn =
        this.db.findUnknownColumn(this.table, this.patch) ?? this.unknownReadColumn()
      if (unknownColumn) return { data: null, error: undefinedColumn(this.table, unknownColumn) }

      // Ein UPDATE darf eine NOT-NULL-Spalte nicht leeren. Geprueft wird nur,
      // was der Patch anfasst — was er nicht nennt, bleibt wie es war.
      for (const [column, value] of Object.entries(this.patch)) {
        if (value == null && this.db.isNotNull(this.table, column)) {
          return { data: null, error: notNullViolation(this.table, column) }
        }
      }

      const hit = rows.filter((row) => this.matches(row))
      for (const row of hit) Object.assign(row, this.patch)
      return { data: this.project(hit), error: null }
    }

    if (this.op === 'delete') {
      const hit = rows.filter((row) => this.matches(row))
      this.db.tables[this.table] = rows.filter((row) => !this.matches(row))
      return { data: this.project(hit), error: null }
    }

    let hit = rows.filter((row) => this.matches(row))
    hit = this.sort(hit)
    if (this.rowLimit != null) hit = hit.slice(0, this.rowLimit)
    return { data: this.project(hit), error: null }
  }

  /**
   * Wendet die per `order()` gemerkten Sortierschluessel an — der erste
   * zuerst, spaetere nur bei Gleichstand. Ohne `order()` bleibt die
   * Einfuegereihenfolge, so wie eine unsortierte Postgres-Abfrage keine
   * Reihenfolge zusichert.
   */
  private sort(rows: Row[]): Row[] {
    if (this.orderBy.length === 0) return rows
    return [...rows].sort((a, b) => {
      for (const { column, ascending } of this.orderBy) {
        const left = a[column]
        const right = b[column]
        if (left == null && right == null) continue
        if (left == null) return 1
        if (right == null) return -1
        if (left === right) continue
        const cmp =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left) < String(right)
              ? -1
              : 1
        return ascending ? cmp : -cmp
      }
      return 0
    })
  }

  /**
   * Lesende Zugriffe gegen das Spaltenschema pruefen.
   *
   * PostgREST beantwortet `?select=status` und `?eq.status=active` mit 42703,
   * wenn es die Spalte nicht gibt — und zwar bevor es die Rechte prueft.
   * Genau darauf beruht ./scripts/schema-probe.sh.
   *
   * Der Fake hat das bis 2026-08-24 nur fuer INSERT/UPDATE getan. Deshalb
   * konnte der komplette Newsletter live an `newsletter_subscribers.status`
   * scheitern (die Tabelle fuehrt `is_active`), waehrend hier alles gruen
   * blieb: die Anmeldung las `select('id, status')`, bekam vom Fake brav
   * eine Zeile und lief nie in den Fehlerzweig.
   */
  private unknownReadColumn(): string | null {
    // Eingebettete Ressourcen sind Beziehungen, keine Spalten dieser Tabelle.
    for (const { key, embedded } of this.projection ?? []) {
      if (embedded || key === '*') continue
      if (!this.db.hasColumn(this.table, key)) return key
    }
    for (const { column } of this.filters) {
      if (!this.db.hasColumn(this.table, column)) return column
    }
    for (const { column } of this.orderBy) {
      if (!this.db.hasColumn(this.table, column)) return column
    }
    return null
  }
}


// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export interface StoredObject {
  path: string
  contentType: string
  size: number
}

/**
 * Minimaler Ersatz fuer Supabase Storage.
 *
 * Er kann genau so viel, wie die Upload-Route braucht — und vor allem das,
 * worauf ihre Korrektheit beruht: `upsert: false` weist einen belegten Pfad
 * ab, und `remove` loescht wirklich. Nur damit laesst sich pruefen, dass eine
 * fehlgeschlagene DB-Zeile die bereits hochgeladene Datei wieder aufraeumt
 * statt sie verwaist liegen zu lassen.
 */
class FakeBucket {
  constructor(
    private readonly store: Map<string, StoredObject>,
    private readonly bucket: string,
    private readonly db: FakeSupabase,
  ) {}

  private key(path: string): string {
    return `${this.bucket}/${path}`
  }

  async upload(
    path: string,
    file: { size?: number },
    opts?: { contentType?: string; upsert?: boolean },
  ): Promise<{ data: { path: string } | null; error: FakeError | null }> {
    const failure = this.db.failures.get(`storage.${this.bucket}.upload`)
    if (failure) return { data: null, error: failure }

    if (!opts?.upsert && this.store.has(this.key(path))) {
      return { data: null, error: { message: 'The resource already exists', code: '23505' } }
    }
    this.store.set(this.key(path), {
      path,
      contentType: opts?.contentType ?? 'application/octet-stream',
      size: file?.size ?? 0,
    })
    return { data: { path }, error: null }
  }

  async remove(paths: string[]): Promise<{ data: unknown; error: FakeError | null }> {
    for (const path of paths) this.store.delete(this.key(path))
    return { data: null, error: null }
  }

  async createSignedUrl(path: string, expiresIn: number) {
    if (!this.store.has(this.key(path))) {
      return { data: null, error: { message: 'Object not found' } as FakeError }
    }
    return {
      data: { signedUrl: `https://storage.test/${this.bucket}/${path}?exp=${expiresIn}` },
      error: null,
    }
  }
}

class FakeStorage {
  readonly objects = new Map<string, StoredObject>()

  constructor(private readonly db: FakeSupabase) {}

  from(bucket: string): FakeBucket {
    return new FakeBucket(this.objects, bucket, this.db)
  }

  /** Alle abgelegten Pfade — fuer Assertions „Datei ist weg/da". */
  paths(): string[] {
    return [...this.objects.keys()]
  }

  clear() {
    this.objects.clear()
  }
}

export class FakeSupabase {
  tables: Record<string, Row[]> = {}
  /** Key: `tabelle.operation` oder `tabelle.*` */
  failures = new Map<string, FakeError>()
  access: AccessLogEntry[] = []
  private uniques: UniqueIndex[] = []
  /** Tabelle -> erlaubte Spalten. Fehlt ein Eintrag, wird nicht geprueft. */
  private schema = new Map<string, Set<string>>()
  /** Tabelle -> Spalten mit NOT NULL und ohne DEFAULT. */
  private notNullColumns = new Map<string, Set<string>>()
  private idCounter = 0
  private clock = 0

  readonly storage = new FakeStorage(this)

  from(table: string): FakeQuery {
    return new FakeQuery(this, table)
  }

  rows(table: string): Row[] {
    return (this.tables[table] ??= [])
  }

  seed(table: string, rows: Row[]) {
    this.rows(table).push(...rows)
    return this
  }

  /**
   * Legt fest, welche Spalten eine Tabelle hat. Danach scheitert jeder
   * Schreibzugriff auf eine andere Spalte mit 42703.
   *
   * Gedacht fuer Ketten-Tests, die gegen das echte Produktionsschema laufen
   * sollen (`src/test/live-schema.ts`). Tabellen ohne Schema bleiben
   * unveraendert freizuegig — kein Bestandstest muss angefasst werden.
   */
  defineSchema(table: string, columns: readonly string[]) {
    this.schema.set(table, new Set(columns))
    return this
  }

  /**
   * Fuehrt die Tabelle diese Spalte? Ohne definiertes Schema gilt jede
   * Spalte als vorhanden — so verhalten sich Bestandstests wie bisher.
   */
  hasColumn(table: string, column: string): boolean {
    const allowed = this.schema.get(table)
    return allowed ? allowed.has(column) : true
  }

  /** Erste Spalte in `row`, die die Tabelle nicht kennt — oder null. */
  findUnknownColumn(table: string, row: Row): string | null {
    const allowed = this.schema.get(table)
    if (!allowed) return null
    for (const column of Object.keys(row)) {
      if (!allowed.has(column)) return column
    }
    return null
  }

  /**
   * Legt fest, welche Spalten einer Tabelle NOT NULL sind und keinen DEFAULT
   * haben. Danach scheitert jeder Insert, der eine davon auslaesst, mit
   * 23502.
   *
   * Der Unterschied zu `defineSchema` ist der, an dem die Nachrichten-Kette
   * gescheitert ist: eine Spaltenliste faengt die ERFUNDENE Spalte, aber
   * nicht die VERGESSENE. `messages.receiver_id`,
   * `conversations.customer_id` und `.provider_id` sind live NOT NULL, der
   * Code schrieb keine davon — und der Fake nahm den unvollstaendigen Insert
   * bereitwillig an.
   */
  defineNotNull(table: string, columns: readonly string[]) {
    this.notNullColumns.set(table, new Set(columns))
    return this
  }

  /** Ist diese Spalte als NOT NULL registriert? */
  isNotNull(table: string, column: string): boolean {
    return this.notNullColumns.get(table)?.has(column) ?? false
  }

  /**
   * Erste NOT-NULL-Spalte, die in `row` fehlt oder null ist — oder null.
   * Geprueft wird die fertige Zeile, also nach den Defaults, die der Fake
   * selbst vergibt (`id`, `created_at`).
   */
  findMissingNotNull(table: string, row: Row): string | null {
    const required = this.notNullColumns.get(table)
    if (!required) return null
    for (const column of required) {
      if (row[column] == null) return column
    }
    return null
  }

  addUniqueIndex(table: string, columns: string[], name: string) {
    this.uniques.push({ table, columns, name })
    return this
  }

  /** Laesst jede Operation dieser Art fehlschlagen — z. B. `('profiles.select', …)`. */
  failOn(key: string, error: FakeError) {
    this.failures.set(key, error)
  }

  /** Simuliert eine noch nicht eingespielte Migration. */
  dropTable(table: string) {
    delete this.tables[table]
    this.failures.set(`${table}.*`, {
      code: 'PGRST205',
      message: `Could not find the table 'public.${table}' in the schema cache`,
    })
  }

  findUniqueViolation(table: string, row: Row): UniqueIndex | null {
    for (const index of this.uniques) {
      if (index.table !== table) continue
      const clash = this.rows(table).some((existing) =>
        index.columns.every((column) => existing[column] === row[column]),
      )
      if (clash) return index
    }
    return null
  }

  nextId(): string {
    this.idCounter += 1
    return `00000000-0000-4000-8000-${String(this.idCounter).padStart(12, '0')}`
  }

  timestamp(): string {
    this.clock += 1000
    return new Date(Date.UTC(2026, 7, 23, 12, 0, 0) + this.clock).toISOString()
  }

  reset() {
    this.tables = {}
    this.failures.clear()
    this.access = []
    this.uniques = []
    this.schema.clear()
    this.notNullColumns.clear()
    this.storage.clear()
    this.idCounter = 0
    this.clock = 0
  }
}

/**
 * Eine Instanz pro Testlauf. Der Mock von `@/lib/supabase-server` gibt genau
 * dieses Objekt zurueck, damit Test und Produktivcode denselben Zustand sehen.
 */
export const fakeDb = new FakeSupabase()
