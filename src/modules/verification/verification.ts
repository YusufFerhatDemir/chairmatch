/**
 * Was heisst „verifiziert"? — das Stufenmodell.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WARUM ES DIESES MODUL GIBT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Bis zum 12.09.2026 gab es dafuer genau EIN Bit: `salons.is_verified`.
 * Gesetzt wird es an einer einzigen Stelle — `src/app/api/admin/route.ts`,
 * Aktion `salon-status` mit `approved` — und diese Stelle verlangt nichts:
 * keinen Ausweis, keine Gewerbeanmeldung, keinen Registerauszug. Ein Klick.
 *
 * Dem gegenueber stehen 100 Stellen in 35 Dateien, die oeffentlich von
 * „verifiziert" sprechen, davon 21 ueber HEILBERUFE („verifizierte
 * Kliniken", „verifizierten Aerzten", als Seitentitel „Verifizierte
 * Kliniken in Deutschland"). Ein Bit kann das nicht tragen: es trennt nicht
 * zwischen „wir haben die E-Mail bestaetigt" und „wir haben den
 * Facharzttitel gesehen", sagt aber beides zugleich.
 *
 * Dieses Modul trennt die Frage in fuenf unabhaengige Dimensionen und —
 * das ist der eigentliche Punkt — macht „darueber wissen wir NICHTS"
 * ausdrueckbar. `nicht_erhoben` ist ein eigener Zustand, nicht dasselbe wie
 * „noch offen". Drei der fuenf Dimensionen stehen heute auf `nicht_erhoben`,
 * und das soll man sehen.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WAS ES HEUTE WIRKLICH GIBT — gemessen am 12.09.2026
 * ══════════════════════════════════════════════════════════════════════
 *
 *   email          Supabase-Auth fuehrt `email_confirmed_at`; die
 *                  Registrierung nutzt `emailRedirectTo`, der Link wird
 *                  also verschickt. NICHT nach `profiles` gespiegelt.
 *   telefon        `phone_verifications.verified` — /api/auth/phone/verify
 *                  setzt es und schreibt danach `profiles.phone`. Ein
 *                  eigenes Flag auf `profiles` gibt es nicht.
 *   identitaet     NICHTS. Keine Tabelle, keine Route, kein Anbieter.
 *   gewerbe        Nachweise koennen hochgeladen werden
 *                  (`/api/owner/documents`, `/api/owner/authorities-pack`,
 *                  Tabellen `documents` und `authorities_packs`) — aber
 *                  KEIN Pfad sieht sie an. Der Upload ist ein Briefkasten
 *                  ohne Leerung.
 *   qualifikation  NICHTS. Meisterbrief, Approbation, Fachkunde: nirgends.
 *
 * Deshalb bekommt jede Dimension ihre Signale VON AUSSEN gereicht statt
 * selbst zu laden: die Quellen liegen in drei verschiedenen Systemen
 * (auth.users, phone_verifications, profiles), und das Modul soll ohne
 * Datenbank testbar bleiben. Dieselbe Linie wie `src/lib/salon-status.ts`.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WAS DIESES MODUL AUSDRUECKLICH NICHT ENTSCHEIDET
 * ══════════════════════════════════════════════════════════════════════
 *
 * Es entscheidet NICHT, ab welcher Stufe die Oeffentlichkeit „verifiziert"
 * lesen darf. Das ist eine Produkt- und Rechtsentscheidung — siehe
 * `darfAlsVerifiziertGelten` weiter unten. Das Modul stellt fest, was
 * geprueft wurde; was man darueber schreibt, steht woanders.
 */

/**
 * Der Zustand EINER Dimension.
 *
 * `nicht_erhoben` und `offen` auseinanderzuhalten ist der Kern: das eine
 * heisst „es gibt fuer diese Pruefung ueberhaupt keinen Vorgang", das
 * andere „der Vorgang laeuft, ist aber nicht abgeschlossen". Wer beides zu
 * `false` zusammenzieht, kann hinterher nicht sagen, ob jemand die Pruefung
 * nicht bestanden oder nie angeboten bekommen hat.
 */
