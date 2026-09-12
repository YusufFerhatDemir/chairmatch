/**
 * Der Prüfvorgang — wer hat wann was geprüft, und warum abgelehnt.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WAS HIER DAZUKOMMT
 * ══════════════════════════════════════════════════════════════════════
 *
 * `verification.ts` beantwortet „was IST geprueft?" — fuenf Dimensionen mit
 * je einer Stufe. Was dort fehlt, ist der VORGANG dahinter: jemand reicht
 * etwas ein, jemand sieht es an, jemand entscheidet, und bei einer Ablehnung
 * muss der Betroffene erfahren, warum.
 *
 * Ohne diesen Teil bleibt das Stufenmodell eine Behauptung mit besserer
 * Struktur — genau der Vorwurf, den es an `salons.is_verified` richtet.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DIESELBE BAUART WIE dispute.ts, UND ZWAR ABSICHTLICH
 * ══════════════════════════════════════════════════════════════════════
 *
 * Eine Uebergangstabelle als einzige Quelle, Endzustaende, ein Verlauf, der
 * bei jedem Wechsel waechst. Zwei Vorgangsmodelle im selben Repo mit zwei
 * verschiedenen Formen zu bauen waere die Sorte Inkonsistenz, die spaeter
 * niemand mehr aufloest.
 */

import type { Dimension } from './verification'

export type ReviewStatus =
  /** Noch nichts eingereicht. Der Ruhezustand. */
  | 'not_submitted'
  /** Unterlagen liegen vor, niemand hat hingesehen. */
  | 'submitted'
  /** Ein Pruefer hat den Fall uebernommen. */
  | 'in_review'
  /** Rueckfrage an den Anbieter, Antwort steht aus. */
  | 'info_requested'
  | 'approved'
  | 'rejected'
  /** Vormals genehmigt, Nachweis ist abgelaufen — muss neu belegt werden. */
  | 'expired'

/**
 * Warum abgelehnt wurde.
 *
 * Eine Ablehnung ohne Grund ist fuer den Betroffenen nicht handhabbar: er
 * weiss nicht, ob er ein besseres Foto schicken oder es gar nicht erst
 * wieder versuchen soll. Deshalb ist der Grund unten Pflicht.
 */
export type RejectionReason =
  /** Datei unlesbar, abgeschnitten, zu dunkel. */
  | 'unreadable'
  /** Dokument ist abgelaufen. */
  | 'expired_document'
  /** Name oder Anschrift passen nicht zum Konto. */
  | 'mismatch'
  /** Falsche Art von Nachweis (Gewerbeschein statt Approbation o. Ae.). */
  | 'wrong_document'
  /** Verdacht auf Faelschung — eskaliert, nicht einfach abgelehnt. */
  | 'suspected_forgery'
  | 'incomplete'
  | 'other'

/** Gruende, bei denen ein neuer Versuch sinnvoll ist. */
const NACHREICHEN_SINNVOLL: readonly RejectionReason[] = [
  'unreadable',
  'expired_document',
  'wrong_document',
  'incomplete',
]

/**
 * Darf der Anbieter nach dieser Ablehnung erneut einreichen?
 *
 * Bei `mismatch` und `suspected_forgery` bewusst NICHT automatisch: das
 * sind Faelle, in denen ein weiterer Upload die Frage nicht beantwortet.
 * Sie gehoeren an einen Menschen — und die Entscheidung, was dann passiert,
 * steht in BUSINESS_DECISION_REQUIRED unten.
 */
export function darfNachreichen(grund: RejectionReason | null | undefined): boolean {
  return !!grund && NACHREICHEN_SINNVOLL.includes(grund)
}

export interface ReviewEvent {
  at: string
  /** Der Pruefer; `null` bei Ereignissen, die das System ausloest. */
  by: string | null
  status: ReviewStatus
  note: string
}

export interface ReviewVorgang {
  id: string
  /** Auf wen oder was er sich bezieht. */
  subjectId: string
  subjectType: 'profile' | 'salon'
  dimension: Dimension
  status: ReviewStatus
  /** Der letzte Pruefer. */
  reviewerId: string | null
  reviewedAt: string | null
  rejectionReason: RejectionReason | null
  rejectionNote: string | null
  /** Wann der genehmigte Nachweis ablaeuft. `null` = unbefristet. */
  expiresAt: string | null
  /** Referenzen in `documents` — die Dateien selbst liegen dort. */
  documentIds: readonly string[]
  timeline: readonly ReviewEvent[]
}

