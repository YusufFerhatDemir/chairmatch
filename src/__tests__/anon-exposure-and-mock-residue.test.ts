// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Track 8. Zwei Befunde, die derselben Ursache entspringen: etwas sah von
 * aussen in Ordnung aus, weil es gerade keine Daten gab.
 *
 * A) ANON-GRANTS. Die Sonde scripts/rls-anon-probe.sh meldete Tabellen mit
 *    HTTP 200 und null Zeilen als "ok (keine Zeilen sichtbar)". Das ist die
 *    falsche Frage. HTTP 200 heisst, dass die Abfrage der Rolle `anon`
 *    AUSGEFUEHRT wurde — das Tabellenrecht ist da. Null Zeilen heisst nur,
 *    dass RLS filtert oder nichts drinsteht. Faellt RLS weg oder kommt die
 *    erste Zeile, liegt der Inhalt oeffentlich unter /rest/v1/<tabelle>.
 *    So stand `newsletter_sends` — Kampagne gegen Abonnent, also ein
 *    Zustellprotokoll — als "ok" da.
 *
 * B) ERFUNDENE DATEN ALS AUSFALLERSATZ. Wieder derselbe Bau wie in Track 7:
 *    ein `catch`, der den Fehler schluckt, und ein Ersatzbestand, der die
 *    Luecke fuellt. Auf /karte waren das drei erfundene Inserate mit
 *    erfundenen Tagespreisen; auf /konto war es ein Loeschbutton, der
 *    `localStorage.clear()` machte und "geloescht" meldete.
 */

const ROOT = process.cwd()
const lies = (...teile: string[]) => readFileSync(join(ROOT, ...teile), 'utf8')

