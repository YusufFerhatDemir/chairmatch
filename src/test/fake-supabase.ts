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
 * Bewusst nicht abgebildet: Joins (eine `select`-Liste mit eingebetteter
 * Ressource schaltet die Projektion ab) und RLS. Wer Policies testen will,
 * braucht eine echte Datenbank.
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
type FilterOp = 'eq' | 'neq' | 'lt' | 'gt' | 'is' | 'in'

interface Filter {
  column: string
  op: FilterOp
  value: unknown
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

function uniqueViolation(index: UniqueIndex): FakeError {
  return {
    code: '23505',
    message: `duplicate key value violates unique constraint "${index.name}"`,
  }
}

class FakeQuery implements PromiseLike<{ data: unknown; error: FakeError | null }> {
  private op: Op = 'select'
  private payload: Row[] = []
  private patch: Row = {}
  private filters: Filter[] = []
  private rowLimit: number | null = null
  private projection: string[] | null = null
  private orderColumns: string[] = []

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
   * Merkt sich die Spaltenauswahl. Eingebettete Ressourcen
   * (`salons(owner_id)`) schalten die Projektion ab — der Fake kann keine
   * Joins, und eine halb angewandte Projektion waere irrefuehrender als gar
   * keine. `*` liefert wie in PostgREST die ganze Zeile.
   */
  select(columns?: string) {
    if (!columns || columns.includes('(') || columns.trim() === '*') {
      this.projection = null
      return this
    }
    this.projection = columns.split(',').map((c) => c.trim()).filter(Boolean)
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
    return rows.map((row) => {
      const out: Row = {}
      for (const column of columns) {
        if (column in row) out[column] = row[column]
      }
      return out
    })
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

  is(column: string, value: unknown) {
    this.filters.push({ column, op: 'is', value })
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
   * Merkt sich die Sortierspalte. Sortiert wird nicht — die Tests hier
   * pruefen Zustand, keine Reihenfolge — aber die Spalte wird gegen das
   * Schema gehalten.
   *
   * Warum das zaehlt: PostgREST beantwortet `?order=updated_at` mit 42703,
   * wenn es die Spalte nicht gibt. Genau darauf lief GET /api/messages —
   * `conversations` heisst live `last_message_at` — und lieferte jedem
   * eingeloggten Nutzer 500 statt seines Postfachs, waehrend hier alles
   * gruen war.
   */
  order(column: string, _opts?: unknown) {
    this.orderColumns.push(column)
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
    return this.filters.every(({ column, op, value }) => {
      const cell = row[column]
      switch (op) {
        case 'lt':
          return cell != null && value != null && String(cell) < String(value)
        case 'gt':
          return cell != null && value != null && String(cell) > String(value)
        case 'is':
          return value === null ? cell == null : cell === value
        case 'neq':
          return cell !== value
        case 'in':
          return Array.isArray(value) && value.includes(cell)
        default:
          return cell === value
      }
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
    if (this.rowLimit != null) hit = hit.slice(0, this.rowLimit)
    return { data: this.project(hit), error: null }
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
    for (const column of this.projection ?? []) {
      if (!this.db.hasColumn(this.table, column)) return column
    }
    for (const { column } of this.filters) {
      if (!this.db.hasColumn(this.table, column)) return column
    }
    for (const column of this.orderColumns) {
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