export interface ReviewTransition {
  from: ReviewStatus
  to: ReviewStatus
  /** `system` = Ablauf durch Zeit, kein Mensch. */
  actor: 'provider' | 'reviewer' | 'system'
}

export const REVIEW_TRANSITIONS: readonly ReviewTransition[] = [
  { from: 'not_submitted', to: 'submitted', actor: 'provider' },
  { from: 'submitted', to: 'in_review', actor: 'reviewer' },
  { from: 'in_review', to: 'info_requested', actor: 'reviewer' },
  { from: 'info_requested', to: 'submitted', actor: 'provider' },
  { from: 'in_review', to: 'approved', actor: 'reviewer' },
  { from: 'in_review', to: 'rejected', actor: 'reviewer' },
  /*
   * Ablauf ist kein Urteil, sondern Zeit. Deshalb `system` und deshalb ein
   * eigener Status: `expired` sagt „war einmal belegt, ist es nicht mehr",
   * und das ist etwas anderes als `rejected` („wurde geprueft und
   * durchgefallen") und als `not_submitted` („nie versucht").
   */
  { from: 'approved', to: 'expired', actor: 'system' },
  // Nach Ablauf oder Ablehnung ein neuer Versuch.
  { from: 'expired', to: 'submitted', actor: 'provider' },
  { from: 'rejected', to: 'submitted', actor: 'provider' },
]

/**
 * `approved` ist KEIN Endzustand — ein Nachweis kann ablaufen.
 * `rejected` auch nicht, wenn nachreichen sinnvoll ist.
 */
export const REVIEW_ENDZUSTAENDE: readonly ReviewStatus[] = []

export function darfReviewWechseln(
  vorgang: Pick<ReviewVorgang, 'status' | 'rejectionReason'>,
  to: ReviewStatus,
  actor: ReviewTransition['actor'],
): boolean {
  // Nach einer Ablehnung, bei der Nachreichen nichts bringt, ist der Weg zu
  // `submitted` zu. Der Fall gehoert an einen Menschen, nicht an einen
  // weiteren Upload.
  if (
    vorgang.status === 'rejected' &&
    to === 'submitted' &&
    !darfNachreichen(vorgang.rejectionReason)
  ) {
    return false
  }
  return REVIEW_TRANSITIONS.some(t => t.from === vorgang.status && t.to === to && t.actor === actor)
}

export function eroeffneReview(input: {
  id: string
  subjectId: string
  subjectType: ReviewVorgang['subjectType']
  dimension: Dimension
}): ReviewVorgang {
  return {
    id: input.id,
    subjectId: input.subjectId,
    subjectType: input.subjectType,
    dimension: input.dimension,
    status: 'not_submitted',
    reviewerId: null,
    reviewedAt: null,
    rejectionReason: null,
    rejectionNote: null,
    expiresAt: null,
    documentIds: [],
    timeline: [],
  }
}

export type ReviewErgebnis =
  | { ok: true; vorgang: ReviewVorgang }
  | { ok: false; grund: string }

/**
 * Ein Wechsel im Prüfvorgang.
 *
 * Drei Pflichten, die der Rumpf durchsetzt:
 *   - `approved` und `rejected` brauchen einen PRUEFER. Eine Entscheidung
 *     ohne Namen ist keine.
 *   - `rejected` braucht einen GRUND (siehe `RejectionReason`).
 *   - ein Grund gehoert ausschliesslich an eine Ablehnung.
 */
export function wechsleReview(
  vorgang: ReviewVorgang,
  to: ReviewStatus,
  actor: ReviewTransition['actor'],
  at: string,
  opt: {
    reviewerId?: string | null
    note?: string
    rejectionReason?: RejectionReason
    rejectionNote?: string
    expiresAt?: string | null
    documentIds?: readonly string[]
  } = {},
): ReviewErgebnis {
  if (!darfReviewWechseln(vorgang, to, actor)) {
    return { ok: false, grund: `Wechsel ${vorgang.status} → ${to} als ${actor} ist nicht vorgesehen.` }
  }

  const entscheidung = to === 'approved' || to === 'rejected'
  if (entscheidung && !opt.reviewerId) {
    return { ok: false, grund: 'Eine Entscheidung ohne Pruefer ist keine Entscheidung.' }
  }
  if (to === 'rejected' && !opt.rejectionReason) {
    return { ok: false, grund: 'Eine Ablehnung ohne Grund ist fuer den Betroffenen nicht handhabbar.' }
  }
  if (to !== 'rejected' && opt.rejectionReason) {
    return { ok: false, grund: 'Ein Ablehnungsgrund gehoert nur an eine Ablehnung.' }
  }

  return {
    ok: true,
    vorgang: {
      ...vorgang,
      status: to,
      reviewerId: entscheidung ? (opt.reviewerId ?? null) : vorgang.reviewerId,
      reviewedAt: entscheidung ? at : vorgang.reviewedAt,
      rejectionReason: to === 'rejected' ? (opt.rejectionReason ?? null) : null,
      rejectionNote: to === 'rejected' ? (opt.rejectionNote ?? null) : null,
      expiresAt: to === 'approved' ? (opt.expiresAt ?? null) : vorgang.expiresAt,
      documentIds: opt.documentIds ?? vorgang.documentIds,
      timeline: [
        ...vorgang.timeline,
        { at, by: opt.reviewerId ?? null, status: to, note: opt.note ?? '' },
      ],
    },
  }
}

