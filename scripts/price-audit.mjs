#!/usr/bin/env node
/**
 * scripts/price-audit.mjs — erzeugt `src/lib/pricing/price-audit.ts`.
 *
 * WARUM ES DEN GENERATOR GIBT UND NICHT NUR DIE DATEI
 *
 * Ein von Hand gepflegtes Preisinventar ist am Tag nach dem Commit falsch.
 * Diese Datei liest den Quelltext und schreibt das Ergebnis; wer wissen will,
 * ob das Inventar noch stimmt, laesst sie laufen und sieht es am git-diff:
 *
 *     node scripts/price-audit.mjs            # schreibt die Datei neu
 *     node scripts/price-audit.mjs --check    # Exit 1, wenn sie veraltet ist
 *
 * WAS ALS PREISLITERAL ZAEHLT
 *
 * Eine Ziffernfolge unmittelbar an einem Waehrungszeichen (`€`, `EUR`,
 * `Euro`) — in beide Richtungen, mit Bereichen („45–75 €") und deutscher
 * Schreibweise („30.000–80.000 €"). NICHT gezaehlt wird die Formatierung
 * eines Wertes, der zur Laufzeit entsteht (`{(cents / 100).toFixed(2)} €`,
 * `toLocaleString`, `Intl.NumberFormat`): dort steht die Zahl in der
 * Datenbank, nicht im Quelltext, und es gibt nichts zu entscheiden.
 *
 * Die Unterscheidung ist der ganze Punkt der Sache. „169 Euro-Literale" war
 * eine Zahl aus einem groben grep; sie hat Formatierungscode mitgezaehlt und
 * die redaktionellen Inhalte unter `src/lib/seo-data/` gar nicht gesehen.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const ZIEL = join(ROOT, 'src/lib/pricing/price-audit.ts')

const WAEHRUNG = /€|\bEUR\b|\bEuro\b/
/** Zahl am Waehrungszeichen — davor oder dahinter, Bereiche eingeschlossen. */
const LITERAL =
  /(?<![\w$])\d[\d.,]*(?:\s*(?:–|—|-|bis)\s*\d[\d.,]*)?\s*(?:€|EUR\b|Euro\b)|(?:€|EUR\b|Euro\b)\s*\d[\d.,]*/g
/** Formatierung eines Laufzeitwertes — kein Literal im Quelltext. */
const DYNAMISCH =
  /\}\s*(?:€|EUR\b|Euro\b)|(?:€|EUR\b|Euro\b)\s*\{|toFixed|toLocaleString|formatEuro|formatPrice|Intl\.NumberFormat/

function dateien(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.next' || e.startsWith('.')) continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) dateien(p, acc)
    else if (/\.tsx?$/.test(e)) acc.push(p)
  }
  return acc
}

/**
 * Wo wird die Zeile sichtbar? Die Reihenfolge ist die Rangfolge — eine Datei
 * unter `(public)` ist oeffentlich, auch wenn sie eine Komponente ist.
 *
 * ACHTUNG BEIM BUCKET `geteilt`: er heisst so, weil die Zuordnung hier NICHT
 * aus dem Pfad folgt. `src/components/HomeClient.tsx` wird von der Startseite
 * gerendert und ist damit so oeffentlich wie irgendetwas im Repo — im Pfad
 * steht das nicht. Die Startseite selbst (`src/app/page.tsx`) liegt ebenfalls
 * ausserhalb von `(public)`, deshalb steht sie unten ausdruecklich drin.
 * Wer diesen Bericht liest, muss `geteilt` Datei fuer Datei ansehen; eine
 * Render-Graph-Analyse waere fuer einen Bericht der falsche Aufwand.
 */
const OEFFENTLICH_TROTZ_PFAD = new Set([
  'src/app/page.tsx',
  'src/components/HomeClient.tsx',
  'src/components/HomeSEOLanding.tsx',
])

function bereich(rel) {
  if (rel.includes('__tests__')) return 'test'
  if (rel.startsWith('src/lib/seo-data/')) return 'redaktionell'
  if (rel.includes('/(public)/')) return 'oeffentlich'
  if (OEFFENTLICH_TROTZ_PFAD.has(rel)) return 'oeffentlich'
  if (rel.includes('/(admin)/')) return 'intern'
  if (rel.includes('/(investor)/')) return 'intern'
  if (rel.includes('/(protected)/')) return 'angemeldet'
  if (rel.startsWith('src/app/api/')) return 'api'
  return 'geteilt'
}

