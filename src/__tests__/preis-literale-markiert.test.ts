// @vitest-environment node
/**
 * Jede oeffentlich sichtbare Preisangabe im Quelltext braucht einen
 * BUSINESS_DECISION_REQUIRED-Marker.
 *
 * WARUM DAS EIN TEST IST UND KEINE EINMALIGE AUFRAEUMAKTION
 *
 * Der Marker sagt: diese Zahl hat niemand entschieden. Am 12.09.2026 waren
 * das 1218 Preisliterale in 36 oeffentlich sichtbaren Dateien — Tagesmieten,
 * Behandlungspreise, Verdienstangaben, Marktgroessen. Markiert waren vier
 * Dateien.
 *
 * Eine Aufraeumaktion haelt genau bis zur naechsten neuen Seite. Dieser Test
 * haelt die Grenze: wer eine Preisangabe auf einer oeffentlichen Seite
 * hinzufuegt, muss auch sagen, ob sie entschieden ist.
 *
 * WAS DER TEST NICHT PRUEFT: ob der Marker an der richtigen Zeile steht oder
 * ob sein Text stimmt. Er prueft die Datei. Feiner zu werden hiesse, die
 * Position von Kommentaren zu testen — das bricht bei jeder Umsortierung und
 * sagt nichts ueber die Sache.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PREIS_AUDIT, PREIS_AUDIT_SUMME, type PreisDatei } from '@/lib/pricing/price-audit'

const ROOT = process.cwd()
const MARKER = 'BUSINESS_DECISION_REQUIRED'

/** Oeffentlich sichtbar — der Bereich, fuer den der Marker Pflicht ist. */
const PFLICHT = new Set(['oeffentlich', 'redaktionell'])

/** Literale, die nicht in einem Kommentar stehen. Nur die sind Zusagen. */
function echteLiterale(f: PreisDatei): number {
  return f.treffer.reduce((s, t) => s + (t.kommentar ? 0 : t.literale.length), 0)
}

const pflichtDateien = PREIS_AUDIT.filter(f => PFLICHT.has(f.bereich) && echteLiterale(f) > 0)

describe('Preisliterale auf oeffentlichen Seiten', () => {
  it('das Inventar ist nicht leer — sonst prueft der Test nichts', () => {
    // Ohne diese Zusicherung wuerde ein kaputter Generator (leere Liste) den
    // Test gruen faerben und damit das Gegenteil dessen behaupten, was er
    // pruefen soll.
    expect(pflichtDateien.length).toBeGreaterThan(20)
  })

  it.each(pflichtDateien.map(f => [f.datei, echteLiterale(f)] as const))(
    '%s (%i Literale) traegt einen BUSINESS_DECISION_REQUIRED-Marker',
    (datei) => {
      const inhalt = readFileSync(join(ROOT, datei), 'utf8')
      expect(inhalt).toContain(MARKER)
    },
  )

  it('der Marker steht in mehr als den vier Dateien vom Ausgangsstand', () => {
    const mitMarker = PREIS_AUDIT.filter(f =>
      readFileSync(join(ROOT, f.datei), 'utf8').includes(MARKER),
    )
    expect(mitMarker.length).toBeGreaterThan(4)
  })
})

describe('Das Inventar selbst', () => {
  it('zaehlt die redaktionellen Inhalte mit — sie sind der groesste Block', () => {
    // `src/lib/seo-data/` traegt den Loewenanteil und wurde von der ersten,
    // groben Zaehlung („169 Literale") komplett uebersehen: die suchte nur
    // unter `src/app/(public)`.
    expect(PREIS_AUDIT_SUMME.redaktionell.literale).toBeGreaterThan(
      PREIS_AUDIT_SUMME.oeffentlich.literale,
    )
  })

  it('zaehlt sich nicht selbst', () => {
    // Die erzeugte Datei liegt unter src/ und enthaelt jedes Literal als
    // Datenfeld. Ohne Riegel im Generator waechst die Zahl mit jedem Lauf
    // (gemessen: 1210 → 3885).
    expect(PREIS_AUDIT.some(f => f.datei.includes('price-audit'))).toBe(false)
  })
})
