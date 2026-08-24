import { createHash } from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import { isMissingTable, isUniqueViolation } from '@/lib/pg-errors'

/**
 * Serverseitiger Doppel-Submit-Schutz fuer Mietanfragen.
 *
 * Bis hierher hing der Schutz an einem `submitting`-State im Formular. Das
 * faengt genau einen Fall ab — den Doppelklick im selben React-Baum. Nicht
 * abgefangen waren: zwei offene Tabs, der Reload einer POST-Antwort, ein
 * Retry der Serverless-Funktion nach Timeout und jeder Client, der nicht
 * unser Formular ist (Mobile-App, Skript).
 *
 * Der Riegel ist ein Claim pro Anfrage-Fingerprint in
 * `rental_request_dedupe` (Migration 20260823). Der Fingerprint ist PRIMARY
 * KEY, also ist der INSERT das atomare Tor: von zwei parallelen Requests
 * gewinnt genau einer, der andere laeuft in 23505.
 *
 * Warum ein Zeitfenster und kein dauerhafter UNIQUE auf `rental_requests`:
 * eine zweite Anfrage fuer denselben Stuhl ist naechste Woche voellig
 * legitim. Geschuetzt werden soll nur die versehentliche Wiederholung
 * innerhalb weniger Minuten.
 *
 * Warum Fingerprint statt reinem Idempotency-Key: ein Key hilft nur, wenn
 * der Client ihn ueber alle Versuche stabil haelt — genau das tut ein
 * Doppelklick oft nicht (neuer Key pro Klick), und ein Browser-Retry
 * schickt zwar denselben Body, aber nicht zwingend denselben Header.
 * Deshalb ist der Inhalt die Grundlage; ein mitgeschickter
 * `Idempotency-Key` hat Vorrang, wenn ein Client ihn wirklich stabil fuehrt.
 */

const TABLE = 'rental_request_dedupe'

/** Trennt die Fingerprint-Felder — ein Zeichen, das in keinem Feld vorkommt. */
const FIELD_SEPARATOR = '\u0000'

/** Laenger akzeptieren wir keinen Client-Key; er landet ungefiltert im Hash. */
const MAX_IDEMPOTENCY_KEY_LENGTH = 200

/**
 * Stellschrauben. Als Objekt, damit Tests das Wartefenster verkuerzen
 * koennen, ohne Timer zu mocken.
 */
export const DEDUPE_SETTINGS = {
  /** Schutzfenster: gleicher Inhalt in dieser Zeit => Duplikat. */
  windowMs: 5 * 60 * 1000,
  /** Wie oft auf den noch laufenden Erstversuch gewartet wird. */
  pollAttempts: 4,
  /** Pause zwischen den Versuchen. 4 x 150 ms = max. 600 ms Zusatzlatenz. */
  pollDelayMs: 150,
  /**
   * Wie alt ein abgelaufener Claim sein muss, damit die Route ihn beim
   * Vorbeikommen mit aufraeumt.
   */
  purgeOlderThanMs: 60 * 60 * 1000,
}

/** Mehr Runden braucht es nur, wenn ein Claim genau dazwischen freigegeben wird. */
const MAX_CLAIM_ROUNDS = 3

export interface RentalRequestFingerprintInput {
  requesterId: string
  equipmentId: string
  requestType: string
  preferredDate: string
  preferredTime?: string | null
  durationUnit?: string | null
  units?: number | null
  message?: string | null
  /** Optionaler `Idempotency-Key`-Header. Hat Vorrang vor dem Inhalt. */
  idempotencyKey?: string | null
}

export type ClaimResult =
  /** Wir halten den Claim — die Anfrage darf geschrieben werden. */
  | { outcome: 'claimed'; fingerprint: string }
  /** Derselbe Inhalt liegt bereits als Anfrage vor. */
  | { outcome: 'duplicate'; fingerprint: string; requestId: string }
  /** Ein identischer Request wird gerade verarbeitet, ist aber noch nicht fertig. */
  | { outcome: 'in_flight'; fingerprint: string }
  /** Tabelle fehlt (Migration nicht eingespielt) — ohne Riegel weiterfahren. */
  | { outcome: 'unavailable'; fingerprint: string; reason: string }
  /** Echter DB-Fehler — die Anfrage darf NICHT geschrieben werden. */
  | { outcome: 'error'; fingerprint: string; error: string }

// ---------------------------------------------------------------------------
// Reine Helfer (ohne IO) — direkt testbar
// ---------------------------------------------------------------------------

/**
 * Freitext vergleichbar machen, ohne verschiedene Nachrichten zu verschmelzen.
 * Nur Rand- und Mehrfach-Whitespace faellt weg (der entsteht beim erneuten
 * Tippen oder Einfuegen); Gross-/Kleinschreibung bleibt bewusst erhalten —
 * wer den Text umformuliert, stellt eine neue Anfrage.
 */
