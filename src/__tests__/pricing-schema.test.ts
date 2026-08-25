/**
 * Preis-Schema — strukturelle Verifikation
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Track 6 von Phase 7. Der Auftrag war ausdruecklich PRUEFEN, nicht
 * Preise festlegen: `protect_pricing` und `compliance_plans` sind
 * strukturell fertig und absichtlich leer (BUSINESS_INPUT_REQUIRED).
 *
 * ── WARUM DIESE PRUEFUNG AUF DEM SQL-TEXT LAEUFT ────────────────────────
 * Das Repository hat keine lokale Postgres-Instanz und keine PGlite-
 * Abhaengigkeit; die einzige Datenbank ist die Produktionsinstanz, gegen
 * die kein Test schreiben darf. Es gibt genau zwei ehrliche
 * Moeglichkeiten, das Schema hier zu pruefen:
 *
 *   1. gegen die Live-Datenbank LESEN  → `scripts/verify-pricing-schema.mjs`
 *      (braucht Keys, laeuft nicht in CI)
 *   2. die Migrationsdatei als Quelle der Wahrheit lesen → diese Suite
 *
 * Diese Suite ist bewusst Nummer 2 und behauptet nichts ueber den
 * Live-Zustand. Was sie leistet: sie haelt fest, welche Zusicherungen die
 * Migration gibt, und schlaegt an, wenn jemand eine davon entfernt. Was
 * sie NICHT leistet: einen Nachweis, dass die Migration angewendet ist.
 * Dafuer ist Skript 1 da.
 *
 * ── ZWEI DINGE, DIE HIER FEHLEN UND DESHALB FESTGEHALTEN WERDEN ─────────
 * `effective_from` / `effective_to` gibt es im aktuellen Schema NICHT.
 * Preise sind damit nicht zeitversioniert: eine Preisaenderung
 * ueberschreibt den alten Wert, und eine Rechnung von gestern ist nicht
 * mehr nachvollziehbar. Die Tests unten halten diesen Zustand
 * ausdruecklich fest, damit die Luecke sichtbar bleibt statt
 * unbenannt — und schlagen um, sobald
 * `20260826_pricing_gueltigkeit.sql` angewendet und hier nachgezogen
 * wird.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const WURZEL = process.cwd()
const MIGRATION = join(WURZEL, 'supabase/migrations/20260824_pricing_schema.sql')
const GUELTIGKEIT = join(WURZEL, 'supabase/migrations/20260826_pricing_gueltigkeit.sql')
const SEED = join(WURZEL, 'supabase/seed/pricing.seed.template.sql')
const SEED_VERSIONIERT = join(WURZEL, 'supabase/seed/pricing.seed.versioniert.template.sql')

const sql = readFileSync(MIGRATION, 'utf8')

/**
 * Die Datei OHNE Kommentarzeilen.
 *
 * Noetig, weil die Kopfkommentare bewusst ueber die Fallen sprechen, die
 * hier geprueft werden (`CREATE TABLE IF NOT EXISTS ist wirkungslos`,
 * Beispielbetraege aus 20260310). Eine Pruefung auf dem Rohtext faende
 * die ERKLAERUNG und meldete sie als Verstoss.
 */
const nurAnweisungen = sql
  .split('\n')
  .filter(z => !z.trimStart().startsWith('--'))
  .join('\n')

/** Normalisiert Whitespace, damit Zeilenumbrueche in SQL nicht mitpruefen. */
const flach = (s: string) => s.replace(/\s+/g, ' ')
const flachSql = flach(sql)

// ═══════════════════════════════════════════════════════════════════════
// 1. Cent-genaue Speicherung — keine Gleitkomma-Geldwerte
// ═══════════════════════════════════════════════════════════════════════

