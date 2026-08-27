/**
 * Wandelt die Wanduhrzeit eines Termins in einen echten Zeitpunkt um.
 *
 * Warum das noetig ist: `bookings.booking_date` und `bookings.start_time`
 * sind ein DATE und eine TIME ohne Zeitzone — also Wanduhrzeit im Salon,
 * und die Salons stehen in Deutschland. Der Servercode laeuft auf Vercel
 * dagegen in UTC.
 *
 * `new Date('2026-09-15T14:00:00')` (ohne Z) nimmt die Zeitzone des Prozesses
 * an. Auf dem Entwicklungsrechner ist das Berlin und alles sieht richtig aus;
 * in Produktion ist es UTC, und derselbe Termin liegt ploetzlich zwei Stunden
 * spaeter. Bei einer 24-Stunden-Stornofrist entscheidet genau dieser Versatz
 * darueber, ob eine Absage als fristgerecht gilt oder nicht — und im Winter
 * anders als im Sommer.
 *
 * Deshalb hier keine Naeherung mit einem festen Offset: `Intl` kennt die
 * echte Zeitzonendatenbank inklusive Sommerzeit-Umstellung, und das ist
 * eingebaut — ohne zusaetzliche Abhaengigkeit.
 */

const ZONE = 'Europe/Berlin'

const FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/**
 * Verschiebung Berlins gegenueber UTC in Minuten, zu einem konkreten
 * Zeitpunkt (+60 im Winter, +120 in der Sommerzeit).
 */
export function berlinOffsetMinutes(utcMillis: number): number {
  const parts = FORMATTER.formatToParts(new Date(utcMillis))
  const get = (type: string): number => Number(parts.find(p => p.type === type)?.value ?? '0')
  // `hour12: false` liefert fuer Mitternacht je nach Laufzeit 24 statt 0.
  const hour = get('hour') % 24
  const alsUtcGelesen = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second'),
  )
  return (alsUtcGelesen - utcMillis) / 60_000
}

/**
 * Berliner Wanduhrzeit -> UTC-Zeitpunkt in Millisekunden.
 *
 * Zweistufig: der erste Versuch nimmt die Verschiebung, die zur geratenen
 * Zeit gilt, der zweite die, die zur korrigierten Zeit gilt. Ohne den zweiten
 * Schritt liegt jeder Termin in der Umstellungsnacht eine Stunde daneben.
 *
 * `time` darf "HH:MM" oder "HH:MM:SS" sein — die Datenbank liefert TIME mit
 * Sekunden, die Formulare schicken ohne.
 *
 * Rueckgabe `NaN`, wenn Datum oder Zeit unbrauchbar sind. Aufrufer muessen
 * das pruefen; still auf "jetzt" zu raten waere hier der schlimmere Fehler.
 */
export function berlinWallClockToUtc(date: string, time: string): number {
  const datum = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const uhrzeit = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time)
  if (!datum || !uhrzeit) return NaN

  const [, y, m, d] = datum.map(Number)
  const [, hh, mm, ss] = uhrzeit.map(Number)
  if (hh > 23 || mm > 59) return NaN

  const geraten = Date.UTC(y, m - 1, d, hh, mm, ss || 0)
  const ersteKorrektur = geraten - berlinOffsetMinutes(geraten) * 60_000
  return geraten - berlinOffsetMinutes(ersteKorrektur) * 60_000
}

/**
 * Stunden zwischen `jetzt` und dem Terminbeginn. Negativ, wenn der Termin
 * bereits begonnen hat. `NaN` bei unbrauchbaren Eingaben.
 */
export function hoursUntilBooking(date: string, time: string, now: number = Date.now()): number {
  const beginn = berlinWallClockToUtc(date, time)
  if (Number.isNaN(beginn)) return NaN
  return (beginn - now) / 3_600_000
}

/** Heutiges Datum im Salon (YYYY-MM-DD), nicht im UTC-Kalender. */
export function berlinToday(now: number = Date.now()): string {
  const parts = FORMATTER.formatToParts(new Date(now))
  const get = (type: string): string => parts.find(p => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}