export type Verifikationsstufe =
  /** Fuer diese Pruefung existiert im Produkt kein Vorgang. */
  | 'nicht_erhoben'
  /** Vorgang existiert, Ergebnis steht aus (Code verschickt, Datei liegt da). */
  | 'offen'
  /** Geprueft und bestanden. */
  | 'bestaetigt'
  /** Geprueft und durchgefallen — sperrt bewusst, statt nur „nicht bestaetigt". */
  | 'abgelehnt'

/** Die fuenf Dimensionen, in aufsteigender Aussagekraft. */
export const DIMENSIONEN = [
  'email',
  'telefon',
  'identitaet',
  'gewerbe',
  'qualifikation',
] as const

export type Dimension = (typeof DIMENSIONEN)[number]

export type Verifikationsprofil = Record<Dimension, Verifikationsstufe>

/**
 * Die Rohsignale, so wie sie in den drei Quellsystemen liegen.
 *
 * Alles optional und alles `null`-faehig: ein Aufrufer, der eine Quelle
 * nicht geladen hat, soll nicht gezwungen sein, etwas zu behaupten.
 * Fehlendes Signal → `nicht_erhoben`, nie `bestaetigt`.
 */
export interface VerifikationsSignale {
  /** `auth.users.email_confirmed_at` — ein Zeitstempel oder nichts. */
  emailBestaetigtAm?: string | null
  /** `phone_verifications.verified` fuer die zuletzt angeforderte Nummer. */
  telefonBestaetigt?: boolean | null
  /** Ein Telefon-Code wurde verschickt, das Ergebnis steht aus. */
  telefonCodeOffen?: boolean | null

  /*
   * Fuer die drei folgenden gibt es heute KEINE Quelle. Sie stehen hier,
   * damit der Aufrufer sie liefern KANN, sobald es eine gibt — und damit
   * sichtbar bleibt, dass sie fehlen. Wer sie nicht setzt, bekommt
   * `nicht_erhoben`, und genau das ist der heutige Stand.
   */
  identitaetGeprueft?: boolean | null
  gewerbeNachweisGeprueft?: boolean | null
  qualifikationGeprueft?: boolean | null

  /** Liegen unbearbeitete Nachweise vor? Macht aus `nicht_erhoben` ein `offen`. */
  nachweiseLiegenVor?: boolean | null

  /**
   * Eine Dimension kann ausdruecklich abgelehnt sein. Getrennt gefuehrt,
   * weil `false` bei den Feldern oben „nicht bestaetigt" heisst und nicht
   * „geprueft und durchgefallen".
   */
  abgelehnt?: readonly Dimension[] | null
}

/** Aus Signalen wird ein Profil. Ohne Signal: `nicht_erhoben`. */
export function verifikationsprofil(
  signale: VerifikationsSignale | null | undefined,
): Verifikationsprofil {
  const s = signale ?? {}
  const abgelehnt = new Set<Dimension>(s.abgelehnt ?? [])

  const stufe = (d: Dimension, bestaetigt: boolean, offen = false): Verifikationsstufe => {
    if (abgelehnt.has(d)) return 'abgelehnt'
    if (bestaetigt) return 'bestaetigt'
    if (offen) return 'offen'
    return 'nicht_erhoben'
  }

  return {
    // Ein Zeitstempel ist der Beleg; der leere String ist keiner.
    email: stufe('email', typeof s.emailBestaetigtAm === 'string' && s.emailBestaetigtAm !== ''),
    telefon: stufe('telefon', s.telefonBestaetigt === true, s.telefonCodeOffen === true),
    identitaet: stufe('identitaet', s.identitaetGeprueft === true),
    // Hochgeladene Nachweise machen aus „gibt es nicht" ein „liegt vor,
    // niemand hat hingesehen" — heute der Normalfall.
    gewerbe: stufe(
      'gewerbe',
      s.gewerbeNachweisGeprueft === true,
      s.nachweiseLiegenVor === true,
    ),
    qualifikation: stufe(
      'qualifikation',
      s.qualifikationGeprueft === true,
      s.nachweiseLiegenVor === true,
    ),
  }
}

/**
 * Die zusammengefasste Stufe — bewusst grob, bewusst aufsteigend.
 *
 * Jede Stufe setzt die darunter voraus. Das ist die Eigenschaft, die eine
 * Anzeige braucht: „geschaeftlich" ohne bestaetigte E-Mail waere eine
 * Aussage, die sich selbst widerspricht.
 */
