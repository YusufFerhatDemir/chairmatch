/**
 * Streitfall — Zustandsmaschine, Frist, Verlauf, Ausgang.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WARUM ES DAS BRAUCHT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Die Plattform verspricht oeffentlich an drei Stellen eine Schlichtung:
 *
 *   /mieter/wie-es-funktioniert  „Reklamation per Email → Streit-
 *                                 Schlichtung in 48h, oft mit Gutschein-
 *                                 Ausgleich"
 *   seo-data/magazin.ts          „Auf ChairMatch: Streit-Schlichtung in
 *                                 48h, Stripe-Zahlungs-Garantie"
 *   seo-data/magazin.ts          „Auf ChairMatch: integrierte Schlichtung"
 *
 * Im Code gab es davon nichts. Volltextsuche `dispute` in `src/` ergab drei
 * Treffer, und keiner war einer: zwei stammen aus Stripes eigenen
 * Ereignissen (`charge.dispute.*` im Webhook, die Rueckstellung im
 * Payout-Cron), der dritte ist die Audit-Log-Ansicht. Kein Fall, kein
 * Status, keine Frist, niemand der 48 Stunden zaehlt.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WAS DIESES MODUL TUT — UND WAS AUSDRUECKLICH NICHT
 * ══════════════════════════════════════════════════════════════════════
 *
 * Es bildet den VORGANG ab: wer hat wann was gemeldet, in welchem Zustand
 * ist der Fall, ist die Frist abgelaufen, wie ging er aus.
 *
 * Es bewegt KEIN GELD. `resolution` haelt fest, WAS entschieden wurde
 * (etwa „Teilerstattung"), nicht wie viel und nicht an wen — der Betrag
 * haengt an der Stornoregel, und die ist offen (siehe `cancellation.ts`).
 * Ein Modul, das hier selbst eine Summe bildet, erfindet sie.
 *
 * Es entscheidet auch nicht, WAS nach Fristablauf passiert. `fristAbgelaufen`
 * stellt fest, dass sie abgelaufen ist. Ob daraus automatisch ein Ausgang
 * zugunsten des Meldenden folgt, ist eine Produkt- und Rechtsentscheidung —
 * siehe BUSINESS_DECISION_REQUIRED unten.
 */

export type DisputeStatus =
  /** Gemeldet, noch niemand zustaendig. */
  | 'open'
  /** Die Gegenseite wurde angehoert, Antwort steht aus. */
  | 'awaiting_response'
  /** Ein Mensch der Plattform bearbeitet den Fall. */
  | 'in_review'
  /** Ueber die erste Ebene hinaus gehoben (Frist gerissen oder Widerspruch). */
  | 'escalated'
  /** Entschieden. */
  | 'resolved'
  /** Zurueckgezogen oder gegenstandslos. */
  | 'withdrawn'

export type DisputeParty = 'customer' | 'provider' | 'platform'

export type DisputeReason =
  | 'not_as_described'
  | 'access_denied'
  | 'hygiene'
  | 'no_show_provider'
  | 'damage'
  | 'payment'
  | 'other'

/**
 * Wie der Fall ausging. KEIN Betrag — bewusst.
 *
 * `partial_refund` sagt „es wird teilweise erstattet", nicht wie viel. Die
 * Summe kommt aus der Stornoregel bzw. aus einer Admin-Entscheidung und
 * wird dort protokolliert.
 */
export type DisputeResolution =
  | 'in_favour_of_customer'
  | 'in_favour_of_provider'
  | 'partial_refund'
  | 'goodwill_credit'
  | 'no_action'

export interface DisputeEvent {
  at: string
  by: DisputeParty
  /** Was passiert ist — frei, aber protokollpflichtig. */
  note: string
  /** Zustand NACH diesem Ereignis, falls es einen Wechsel ausgeloest hat. */
  status?: DisputeStatus
}

export interface Dispute {
  id: string
  bookingId: string
  openedBy: Exclude<DisputeParty, 'platform'>
  reason: DisputeReason
  status: DisputeStatus
  openedAt: string
  /** Frist fuer die erste Reaktion der Plattform. */
  responseDueAt: string | null
  resolution: DisputeResolution | null
  resolvedAt: string | null
  timeline: readonly DisputeEvent[]
}

