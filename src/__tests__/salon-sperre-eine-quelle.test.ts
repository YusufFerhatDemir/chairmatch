// @vitest-environment node
/**
 * Die Salon-Sperre steht in `src/lib/salon-status.ts` — nirgends sonst.
 *
 * `src/lib/salon-status.ts` existiert, um eine einzige Frage an einer
 * einzigen Stelle zu beantworten — „nimmt dieser Salon noch Geschaefte an?".
 * Sein Kopfkommentar zaehlt die fuenf Strecken auf, an denen die Antwort
 * zaehlt, und begruendet ausfuehrlich, warum nur ein AUSDRUECKLICHES `false`
 * sperrt und `null` nicht.
 *
 * Am 12.09.2026 stand die Regel trotzdem zweimal ausgeschrieben daneben:
 *
 *     src/app/api/match/route.ts            (l) => l.salon?.is_active !== false
 *     src/app/api/rental-listings/route.ts  (row) => row.salons?.is_active !== false
 *
 * Beide Routen sind oeffentlich (`/api/match` steht in `publicPrefixes`,
 * `/api/rental-listings` in `publicPaths`). Beide Kopien waren zu dem
 * Zeitpunkt inhaltlich richtig — das ist gerade das Tueckische daran: ein
 * Duplikat, das stimmt, faellt nicht auf. Es faellt auf, wenn jemand die
 * Regel im Modul aendert (etwa `is_verified` dazunimmt, was der
 * Kopfkommentar als offene Produktentscheidung fuehrt) und die zwei Kopien
 * uebersieht. Dann empfiehlt die Plattform wieder Salons, die sie gesperrt
 * hat.
 *
 * Dieser Test prueft deshalb den Quelltext, nicht das Verhalten: das
 * Verhalten ist schon anderswo abgedeckt, der Schaden entsteht aber durch
 * die FORM.
 *
 * WAS DAS AUFRAEUMEN ZUTAGE GEFOERDERT HAT: die zwei Kopien waren NICHT
 * dasselbe wie `salonAcceptsBusiness`. Der erste Versuch, sie schlicht durch
 * diese Funktion zu ersetzen, liess `matching-gesperrte-anbieter.test.ts`
 * durchfallen — „verschluckt kein Inserat, dessen Salon-Einbettung leer
 * bleibt". Ein FEHLENDER Salon heisst auf der Geldstrecke „kein Geschaeft"
 * (fail closed) und in einer Liste „nichts spricht dagegen" (eine leere
 * Einbettung ist eine Aussage ueber die Abfrage, nicht ueber den Salon).
 *
 * Das Modul hat deshalb jetzt ZWEI benannte Regeln statt einer Regel und
 * zweier namenloser Kopien: `salonAcceptsBusiness` fuer alles, wo Geld oder
 * eine Verpflichtung entsteht, `salonIsNotBlocked` fuer die oeffentlichen
 * Listen. Der Unterschied ist genau ein Fall, und der wird unten geprueft.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  salonAcceptsBusiness,
  salonIsNotBlocked,
  salonIsPubliclyVisible,
} from '@/lib/salon-status'

const ROOT = process.cwd()
const QUELLE = 'src/lib/salon-status.ts'

/** Die Regel, ausgeschrieben — in allen Schreibweisen, die vorkamen. */
const AUSGESCHRIEBEN = /\b(?:salons?|salon)\??\.\s*is_active\s*(?:!==|===)\s*(?:false|true)/

function dateien(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.next' || e.startsWith('.')) continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) dateien(p, acc)
    else if (/\.tsx?$/.test(e)) acc.push(p)
  }
  return acc
}

describe('salonAcceptsBusiness', () => {
  it('sperrt nur bei einem ausdruecklichen false', () => {
    expect(salonAcceptsBusiness({ is_active: false })).toBe(false)
    expect(salonAcceptsBusiness({ is_active: true })).toBe(true)
    // `null` ist kein Urteil — mit dem anon-Key ist der Wert nicht lesbar,
    // und aus „ich kenne den Default nicht" eine Sperre zu machen hiesse,
    // laufende Buchungen auf eine Vermutung hin abzuschalten.
    expect(salonAcceptsBusiness({ is_active: null })).toBe(true)
    expect(salonAcceptsBusiness({})).toBe(true)
  })

  it('ein fehlender Salon ist kein arbeitsfaehiger Salon', () => {
    expect(salonAcceptsBusiness(null)).toBe(false)
    expect(salonAcceptsBusiness(undefined)).toBe(false)
  })

  it('salonIsNotBlocked unterscheidet sich NUR beim fehlenden Salon', () => {
    // Der eine Fall, der die zweite Funktion rechtfertigt. Laufen die beiden
    // irgendwo sonst auseinander, ist eine von ihnen falsch.
    for (const fall of [{ is_active: false }, { is_active: true }, { is_active: null }, {}]) {
      expect(salonIsNotBlocked(fall)).toBe(salonAcceptsBusiness(fall))
    }
    // Eine leere Einbettung ist eine Aussage ueber die Abfrage, nicht ueber
    // den Salon: die Liste behaelt die Zeile, die Geldstrecke nicht.
    expect(salonIsNotBlocked(null)).toBe(true)
    expect(salonAcceptsBusiness(null)).toBe(false)
    expect(salonIsNotBlocked(undefined)).toBe(true)
  })

  it('die oeffentliche Sichtbarkeit folgt derselben Regel', () => {
    // Zwei Namen, eine Entscheidung. Laufen sie auseinander, ist ein Salon
    // sichtbar, der nichts annehmen darf — oder umgekehrt.
    for (const fall of [{ is_active: false }, { is_active: true }, { is_active: null }, {}]) {
      expect(salonIsPubliclyVisible(fall)).toBe(salonAcceptsBusiness(fall))
    }
    expect(salonIsPubliclyVisible(null)).toBe(salonAcceptsBusiness(null))
  })
})

describe('Keine zweite Quelle der Wahrheit', () => {
  it('niemand schreibt die Salon-Sperre neben dem Modul aus', () => {
    const treffer: string[] = []
    for (const p of dateien(join(ROOT, 'src'))) {
      const rel = p.slice(ROOT.length + 1)
      if (rel === QUELLE) continue // hier GEHOERT sie hin
      if (rel.includes('__tests__')) continue // Tests duerfen den Zustand bauen
      readFileSync(p, 'utf8')
        .split('\n')
        .forEach((zeile, i) => {
          const t = zeile.trimStart()
          if (t.startsWith('//') || t.startsWith('*')) return // Kommentare erklaeren sie
          if (AUSGESCHRIEBEN.test(zeile)) treffer.push(`${rel}:${i + 1}`)
        })
    }
    expect(treffer).toEqual([])
  })

  it('die beiden oeffentlichen Routen rufen den Helfer wirklich auf', () => {
    // Ohne diese Zusicherung waere der Test oben auch dann gruen, wenn jemand
    // den Filter ersatzlos entfernt — und ein gesperrter Salon stuende wieder
    // in Mietsuche und Empfehlungen.
    for (const rel of ['src/app/api/match/route.ts', 'src/app/api/rental-listings/route.ts']) {
      const inhalt = readFileSync(join(ROOT, rel), 'utf8')
      expect(inhalt, rel).toContain("from '@/lib/salon-status'")
      expect(inhalt, rel).toContain('salonIsNotBlocked(')
    }
  })
})