function ohneKommentare(quelltext: string): string {
  return quelltext
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

// ══════════════════════════════════════════════════════════════════════
// A) anon-Grants
// ══════════════════════════════════════════════════════════════════════

/**
 * Tabellen, die die Rolle `anon` nie lesen koennen darf. Diese Liste ist die
 * Quelle der Wahrheit; Sonde und Migration muessen ihr folgen.
 *
 * Alle neun antworteten am 27.08.2026 dem oeffentlichen ANON-Key mit HTTP 200
 * (also: Tabellenrecht vorhanden) — bis auf user_2fa, das bereits zu ist und
 * hier steht, damit ein Ruecksetzer auffliegt.
 */
const NIE_FUER_ANON = [
  'newsletter_sends',        // Kampagne <-> Abonnent = Zustellprotokoll
  'newsletter_campaigns',    // unversandte Entwuerfe
  'payout_accounts',         // Bankverbindung, Kontoinhaber
  'tenant_profiles',         // Klarname, Beruf, Lizenznummer
  'rental_requests',         // Freitext-Nachrichten, Wunschtermine
  'rental_request_dedupe',   // Anfrage-Fingerprints je Nutzer
  'user_uploads',            // storage_path auch privater Zertifikate
  'staff',                   // Mitarbeitende der Salons
  'user_2fa',                // 2FA-Zustand je Konto
]

describe('anon-Expositionsflaeche', () => {
  const migration = lies('supabase/migrations/20260827_anon_grant_lockdown.sql')
  const sonde = lies('scripts/rls-anon-probe.sh')

  it('entzieht jeder gesperrten Tabelle in der Migration das anon-Recht', () => {
    const liste = migration.match(/gesperrt text\[\] := ARRAY\[([\s\S]*?)\]/)
    expect(liste, 'ARRAY-Block in der Migration nicht gefunden').not.toBeNull()
    const inMigration = [...liste![1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1])
    expect([...inMigration].sort()).toEqual([...NIE_FUER_ANON].sort())
  })

  it('haelt die Sperrliste der Sonde deckungsgleich mit der Migration', () => {
    // Ohne diese Kopplung meldet die Sonde nach dem naechsten Tabellen-Zuwachs
    // wieder "ok" fuer etwas, das die Migration nie erfasst hat.
    const zeile = sonde.match(/^GESPERRT="([^"]*)"/m)
    expect(zeile, 'GESPERRT-Zeile in der Sonde nicht gefunden').not.toBeNull()
    const inSonde = zeile![1].trim().split(/\s+/)
    expect([...inSonde].sort()).toEqual([...NIE_FUER_ANON].sort())
  })

  it('bewertet den GRANT am HTTP-Status, nicht an einer erfundenen Spalte', () => {
    /*
     * Der erste Anlauf fragte eine nicht existierende Spalte ab und wertete
     * 42703 ("column does not exist") als "Rechte-Check war durch". Das ist
     * falsch: PostgREST prueft Spaltennamen gegen seinen eigenen
     * Schema-Cache und antwortet 42703, ohne die Abfrage je an PostgreSQL zu
     * schicken. Die Sonde meldete damit ALLE Tabellen als offen, auch
     * `profiles`, das nachweislich zu ist.
     */
    expect(sonde).not.toMatch(/select=zzz_gibt_es_nicht/)
    expect(sonde).toMatch(/200\)\s*G="offen"/)
    expect(sonde).toMatch(/401\)\s*G="zu"/)
  })

  it('faellt durch, sobald eine gesperrte Tabelle Zeilen ODER ein GRANT hat', () => {
    // Beide Zaehler muessen den Exitcode bestimmen — sonst ist ein roter
    // Befund nur Text auf dem Bildschirm.
    expect(sonde).toMatch(/LECK=\$\(\(LECK\+1\)\)/)
    expect(sonde).toMatch(/OFFEN=\$\(\(OFFEN\+1\)\)/)
    expect(sonde).toMatch(/\[ "\$LECK" -gt 0 \] \|\| \[ "\$OFFEN" -gt 0 \] && exit 1/)
  })

  it('macht die IBAN-Spaltensperre wirksam, statt sie nur zu behaupten', () => {
    /*
     * 20260821 schrieb `REVOKE SELECT (iban) ... FROM anon, authenticated`,
     * liess aber das Tabellenrecht stehen. PostgreSQL prueft zuerst das
     * Tabellenrecht, und das deckt alle Spalten ab — ein Spalten-REVOKE kann
     * es nicht loechern. Live bestaetigt: ?select=iban antwortete dem
     * ANON-Key mit 200, nicht mit 42501.
     */
    expect(migration).toMatch(/REVOKE ALL ON TABLE public\.payout_accounts FROM authenticated/)
    const grant = migration.match(/GRANT SELECT \(([^)]*)\)\s*\n?\s*ON public\.payout_accounts/)
    expect(grant, 'Spalten-GRANT fuer payout_accounts nicht gefunden').not.toBeNull()
    expect(grant![1]).not.toMatch(/\biban\b(?!_last4)/)
    expect(grant![1]).toMatch(/iban_last4/)
  })
})

// ══════════════════════════════════════════════════════════════════════
// B) Reste erfundener Daten
// ══════════════════════════════════════════════════════════════════════

