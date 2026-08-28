/**
 * Dateinamen fuer den `Content-Disposition`-Header.
 *
 * Der Header ist eine Zeichenkette mit eigener Grammatik, und drei Stellen in
 * ChairMatch haben bis Track 19 fremde Daten unveraendert hineingeschrieben.
 * Die auffaelligste ist der Termin-Download:
 *
 *     `attachment; filename="chairmatch-${serviceName…}.ics"`
 *
 * `serviceName` ist der Name einer Leistung. Den schreibt der Anbieter selbst
 * (`POST /api/provider/services`, 2 bis 120 Zeichen, sonst ohne Einschraenkung).
 * Zwei Folgen:
 *
 *  1. Ein Anfuehrungszeichen im Namen bricht aus dem Wert aus. Aus einer
 *     Leistung namens `Schnitt"; filename="rechnung.html` wird ein Header mit
 *     zwei `filename`-Parametern; welchen ein Browser nimmt, ist nicht
 *     festgelegt. Der Anbieter bestimmt damit, unter welchem Namen die Datei
 *     im Download-Ordner seiner Kundin landet.
 *
 *  2. Ein Zeilenumbruch im Namen ist ein ungueltiger Header-Wert. Undici
 *     wirft dann beim Bauen der Response, der Handler faengt das ab und
 *     antwortet 500 — der Kalender-Download der Kundin waere fuer diese
 *     Leistung dauerhaft kaputt, ohne dass irgendwo etwas dazu steht.
 *
 * Deshalb baut diesen Header ab jetzt nur noch diese Funktion: sie wirft
 * Steuerzeichen weg, entfernt alles, was Pfad oder Grammatik beeinflusst,
 * deckelt die Laenge und liefert beide Formen — den ASCII-Wert fuer alte
 * Clients und `filename*` nach RFC 5987 fuer die Umlaute.
 */

/** Steuerzeichen, Anfuehrungszeichen, Backslash, Pfadtrenner, Semikolon. */
// eslint-disable-next-line no-control-regex
const UNSAFE = /[\u0000-\u001f\u007f"\\/;:*?<>|]/g

/** Maximale Laenge des Dateinamens, damit kein Header ausufert. */
const MAX_LENGTH = 100

/**
 * Einen Dateinamen auf das reduzieren, was gefahrlos in einem Header steht.
 * Gibt `fallback` zurueck, wenn nichts Brauchbares uebrig bleibt.
 */
export function sanitizeFilename(name: unknown, fallback = 'download'): string {
  const cleaned = String(name ?? '')
    .replace(UNSAFE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LENGTH)
    // Ein fuehrender Punkt macht die Datei auf Unix unsichtbar, ein
    // nachlaufender stoert Windows.
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .trim()

  return cleaned.length > 0 ? cleaned : fallback
}

/**
 * Vollstaendiger `Content-Disposition`-Wert fuer einen Download.
 *
 * Enthaelt der Name Zeichen ausserhalb von US-ASCII, wird zusaetzlich
 * `filename*=UTF-8''…` gesetzt (RFC 5987/6266); der ASCII-Wert bleibt als
 * Rueckfall stehen.
 */
export function attachmentDisposition(name: unknown, fallback = 'download'): string {
  const safe = sanitizeFilename(name, fallback)
  const ascii = safe.replace(/[^\u0020-\u007e]/g, '_')
  const asciiSafe = ascii.trim().length > 0 ? ascii : fallback

  const base = `attachment; filename="${asciiSafe}"`
  if (safe === asciiSafe) return base
  return `${base}; filename*=UTF-8''${encodeURIComponent(safe)}`
}
