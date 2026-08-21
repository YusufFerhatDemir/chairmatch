/**
 * Fake-Supabase — In-Memory-Nachbau des supabase-js Query-Builders.
 *
 * Warum kein echter DB-Zugriff in den E2E-Tests?
 *  - Produktion und Tests teilen sich dasselbe Supabase-Projekt
 *    (pwdbjqfpgumyfktbfswg). Tests, die dort schreiben, erzeugen echte
 *    Buchungen, echte Zahlungen, echte Audit-Logs.
 *  - Der gesamte Server-Code läuft über `getSupabaseAdmin()` (service_role,
 *    umgeht RLS). Genau diese eine Fabrik wird hier ersetzt — der komplette
 *    Pfad Route → Action → Service läuft echt, nur die DB ist im Speicher.
 *
 * Unterstützt wird die Teilmenge des Query-Builders, die der Produktivcode
 * tatsächlich benutzt:
 *   from().select().eq()/.neq()/.in()/.lte()/.gte()/.order()/.limit()/.single()
 *   from().select('*', { count: 'exact', head: true })
 *   from().insert().select().single()
 *   from().update().eq()...   from().delete().eq()
 *
 * Relationen (`salons(name, owner_id)`, `rental_equipment(...)`) werden NICHT
 * aus dem Select-String geparst, sondern über eine Relations-Tabelle
 * (siehe fixtures.ts) eingebettet. Das reicht, weil der Produktivcode die
 * eingebetteten Objekte immer über den Tabellen-/Alias-Namen liest.
 */

export type Row = Record<string, unknown>

export interface RelationDef {
  /** Zieltabelle der Beziehung */
  table: string
  /** Spalte auf der Ausgangstabelle, die auf `table.id` zeigt */
  localKey: string
}

/** table -> alias -> Beziehung */
export type RelationMap = Record<string, Record<string, RelationDef>>

export interface PostgrestError {
  code: string
  message: string
  details: string | null
  hint: string | null
}

export type InsertHook = (table: string, row: Row) => PostgrestError | null

export type QueryOp = 'select' | 'insert' | 'update' | 'delete'

export interface CallLogEntry {
  op: QueryOp
  table: string
  payload?: unknown
}

type FilterOp = 'eq' | 'neq' | 'in' | 'lte' | 'gte' | 'gt' | 'lt' | 'is'
interface Filter {
  op: FilterOp
  column: string
  value: unknown
}

export function pgError(code: string, message: string): PostgrestError {
  return { code, message, details: null, hint: null }
}

/** PostgREST-Fehler, wenn `.single()` keine (oder mehrere) Zeilen findet */
export const NO_ROWS = pgError(
  'PGRST116',
  'JSON object requested, multiple (or no) rows returned',
)

function cmp(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const as = String(a ?? '')
  const bs = String(b ?? '')
  return as < bs ? -1 : as > bs ? 1 : 0
}

interface Result<T> {
  data: T
  error: PostgrestError | null
  count?: number | null
}

class FakeQuery implements PromiseLike<Result<unknown>> {
  private op: QueryOp = 'select'
  private filters: Filter[] = []
  private payload: Row[] = []
  private wantSingle = false
  private returnRows = false
  private headOnly = false
  private wantCount = false
  private limitN: number | null = null
  private orderBy: { column: string; ascending: boolean } | null = null

  constructor(
    private readonly db: FakeSupabase,
    private readonly tableName: string,
  ) {}

  select(_columns?: string, options?: { count?: string; head?: boolean }): this {
    if (this.op === 'select') {
      this.wantCount = !!options?.count
      this.headOnly = !!options?.head
    } else {
      // .insert(...).select() → eingefügte Zeilen zurückgeben
      this.returnRows = true
    }
    return this
  }

  insert(values: Row | Row[]): this {
    this.op = 'insert'
    this.payload = Array.isArray(values) ? values : [values]
    return this
  }

  update(values: Row): this {
    this.op = 'update'
    this.payload = [values]
    return this
  }

  upsert(values: Row | Row[]): this {
    return this.insert(values)
  }