/**
 * Markiert je Zeile, ob sie in einem Kommentar steht — Dokumentation, kein
 * Preis. Der Zustand muss ueber die Datei mitlaufen: ein Blockkommentar, der
 * Fliesstext enthaelt, hat Zeilen ohne fuehrenden `*`, und genau die wurden
 * sonst als Preisangabe gezaehlt. Zwei echte Fehltreffer kamen daher —
 * `anbieter/onboarding/page.tsx` und `vermieter/mein-inserat/umsatz/page.tsx`
 * erklaeren in Prosa, dass dort frueher ein Preis STAND.
 *
 * Bewusst simpel: `/*` und `*\/` in Zeichenketten oder regulaeren Ausdruecken
 * werden nicht erkannt. Fuer die Frage „Kommentar oder nicht" reicht das; ein
 * Parser waere fuer einen Bericht der falsche Aufwand.
 */
function kommentarZeilen(zeilen) {
  const flags = new Array(zeilen.length).fill(false)
  let imBlock = false
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i]
    if (imBlock) {
      flags[i] = true
      if (z.includes('*/')) imBlock = false
      continue
    }
    const t = z.trimStart()
    if (t.startsWith('//')) {
      flags[i] = true
      continue
    }
    const auf = z.indexOf('/*')
    if (auf !== -1 && z.indexOf('*/', auf + 2) === -1) {
      flags[i] = true
      imBlock = true
    } else if (auf !== -1) {
      flags[i] = true // einzeiliger Blockkommentar
    }
  }
  return flags
}

const befunde = []
for (const p of dateien(join(ROOT, 'src'))) {
  const rel = relative(ROOT, p)
  // Die erzeugte Datei liegt selbst unter src/ und enthaelt jedes gefundene
  // Literal als Datenfeld. Ohne diesen Riegel zaehlt der zweite Lauf den
  // ersten mit: aus 1210 Literalen wurden 3885, und die Zahl waechst mit
  // jedem Durchgang weiter.
  if (p === ZIEL) continue
  const zeilen = readFileSync(p, 'utf8').split('\n')
  const imKommentar = kommentarZeilen(zeilen)
  const treffer = []
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i]
    if (!WAEHRUNG.test(z)) continue
    const lit = z.match(LITERAL) ?? []
    if (lit.length === 0) continue // reine Formatierung oder Fliesstext ohne Zahl
    treffer.push({
      zeile: i + 1,
      literale: lit.map(s => s.replace(/\s+/g, ' ').trim()),
      kommentar: imKommentar[i],
      dynamisch: DYNAMISCH.test(z),
    })
  }
  if (treffer.length) befunde.push({ datei: rel, bereich: bereich(rel), treffer })
}

befunde.sort((a, b) => {
  const na = a.treffer.reduce((s, t) => s + t.literale.length, 0)
  const nb = b.treffer.reduce((s, t) => s + t.literale.length, 0)
  return nb - na || a.datei.localeCompare(b.datei)
})

const zaehle = (f, nurEcht = true) =>
  f.treffer.reduce((s, t) => s + (nurEcht && t.kommentar ? 0 : t.literale.length), 0)

const proBereich = {}
for (const f of befunde) {
  const b = (proBereich[f.bereich] ??= { dateien: 0, literale: 0, inKommentaren: 0 })
  b.dateien++
  b.literale += zaehle(f)
  b.inKommentaren += f.treffer.reduce((s, t) => s + (t.kommentar ? t.literale.length : 0), 0)
}

const gesamt = Object.values(proBereich).reduce((s, b) => s + b.literale, 0)
const markiert = befunde.filter(f =>
  readFileSync(join(ROOT, f.datei), 'utf8').includes('BUSINESS_DECISION_REQUIRED'),
).length

const zeilenAus = []
const W = s => zeilenAus.push(s)

