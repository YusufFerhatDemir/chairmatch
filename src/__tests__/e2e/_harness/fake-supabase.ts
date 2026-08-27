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

type FilterOp = 'eq' | 'neq' | 'in' | 'lte' | 'gte' | 'gt' | 'lt' | 'is' | 'not'
interface Filter {
  op: FilterOp
  column: string
  value: unknown
  /** nur fuer op 'not': der negierte Operator, z.B. `.not(col, 'is', null)` */
  negated?: FilterOp
}

/**
 * NULL in der Fake-DB.
 *
 * PostgREST liefert fuer eine nicht gesetzte Spalte `null`; die Seed-Zeilen
 * hier lassen den Schluessel oft einfach weg. Fuer `.is(col, null)` muessen
 * beide dasselbe bedeuten — sonst findet ein `.is('deleted_at', null)` genau
 * die Zeilen nicht, um die es geht.
 */
function istNull(v: unknown): boolean {
  return v === null || v === undefined
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
  /** maybeSingle(): 0 Zeilen sind erlaubt und KEIN Fehler. */
  private allowNoRows = false
  private returnRows = false
  private headOnly = false
  private wantCount = false
  private limitN: number | null = null
  private orderBy: { column: string; ascending: boolean } | null = null
  private conflictKeys: string[] | null = null
  /** Spalten aus `select('a, b')` — null bei `*` oder eingebetteten Relationen. */
  private selectedColumns: string[] | null = null

  constructor(
    private readonly db: FakeSupabase,
    private readonly tableName: string,
  ) {}

  select(_columns?: string, options?: { count?: string; head?: boolean }): this {
    this.selectedColumns =
      !_columns || _columns.includes('(') || _columns.trim() === '*'
        ? null
        : _columns.split(',').map(c => c.trim()).filter(Boolean)
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

  upsert(values: Row | Row[], options?: { onConflict?: string }): this {
    this.insert(values)
    // Ohne onConflict verhaelt sich upsert wie ein Insert (so nutzt der
    // Produktivcode es an einigen Stellen). Mit onConflict wird die
    // Konfliktspalten-Liste zum Schluessel: existierende Zeile wird ersetzt.
    this.conflictKeys = options?.onConflict
      ? options.onConflict.split(',').map(c => c.trim()).filter(Boolean)
      : null
    return this
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
  /** `.not(col, 'is', null)` / `.not(col, 'eq', x)` — negiert den Operator. */
  not(column: string, operator: string, value: unknown): this {
    this.filters.push({ op: 'not', column, value, negated: operator as FilterOp })
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

  /**
   * `maybeSingle()` war bis 2026-08-27 ein Alias auf `single()`. Damit lieferte
   * der Harness bei null Treffern PGRST116 — echtes supabase-js gibt dort
   * `{ data: null, error: null }` zurueck. Jeder Produktivcode, der
   * `maybeSingle()` benutzt und `if (error)` prueft, wurde deshalb falsch
   * getestet: der Testlauf sah einen Fehler, wo live keiner ist, und ein
   * "nicht gefunden" liess sich nicht von einem echten Ausfall unterscheiden.
   */
  maybeSingle(): this {
    this.single()
    this.allowNoRows = true
    return this
  }

  then<TResult1 = Result<unknown>, TResult2 = never>(
    onfulfilled?: ((value: Result<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected)
  }

  private matches(row: Row): boolean {
    return this.filters.every(f => this.matchesFilter(row, f))
  }

  private matchesFilter(row: Row, f: Filter): boolean {
    const v = row[f.column]
    switch (f.op) {
      case 'eq':
        return v === f.value
      case 'neq':
        return v !== f.value
      case 'in':
        return Array.isArray(f.value) && (f.value as unknown[]).includes(v)
      case 'is':
        return istNull(f.value) ? istNull(v) : v === f.value
      case 'not':
        return !this.matchesFilter(row, {
          op: f.negated ?? 'eq',
          column: f.column,
          value: f.value,
        })
      case 'lte':
        return cmp(v, f.value) <= 0
      case 'gte':
        return cmp(v, f.value) >= 0
      case 'lt':
        return cmp(v, f.value) < 0
      case 'gt':
        return cmp(v, f.value) > 0
    }
  }

  private async exec(): Promise<Result<unknown>> {
    this.db.log.push({
      op: this.op,
      table: this.tableName,
      payload: this.payload.length ? this.payload : undefined,
    })

    const forced = this.db.takeForcedError(this.tableName, this.op)
    if (forced) return { data: null, error: forced }

    // Lesende Zugriffe gegen das Spaltenschema: PostgREST beantwortet
    // `?select=…` und `?spalte=eq.…` mit 42703, wenn es die Spalte nicht
    // gibt — und zwar vor der Rechtepruefung.
    const unknownRead = this.unknownReadColumn()
    if (unknownRead) {
      return { data: null, error: this.db.undefinedColumn(this.tableName, unknownRead) }
    }

    const rows = this.db.rows(this.tableName)

    if (this.op === 'insert') {
      const inserted: Row[] = []
      for (const raw of this.payload) {
        const keys = this.conflictKeys
        const existing = keys
          ? rows.find(r => keys.every(k => r[k] === raw[k]))
          : undefined

        if (existing) {
          Object.assign(existing, raw)
          inserted.push(existing)
          continue
        }

        const unknown = this.db.findUnknownColumn(this.tableName, raw)
        if (unknown) {
          return { data: null, error: this.db.undefinedColumn(this.tableName, unknown) }
        }

        const row: Row = { ...raw }
        if (row.id === undefined && this.db.hasColumn(this.tableName, 'id')) {
          row.id = this.db.nextId()
        }
        if (row.created_at === undefined && this.db.hasColumn(this.tableName, 'created_at')) {
          row.created_at = new Date().toISOString()
        }

        const missing = this.db.findMissingNotNull(this.tableName, row)
        if (missing) {
          return { data: null, error: this.db.notNullViolation(this.tableName, missing) }
        }

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
      const unknown = this.db.findUnknownColumn(this.tableName, patch)
      if (unknown) {
        return { data: null, error: this.db.undefinedColumn(this.tableName, unknown) }
      }
      // Ein UPDATE darf eine NOT-NULL-Spalte nicht leeren. Geprueft wird nur,
      // was der Patch anfasst.
      for (const [column, value] of Object.entries(patch)) {
        if (value == null && this.db.isNotNull(this.tableName, column)) {
          return { data: null, error: this.db.notNullViolation(this.tableName, column) }
        }
      }
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
      if (embedded.length === 0 && this.allowNoRows) return { data: null, error: null }
      if (embedded.length !== 1) return { data: null, error: NO_ROWS }
      return { data: embedded[0], error: null }
    }

    return this.wantCount
      ? { data: embedded, error: null, count: embedded.length }
      : { data: embedded, error: null }
  }

  /**
   * Erste gelesene Spalte, die die Tabelle laut Schema nicht fuehrt.
   *
   * Beruecksichtigt Projektion, Filter und Sortierung — PostgREST kennt bei
   * allen dreien 42703. Ohne definiertes Schema gilt jede Spalte als
   * vorhanden, Bestandstests bleiben also unberuehrt.
   */
  private unknownReadColumn(): string | null {
    if (this.op === 'insert') return null
    for (const column of this.selectedColumns ?? []) {
      if (!this.db.hasColumn(this.tableName, column)) return column
    }
    for (const { column } of this.filters) {
      if (!this.db.hasColumn(this.tableName, column)) return column
    }
    if (this.orderBy && !this.db.hasColumn(this.tableName, this.orderBy.column)) {
      return this.orderBy.column
    }
    return null
  }
}

export class FakeSupabase {
  private tables = new Map<string, Row[]>()
  private insertHooks: InsertHook[] = []
  private forcedErrors: { table: string; op: QueryOp; error: PostgrestError; once: boolean }[] = []
  private idCounter = 0
  /** Tabelle -> erlaubte Spalten. Fehlt ein Eintrag, wird nicht geprueft. */
  private schema = new Map<string, Set<string>>()
  /** Tabelle -> Spalten, die live NOT NULL sind und keinen DEFAULT haben. */
  private notNullColumns = new Map<string, Set<string>>()

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

  // ── Spaltenschema ──────────────────────────────────────────────────
  //
  // Diese Harness konnte bis Track 6 gar nicht pruefen, ob eine Spalte
  // existiert. Genau diese Luecke hat im Nachrichten-System dazu gefuehrt,
  // dass eine gruene Suite einen live komplett toten Pfad gedeckt hat — dort
  // geschlossen (src/test/fake-supabase.ts), hier offen geblieben. Die
  // Buchungs-Tests liegen in DIESER Harness, also gehoert sie auch hierhin.
  //
  // Zwei verschiedene Fehler, zwei verschiedene Pruefungen:
  //   defineSchema  faengt die ERFUNDENE Spalte (42703)
  //   defineNotNull faengt die VERGESSENE Spalte (23502)

  /** Legt fest, welche Spalten eine Tabelle hat (42703 fuer alle anderen). */
  defineSchema(table: string, columns: readonly string[]): this {
    this.schema.set(table, new Set(columns))
    return this
  }

  /** Legt fest, welche Spalten NOT NULL und ohne DEFAULT sind (23502). */
  defineNotNull(table: string, columns: readonly string[]): this {
    this.notNullColumns.set(table, new Set(columns))
    return this
  }

  /** Ohne definiertes Schema gilt jede Spalte als vorhanden. */
  hasColumn(table: string, column: string): boolean {
    const allowed = this.schema.get(table)
    return allowed ? allowed.has(column) : true
  }

  isNotNull(table: string, column: string): boolean {
    return this.notNullColumns.get(table)?.has(column) ?? false
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

  /** Erste NOT-NULL-Spalte, die in der fertigen Zeile fehlt — oder null. */
  findMissingNotNull(table: string, row: Row): string | null {
    const required = this.notNullColumns.get(table)
    if (!required) return null
    for (const column of required) {
      if (row[column] == null) return column
    }
    return null
  }

  undefinedColumn(table: string, column: string): PostgrestError {
    return pgError('42703', `column ${table}.${column} does not exist`)
  }

  notNullViolation(table: string, column: string): PostgrestError {
    return pgError(
      '23502',
      `null value in column "${column}" of relation "${table}" violates not-null constraint`,
    )
  }

  /**
   * Supabase-Storage — nur die drei im Produktivcode benutzten Aufrufe.
   * Dateien landen in einer Map statt in einem Bucket; das reicht, um
   * Upload/Cleanup/Signed-URL-Pfade zu pruefen.
   */
  readonly files = new Map<string, { size: number; contentType: string }>()
  private storageErrors = new Map<string, PostgrestError>()

  /** Naechsten upload/remove/sign-Aufruf auf diesen Bucket fehlschlagen lassen. */
  failStorage(bucket: string, op: 'upload' | 'remove' | 'sign', error: PostgrestError): void {
    this.storageErrors.set(`${bucket}:${op}`, error)
  }

  private takeStorageError(bucket: string, op: string): PostgrestError | null {
    const key = `${bucket}:${op}`
    const err = this.storageErrors.get(key)
    if (err) this.storageErrors.delete(key)
    return err ?? null
  }

  storage = {
    from: (bucket: string) => ({
      upload: async (
        path: string,
        file: { size?: number; type?: string },
        options?: { contentType?: string; upsert?: boolean },
      ) => {
        this.log.push({ op: 'insert', table: `storage:${bucket}`, payload: [{ path }] })
        const forced = this.takeStorageError(bucket, 'upload')
        if (forced) return { data: null, error: forced }
        const key = `${bucket}/${path}`
        if (this.files.has(key) && !options?.upsert) {
          return { data: null, error: pgError('23505', 'The resource already exists') }
        }
        this.files.set(key, {
          size: file?.size ?? 0,
          contentType: options?.contentType ?? file?.type ?? 'application/octet-stream',
        })
        return { data: { path }, error: null }
      },
      remove: async (paths: string[]) => {
        this.log.push({ op: 'delete', table: `storage:${bucket}`, payload: paths })
        const forced = this.takeStorageError(bucket, 'remove')
        if (forced) return { data: null, error: forced }
        for (const p of paths) this.files.delete(`${bucket}/${p}`)
        return { data: paths.map(p => ({ name: p })), error: null }
      },
      createSignedUrl: async (path: string, expiresIn: number) => {
        const forced = this.takeStorageError(bucket, 'sign')
        if (forced) return { data: null, error: forced }
        if (!this.files.has(`${bucket}/${path}`)) {
          return { data: null, error: pgError('404', 'Object not found') }
        }
        return {
          data: { signedUrl: `https://storage.test/${bucket}/${path}?token=sig&exp=${expiresIn}` },
          error: null,
        }
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `https://storage.test/public/${bucket}/${path}` },
      }),
    }),
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
