/**
 * Stornoregeln — datengetrieben, ohne erfundene Gebuehr.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DAS PROBLEM, DAS DIESES MODUL LOEST
 * ══════════════════════════════════════════════════════════════════════
 *
 * Oeffentlich verspricht `/mieter/wie-es-funktioniert`:
 *
 *     „Bis 48h vorher kostenlos. Danach 50-100 % des Tagespreises
 *      (steht im Listing). Bei Krankheit (mit Attest): immer kostenlos."
 *
 * Im Listing steht das NICHT. Es gibt kein Feld dafuer: `booking_policies`
 * fuehrt `no_show_fee_cents` — die Gebuehr fuers Nichterscheinen — und
 * sonst nichts zum Absagen. `cancelBooking` sagt das im eigenen Kommentar
 * und weigert sich deshalb, einen Betrag zu bilden: „Vollerstattung waere
 * hier genauso erfunden wie ein einbehaltener Betrag."
 *
 * Dieses Modul aendert daran genau eine Sache: es gibt der Regel eine
 * FORM, ohne ihr einen WERT zu geben. Die Staffel „50-100 %" wird hier
 * NICHT eingebaut — sie steht in keinem Vertrag, keiner Datenbank und
 * keiner Entscheidung, sondern nur in einem Marketingtext.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WAS „DATENGETRIEBEN" HIER HEISST
 * ══════════════════════════════════════════════════════════════════════
 *
 * Jede Zahl kommt aus der uebergebenen Regel. Fehlt die Regel oder fehlt
 * ein Feld, ist das Ergebnis `unbestimmt` — nicht „kostenlos" und nicht
 * „voller Preis". Beides waere eine Erfindung, und die teurere Richtung
 * waere nicht besser als die guenstigere.
 *
 * `unbestimmt` ist deshalb ein erstklassiges Ergebnis mit eigenem Zweig,
 * kein Fehlerfall. Heute ist es der Normalfall.
 */

/** Wie sich eine Gebuehr berechnet. Kein Default — das waere die Erfindung. */
export type CancellationFeeType =
  /** Kein Entgelt. */
  | 'none'
  /** Fester Betrag in Cent. */
  | 'fixed'
  /** Anteil des Buchungswerts in Prozent. */
  | 'percent'

/**
 * Eine Stufe der Staffel: „ab X Stunden vor Termin gilt Y".
 *
 * `hoursBefore` ist die UNTERE Grenze des Fensters, in Stunden vor dem
 * Termin. Die Stufe mit dem groessten `hoursBefore`, das noch erreicht
 * wird, gewinnt — so liest man eine Staffel auch auf Papier.
 */
export interface CancellationTier {
  hoursBefore: number
  feeType: CancellationFeeType
  /** Bei `fixed`: Cent. Bei `percent`: 0–100. Bei `none`: ignoriert. */
  feeValue?: number | null
}

/**
 * Die Regel eines Salons oder Inserats.
 *
 * Bewusst OHNE Standardwerte. Ein Salon, der nichts hinterlegt hat, hat
 * keine Regel — nicht „die uebliche".
 */
export interface CancellationPolicy {
  /** Ab wann ueberhaupt etwas faellig wird. Ohne Staffel der einzige Schalter. */
  cancellationWindowHours?: number | null
  cancellationFeeType?: CancellationFeeType | null
  /** Bei `fixed`: Cent. Bei `percent`: 0–100. */
  cancellationFeeValue?: number | null
  /** Optionale Staffel; schlaegt die drei Felder darueber. */
  tiers?: readonly CancellationTier[] | null
  /**
   * Gebuehr fuers Nichterscheinen. Das EINZIGE Feld, das es heute in der
   * Datenbank wirklich gibt (`booking_policies.no_show_fee_cents`).
   */
  noShowFeeCents?: number | null
}

export type CancellationOutcome =
  | { kind: 'free'; feeCents: 0; grund: string }
  | { kind: 'fee'; feeCents: number; grund: string }
  /** Keine hinterlegte Regel — der Fall gehoert an einen Menschen. */
  | { kind: 'unbestimmt'; feeCents: null; grund: string }

const UNBESTIMMT = (grund: string): CancellationOutcome => ({
  kind: 'unbestimmt',
  feeCents: null,
  grund,
})

function betrag(
  feeType: CancellationFeeType,
  feeValue: number | null | undefined,
  bookingTotalCents: number,
): CancellationOutcome {
  if (feeType === 'none') return { kind: 'free', feeCents: 0, grund: 'Regel sieht kein Entgelt vor.' }

  if (typeof feeValue !== 'number' || !Number.isFinite(feeValue) || feeValue < 0) {
    return UNBESTIMMT(`Gebuehrenart "${feeType}" ohne brauchbaren Wert hinterlegt.`)
  }

  if (feeType === 'fixed') {
    // Mehr als der Buchungswert kann nicht einbehalten werden — sonst
    // entstuende aus einer Absage eine Forderung.
    const f = Math.min(Math.round(feeValue), bookingTotalCents)
    return { kind: 'fee', feeCents: f, grund: `Fester Betrag aus der Regel (${feeValue} Cent).` }
  }

  // percent
  if (feeValue > 100) {
    return UNBESTIMMT(`Prozentsatz ${feeValue} liegt ueber 100 — das ist kein Anteil.`)
  }
  const f = Math.round((bookingTotalCents * feeValue) / 100)
  return { kind: 'fee', feeCents: f, grund: `${feeValue} % des Buchungswerts.` }
}

