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

/*
 * ZWEI MARKER, UND WARUM BEIDE GELTEN
 *
 * `BUSINESS_DECISION_REQUIRED` ist der aeltere, allgemeine Marker des Repos
 * (er stand schon in `src/lib/constants.ts`, bevor es dieses Inventar gab).
 * `PRICE_DECISION_REQUIRED` kam am 12.09.2026 dazu und ist der spezifische:
 * er sitzt genau dort, wo ein GELDBETRAG oder ein Satz auf Geld offen ist.
 *
 * Heute sind beide praktisch deckungsgleich — jeder Marker im Repo betrifft
 * Geld. Das kann sich aendern, sobald der allgemeine Marker fuer etwas
 * anderes benutzt wird (Fristen, Kontingente, Schwellen). Wer die Preise
 * sucht, greppt deshalb `PRICE_DECISION_REQUIRED`; der Test akzeptiert
 * beide, damit ein Marker nicht an einer Schreibweise scheitert.
 */
const MARKER = ['BUSINESS_DECISION_REQUIRED', 'PRICE_DECISION_REQUIRED'] as const

function traegtMarker(inhalt: string): boolean {
  return MARKER.some(m => inhalt.includes(m))
}

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
    '%s (%i Literale) traegt einen Preis-Marker',
    (datei) => {
      const inhalt = readFileSync(join(ROOT, datei), 'utf8')
      expect(traegtMarker(inhalt)).toBe(true)
    },
  )

  it('jede Datei mit Preisliteralen traegt den spezifischen PRICE_DECISION_REQUIRED', () => {
    // Der allgemeine Marker allein reicht fuer eine Preisangabe nicht: wer
    // die Preisflaeche sucht, soll EINEN Begriff greppen koennen und genau
    // sie bekommen.
    const ohne = pflichtDateien
      .map(f => f.datei)
      .filter(d => !readFileSync(join(ROOT, d), 'utf8').includes('PRICE_DECISION_REQUIRED'))
    expect(ohne).toEqual([])
  })

  it('der Marker steht in mehr als den vier Dateien vom Ausgangsstand', () => {
    const mitMarker = PREIS_AUDIT.filter(f =>
      traegtMarker(readFileSync(join(ROOT, f.datei), 'utf8')),
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
