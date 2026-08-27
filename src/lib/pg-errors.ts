/**
 * Postgres-/PostgREST-Fehlercodes, die „das Schema passt nicht zum Code"
 * bedeuten — und deshalb anders behandelt werden muessen als ein echter
 * Laufzeitfehler.
 *
 * Warum das eine eigene Datei ist: dieselbe Unterscheidung stand vorher je
 * einmal in `rental-request-dedupe.ts` und `rental-request-email.ts` — und im
 * dritten Fall (`/api/analytics/events`) fehlte die Haelfte davon: die Route
 * prueft nur `42P01`, PostgREST antwortet fuer eine fehlende Tabelle aber mit
 * `PGRST205`. Ergebnis war ein 500 pro Besucher-Event statt eines
 * 202 „noch nicht migriert". Eine kopierte Fallunterscheidung driftet.
 *
 * WICHTIG: „Schema fehlt" heisst NICHT „Fehler ignorieren". Der Aufrufer muss
 * sich bewusst entscheiden, ob er ohne die Tabelle weiterlaufen darf
 * (Telemetrie: ja) oder nicht (Doppelversand-Schutz, Anmeldungen: nein).
 * Siehe supabase/migrations/20260824_newsletter_schema_repair.sql.
 */

/** Ein Objekt, das aussieht wie ein PostgrestError — ohne den Import. */
export interface PgErrorLike {
  code?: string | null
  message?: string | null
}

/**
 * Relation existiert nicht.
 *   42P01     Postgres `undefined_table`
 *   PGRST205  PostgREST: Tabelle nicht im Schema-Cache
 *   PGRST106  PostgREST: Schema nicht exponiert
 *
 * `schema cache` im Klartext wird mitgeprueft, weil PostgREST diesen Fall je
 * nach Version ohne verwertbaren Code meldet.
 */
export function isMissingTable(err: PgErrorLike | null | undefined): boolean {
  if (!err) return false
  const code = err.code ?? undefined
  if (code === '42P01' || code === 'PGRST205' || code === 'PGRST106') return true
  return (err.message ?? '').includes('schema cache')
}

/**
 * Spalte existiert nicht (Postgres `undefined_column`).
 *
 * Der gefaehrlichste der drei Faelle: die Tabelle ist da, der Aufruf sieht
 * gesund aus, und nur ein einzelnes Feld fehlt. Genau so fiel das
 * E-Mail-Zustelllog monatelang still aus.
 */
export function isMissingColumn(err: PgErrorLike | null | undefined): boolean {
  return (err?.code ?? undefined) === '42703'
}

/** Tabelle oder Spalte fehlt — der Code laeuft gegen ein anderes Schema. */
export function isSchemaMismatch(err: PgErrorLike | null | undefined): boolean {
  return isMissingTable(err) || isMissingColumn(err)
}

/** Unique-Verletzung (Postgres `unique_violation`). */
export function isUniqueViolation(err: PgErrorLike | null | undefined): boolean {
  return (err?.code ?? undefined) === '23505'
}

/**
 * NOT-NULL-Verletzung (Postgres `not_null_violation`).
 *
 * Gehoert in dieselbe Familie wie `isSchemaMismatch`: der Aufruf sieht
 * gesund aus, die Tabelle ist da, und trotzdem kommt keine Zeile zustande —
 * weil der Code eine Pflichtspalte gar nicht kennt. Die Nachrichten-Kette
 * lief bis 2026-08-27 genau so: `messages.receiver_id` und
 * `conversations.customer_id`/`.provider_id` wurden nie geschrieben.
 */
export function isNotNullViolation(err: PgErrorLike | null | undefined): boolean {
  return (err?.code ?? undefined) === '23502'
}
