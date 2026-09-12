/**
 * Die Buchungs-Pipeline — EIN Blick auf zwei bestehende Statuswelten.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WARUM HIER KEIN NEUER STATUS ENTSTEHT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Gefragt war die Kette
 *
 *   REQUESTED → PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
 *             → CANCELLED → NO_SHOW → DISPUTED → REFUNDED
 *
 * Im Code existieren davon sechs Namen, verteilt auf ZWEI Tabellen mit je
 * eigener Statuswelt — gemessen am 12.09.2026:
 *
 *   bookings.status          pending · confirmed · completed · cancelled
 *                            · no_show · refunded
 *   rental_requests.status   open · accepted · declined · withdrawn
 *
 * Drei der gefragten Namen haben dort KEINE Entsprechung. Die naheliegende
 * Reaktion waere, sie als Statuswerte nachzutragen. Genau das passiert hier
 * NICHT, und zwar aus drei getrennten Gruenden:
 *
 *   REQUESTED   ist kein fehlender Zustand, sondern ein anderer Vorgang:
 *               eine Mietanfrage (`rental_requests`, Status `open`), die noch
 *               keine Buchung ist. Ein zweiter Name dafuer in
 *               `bookings.status` waere ein Duplikat.
 *
 *   IN_PROGRESS ist aus der UHR ableitbar: eine bestaetigte Buchung, deren
 *               Fenster gerade laeuft. Als gespeicherter Zustand braeuchte
 *               er einen Job, der ihn zweimal je Buchung umschaltet — und
 *               damit eine neue Fehlerquelle (Job faellt aus → der Status
 *               luegt). Abgeleitet kann er nicht veralten.
 *
 *   DISPUTED    ist ein eigenes OBJEKT (`disputes` mit eigenem Status, siehe
 *               `dispute.ts`). Zusaetzlich ein `disputed` in
 *               `bookings.status` zu fuehren, heisst denselben Sachverhalt an
 *               zwei Orten zu speichern — und irgendwann widersprechen sie
 *               sich. Die Frage „ist diese Buchung im Streit?" beantwortet
 *               der Streitfall, nicht die Buchung.
 *
 * Dieses Modul ist deshalb ein LESEMODELL: es rechnet aus dem, was
 * gespeichert ist, die gefragte Kette aus. Es schreibt nichts, es kennt
 * keine Uebergaenge, und es ersetzt `VALID_TRANSITIONS` nicht — das bleibt
 * die einzige Quelle dafuer, welcher Statuswechsel erlaubt ist.
 */

import type { DisputeStatus } from './dispute'

export type PipelineStage =
  /** Mietanfrage gestellt, noch keine Buchung. */
  | 'REQUESTED'
  /** Buchung angefragt, Salon hat nicht entschieden. Belegt den Slot. */
  | 'PENDING'
  /** Vom Salon bestaetigt, Termin liegt in der Zukunft. */
  | 'CONFIRMED'
  /** Das Terminfenster laeuft gerade. Abgeleitet, nicht gespeichert. */
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  /** Ein Streitfall ist offen. Kommt aus `disputes`, nicht aus der Buchung. */
  | 'DISPUTED'
  | 'REFUNDED'

/** Die Kette in ihrer erzaehlten Reihenfolge — fuer Anzeigen und Sortierung. */
export const PIPELINE_REIHENFOLGE: readonly PipelineStage[] = [
  'REQUESTED',
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'DISPUTED',
  'REFUNDED',
]

/** Eine Zeile aus `bookings`, soweit die Pipeline sie braucht. */
export interface BookingZeile {
  status?: string | null
  /** `YYYY-MM-DD` */
  booking_date?: string | null
  /** `HH:MM` oder `HH:MM:SS` */
  start_time?: string | null
  end_time?: string | null
}

/** Eine Zeile aus `rental_requests`. */
export interface AnfrageZeile {
  status?: string | null
}

/** Der offene Streitfall zu diesem Vorgang, falls es einen gibt. */
export interface StreitZeile {
  status?: DisputeStatus | string | null
}

const STREIT_OFFEN = new Set<string>([
  'open',
  'awaiting_response',
  'in_review',
  'escalated',
])

/** Ist dieser Streitfall noch in Arbeit? Endzustaende zaehlen nicht. */
export function streitIstOffen(streit: StreitZeile | null | undefined): boolean {
  const s = streit?.status
  return typeof s === 'string' && STREIT_OFFEN.has(s.toLowerCase())
}

/**
 * `booking_date` + `start_time`/`end_time` zu einem Zeitfenster.
 *
 * Bewusst OHNE Zeitzonenrechnung: die Werte stehen als lokale Datums- und
 * Uhrzeitfelder in der Datenbank, und `new Date('2026-09-12T10:00')` liest
 * sie in der Zone der Laufzeitumgebung. Das ist dieselbe Annahme, die
 * `/api/availability` und `createBooking` schon treffen — hier eine andere
 * zu treffen waere der Fehler.
 *
 * `null`, wenn eines der Felder fehlt oder unlesbar ist. Ein unlesbares
 * Fenster fuehrt nie zu `IN_PROGRESS`.
 */