describe('Geldwerte sind ganzzahlige Cent', () => {
  const GELDSPALTEN = [
    'day_price_cents',
    'month_price_cents',
    'year_price_cents',
    'price_cents',
    'extra_submission_price_cents',
  ]

  it.each(GELDSPALTEN)('%s ist integer', (spalte) => {
    expect(flachSql).toMatch(new RegExp(`${spalte}\\s+integer`, 'i'))
  })

  it('keine Geldspalte ist numeric, decimal, real oder double precision', () => {
    // Der Fehler, den das verhindert: `numeric` waere fachlich richtig,
    // `real`/`double precision` aber nicht — 0,1 + 0,2 ist dort nicht 0,3.
    // Die Konvention dieses Schemas ist ganzzahliger Cent; jede Abweichung
    // waere eine stille Aenderung der Rechenbasis.
    for (const spalte of GELDSPALTEN) {
      expect(flachSql).not.toMatch(
        new RegExp(`${spalte}\\s+(numeric|decimal|real|double precision|float)`, 'i')
      )
    }
  })

  it('jede Geldspalte endet auf _cents — die Einheit steht im Namen', () => {
    for (const spalte of GELDSPALTEN) expect(spalte.endsWith('_cents')).toBe(true)
  })

  it('kein Preis darf negativ sein, 0 bleibt erlaubt', () => {
    expect(flachSql).toContain(
      'CHECK (day_price_cents >= 0 AND month_price_cents >= 0 AND year_price_cents >= 0)'
    )
    expect(flachSql).toContain('CHECK (price_cents >= 0 AND extra_submission_price_cents >= 0)')
    // 0 heisst „gratis", nicht „gibt es nicht" — der Unterschied steht im
    // Seed-Template und darf nicht durch ein `> 0` verwischt werden.
    expect(flachSql).not.toMatch(/day_price_cents\s*>\s*0/)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// 2. Wertebereiche: risk_level, plan_type, currency
// ═══════════════════════════════════════════════════════════════════════

describe('Wertebereiche', () => {
  it('risk_level kennt genau die vier Stufen, die der Code kennt', () => {
    expect(flachSql).toContain("CHECK (risk_level IN ('LOW', 'MED', 'HIGH', 'VERY_HIGH'))")
  })

  it('die Stufen des Schemas stimmen mit RiskBadge.tsx überein', () => {
    // Zwei Definitionen derselben Taxonomie an zwei Orten sind die Ursache
    // der meisten Drifts. Hier wird die Uebereinstimmung erzwungen.
    const badge = readFileSync(join(WURZEL, 'src/components/RiskBadge.tsx'), 'utf8')
    const treffer = badge.match(/type RiskLevel = ([^\n]+)/)
    expect(treffer, 'RiskLevel-Typ nicht gefunden').not.toBeNull()
    const stufen = [...treffer![1].matchAll(/'([A-Z_]+)'/g)].map(m => m[1])
    expect(stufen.sort()).toEqual(['HIGH', 'LOW', 'MED', 'VERY_HIGH'])
    for (const stufe of stufen) expect(flachSql).toContain(`'${stufe}'`)
  })

  it('plan_type kennt genau die drei Plaene aus dem Repository', () => {
    expect(flachSql).toContain("CHECK (plan_type IN ('one_time', 'yearly', 'monthly'))")
  })

  it('currency ist auf ISO-4217-Form beschraenkt', () => {
    const treffer = flachSql.match(/CHECK \(currency ~ '\^\[A-Z\]\{3\}\$'\)/g)
    // Beide Tabellen, nicht nur eine.
    expect(treffer).toHaveLength(2)
  })

  it('currency hat einen Default und ist NOT NULL', () => {
    const treffer = flachSql.match(/currency\s+text NOT NULL DEFAULT 'EUR'/g)
    expect(treffer).toHaveLength(2)
  })

  it('Stueckzahlen und Laufzeiten sind nicht negativ', () => {
    expect(flachSql).toContain('CHECK (included_submissions >= 0 AND min_term_months >= 0)')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// 3. Keine ueberlappenden aktiven Preise
// ═══════════════════════════════════════════════════════════════════════

describe('Eindeutigkeit aktiver Preise', () => {
  it('je Risikostufe kann es nur eine Zeile geben', () => {
    expect(flachSql).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS protect_pricing_risk_level_key ON public.protect_pricing (risk_level)'
    )
  })

  it('je Plan-Typ kann es nur eine Zeile geben', () => {
    expect(flachSql).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS compliance_plans_plan_type_key ON public.compliance_plans (plan_type)'
    )
  })

  it('das aktuelle Schema erzwingt Eindeutigkeit über die Zeile, nicht über einen Zeitraum', () => {
    // Festgehaltener IST-Zustand: „keine zwei aktiven Preise" wird hier
    // dadurch erreicht, dass es ueberhaupt nur EINE Zeile je Stufe gibt.
    // Das ist wirksam — aber es gibt damit auch keine Preisgeschichte.
    expect(nurAnweisungen).not.toMatch(/EXCLUDE\s+USING\s+gist/i)
    expect(nurAnweisungen).not.toMatch(/daterange/i)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// 4. effective_from / effective_to — die benannte Luecke
// ═══════════════════════════════════════════════════════════════════════

describe('Zeitliche Gültigkeit', () => {
  it('das angewendete Schema kennt effective_from/effective_to NICHT', () => {
    // ‼️ Dieser Test haelt eine LUECKE fest, keine Eigenschaft.
    //
    // Folge im Betrieb: eine Preisaenderung ueberschreibt den alten Wert
    // (der Seed macht genau das per ON CONFLICT DO UPDATE). Zu einer
    // Rechnung von gestern laesst sich danach nicht mehr feststellen,
    // welcher Preis damals galt.
    //
    // Solange beide Tabellen leer sind, ist der Schaden null. Mit dem
    // ersten verkauften Vertrag ist es eine Nachweisluecke.
    expect(nurAnweisungen).not.toMatch(/effective_from/)
    expect(nurAnweisungen).not.toMatch(/effective_to/)
  })

  it('die Nachrüst-Migration liegt vor und ist noch nicht Teil des Grundschemas', () => {
    expect(existsSync(GUELTIGKEIT), '20260826_pricing_gueltigkeit.sql fehlt').toBe(true)
    const nach = readFileSync(GUELTIGKEIT, 'utf8')
    expect(nach).toMatch(/effective_from/)
    expect(nach).toMatch(/effective_to/)
    // Sie muss den Ueberlappungsschutz mitbringen — sonst ersetzt sie eine
    // wirksame Eindeutigkeit (eine Zeile je Stufe) durch gar keine.
    expect(nach).toMatch(/EXCLUDE\s+USING\s+gist/i)
    expect(nach).toMatch(/btree_gist/i)
    // Und sie darf nicht automatisch mitlaufen.
    expect(nach).toMatch(/SQL-Editor/i)
  })

  it('die Nachrüst-Migration erlaubt kein Ende vor dem Beginn', () => {
    const nach = readFileSync(GUELTIGKEIT, 'utf8')
    expect(flach(nach)).toMatch(/effective_to IS NULL OR effective_to > effective_from/)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// 5. RLS
// ═══════════════════════════════════════════════════════════════════════

describe('RLS und Rechte', () => {
  it('beide Tabellen haben RLS aktiviert', () => {
    expect(flachSql).toContain('ALTER TABLE public.protect_pricing ENABLE ROW LEVEL SECURITY')
    expect(flachSql).toContain('ALTER TABLE public.compliance_plans ENABLE ROW LEVEL SECURITY')
  })

  it('es wird KEINE Policy angelegt — RLS an ohne Policy ist deny', () => {
    // Eine `FOR ALL USING (true)`-Policy waere RLS ohne Wirkung. Der
    // gesamte Lesepfad laeuft ueber service_role (umgeht RLS), also
    // braucht kein Client eine Policy.
    expect(nurAnweisungen).not.toMatch(/CREATE POLICY/i)
  })

  it('Alt-Policies früherer Entwürfe werden entfernt', () => {
    for (const p of ['protect_pricing_all', 'protect_pricing_public_read',
                     'compliance_plans_all', 'compliance_plans_public_read']) {
      expect(sql).toContain(`DROP POLICY IF EXISTS "${p}"`)
    }
  })

  it('anon und authenticated verlieren jedes Recht auf beiden Tabellen', () => {
    // RLS allein reicht nicht: ein GRANT bleibt bestehen und wirkt, sobald
    // irgendwann eine permissive Policy dazukommt.
    expect(flachSql).toContain('REVOKE ALL ON public.protect_pricing FROM anon, authenticated')
    expect(flachSql).toContain('REVOKE ALL ON public.compliance_plans FROM anon, authenticated')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// 6. Die Migration legt keine Preise an
// ═══════════════════════════════════════════════════════════════════════

describe('BUSINESS_INPUT_REQUIRED', () => {
  it('die Migration enthält kein einziges INSERT', () => {
    // Der Kern des Auftrags: Preise werden nicht erfunden. Ein INSERT hier
    // waere ein Preis, den niemand entschieden hat.
    expect(nurAnweisungen).not.toMatch(/INSERT\s+INTO/i)
  })

  it('die Migration markiert sich selbst als geschäftsentscheidungs-abhängig', () => {
    expect(sql).toContain('BUSINESS_INPUT_REQUIRED')
  })

  it('das Seed-Template ist ohne Ausfüllen absichtlich NICHT lauffähig', () => {
    const seed = readFileSync(SEED, 'utf8')
    // Die Platzhalter sind SQL-ungueltig. Ein versehentlicher Lauf bricht
    // mit Syntaxfehler ab, statt still Fantasiepreise anzulegen.
    expect(seed).toMatch(/<<<[A-Z_]+>>>/)
    expect(seed).not.toMatch(/VALUES\s*\(\s*'HIGH',\s*\d+/)
  })

  it('kein Beispielbetrag aus dem alten Entwurf steht mehr im Seed', () => {
    const seed = readFileSync(SEED, 'utf8')
    // 20260310 trug Entwurfswerte, die ausdruecklich NICHT gelten. Sie
    // duerfen nirgends als Vorbelegung wiederauftauchen.
    for (const betrag of ['2900', '12900', '89900', '9900', '29900', '3900']) {
      expect(seed).not.toMatch(new RegExp(`\\b${betrag}\\b`))
    }
  })

  it('das versionierte Seed-Template existiert und ist ebenfalls ungefüllt', () => {
    expect(existsSync(SEED_VERSIONIERT)).toBe(true)
    const seed = readFileSync(SEED_VERSIONIERT, 'utf8')
    expect(seed).toMatch(/<<<[A-Z_]+>>>/)
    expect(seed).toMatch(/effective_from/)
    expect(seed).toContain('BUSINESS_INPUT_REQUIRED')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// 7. Migrationshygiene
// ═══════════════════════════════════════════════════════════════════════

describe('Migrationshygiene', () => {
  it('die Strukturmigration läuft in einer Transaktion', () => {
    expect(sql).toMatch(/^\s*BEGIN;/m)
    expect(sql).toMatch(/^COMMIT;/m)
  })

  it('sie benutzt ausschließlich ALTER … ADD COLUMN IF NOT EXISTS', () => {
    // `CREATE TABLE IF NOT EXISTS` auf einer bereits bestehenden Tabelle
    // ist wirkungslos — genau daran war 20260310 live gescheitert.
    expect(nurAnweisungen).not.toMatch(/CREATE TABLE/i)
    expect(nurAnweisungen).toMatch(/ADD COLUMN IF NOT EXISTS/)
  })

  it('SET NOT NULL läuft nur auf leerer Tabelle', () => {
    // Auf einer befuellten Tabelle wuerde SET NOT NULL die ganze
    // Transaktion zurueckrollen.
    expect(flachSql).toMatch(/IF n = 0 THEN ALTER TABLE public\.protect_pricing ALTER COLUMN risk_level SET NOT NULL/)
    expect(flachSql).toMatch(/IF n = 0 THEN ALTER TABLE public\.compliance_plans ALTER COLUMN plan_type SET NOT NULL/)
  })

  it('der Fremdschlüssel-Block ist auskommentiert und läuft nicht mit', () => {
    // Gegen eine leere Referenztabelle scheitert jede bestehende Zeile.
    const fkZeilen = sql.split('\n').filter(z => z.includes('insurance_policies_risk_level_fkey'))
    expect(fkZeilen.length).toBeGreaterThan(0)
    for (const z of fkZeilen) expect(z.trimStart().startsWith('--')).toBe(true)
  })
})