describe('/konto: Konto-Loeschung ist echt', () => {
  const seite = lies('src/app/(public)/konto/page.tsx')
  const ohne = ohneKommentare(seite)

  it('schickt die Loeschung an /api/account/delete', () => {
    // Vorher gab es ueberhaupt keinen Request — nur localStorage.clear().
    expect(ohne).toMatch(/\/api\/account\/delete/)
    expect(ohne).toMatch(/confirmEmail/)
  })

  it('raeumt den Browserspeicher nicht mehr als Ersatz fuer eine Loeschung', () => {
    // `localStorage.clear()` war die gesamte "Loeschung": Konto, Profil und
    // Daten blieben unveraendert, der Nutzer konnte sich danach normal wieder
    // anmelden — und glaubte, geloescht zu sein.
    expect(ohne).not.toMatch(/localStorage\.clear\(\)/)
  })

  it('meldet Erfolg erst, wenn der Server ihn bestaetigt hat', () => {
    const block = ohne.slice(ohne.indexOf('async function handleDelete'))
    const bisErfolg = block.slice(0, block.indexOf("showToast(t('toast.deleted')"))
    expect(bisErfolg).toMatch(/if \(r\.ok\)/)
  })

  it('zeigt den Fehlschlag sichtbar an', () => {
    expect(ohne).toMatch(/setDeleteError\(/)
    expect(ohne).toMatch(/role="alert"/)
    // Kein stilles catch{}: der Nutzer muss wissen, dass NICHT geloescht wurde.
    expect(ohne).toMatch(/NICHT gelöscht/)
  })
})

describe('/karte: keine erfundenen Inserate', () => {
  const seite = lies('src/app/(public)/karte/page.tsx')
  const ohne = ohneKommentare(seite)

  it('haelt keinen Ersatzbestand mehr vor', () => {
    expect(ohne).not.toMatch(/\bDEMO_LISTINGS\b/)
    expect(ohne).not.toMatch(/Beispiel-Salon|Beispiel-Studio|Beispiel-Barbershop/)
    // Erfundene Tagespreise (45/55/65 EUR) auf einer oeffentlichen Seite
    // lesen sich wie Marktpreise von ChairMatch.
    expect(ohne).not.toMatch(/priceDayCents: (4500|5500|6500)/)
  })

  it('unterscheidet Ladefehler von "es gibt nichts"', () => {
    // Beides sah vorher gleich aus: "Gerade keine Live-Inserate" — auch dann,
    // wenn die Abfrage gescheitert war und die Inserate sehr wohl existierten.
    expect(ohne).toMatch(/ladefehler = true/)
    expect(ohne).toMatch(/\{ladefehler &&/)
    expect(ohne).toMatch(/\{!ladefehler && listings\.length === 0 &&/)
  })

  it('schluckt den Fehler nicht mehr stumm', () => {
    expect(ohne).toMatch(/catch \(e\)/)
    expect(ohne).toMatch(/console\.error\('\[karte\]/)
  })
})

describe('sitemap: keine erfundenen Salons bei Google anmelden', () => {
  const sitemap = lies('src/app/sitemap.ts')
  const ohne = ohneKommentare(sitemap)

  it('traegt die Demo-Provider nicht mehr ein', () => {
    // 30 Eintraege /salon/p1 … /salon/p30 — erfundene Betriebe mit erfundener
    // Adresse und erfundenem Bewertungsschnitt, angemeldet als echte Seiten
    // dieser Website. Auch im catch-Zweig.
    expect(ohne).not.toMatch(/\bPROVS\b/)
    expect(ohne).not.toMatch(/\bdemoPages\b/)
  })

  it('meldet echte Salons weiterhin an', () => {
    expect(ohne).toMatch(/salonPages/)
  })
})

describe('Demo-Konten sind ausserhalb der lokalen Entwicklung tot', () => {
  const config = lies('src/modules/auth/auth.config.ts')

  it('haengt nicht allein an NODE_ENV', () => {
    /*
     * Quelltext-Pruefung mit Absicht: unter vitest ist NODE_ENV ohnehin
     * 'test', ein Verhaltenstest waere also auch ohne den zweiten Riegel
     * gruen und damit wertlos.
     *
     * Die Liste enthaelt feste Klartext-Passwoerter, darunter eines mit der
     * Rolle super_admin, und liegt im Repository. Stuende NODE_ENV in einer
     * Deploy-Umgebung je auf 'development', haette jeder Leser dieser Datei
     * Super-Admin-Zugang zur Produktionsdatenbank.
     */
    const zeile = config.match(/const IS_DEV = .*/)
    expect(zeile).not.toBeNull()
    expect(zeile![0]).toMatch(/process\.env\.NODE_ENV === 'development'/)
    expect(zeile![0]).toMatch(/!process\.env\.VERCEL/)
  })

  it('leert die Demo-Liste, wenn das Gate zu ist', () => {
    expect(config).toMatch(/IS_DEV \? \{/)
    expect(config).toMatch(/\} : \{\}/)
  })
})
