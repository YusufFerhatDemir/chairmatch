/**
 * Ein Kalendertag ist erst ein Kalendertag, wenn es ihn gibt.
 *
 * Der Miet-Marktplatz hat Datumsangaben bis Track 22 ausschliesslich gegen
 * `/^\d{4}-\d{2}-\d{2}$/` geprueft. Das ist ein Formtest, kein Datumstest:
 * `2026-02-30` und `2026-13-45` haben genau diese Form. Was danach passiert,
 * ist in beiden Faellen falsch, aber auf zwei verschiedene Arten:
 *
 *   2026-02-30  `new Date('2026-02-30T12:00:00Z')` rollt in JavaScript still
 *               auf den 2. Maerz weiter. Die Mietdauer wird also fuer einen
 *               anderen Zeitraum gerechnet als den, der gleich in die
 *               Datenbank geht — und Postgres weist den 30. Februar dann als
 *               22008 zurueck, nachdem der Preis laengst feststand.
 *
 *   2026-13-45  `new Date(...)` liefert Invalid Date, die Tagesdifferenz wird
 *               NaN. Und NaN ist der stille Fall: `days > 366` ist fuer NaN
 *               falsch, `totalCents <= 0` ist fuer NaN ebenfalls falsch. Beide
 *               Riegel in /api/rental-bookings lassen den Wert also durch,
 *               `total_cents: NaN` serialisiert als `null`, und der Fehler
 *               faellt erst in der Datenbank auf — als 500 fuer eine reine
 *               Eingabefehleingabe.
 *
 * Deshalb hier eine Pruefung, die den geparsten Tag wieder ausschreibt und
 * mit der Eingabe vergleicht. Was den Weg hin und zurueck ueberlebt, gibt es
 * wirklich; alles andere ist eine 400 wert, keine 500.
 *
 * Bewusst UTC: die Zeichenkette ist ein reiner Kalendertag ohne Uhrzeit, und
 * `Date.UTC` ist die einzige Konstruktion, die keine Zeitzone des Prozesses
 * hineinrechnet. Fuer die Frage „welcher Tag ist heute" ist weiterhin
 * `berlinToday()` zustaendig — das ist eine andere Frage als diese.
 */

const SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Existiert dieser Kalendertag wirklich? */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const m = SHAPE.exec(value)
  if (!m) return false

  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])

  // Jahr 0000 ist syntaktisch moeglich und fachlich nie gemeint; Postgres
  // kennt es als 1 v. Chr. Der Rest faellt ueber den Rueckvergleich.
  if (year < 1000) return false

  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

/**
 * Ganze Tage zwischen zwei Kalendertagen, Start- und Endtag eingeschlossen.
 *
 * Wirft bei einem Datum, das es nicht gibt — statt NaN zurueckzugeben, das
 * jeden nachfolgenden Vergleich still passieren laesst. Wer die Funktion
 * ruft, hat vorher `isCalendarDate` zu fragen.
 */
export function inclusiveDayCount(startDate: string, endDate: string): number {
  if (!isCalendarDate(startDate) || !isCalendarDate(endDate)) {
    throw new RangeError(`Kein gueltiger Kalendertag: ${startDate} / ${endDate}`)
  }
  const start = Date.parse(`${startDate}T12:00:00Z`)
  const end = Date.parse(`${endDate}T12:00:00Z`)
  return Math.round((end - start) / 86_400_000) + 1
}