export type Vertrauensstufe =
  /** Nichts bestaetigt. */
  | 'keine'
  /** E-Mail bestaetigt. */
  | 'basis'
  /** Zusaetzlich Telefon. */
  | 'kontakt'
  /** Zusaetzlich Identitaet und Gewerbe. */
  | 'geschaeftlich'
  /** Zusaetzlich fachliche Qualifikation. */
  | 'fachlich'

const AUFSTEIGEND: ReadonlyArray<{ stufe: Vertrauensstufe; noetig: readonly Dimension[] }> = [
  { stufe: 'fachlich', noetig: ['email', 'telefon', 'identitaet', 'gewerbe', 'qualifikation'] },
  { stufe: 'geschaeftlich', noetig: ['email', 'telefon', 'identitaet', 'gewerbe'] },
  { stufe: 'kontakt', noetig: ['email', 'telefon'] },
  { stufe: 'basis', noetig: ['email'] },
]

export function vertrauensstufe(profil: Verifikationsprofil): Vertrauensstufe {
  for (const { stufe, noetig } of AUFSTEIGEND) {
    if (noetig.every(d => profil[d] === 'bestaetigt')) return stufe
  }
  return 'keine'
}

/**
 * BUSINESS_DECISION_REQUIRED — ab wann darf „verifiziert" dastehen?
 *
 * Diese Funktion beantwortet die Frage NICHT, sie stellt sie. Sie gibt
 * heute fuer jede Stufe `false` zurueck, weil die noetige Entscheidung
 * nicht getroffen ist, und nennt im zweiten Rueckgabewert den Grund.
 *
 * Zu entscheiden sind drei Dinge, und keines davon ist technisch:
 *
 *   1. AB WELCHER STUFE. „verifiziert" ab `basis` (E-Mail) waere fuer einen
 *      Marktplatz ungewoehnlich schwach; ab `geschaeftlich` waere es
 *      belastbar, aber heute erreicht es niemand, weil es fuer Identitaet
 *      und Gewerbe keinen Vorgang gibt.
 *   2. OB HEILBERUFE STRENGER SIND. 21 der 100 oeffentlichen Stellen
 *      sprechen von Kliniken und Aerzten. Fuer die waere `fachlich` das
 *      naheliegende Minimum — eine Approbation ist pruefbar, und die
 *      Aussage wiegt anders als bei einem Friseurstuhl.
 *   3. WAS MIT DEM ALTBESTAND PASSIERT. `salons.is_verified` ist heute bei
 *      jedem freigeschalteten Salon true. Wird die Schwelle angehoben,
 *      verlieren diese Salons ihr Abzeichen — das ist eine Ansage an
 *      bestehende Anbieter und gehoert angekuendigt, nicht still deployt.
 *
 * Bis dahin ist `false` die richtige Antwort: lieber kein Abzeichen als
 * eines, das nichts bedeutet.
 */
export function darfAlsVerifiziertGelten(
  _profil: Verifikationsprofil,
): { erlaubt: false; grund: string } {
  return {
    erlaubt: false,
    grund:
      'Die Schwelle fuer das oeffentliche Abzeichen ist nicht festgelegt. ' +
      'Siehe BUSINESS_DECISION_REQUIRED in src/modules/verification/verification.ts.',
  }
}

/**
 * Was `salons.is_verified` HEUTE bedeutet — und was nicht.
 *
 * Das Flag wird gesetzt, wenn ein Admin auf „Freischalten" klickt. Das ist
 * eine Freigabe durch die Plattform, keine Pruefung des Anbieters. Wer das
 * Flag liest, soll den Unterschied im Namen sehen; deshalb heisst die
 * Funktion nicht `istVerifiziert`.
 */
export function istVonPlattformFreigeschaltet(
  salon: { is_verified?: boolean | null } | null | undefined,
): boolean {
  return salon?.is_verified === true
}

/**
 * Menschlicher Text je Dimension — fuer Admin-Ansichten, NICHT fuer die
 * oeffentliche Ansprache. Der oeffentliche Text haengt an der offenen
 * Entscheidung oben.
 */
export const STUFEN_TEXT: Record<Verifikationsstufe, string> = {
  nicht_erhoben: 'nicht erhoben',
  offen: 'liegt vor, ungeprüft',
  bestaetigt: 'bestätigt',
  abgelehnt: 'abgelehnt',
}