  delete(): this {
    this.op = 'delete'
    return this
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ op: 'eq', column, value })
    return this
  }
  neq(column: string, value: unknown): this {
    this.filters.push({ op: 'neq', column, value })
    return this
  }
  in(column: string, value: unknown[]): this {
    this.filters.push({ op: 'in', column, value })
    return this
  }
  lte(column: string, value: unknown): this {
    this.filters.push({ op: 'lte', column, value })
    return this
  }
  gte(column: string, value: unknown): this {
    this.filters.push({ op: 'gte', column, value })
    return this
  }
  lt(column: string, value: unknown): this {
    this.filters.push({ op: 'lt', column, value })
    return this
  }
  gt(column: string, value: unknown): this {
    this.filters.push({ op: 'gt', column, value })
    return this
  }
  is(column: string, value: unknown): this {
    this.filters.push({ op: 'is', column, value })
    return this
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderBy = { column, ascending: options?.ascending !== false }
    return this
  }

  limit(n: number): this {
    this.limitN = n
    return this
  }

  single(): this {
    this.wantSingle = true
    this.returnRows = true
    return this
  }

  maybeSingle(): this {
    return this.single()
  }

  then<TResult1 = Result<unknown>, TResult2 = never>(
    onfulfilled?: ((value: Result<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected)
  }

  private matches(row: Row): boolean {
    return this.filters.every(f => {
      const v = row[f.column]
      switch (f.op) {
        case 'eq':
          return v === f.value
        case 'neq':
          return v !== f.value
        case 'in':
          return Array.isArray(f.value) && (f.value as unknown[]).includes(v)
        case 'is':
          return v === f.value
        case 'lte':
          return cmp(v, f.value) <= 0
        case 'gte':
          return cmp(v, f.value) >= 0
        case 'lt':
          return cmp(v, f.value) < 0
        case 'gt':
          return cmp(v, f.value) > 0
      }
    })
  }

  private async exec(): Promise<Result<unknown>> {
    this.db.log.push({
      op: this.op,
      table: this.tableName,
      payload: this.payload.length ? this.payload : undefined,
    })

    const forced = this.db.takeForcedError(this.tableName, this.op)
    if (forced) return { data: null, error: forced }

    const rows = this.db.rows(this.tableName)

    if (this.op === 'insert') {
      const inserted: Row[] = []
      for (const raw of this.payload) {
        const row: Row = { ...raw }
        if (row.id === undefined) row.id = this.db.nextId()
        if (row.created_at === undefined) row.created_at = new Date().toISOString()
        const hookError = this.db.runInsertHooks(this.tableName, row)
        if (hookError) return { data: null, error: hookError }
        rows.push(row)
        inserted.push(row)
      }
      if (!this.returnRows) return { data: null, error: null }
      return this.wantSingle
        ? { data: this.db.embed(this.tableName, inserted[0]), error: null }
        : { data: inserted.map(r => this.db.embed(this.tableName, r)), error: null }
    }

    if (this.op === 'update') {
      const patch = this.payload[0] ?? {}
      const hit = rows.filter(r => this.matches(r))
      for (const r of hit) Object.assign(r, patch)
      if (!this.returnRows) return { data: null, error: null }
      return this.wantSingle
        ? { data: hit[0] ? this.db.embed(this.tableName, hit[0]) : null, error: hit[0] ? null : NO_ROWS }
        : { data: hit.map(r => this.db.embed(this.tableName, r)), error: null }
    }

    if (this.op === 'delete') {
      const keep: Row[] = []
      const removed: Row[] = []
      for (const r of rows) (this.matches(r) ? removed : keep).push(r)
      this.db.replace(this.tableName, keep)
      return { data: this.returnRows ? removed : null, error: null }
    }

    // --- select ---
    let hit = rows.filter(r => this.matches(r))

    if (this.orderBy) {
      const { column, ascending } = this.orderBy
      hit = [...hit].sort((a, b) => (ascending ? cmp(a[column], b[column]) : cmp(b[column], a[column])))
    }
    if (this.limitN !== null) hit = hit.slice(0, this.limitN)

    if (this.headOnly) return { data: null, error: null, count: hit.length }

    const embedded = hit.map(r => this.db.embed(this.tableName, r))

    if (this.wantSingle) {
      if (embedded.length !== 1) return { data: null, error: NO_ROWS }
      return { data: embedded[0], error: null }
    }

    return this.wantCount
      ? { data: embedded, error: null, count: embedded.length }
      : { data: embedded, error: null }
  }
}