/**
 * Erlaubte Zustandswechsel — eine Quelle, wie bei `VALID_TRANSITIONS` fuer
 * Buchungen. Offen ausgeschriebene Kopien in Routen sind der Fehler, den
 * `salon-status.ts` schon einmal gekostet hat.
 */
export interface DisputeTransition {
  from: DisputeStatus
  to: DisputeStatus
  actor: DisputeParty
}

export const DISPUTE_TRANSITIONS: readonly DisputeTransition[] = [
  // Anhoerung
  { from: 'open', to: 'awaiting_response', actor: 'platform' },
  { from: 'open', to: 'in_review', actor: 'platform' },
  { from: 'awaiting_response', to: 'in_review', actor: 'platform' },
  // Die Gegenseite antwortet und bringt den Fall damit zur Pruefung.
  { from: 'awaiting_response', to: 'in_review', actor: 'provider' },
  { from: 'awaiting_response', to: 'in_review', actor: 'customer' },
  // Eskalation
  { from: 'open', to: 'escalated', actor: 'platform' },
  { from: 'awaiting_response', to: 'escalated', actor: 'platform' },
  { from: 'in_review', to: 'escalated', actor: 'platform' },
  // Abschluss — nur die Plattform entscheidet.
  { from: 'in_review', to: 'resolved', actor: 'platform' },
  { from: 'escalated', to: 'resolved', actor: 'platform' },
  /*
   * Zurueckziehen darf NUR, wer den Fall eroeffnet hat — und nur, solange
   * er nicht entschieden ist. Ein Anbieter, der die Beschwerde des Kunden
   * „zurueckzieht", waere sonst der bequemste Weg aus jedem Streit.
   */
  { from: 'open', to: 'withdrawn', actor: 'customer' },
  { from: 'open', to: 'withdrawn', actor: 'provider' },
  { from: 'awaiting_response', to: 'withdrawn', actor: 'customer' },
  { from: 'awaiting_response', to: 'withdrawn', actor: 'provider' },
]

/** Endzustaende. Aus ihnen fuehrt kein Weg zurueck. */
export const DISPUTE_ENDZUSTAENDE: readonly DisputeStatus[] = ['resolved', 'withdrawn']

export function istEndzustand(s: DisputeStatus): boolean {
  return DISPUTE_ENDZUSTAENDE.includes(s)
}

/**
 * Ist dieser Wechsel erlaubt?
 *
 * `openedBy` ist noetig, weil „zurueckziehen" nicht von der Rolle allein
 * abhaengt, sondern davon, wer den Fall eroeffnet hat.
 */
export function darfWechseln(
  dispute: Pick<Dispute, 'status' | 'openedBy'>,
  to: DisputeStatus,
  actor: DisputeParty,
): boolean {
  if (istEndzustand(dispute.status)) return false
  if (to === 'withdrawn' && actor !== dispute.openedBy) return false
  return DISPUTE_TRANSITIONS.some(
    t => t.from === dispute.status && t.to === to && t.actor === actor,
  )
}

/**
 * Die 48 Stunden aus der oeffentlichen Zusage.
 *
 * Die Zahl steht hier als Konstante, weil sie KEINE Geschaeftsentscheidung
 * mehr ist, sondern eine bereits gemachte Zusage — sie steht seit Langem
 * auf zwei oeffentlichen Seiten. Wer sie aendert, aendert eine Zusage und
 * muss die Seiten mitziehen; deshalb der Verweis hier.
 *
 * Siehe `/mieter/wie-es-funktioniert` und `seo-data/magazin.ts`.
 */
export const DISPUTE_RESPONSE_HOURS = 48

export function responseDueAt(openedAt: string, stunden = DISPUTE_RESPONSE_HOURS): string | null {
  const t = new Date(openedAt).getTime()
  if (Number.isNaN(t)) return null
  return new Date(t + stunden * 3_600_000).toISOString()
}

/**
 * Ist die Frist gerissen?
 *
 * Ein Fall in einem Endzustand reisst keine Frist mehr — sonst zaehlte die
 * Uhr fuer abgeschlossene Faelle ewig weiter.
 */