W('/* eslint-disable */')
W('/**')
W(' * GENERIERT — nicht von Hand aendern.')
W(' * Quelle: scripts/price-audit.mjs · `node scripts/price-audit.mjs`')
W(' *')
W(' * Das vollstaendige Inventar der Preisliterale im Quelltext: jede Zahl, die')
W(' * an einem Waehrungszeichen steht und damit im Code entschieden wurde statt')
W(' * in der Datenbank. Nicht enthalten ist die Formatierung von Laufzeitwerten')
W(' * (`toFixed`, `toLocaleString`, `Intl.NumberFormat`) — dort gibt es nichts')
W(' * zu entscheiden.')
W(' *')
W(' * Diese Datei ist ein BERICHT, kein Modul mit Geschaeftslogik. Sie aendert')
W(' * keinen einzigen Preis und wird von keinem Produktivpfad gelesen.')
W(' */')
W('')
W('export interface PreisTreffer {')
W('  /** 1-basierte Zeilennummer zum Stand der letzten Generierung. */')
W('  zeile: number')
W('  /** Die gefundenen Literale, so wie sie im Quelltext stehen. */')
W('  literale: string[]')
W('  /** Steht in einem Kommentar — Dokumentation, keine Zusage an Nutzer. */')
W('  kommentar: boolean')
W('  /** Zeile mischt Literal und Formatierung eines Laufzeitwertes. */')
W('  dynamisch: boolean')
W('}')
W('')
W("export type PreisBereich =")
W("  /** Unter src/app/(public) — jeder anonyme Besucher sieht das. */")
W("  | 'oeffentlich'")
W("  /** src/lib/seo-data — Fliesstext der SEO-Seiten, ebenfalls oeffentlich. */")
W("  | 'redaktionell'")
W("  /** Erst nach Anmeldung sichtbar. */")
W("  | 'angemeldet'")
W("  /** Admin- und Investor-Bereich. */")
W("  | 'intern'")
W("  /** API-Antworten. */")
W("  | 'api'")
W("  /** Bibliotheken und Komponenten, je nach Aufrufer. */")
W("  | 'geteilt'")
W("  /** Tests und Fixtures — nie ausgeliefert. */")
W("  | 'test'")
W('')
W('export interface PreisDatei {')
W('  datei: string')
W('  bereich: PreisBereich')
W('  treffer: PreisTreffer[]')
W('}')
W('')
W(`/** Stand der Generierung: ${new Date().toISOString().slice(0, 10)} */`)
W(`export const PREIS_AUDIT_STAND = '${new Date().toISOString().slice(0, 10)}' as const`)
W('')
W('export const PREIS_AUDIT: readonly PreisDatei[] = [')
for (const f of befunde) {
  W(`  {`)
  W(`    datei: ${JSON.stringify(f.datei)},`)
  W(`    bereich: ${JSON.stringify(f.bereich)},`)
  W(`    treffer: [`)
  for (const t of f.treffer) {
    W(
      `      { zeile: ${t.zeile}, literale: ${JSON.stringify(t.literale)}, ` +
        `kommentar: ${t.kommentar}, dynamisch: ${t.dynamisch} },`,
    )
  }
  W(`    ],`)
  W(`  },`)
}
W('] as const')
W('')
W('/** Literale je Bereich, Kommentar-Treffer nicht mitgezaehlt. */')
W('export const PREIS_AUDIT_SUMME = {')
for (const [b, v] of Object.entries(proBereich).sort((a, b2) => b2[1].literale - a[1].literale)) {
  W(`  ${b}: { dateien: ${v.dateien}, literale: ${v.literale}, inKommentaren: ${v.inKommentaren} },`)
}
W(`  gesamt: ${gesamt},`)
W('} as const')
W('')
W('/**')
W(' * Wie viele der OBEN GELISTETEN Dateien einen BUSINESS_DECISION_REQUIRED-')
W(' * Marker tragen. Nicht die Gesamtzahl markierter Dateien im Repo: Marker')
W(' * stehen auch dort, wo kein Waehrungszeichen im Quelltext steht — etwa in')
W(' * `src/lib/constants.ts` (Preiskataloge als Zahlen ohne Einheit) und in')
W(' * `src/lib/marketplace-rules.ts` (Provisionssaetze in Prozent).')
W(' */')
W(`export const PREIS_AUDIT_MARKIERTE_DATEIEN = ${markiert} as const`)
W('')

const inhalt = zeilenAus.join('\n')

if (process.argv.includes('--check')) {
  let alt = ''
  try {
    alt = readFileSync(ZIEL, 'utf8')
  } catch {
    /* existiert noch nicht */
  }
  // Der Stand-Zeitstempel darf sich unterscheiden, der Rest nicht.
  const ohneStand = s => s.replace(/^.*PREIS_AUDIT_STAND.*$/gm, '').replace(/^ \* Stand.*$/gm, '')
  if (ohneStand(alt) !== ohneStand(inhalt)) {
    console.error('price-audit.ts ist veraltet — `node scripts/price-audit.mjs` laufen lassen.')
    process.exit(1)
  }
  console.log('price-audit.ts ist aktuell.')
  process.exit(0)
}

writeFileSync(ZIEL, inhalt)
console.log(`${ZIEL}: ${befunde.length} Dateien, ${gesamt} Literale`)
for (const [b, v] of Object.entries(proBereich).sort((a, b2) => b2[1].literale - a[1].literale)) {
  console.log(`  ${b.padEnd(14)} ${String(v.dateien).padStart(4)} Dateien ${String(v.literale).padStart(6)} Literale`)
}
