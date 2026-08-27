// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Track 9. Drei Befunde, alle nach demselben Muster wie in Track 6 und 7:
 * etwas sah fuer den Nutzer aus wie ein Ergebnis und war eine Erfindung des
 * Browsers.
 *
 * A) STILLER ERFOLG IN DER TERMINBUCHUNG.
 *    /booking/[salonId] schickte fuer die dreissig Demo-Salons aus `PROVS`
 *    absichtlich `salonId: undefined` los und fing die unvermeidliche Absage
 *    ab, um dann /booking/success anzusteuern — die Seite, die "BESTÄTIGT!"
 *    samt Salon, Leistung, Datum, Uhrzeit und Preis zeigt. Es gab weder eine
 *    Zeile in `bookings` noch eine E-Mail noch einen Salon, der davon wusste.
 *    Derselbe Zweig sprang auch bei einem Netzwerkfehler an.
 *
 *    Serverseitig war genau dieser Fehler in Track 6 geschlossen worden
 *    (createBooking meldete `success` ohne salonId). Der Browser hat ihn
 *    danach weiter selbst erzeugt — ein Beleg dafuer, dass ein Fix an der
 *    Route nichts nuetzt, solange der Aufrufer die Absage wegwirft.
 *
 * B) RABATT AUS EINER BROWSER-KONSTANTE.
 *    `PROMO_CODES` in src/lib/constants.ts fuehrte CHAIR2026 (15 %),
 *    WELCOME10 (10 %) und BEAUTY5 (5 €). Der Server kennt diese Liste nicht:
 *    er prueft die Tabelle `promo_codes` und belegt dort ein Kontingent per
 *    Compare-and-Swap (claimPromoCode). Die Buchungsseite meldete trotzdem
 *    "✓ Code gültig! Du sparst 15 €" und rechnete eine Endsumme aus, ohne
 *    den Server je gefragt zu haben.
 *
 * C) DOUBLE-BLIND-BEWERTUNGEN AUF DER OEFFENTLICHEN SALONSEITE.
 *    /salon/[slug] fragte `reviews` direkt ab, ohne Filter auf den
 *    Bewertungstyp. Miet-Bewertungen tragen aus Legacy-Gruenden dieselbe
 *    `salon_id`, sind aber gesperrt, bis beide Seiten bewertet haben oder
 *    14 Tage vergangen sind. Die Sperre, die /api/reviews/rental und
 *    /api/reviews/aggregate durchsetzen, war ueber die Salonseite zu
 *    umgehen — mit dem Namen des Bewertenden daneben.
 */

const ROOT = process.cwd()
const lies = (...teile: string[]) => readFileSync(join(ROOT, ...teile), 'utf8')

function ohneKommentare(quelltext: string): string {
  return quelltext
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const BUCHUNGSSEITE = 'src/app/(protected)/booking/[salonId]/page.tsx'
const SALONSEITE = 'src/app/(public)/salon/[slug]/page.tsx'

// ══════════════════════════════════════════════════════════════════════
// A) Kein stiller Erfolg in der Terminbuchung
// ══════════════════════════════════════════════════════════════════════

describe('Terminbuchung meldet keinen Erfolg, den es nicht gab', () => {
  const code = ohneKommentare(lies(BUCHUNGSSEITE))

  it('leitet nur mit einer Server-Antwort auf die Bestaetigung', () => {
    // Jeder Aufruf muss ein Argument haben — das ist die Antwort der Route.
    // Der parameterlose Aufruf war genau der erfundene Erfolg.
    const aufrufe = [...code.matchAll(/saveAndRedirectToSuccess\(([^)]*)\)/g)]
    expect(aufrufe.length).toBeGreaterThan(0)
    for (const treffer of aufrufe) {
      expect(treffer[1].trim(), `saveAndRedirectToSuccess${treffer[0]}`).not.toBe('')
    }
  })

  it('verlangt eine bookingId, bevor es "gebucht" sagt', () => {
    expect(code).toMatch(/data\.bookingId/)
  })

  it('schickt die echte Salon-ID mit, statt sie absichtlich wegzulassen', () => {
    expect(code).not.toMatch(/salonId:\s*demoP\s*\?\s*undefined/)
    expect(code).toMatch(/salonId:\s*salon\.id/)
  })

  it('bietet fuer einen Demo-Eintrag gar kein Buchungsformular an', () => {
    // Der Ausstieg muss VOR dem Formular kommen; sonst laeuft der Nutzer
    // wieder in einen Ablauf, der nur scheitern kann.
    const ausstieg = code.indexOf('if (demoP) {')
    const formular = code.indexOf('handleSubmit')
    expect(ausstieg).toBeGreaterThan(-1)
    expect(code.slice(ausstieg, ausstieg + 400)).toMatch(/return \(/)
    expect(formular).toBeGreaterThan(-1)
  })

  it('verschluckt keinen Fehlschlag mehr im catch-Zweig', () => {
    // Frueher: catch { if (demoP) { saveAndRedirectToSuccess(); return } }
    const catchBloecke = [...code.matchAll(/catch\s*(\([^)]*\))?\s*\{([\s\S]{0,400}?)\}/g)]
    for (const [, , inhalt] of catchBloecke) {
      expect(inhalt).not.toMatch(/saveAndRedirectToSuccess/)
    }
  })
})

