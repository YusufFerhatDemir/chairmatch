// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * Waechter gegen zwei Fehler, die im Miet-Marktplatz gemeinsam auftraten und
 * sich gegenseitig unsichtbar gemacht haben.
 *
 * 1. LESEN AUF `salons` AUS DEM BROWSER.
 *    Live antwortet PostgREST darauf mit
 *      42501  permission denied for function is_admin_or_super
 *    — die RLS-Policy ruft eine Funktion auf, die die Rolle `anon` nicht
 *    ausfuehren darf, und der Fehler kippt die GANZE Abfrage, auch wenn
 *    `salons` nur eingebettet ist. Verifiziert am 2026-08-27 gegen die
 *    Produktionsdatenbank. Betroffen waren die Stuhl-Suche (zeigte deshalb
 *    NUR Erfundenes) und das Bewertungsformular (konnte deshalb NIE
 *    absenden). Beides sah im Code aus wie funktionierender Zugriff.
 *
 * 2. ERSATZBESTAND IM CATCH-ZWEIG.
 *    Weil (1) immer fehlschlug, sprang ueberall der Fallback an und legte
 *    erfundene Inserate, Anfragen, Umsaetze und Bewertungen vor — jedem
 *    Nutzer dieselben. Ein Fehler, der als Inhalt auftritt, wird nie
 *    gemeldet: niemand sieht eine leere Seite, also meldet niemand etwas.
 *
 * Der Test macht aus beidem einen roten Build. Wer serverseitig auf `salons`
 * zugreift (Service-Client in einer Route), ist davon nicht betroffen — dort
 * gibt es die Policy-Falle nicht.
 */

const SRC = join(process.cwd(), 'src')

function ohneKommentare(quelltext: string): string {
  return quelltext
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue
      walk(p, out)
    } else if (name.endsWith('.tsx') || name.endsWith('.ts')) {
      out.push(p)
    }
  }
  return out
}

const ALLE = walk(SRC)

/** Client-Komponenten: nur die laufen mit dem ANON-Key im Browser. */
const CLIENT_DATEIEN = ALLE.filter((p) => {
  const text = readFileSync(p, 'utf8')
  return /^\s*['"]use client['"]/m.test(text.slice(0, 400))
})

/**
 * Seiten des Miet-Marktplatzes, die vor Track 7 erfundene Inserate,
 * Anfragen, Umsaetze, Favoriten oder Bewertungen ausgeliefert haben —
 * einschliesslich der Detailseite /inserat/[id], die fuer JEDE ID dasselbe
 * erfundene Inserat samt Preisleiste zeigte.
 */
const MARKTPLATZ_SEITEN = ALLE.filter((p) => {
  const rel = relative(SRC, p).replace(/\\/g, '/')
  return (
    rel.includes('mieter/mein-bereich/') ||
    rel.includes('vermieter/mein-inserat/') ||
    rel.includes('/inserat/')
  )
})

describe('Miet-Marktplatz: keine erfundenen Daten', () => {
  it('findet die Dateien, ueber die dieser Test wacht', () => {
    // Ein Waechter, der nichts sieht, ist gruen und wertlos.
    expect(CLIENT_DATEIEN.length).toBeGreaterThan(10)
    expect(MARKTPLATZ_SEITEN.length).toBeGreaterThan(10)
  })

  it('liest `salons` in keiner Client-Komponente ueber den Browser-Client', () => {
    const treffer = CLIENT_DATEIEN.filter((p) => {
      const text = ohneKommentare(readFileSync(p, 'utf8'))
      if (!/from\s+['"]@\/lib\/supabase['"]/.test(text)) return false
      // Direkt (`.from('salons')`) oder eingebettet (`salons(name, city)`)
      // — 42501 trifft beides.
      return /\.from\(\s*['"]salons['"]\s*\)/.test(text) || /\bsalons?\s*:?\s*salons\(/.test(text)
    })
    expect(treffer.map((p) => relative(SRC, p))).toEqual([])
  })

  it('haelt keine erfundenen Datensaetze in den Marktplatz-Seiten vor', () => {
    const verboten = [
      /\bMOCK_[A-Z_]+\b/,
      /\bbuildDemoData\b/,
      /\bDEMO_[A-Z_]+\b/,
      /Beispieldaten/i,
      /Beispiel-Anfragen/i,
      /Beispielmodus/i,
    ]
    const treffer: string[] = []
    for (const p of MARKTPLATZ_SEITEN) {
      const text = ohneKommentare(readFileSync(p, 'utf8'))
      for (const muster of verboten) {
        if (muster.test(text)) treffer.push(`${relative(SRC, p)} → ${muster}`)
      }
    }
    expect(treffer).toEqual([])
  })

  it('speichert keinen Anfrage-Status im Browserspeicher', () => {
    // Bestaetigen/Ablehnen schrieb den Ausgang nach
    // localStorage['cm_vermieter_anfragen_state']: es sah aus wie eine
    // Entscheidung, blieb im Browser des Vermieters liegen und erreichte
    // den Anfragenden nie. Der Status gehoert in rental_requests.status.
    const treffer = MARKTPLATZ_SEITEN.filter((p) =>
      /cm_vermieter_anfragen_state/.test(ohneKommentare(readFileSync(p, 'utf8'))),
    )
    expect(treffer.map((p) => relative(SRC, p))).toEqual([])
  })

  it('meldet Ladefehler, statt sie mit Inhalten zu ueberdecken', () => {
    // Jede Marktplatz-Seite, die Daten laedt, muss einen sichtbaren
    // Fehlerzweig haben. Ohne den landet ein Ausfall wieder als Inhalt auf
    // dem Bildschirm — der Ausgangspunkt des ganzen Problems.
    const ladend = MARKTPLATZ_SEITEN.filter((p) => {
      const text = readFileSync(p, 'utf8')
      return /apiGet\(|apiGet</.test(text) || /fetch\('\/api/.test(text)
    })
    expect(ladend.length).toBeGreaterThan(4)

    const ohneFehlerzweig = ladend.filter((p) => {
      const text = readFileSync(p, 'utf8')
      // `loadValues` reicht das Laden an MeinBereichSubPage durch — dort
      // sitzt der Fehlerzweig (setLoadError) fuer alle diese Seiten
      // gemeinsam. Wer selbst laedt, braucht ihn selbst.
      if (/loadValues=\{/.test(text)) return false
      return !/setFehler\(|setErrorMsg\(|role="alert"/.test(text)
    })
    expect(ohneFehlerzweig.map((p) => relative(SRC, p))).toEqual([])
  })
})