export function terminFenster(
  b: BookingZeile | null | undefined,
): { von: Date; bis: Date } | null {
  if (!b?.booking_date || !b.start_time || !b.end_time) return null
  const kurz = (t: string) => (t.length === 5 ? `${t}:00` : t)
  const von = new Date(`${b.booking_date}T${kurz(b.start_time)}`)
  const bis = new Date(`${b.booking_date}T${kurz(b.end_time)}`)
  if (Number.isNaN(von.getTime()) || Number.isNaN(bis.getTime())) return null
  // Ein Fenster, das endet, bevor es beginnt, ist kein Fenster.
  if (bis.getTime() <= von.getTime()) return null
  return { von, bis }
}

/**
 * Welche Stufe zeigt dieser Vorgang?
 *
 * RANGFOLGE, und sie ist der eigentliche Inhalt dieser Funktion:
 *
 *   1. Ein OFFENER STREITFALL schlaegt alles. Auch eine abgeschlossene oder
 *      stornierte Buchung ist „im Streit", wenn einer laeuft — das ist der
 *      Zustand, an dem jemand arbeiten muss, und deshalb der, der angezeigt
 *      gehoert. Ein GESCHLOSSENER Streitfall schlaegt nichts: danach zaehlt
 *      wieder, was mit der Buchung passiert ist.
 *   2. Danach der gespeicherte Buchungsstatus.
 *   3. `IN_PROGRESS` nur innerhalb von 1 und 2: eine bestaetigte Buchung,
 *      deren Fenster JETZT laeuft.
 */
export function pipelineStage(
  eingabe: {
    booking?: BookingZeile | null
    anfrage?: AnfrageZeile | null
    streit?: StreitZeile | null
  },
  jetzt: Date = new Date(),
): PipelineStage | null {
  const { booking, anfrage, streit } = eingabe

  if (streitIstOffen(streit)) return 'DISPUTED'

  const s = booking?.status?.toLowerCase() ?? null
  if (s) {
    switch (s) {
      case 'refunded':
        return 'REFUNDED'
      case 'no_show':
        return 'NO_SHOW'
      case 'cancelled':
      case 'canceled': // beide Schreibweisen kommen im Repo vor
        return 'CANCELLED'
      case 'completed':
        return 'COMPLETED'
      case 'confirmed': {
        const f = terminFenster(booking)
        if (f && jetzt >= f.von && jetzt < f.bis) return 'IN_PROGRESS'
        return 'CONFIRMED'
      }
      case 'pending':
        return 'PENDING'
      default:
        // Ein unbekannter Status wird NICHT geraten. `null` heisst „diese
        // Pipeline kennt den Vorgang nicht" — besser als eine Stufe, die
        // nicht stimmt.
        return null
    }
  }

  // Keine Buchung, aber eine Mietanfrage: der Vorgang ist noch davor.
  const a = anfrage?.status?.toLowerCase() ?? null
  if (a === 'open' || a === 'pending') return 'REQUESTED'
  if (a === 'accepted') return 'PENDING' // angenommen, Buchung folgt
  if (a === 'declined' || a === 'withdrawn') return 'CANCELLED'

  return null
}

/** Stufen, aus denen kein Weg mehr herausfuehrt. */
export const PIPELINE_ENDSTUFEN: readonly PipelineStage[] = [
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'REFUNDED',
]

export function istEndstufe(stage: PipelineStage): boolean {
  return PIPELINE_ENDSTUFEN.includes(stage)
}

/**
 * Darf zu dieser Stufe eine Rechnung entstehen?
 *
 * Nur aus einem Vorgang, der tatsaechlich stattgefunden hat. Ein `NO_SHOW`
 * ist der Grenzfall: dort kann eine Gebuehr anfallen
 * (`booking_policies.no_show_fee_cents`), also kann auch ein Beleg
 * entstehen. Bei `CANCELLED` haengt es an der Stornoregel, und die ist offen
 * (siehe `cancellation.ts`) — deshalb `false`, nicht „vielleicht".
 */
export function rechnungMoeglich(stage: PipelineStage | null): boolean {
  return stage === 'COMPLETED' || stage === 'NO_SHOW'
}

/**
 * Darf zu dieser Stufe ein Streitfall eroeffnet werden?
 *
 * Nicht vor dem Termin: bis dahin ist Absagen der richtige Weg, nicht
 * Streiten. Und nicht, wenn schon einer laeuft.
 */
export function streitMoeglich(stage: PipelineStage | null): boolean {
  return stage === 'IN_PROGRESS' || stage === 'COMPLETED' || stage === 'NO_SHOW'
}