export class FakeSupabase {
  private tables = new Map<string, Row[]>()
  private insertHooks: InsertHook[] = []
  private forcedErrors: { table: string; op: QueryOp; error: PostgrestError; once: boolean }[] = []
  private idCounter = 0

  /** Protokoll aller abgesetzten Queries — für Assertions über Seiteneffekte */
  readonly log: CallLogEntry[] = []

  constructor(
    seed: Record<string, Row[]> = {},
    readonly relations: RelationMap = {},
  ) {
    for (const [table, rows] of Object.entries(seed)) {
      this.tables.set(table, rows.map(r => ({ ...r })))
    }
  }

  /** Supabase-Auth-Admin — nur die im Produktivcode benutzten Aufrufe */
  readonly auth = {
    admin: {
      updateUserById: async (id: string, attrs: Record<string, unknown>) => {
        this.log.push({ op: 'update', table: 'auth.users', payload: { id, ...attrs } })
        return { data: { user: { id } }, error: null }
      },
    },
  }

  from(table: string): FakeQuery {
    return new FakeQuery(this, table)
  }

  /** Rohzeilen einer Tabelle (mutierbar — genau das wollen wir in Assertions) */
  rows(table: string): Row[] {
    let t = this.tables.get(table)
    if (!t) {
      t = []
      this.tables.set(table, t)
    }
    return t
  }

  replace(table: string, rows: Row[]): void {
    this.tables.set(table, rows)
  }

  row(table: string, id: unknown): Row | undefined {
    return this.rows(table).find(r => r.id === id)
  }

  nextId(): string {
    this.idCounter += 1
    return `00000000-0000-4000-8000-${String(this.idCounter).padStart(12, '0')}`
  }

  /** Constraint-Simulation (z.B. EXCLUDE rental_bookings_no_overlap) */
  onInsert(hook: InsertHook): void {
    this.insertHooks.push(hook)
  }

  runInsertHooks(table: string, row: Row): PostgrestError | null {
    for (const hook of this.insertHooks) {
      const err = hook(table, row)
      if (err) return err
    }
    return null
  }

  /** Nächste (oder jede) Query auf table/op mit einem DB-Fehler beantworten */
  failOn(table: string, op: QueryOp, error: PostgrestError, once = true): void {
    this.forcedErrors.push({ table, op, error, once })
  }

  takeForcedError(table: string, op: QueryOp): PostgrestError | null {
    const idx = this.forcedErrors.findIndex(f => f.table === table && f.op === op)
    if (idx === -1) return null
    const found = this.forcedErrors[idx]
    if (found.once) this.forcedErrors.splice(idx, 1)
    return found.error
  }

  /** Relationen gemäß RelationMap einbetten (max. 3 Ebenen tief) */
  embed(table: string, row: Row | undefined, depth = 0): Row | null {
    if (!row) return null
    const rels = this.relations[table]
    if (!rels || depth > 2) return { ...row }
    const out: Row = { ...row }
    for (const [alias, def] of Object.entries(rels)) {
      const fk = row[def.localKey]
      const target = fk === null || fk === undefined ? undefined : this.row(def.table, fk)
      out[alias] = target ? this.embed(def.table, target, depth + 1) : null
    }
    return out
  }

  /** Zählt Queries eines Typs — z.B. „wurde wirklich ein Audit-Log geschrieben?“ */
  countCalls(op: QueryOp, table: string): number {
    return this.log.filter(c => c.op === op && c.table === table).length
  }

  /** Payloads aller Inserts in eine Tabelle */
  insertsInto(table: string): Row[] {
    return this.log
      .filter(c => c.op === 'insert' && c.table === table)
      .flatMap(c => (c.payload as Row[]) ?? [])
  }
}