/**
 * Was kostet diese Absage?
 *
 * @param stundenVorTermin  Stunden zwischen Absage und Termin. Negativ =
 *                          der Termin liegt bereits in der Vergangenheit.
 */
export function cancellationOutcome(
  policy: CancellationPolicy | null | undefined,
  stundenVorTermin: number,
  bookingTotalCents: number,
): CancellationOutcome {
  if (!policy) {
    return UNBESTIMMT('Fuer diese Buchung ist keine Stornoregel hinterlegt.')
  }
  if (!Number.isFinite(bookingTotalCents) || bookingTotalCents < 0) {
    return UNBESTIMMT('Buchungswert unbrauchbar.')
  }

  // Staffel hat Vorrang: sie ist die ausdruecklichere Aussage.
  const tiers = (policy.tiers ?? []).filter(t => Number.isFinite(t.hoursBefore))
  if (tiers.length > 0) {
    // Die Stufe mit der groessten noch erreichten Vorlaufzeit gewinnt.
    const passend = [...tiers]
      .sort((a, b) => b.hoursBefore - a.hoursBefore)
      .find(t => stundenVorTermin >= t.hoursBefore)

    if (!passend) {
      // Unterhalb jeder Stufe. Die Staffel sagt fuer diesen Fall nichts —
      // „also voller Preis" waere gerade die Erfindung.
      return UNBESTIMMT(
        `Absage ${stundenVorTermin} h vor Termin liegt unter der niedrigsten ` +
          'Staffelstufe; die Regel sagt dazu nichts.',
      )
    }
    return betrag(passend.feeType, passend.feeValue, bookingTotalCents)
  }

  const fenster = policy.cancellationWindowHours
  if (typeof fenster === 'number' && Number.isFinite(fenster)) {
    if (stundenVorTermin >= fenster) {
      return { kind: 'free', feeCents: 0, grund: `Absage ${stundenVorTermin} h vorher, Frist ${fenster} h.` }
    }
    const art = policy.cancellationFeeType
    if (!art) {
      return UNBESTIMMT(
        `Frist von ${fenster} h unterschritten, aber keine Gebuehrenart hinterlegt.`,
      )
    }
    return betrag(art, policy.cancellationFeeValue, bookingTotalCents)
  }

  return UNBESTIMMT('Weder Frist noch Staffel hinterlegt.')
}

/**
 * Nichterscheinen — der einzige Fall mit einer echten Quelle.
 *
 * `booking_policies.no_show_fee_cents` existiert in der Datenbank. Fehlt
 * der Wert, gilt dasselbe wie oben: unbestimmt, nicht null.
 */
export function noShowOutcome(
  policy: CancellationPolicy | null | undefined,
  bookingTotalCents: number,
): CancellationOutcome {
  const cents = policy?.noShowFeeCents
  if (typeof cents !== 'number' || !Number.isFinite(cents) || cents < 0) {
    return UNBESTIMMT('Keine No-Show-Gebuehr hinterlegt.')
  }
  if (cents === 0) return { kind: 'free', feeCents: 0, grund: 'No-Show-Gebuehr ist 0.' }
  return {
    kind: 'fee',
    feeCents: Math.min(Math.round(cents), Math.max(0, bookingTotalCents)),
    grund: 'no_show_fee_cents aus booking_policies.',
  }
}

/**
 * BUSINESS_DECISION_REQUIRED / PRICE_DECISION_REQUIRED
 *
 * Es gibt hier bewusst KEINE Standardregel. Sobald eine existiert, gehoert
 * sie in die Datenbank (pro Salon oder pro Inserat) und NICHT als Konstante
 * in diese Datei — sonst steht die naechste erfundene Zahl wieder im Code.
 *
 * Zu entscheiden ist:
 *   1. Gilt eine plattformweite Mindestregel, oder setzt jeder Anbieter
 *      seine eigene?
 *   2. Welche Staffel? Die oeffentlich genannten „50-100 %" stammen aus
 *      einem Marketingtext und aus keiner Quelle.
 *   3. Was passiert bei Krankheit mit Attest? Auch das ist oeffentlich
 *      zugesagt („immer kostenlos") und nirgends abgebildet — es gibt
 *      keinen Attest-Upload und keinen Zustand dafuer.
 *   4. Wer traegt die Zahlungsgebuehren einer erstatteten Buchung?
 *
 * Bis dahin ist `unbestimmt` die richtige Antwort, und der Fall geht an
 * einen Menschen (/api/admin/refund).
 */
export const CANCELLATION_DEFAULT_POLICY = null