/**
 * Muss neu geprüft werden?
 *
 * Nur ein GENEHMIGTER Vorgang kann ablaufen. Ein abgelaufenes Datum an einem
 * abgelehnten oder nie eingereichten Vorgang bedeutet nichts.
 */
export function reVerifikationFaellig(
  vorgang: Pick<ReviewVorgang, 'status' | 'expiresAt'>,
  jetzt: Date = new Date(),
): boolean {
  if (vorgang.status !== 'approved') return false
  if (!vorgang.expiresAt) return false // unbefristet
  const bis = new Date(vorgang.expiresAt).getTime()
  // Ein unlesbares Datum belegt nichts — also faellig.
  if (Number.isNaN(bis)) return true
  return jetzt.getTime() >= bis
}

/** Läuft der Nachweis in den nächsten `tage` Tagen ab? Für Erinnerungen. */
export function laeuftBaldAb(
  vorgang: Pick<ReviewVorgang, 'status' | 'expiresAt'>,
  tage = 30,
  jetzt: Date = new Date(),
): boolean {
  if (vorgang.status !== 'approved' || !vorgang.expiresAt) return false
  const bis = new Date(vorgang.expiresAt).getTime()
  if (Number.isNaN(bis)) return false
  const rest = bis - jetzt.getTime()
  return rest > 0 && rest <= tage * 86_400_000
}

/**
 * BUSINESS_DECISION_REQUIRED — reglementierte Berufe
 *
 * Fuer welche Kategorien ein Qualifikationsnachweis VERLANGT werden muss,
 * ist eine Rechtsfrage. `NACHWEIS_ZU_PRUEFEN` in `verification.ts` benennt
 * die Kandidaten (Heilberufe `arzt`/`opraum`/`aesthetik`, Geraetefachkunde
 * `kosmetik`, Handwerk `friseur`) und sagt ausdruecklich NICHT, dass sie ihn
 * brauchen.
 *
 * Was zusaetzlich hier offen ist und nicht im Code entschieden werden kann:
 *
 *   1. WER darf pruefen? Eine Approbation zu beurteilen ist etwas anderes
 *      als ein unscharfes Foto zu erkennen. Heute gibt es nur die Rollen
 *      `admin` und `super_admin`.
 *   2. WIE LANGE gilt ein Nachweis? Eine NiSV-Fachkunde hat eine andere
 *      Halbwertszeit als ein Meisterbrief. Ohne diese Festlegung bleibt
 *      `expiresAt` leer, und das heisst „unbefristet".
 *   3. WAS PASSIERT BEI `suspected_forgery`? Das ist kein Prüf-, sondern ein
 *      Meldevorgang.
 *   4. Sperrt ein abgelaufener Nachweis den Betrieb, oder nur das Abzeichen?
 *      Heute sperrt ausschliesslich `is_active` (siehe
 *      `src/lib/salon-status.ts`), und das bleibt bewusst so.
 *
 * Bis dahin gilt: dieser Vorgang kann eine Dimension auf `bestaetigt`
 * bringen — aber `darfAlsVerifiziertGelten()` gibt weiterhin fuer JEDE
 * Stufe `false` zurueck. Das Abzeichen haengt nicht am Vorgang, sondern an
 * einer Entscheidung, die nicht getroffen ist.
 */
export function pruefungDurchWenErlaubt(): { entschieden: false; grund: string } {
  return {
    entschieden: false,
    grund:
      'Wer welche Qualifikation pruefen darf, ist nicht festgelegt. ' +
      'Siehe BUSINESS_DECISION_REQUIRED in src/modules/verification/review.ts.',
  }
}