export function fristAbgelaufen(
  dispute: Pick<Dispute, 'status' | 'responseDueAt'>,
  jetzt: Date = new Date(),
): boolean {
  if (istEndzustand(dispute.status)) return false
  if (!dispute.responseDueAt) return false
  const due = new Date(dispute.responseDueAt).getTime()
  if (Number.isNaN(due)) return false
  return jetzt.getTime() > due
}

/** Einen Fall eroeffnen. Die Frist entsteht mit ihm, nicht spaeter. */
export function eroeffne(input: {
  id: string
  bookingId: string
  openedBy: Exclude<DisputeParty, 'platform'>
  reason: DisputeReason
  openedAt: string
  note?: string
}): Dispute {
  return {
    id: input.id,
    bookingId: input.bookingId,
    openedBy: input.openedBy,
    reason: input.reason,
    status: 'open',
    openedAt: input.openedAt,
    responseDueAt: responseDueAt(input.openedAt),
    resolution: null,
    resolvedAt: null,
    timeline: [
      { at: input.openedAt, by: input.openedBy, note: input.note ?? 'Fall eroeffnet.', status: 'open' },
    ],
  }
}

export type WechselErgebnis =
  | { ok: true; dispute: Dispute }
  | { ok: false; grund: string }

/**
 * Zustandswechsel mit Protokolleintrag.
 *
 * Der Verlauf waechst bei JEDEM Wechsel — ein Fall ohne Verlauf ist eine
 * Behauptung. Dasselbe Argument wie beim Verifikations-Nachweis.
 */
export function wechsle(
  dispute: Dispute,
  to: DisputeStatus,
  actor: DisputeParty,
  at: string,
  note: string,
  resolution?: DisputeResolution,
): WechselErgebnis {
  if (!darfWechseln(dispute, to, actor)) {
    return { ok: false, grund: `Wechsel ${dispute.status} → ${to} als ${actor} ist nicht vorgesehen.` }
  }
  if (to === 'resolved' && !resolution) {
    return { ok: false, grund: 'Ein Abschluss ohne Ausgang ist kein Abschluss.' }
  }
  if (to !== 'resolved' && resolution) {
    return { ok: false, grund: 'Ein Ausgang gehoert nur an den Abschluss.' }
  }
  return {
    ok: true,
    dispute: {
      ...dispute,
      status: to,
      resolution: to === 'resolved' ? (resolution ?? null) : dispute.resolution,
      resolvedAt: to === 'resolved' ? at : dispute.resolvedAt,
      timeline: [...dispute.timeline, { at, by: actor, note, status: to }],
    },
  }
}

/**
 * BUSINESS_DECISION_REQUIRED — was passiert NACH den 48 Stunden?
 *
 * Diese Funktion stellt fest, dass die Frist gerissen ist. Sie zieht keine
 * Folge daraus, weil die Folge nicht entschieden ist:
 *
 *   1. Faellt der Fall automatisch zugunsten des Meldenden aus? Das waere
 *      eine Garantie mit Geldwirkung und gehoert in die AGB, bevor sie in
 *      den Code gehoert.
 *   2. Oder eskaliert er nur intern, ohne Wirkung nach aussen?
 *   3. Wer ist ueberhaupt zustaendig? Heute gibt es keine Rolle dafuer —
 *      `admin` und `super_admin` sind die einzigen, die in Frage kaemen.
 *   4. Der zugesagte „Gutschein-Ausgleich" hat kein Gegenstueck im System:
 *      es gibt keine Gutscheine (`promo_codes` ist etwas anderes).
 *
 * Bis das entschieden ist, ist die ehrliche Antwort: die Frist wird
 * gemessen und angezeigt, mehr nicht. Eine Automatik, die Geld bewegt,
 * waere hier die teuerste Art von erfundener Zahl.
 */
export function folgeNachFristablauf(): { automatik: false; grund: string } {
  return {
    automatik: false,
    grund:
      'Was nach Ablauf der 48 Stunden geschieht, ist nicht entschieden. ' +
      'Siehe BUSINESS_DECISION_REQUIRED in src/modules/booking/dispute.ts.',
  }
}
