/**
 * Eine ID aus einem Request ist erst eine ID, wenn sie wie eine aussieht.
 *
 * Alle betroffenen Spalten sind in Postgres vom Typ `uuid`. Geht dort etwas
 * anderes hinein, antwortet PostgREST mit 22P02 (`invalid input syntax for
 * type uuid`) — ein Datenbankfehler fuer eine reine Eingabefehleingabe. Die
 * Routen machten daraus bis Track 19 ein 500 (oder, wo `.single()` im Spiel
 * war, ein irrefuehrendes 404), und in beiden Faellen steht der Postgres-Text
 * im Server-Log statt einer klaren 400.
 *
 * Track 18 hat diese Pruefung auf zehn Routen eingezogen, jede mit einer
 * eigenen Kopie derselben Regex. Ab hier gibt es eine Stelle dafuer.
 *
 * Bewusst die lockere Form ohne Versions- und Variantennibble: die Datenbank
 * akzeptiert jede syntaktisch gueltige UUID, und eine strengere Pruefung im
 * Code wuerde Zeilen unerreichbar machen, die dort bereits liegen.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}