export function normalizeMessage(message: string | null | undefined): string {
  return (message ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * SHA-256-Hex ueber die Felder, die eine Anfrage fachlich ausmachen.
 *
 * Absichtlich enthalten: `requesterId` (Anfragen zweier Nutzer kollidieren
 * nie), `equipmentId` (ein anderes Mietobjekt ist immer eine neue Anfrage),
 * Termin, Dauer und Nachricht (aendert der Nutzer etwas davon, meint er es
 * ernst). Nicht enthalten: alles Abgeleitete wie `salon_id` oder der
 * geschaetzte Preis — sonst haengt der Riegel an Vermieterdaten.
 */
export function rentalRequestFingerprint(input: RentalRequestFingerprintInput): string {
  const key = input.idempotencyKey?.trim().slice(0, MAX_IDEMPOTENCY_KEY_LENGTH)

  // Client-Key wird mit der Nutzer-ID gesalzen: ein fremder Key kann damit
  // niemals die Anfrage eines anderen Nutzers blockieren.
  const material = key
    ? ['key', input.requesterId, key]
    : [
        'body',
        input.requesterId,
        input.equipmentId,
        input.requestType,
        input.preferredDate,
        input.preferredTime ?? '',
        input.durationUnit ?? '',
        input.units == null ? '' : String(input.units),
        normalizeMessage(input.message),
      ]

  return createHash('sha256').update(material.join(FIELD_SEPARATOR)).digest('hex')
}

/** Header lesen — leere Werte gelten als „nicht gesetzt". */
export function readIdempotencyKey(headers: Headers): string | null {
  const raw = headers.get('idempotency-key') ?? headers.get('x-idempotency-key')
  const trimmed = raw?.trim()
  return trimmed ? trimmed : null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Claim-Handling (mit IO)
// ---------------------------------------------------------------------------

type Db = ReturnType<typeof getSupabaseAdmin>

/**
 * Abgelaufene Claims wegraeumen. Laeuft nur auf dem seltenen Pfad „wir sind
 * gerade ueber einen abgelaufenen Claim gestolpert" — dann ist belegt, dass
 * es alte Zeilen gibt, und der Aufwand lohnt sich. Fehler sind egal.
 */
async function purgeExpiredClaims(supabase: Db, now: number): Promise<void> {
  const cutoff = new Date(now - DEDUPE_SETTINGS.purgeOlderThanMs).toISOString()
  const { error } = await supabase.from(TABLE).delete().lt('expires_at', cutoff)
  if (error) logger.warn('rental_request.dedupe.purge_failed', { error: error.message })
}

/**
 * Versucht, den Fingerprint zu belegen.
 *
 * Ergebnis `claimed` heisst: ab jetzt kommt kein zweiter Request mit
 * demselben Inhalt durch, bis das Fenster ablaeuft oder der Claim per
 * `releaseRentalRequestClaim` freigegeben wird.
 */
export async function claimRentalRequest(
  input: RentalRequestFingerprintInput,
): Promise<ClaimResult> {
  const fingerprint = rentalRequestFingerprint(input)
  const supabase = getSupabaseAdmin()

  for (let round = 0; round < MAX_CLAIM_ROUNDS; round++) {
    const now = Date.now()
    const nowIso = new Date(now).toISOString()
    const expiresAt = new Date(now + DEDUPE_SETTINGS.windowMs).toISOString()

    // 1. Das atomare Tor. Genau ein paralleler Request kommt hier durch.
    const insert = await supabase
      .from(TABLE)
      .insert({
        fingerprint,
        requester_id: input.requesterId,
        equipment_id: input.equipmentId,
        request_id: null,
        claimed_at: nowIso,
        expires_at: expiresAt,
      })
      .select('fingerprint')
      .maybeSingle()

    if (!insert.error) return { outcome: 'claimed', fingerprint }

    if (isMissingTable(insert.error)) {
      // Migration noch nicht eingespielt. Die Anfrage selbst ist wichtiger
      // als der Riegel — aber das gehoert laut in die Logs.
      logger.warn('rental_request.dedupe.table_missing', { error: insert.error.message })
      return { outcome: 'unavailable', fingerprint, reason: insert.error.message }
    }

    if (!isUniqueViolation(insert.error)) {
      logger.error('rental_request.dedupe.claim_failed', insert.error, { fingerprint })
      return { outcome: 'error', fingerprint, error: insert.error.message }
    }

    // 2. Es gibt schon einen Claim. Ist er abgelaufen, uebernehmen wir ihn.
    //    Das `lt('expires_at', …)` macht die Uebernahme atomar: bei zwei
    //    gleichzeitigen Uebernahmen prueft Postgres das Praedikat nach dem
    //    Zeilen-Lock erneut, der zweite trifft dann auf 0 Zeilen.
    const takeover = await supabase
      .from(TABLE)
      .update({
        requester_id: input.requesterId,
        equipment_id: input.equipmentId,
        request_id: null,
        claimed_at: nowIso,
        expires_at: expiresAt,
      })
      .eq('fingerprint', fingerprint)
      .lt('expires_at', nowIso)
      .select('fingerprint')

    if (takeover.error) {
      logger.error('rental_request.dedupe.takeover_failed', takeover.error, { fingerprint })
      return { outcome: 'error', fingerprint, error: takeover.error.message }
    }

    if (takeover.data && takeover.data.length > 0) {
      // Fenster war abgelaufen => legitime neue Anfrage. Guter Moment, um
      // andere Altlasten gleich mitzunehmen.
      await purgeExpiredClaims(supabase, now)
      return { outcome: 'claimed', fingerprint }
    }

    // 3. Aktiver Claim => Duplikat. Wenn der Erstversuch schon fertig ist,
    //    geben wir dessen Anfrage zurueck; sonst warten wir kurz auf ihn.
    const existing = await waitForClaimedRequest(supabase, fingerprint)

    if (existing.kind === 'error') return { outcome: 'error', fingerprint, error: existing.error }
    if (existing.kind === 'found') {
      return { outcome: 'duplicate', fingerprint, requestId: existing.requestId }
    }
    if (existing.kind === 'pending') return { outcome: 'in_flight', fingerprint }
    // 'gone': der Erstversuch ist gescheitert und hat den Claim freigegeben —
    // dann darf dieser Request ihn holen. Naechste Runde.
  }

  return { outcome: 'in_flight', fingerprint }
}

type WaitResult =
  | { kind: 'found'; requestId: string }
  | { kind: 'pending' }
  | { kind: 'gone' }
  | { kind: 'error'; error: string }

/**
 * Kurz darauf warten, dass der Erstversuch seine `request_id` nachtraegt.
 *
 * Ohne das Warten wuerde ein Doppelklick — beide Requests wenige
 * Millisekunden auseinander — dem Nutzer einen Fehler zeigen, obwohl seine
 * Anfrage gerade erfolgreich rausgeht. Die Wartezeit ist hart begrenzt
 * (Standard: 4 x 150 ms), damit sie keine Serverless-Funktion aufhaelt.
 */
async function waitForClaimedRequest(supabase: Db, fingerprint: string): Promise<WaitResult> {
  for (let attempt = 0; attempt < DEDUPE_SETTINGS.pollAttempts; attempt++) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('request_id')
      .eq('fingerprint', fingerprint)
      .maybeSingle()

    if (error) {
      logger.error('rental_request.dedupe.lookup_failed', error, { fingerprint })
      return { kind: 'error', error: error.message }
    }
    if (!data) return { kind: 'gone' }

    const requestId = (data as { request_id?: unknown }).request_id
    if (requestId) return { kind: 'found', requestId: String(requestId) }

    if (attempt < DEDUPE_SETTINGS.pollAttempts - 1) await sleep(DEDUPE_SETTINGS.pollDelayMs)
  }
  return { kind: 'pending' }
}

/**
 * Claim mit der entstandenen Anfrage verknuepfen. Ab jetzt bekommt ein
 * Duplikat-Request diese Anfrage zurueck, statt auf sie zu warten.
 */
export async function linkRentalRequestClaim(
  fingerprint: string,
  requestId: string,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(TABLE)
    .update({ request_id: requestId })
    .eq('fingerprint', fingerprint)

  // Nicht kritisch: der Riegel haelt auch ohne Verknuepfung, ein Duplikat
  // bekommt dann 409 statt der bestehenden Anfrage.
  if (error) logger.warn('rental_request.dedupe.link_failed', { fingerprint, error: error.message })
}

/**
 * Claim wieder freigeben, wenn die Anfrage NICHT zustande gekommen ist.
 *
 * Ohne das waere ein einmaliger DB-Fehler doppelt bestraft: der Nutzer
 * bekaeme fuer die naechsten fuenf Minuten auch bei jedem Neuversuch nur
 * „schon gesendet" zu sehen, obwohl nie etwas gespeichert wurde.
 */
export async function releaseRentalRequestClaim(fingerprint: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from(TABLE).delete().eq('fingerprint', fingerprint)
  if (error) {
    logger.warn('rental_request.dedupe.release_failed', { fingerprint, error: error.message })
  }
}
