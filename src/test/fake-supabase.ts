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
 * Bewusst nicht abgebildet: Spalten-Projektion (`select('a, b')` liefert die
 * ganze Zeile), Joins und RLS. Wer Projektion oder Policies testen will,
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
type FilterOp = 'eq' | 'lt' | 'gt' | 'is'

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

  select(_columns?: string) {
    return this
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

  order(_column: string, _opts?: unknown) {
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

    if (this.op === 'insert') {
      const inserted: Row[] = []
      for (const raw of this.payload) {
        const row: Row = { id: this.db.nextId(), created_at: this.db.timestamp(), ...raw }
        const violated = this.db.findUniqueViolation(this.table, row)
        if (violated) return { data: null, error: uniqueViolation(violated) }
        rows.push(row)
        inserted.push(row)
      }
      return { data: inserted, error: null }
    }

    if (this.op === 'update') {
      const hit = rows.filter((row) => this.matches(row))
      for (const row of hit) Object.assign(row, this.patch)
      return { data: hit, error: null }
    }

    if (this.op === 'delete') {
      const hit = rows.filter((row) => this.matches(row))
      this.db.tables[this.table] = rows.filter((row) => !this.matches(row))
      return { data: hit, error: null }
    }

    let hit = rows.filter((row) => this.matches(row))
    if (this.rowLimit != null) hit = hit.slice(0, this.rowLimit)
    return { data: hit, error: null }
  }
}

export class FakeSupabase {
  tables: Record<string, Row[]> = {}
  /** Key: `tabelle.operation` oder `tabelle.*` */
  failures = new Map<string, FakeError>()
  access: AccessLogEntry[] = []
  private uniques: UniqueIndex[] = []
  private idCounter = 0
  private clock = 0

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
    this.idCounter = 0
    this.clock = 0
  }
}

/**
 * Eine Instanz pro Testlauf. Der Mock von `@/lib/supabase-server` gibt genau
 * dieses Objekt zurueck, damit Test und Produktivcode denselben Zustand sehen.
 */
export const fakeDb = new FakeSupabase()