// ══════════════════════════════════════════════════════════════════════
// B) Preise kommen vom Server
// ══════════════════════════════════════════════════════════════════════

describe('Rabatt und Endpreis kommen aus der Buchung, nicht aus dem Browser', () => {
  const code = ohneKommentare(lies(BUCHUNGSSEITE))

  it('rechnet im Browser keinen Rabatt aus', () => {
    expect(code).not.toMatch(/PROMO_CODES/)
  })

  it('zeigt keine Endsumme, die niemand zugesagt hat', () => {
    // `finalPrice` darf nur noch als Feld der Server-Antwort vorkommen,
    // nicht als lokal gerechneter Wert.
    expect(code).not.toMatch(/const\s+finalPrice\s*=/)
    expect(code).not.toMatch(/const\s+discountAmount\s*=/)
  })

  it('uebernimmt den Preis aus der angelegten Buchung', () => {
    expect(code).toMatch(/gebucht\.priceCents/)
    expect(code).toMatch(/gebucht\.promoApplied/)
  })

  it('gibt createBooking den wirklich gespeicherten Preis zurueck', () => {
    const actions = lies('src/modules/booking/booking.actions.ts')
    expect(actions).toMatch(/priceCents:\s*finalPriceCents/)
    expect(actions).toMatch(/promoApplied:\s*promoClaimed/)
  })

  it('fuehrt die erfundene Rabattliste nirgends mehr', () => {
    // Solange sie irgendwo steht, importiert sie irgendwann wieder jemand.
    const konstanten = ohneKommentare(lies('src/lib/constants.ts'))
    expect(konstanten).not.toMatch(/PROMO_CODES/)
    expect(konstanten).not.toMatch(/DEFAULT_NOTIFICATIONS/)
  })
})

// ══════════════════════════════════════════════════════════════════════
// C) Double-blind bleibt double-blind
// ══════════════════════════════════════════════════════════════════════

describe('Oeffentliche Salonseite umgeht die Bewertungssperre nicht', () => {
  const code = ohneKommentare(lies(SALONSEITE))

  it('fragt reviews nicht an der gemeinsamen Regel vorbei ab', () => {
    expect(code).not.toMatch(/from\(['"]reviews['"]\)/)
  })

  it('nimmt die gefilterte Liste aus dem Bewertungsmodul', () => {
    expect(code).toMatch(/getReviews\(/)
    expect(code).toMatch(/from '@\/modules\/reviews\/review\.actions'/)
  })

  it('begrenzt erst NACH dem Filter auf zehn', () => {
    // Ein `.limit(10)` vor dem Filter haette bei zehn Miet-Bewertungen
    // ueberhaupt keine Kundenbewertung mehr uebrig gelassen.
    expect(code).toMatch(/getReviews\(salon\.id\)/)
    expect(code).toMatch(/\.slice\(0,\s*10\)/)
  })

  it('haelt die Typregel an einer einzigen Stelle', () => {
    const service = lies('src/modules/reviews/review.service.ts')
    expect(service).toMatch(/export function isSalonReview/)
    const actions = lies('src/modules/reviews/review.actions.ts')
    expect(actions).toMatch(/filter\(isSalonReview\)/)
  })
})

// ══════════════════════════════════════════════════════════════════════
// D) Oeffentliche Route, oeffentliche Spalten
// ══════════════════════════════════════════════════════════════════════

describe('GET /api/salons/[id] gibt nur eine Positivliste heraus', () => {
  const route = lies('src/app/api/salons/[id]/route.ts')

  it('liest salons und staff nicht mehr mit select(*)', () => {
    const abfragen = [...route.matchAll(/from\('(salons|staff)'\)\s*\n?\s*\.select\(([^)]*)\)/g)]
    expect(abfragen.length).toBeGreaterThan(0)
    for (const [, tabelle, spalten] of abfragen) {
      expect(spalten.trim(), `${tabelle} liest noch mit ${spalten}`).not.toMatch(/^['"]\*['"]$/)
    }
  })

  it.each(['owner_id', 'email', 'status', 'gewerbe_check'])(
    'fuehrt %s nicht in der oeffentlichen Spaltenliste',
    (feld) => {
      const liste = route.match(/const SALON_PUBLIC_COLUMNS = \[([\s\S]*?)\]/)
      expect(liste, 'SALON_PUBLIC_COLUMNS nicht gefunden').not.toBeNull()
      const spalten = [...liste![1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1])
      expect(spalten).not.toContain(feld)
    },
  )

  it('nennt bei staff keinen Kontoschluessel', () => {
    const liste = route.match(/const STAFF_PUBLIC_COLUMNS = '([^']*)'/)
    expect(liste).not.toBeNull()
    expect(liste![1]).not.toMatch(/user_id/)
  })
})
