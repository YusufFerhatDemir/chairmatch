import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import { sendRentalRequestNotification } from '@/lib/email'

/**
 * E-Mail-Benachrichtigung an den Vermieter bei neuer Mietanfrage.
 *
 * Bis hierher erfuhr der Vermieter nur in-app von einer Anfrage — wer die App
 * nicht offen hatte, sah sie erst Tage spaeter. Diese Zustellung ist bewusst
 * "best effort": schlaegt sie fehl, ist die Anfrage trotzdem gespeichert.
 *
 * Drei Garantien:
 *  - Datensparsamkeit: keine IBAN, keine vollstaendige Adresse, keine
 *    Kontaktdaten des Interessenten. Details gibt es nur hinter dem Login.
 *  - Idempotenz: pro rental_requests.id genau eine Mail, abgesichert ueber
 *    den UNIQUE-Index auf email_delivery_log(email_type, reference_id).
 *  - Nachvollziehbarkeit: jeder Versuch landet mit Status im Delivery-Log.
 */

export const RENTAL_REQUEST_EMAIL_TYPE = 'rental_request_created'

const DELIVERY_LOG_TABLE = 'email_delivery_log'

/** Freitext des Interessenten, der in die Mail darf. */
const MESSAGE_EXCERPT_LIMIT = 400

export interface RentalRequestEmailInput {
  requestId: string
  /** profiles.id des Vermieters (rental_requests.recipient_id) */
  recipientId: string | null
  requestType: 'miete' | 'besichtigung'
  equipmentName: string
  /** Klarname des Interessenten — wird vor dem Versand gekuerzt. */
  requesterName: string
  preferredDate: string
  preferredTime?: string | null
  durationUnit?: 'hour' | 'day' | 'week' | 'month' | null
  units?: number | null
  estimatedCents?: number | null
  message?: string | null
  salonName?: string | null
  city?: string | null
}

export type RentalRequestEmailOutcome =
  | { status: 'sent'; messageId?: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string }

// ---------------------------------------------------------------------------
// Reine Helfer (ohne IO) — direkt testbar
// ---------------------------------------------------------------------------

const DURATION_LABELS: Record<string, [string, string]> = {
  hour: ['Stunde', 'Stunden'],
  day: ['Tag', 'Tage'],
  week: ['Woche', 'Wochen'],
  month: ['Monat', 'Monate'],
}

/**
 * „3 Tage", „1 Stunde" — oder null, wenn keine Dauer angegeben ist
 * (Besichtigungen haben keine).
 */
export function formatDurationLabel(
  unit: string | null | undefined,
  units: number | null | undefined,
): string | null {
  if (!unit || !units || units < 1) return null
  const labels = DURATION_LABELS[unit]
  if (!labels) return null
  return `${units} ${units === 1 ? labels[0] : labels[1]}`
}

/**
 * „Marko Fischer" -> „Marko F.", „marko@example.com" -> „marko".
 *
 * Der Vermieter sieht in der Mail nur so viel, wie er zur Einordnung braucht;
 * den vollen Namen gibt es in der App. Das haelt auch E-Mail-Adressen aus
 * durchgereichten Session-Namen aus der Mail heraus.
 */
export function shortenRequesterName(raw: string | null | undefined): string {
  const value = (raw ?? '').trim()
  if (!value) return 'Ein Interessent'

  // Sieht es nach einer Mailadresse aus, bleibt nur der lokale Teil uebrig.
  const at = value.indexOf('@')
  const base = at > 0 ? value.slice(0, at) : value

  const parts = base.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Ein Interessent'
  if (parts.length === 1) return parts[0]
  const last = parts[parts.length - 1]
  return `${parts.slice(0, -1).join(' ')} ${last.charAt(0).toUpperCase()}.`
}

/** Kuerzt den Freitext, damit die Mail nicht zum Roman wird. */
export function truncateMessage(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  if (value.length <= MESSAGE_EXCERPT_LIMIT) return value
  return `${value.slice(0, MESSAGE_EXCERPT_LIMIT).trimEnd()}…`
}

// ---------------------------------------------------------------------------
// Delivery-Log (Idempotenz + Zustellstatus)
// ---------------------------------------------------------------------------

type ClaimResult =
  /** Zeile angelegt — dieser Aufruf darf senden. */
  | { kind: 'claimed'; logId: string | null }
  /** Es gibt bereits eine Zeile — ein frueherer Aufruf hat die Mail uebernommen. */
  | { kind: 'duplicate' }
  /** Tabelle fehlt (Migration nicht eingespielt) — senden ohne Schutz. */
  | { kind: 'unavailable' }

/** Postgres/PostgREST-Codes fuer „Relation existiert nicht". */
function isMissingTable(code: string | undefined): boolean {
  return code === '42P01' || code === 'PGRST205' || code === 'PGRST106'
}

/** Postgres-Code fuer Unique-Verletzung. */
function isUniqueViolation(code: string | undefined): boolean {
  return code === '23505'
}

/**
 * Reserviert den Versand fuer (Typ, referenceId). Der zweite Aufruf mit
 * derselben Referenz laeuft in den UNIQUE-Index und bekommt 'duplicate' —
 * genau das verhindert die doppelte Mail bei einem Retry.
 */
async function claimDelivery(
  referenceId: string,
  recipientUserId: string | null,
): Promise<ClaimResult> {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from(DELIVERY_LOG_TABLE)
      .insert({
        email_type: RENTAL_REQUEST_EMAIL_TYPE,
        reference_id: referenceId,
        recipient_user_id: recipientUserId,
        status: 'pending',
      })
      .select('id')
      .maybeSingle()

    if (error) {
      if (isUniqueViolation(error.code)) return { kind: 'duplicate' }
      if (isMissingTable(error.code)) {
        logger.warn('rental_request_email.log_table_missing', {
          hint: 'Migration 20260823_email_delivery_log.sql nicht eingespielt — kein Doppelversand-Schutz',
        })
        return { kind: 'unavailable' }
      }
      logger.warn('rental_request_email.claim_failed', { requestId: referenceId, err: error.message })
      return { kind: 'unavailable' }
    }

    return { kind: 'claimed', logId: (data as { id?: string } | null)?.id ?? null }
  } catch (e) {
    logger.warn('rental_request_email.claim_exception', { requestId: referenceId, err: String(e) })
    return { kind: 'unavailable' }
  }
}

/** Schreibt das Ergebnis zurueck. Fehler hier duerfen den Request nie kippen. */
async function finishDelivery(
  logId: string | null,
  patch: {
    status: 'sent' | 'failed' | 'skipped'
    recipient_email?: string | null
    provider_message_id?: string | null
    error?: string | null
  },
): Promise<void> {
  if (!logId) return
  try {
    const admin = getSupabaseAdmin()
    await admin
      .from(DELIVERY_LOG_TABLE)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', logId)
  } catch (e) {
    logger.warn('rental_request_email.log_update_failed', { logId, err: String(e) })
  }
}

// ---------------------------------------------------------------------------
// Empfaenger-Ermittlung
// ---------------------------------------------------------------------------

interface Recipient {
  email: string | null
  name: string | null
}

/**
 * Adresse und Anrede des Vermieters.
 *
 * `payout_accounts` fuehrt den Kontoinhaber (`account_holder`) — der Name, den
 * der Vermieter selbst als Vertragspartner angegeben hat, und damit die
 * bessere Anrede. Eine Mailadresse steht dort bewusst nicht (die Tabelle
 * enthaelt Zahlungsdaten), die kommt aus `profiles`. Kein Feld aus
 * payout_accounts ausser dem Namen wird gelesen — IBAN bleibt aussen vor.
 */
async function resolveRecipient(userId: string): Promise<Recipient> {
  const admin = getSupabaseAdmin()
  let name: string | null = null

  try {
    const { data: payout } = await admin
      .from('payout_accounts')
      .select('account_holder')
      .eq('user_id', userId)
      .eq('context', 'vermieter')
      .maybeSingle()
    name = (payout as { account_holder?: string | null } | null)?.account_holder?.trim() || null
  } catch (e) {
    // Fehlende Tabelle/Zeile ist kein Grund, die Mail ausfallen zu lassen.
    logger.debug('rental_request_email.payout_lookup_failed', { err: String(e) })
  }

  const { data: profile, error } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    logger.warn('rental_request_email.profile_lookup_failed', { err: error.message })
    return { email: null, name }
  }

  const row = profile as { email?: string | null; full_name?: string | null } | null
  return {
    email: row?.email?.trim() || null,
    name: name || row?.full_name?.trim() || null,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Schickt dem Vermieter die Mail zur neuen Anfrage.
 *
 * Wirft nie — der Aufrufer soll die Anfrage in jedem Fall bestaetigen koennen.
 */
export async function notifyLandlordOfRentalRequest(
  input: RentalRequestEmailInput,
): Promise<RentalRequestEmailOutcome> {
  if (!input.recipientId) {
    return { status: 'skipped', reason: 'Kein Vermieter hinterlegt' }
  }

  const claim = await claimDelivery(input.requestId, input.recipientId)
  if (claim.kind === 'duplicate') {
    logger.info('rental_request_email.duplicate_suppressed', { requestId: input.requestId })
    return { status: 'skipped', reason: 'Bereits versendet' }
  }
  const logId = claim.kind === 'claimed' ? claim.logId : null

  let recipient: Recipient
  try {
    recipient = await resolveRecipient(input.recipientId)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await finishDelivery(logId, { status: 'failed', error: `Empfaenger-Lookup: ${message}` })
    logger.warn('rental_request_email.recipient_failed', { requestId: input.requestId, err: message })
    return { status: 'failed', error: message }
  }

  if (!recipient.email) {
    await finishDelivery(logId, { status: 'skipped', error: 'Keine E-Mail-Adresse hinterlegt' })
    logger.warn('rental_request_email.no_address', { requestId: input.requestId })
    return { status: 'skipped', reason: 'Keine E-Mail-Adresse hinterlegt' }
  }

  try {
    const result = await sendRentalRequestNotification(recipient.email, {
      requestId: input.requestId,
      requestType: input.requestType,
      equipmentName: input.equipmentName,
      requesterName: shortenRequesterName(input.requesterName),
      preferredDate: input.preferredDate,
      preferredTime: input.preferredTime ?? null,
      durationLabel: formatDurationLabel(input.durationUnit, input.units),
      estimatedCents: input.estimatedCents ?? null,
      message: truncateMessage(input.message),
      salonName: input.salonName ?? null,
      city: input.city ?? null,
      recipientName: recipient.name,
    })

    if (!result.success) {
      await finishDelivery(logId, {
        status: 'failed',
        recipient_email: recipient.email,
        error: result.error ?? 'Unbekannter Versandfehler',
      })
      logger.warn('rental_request_email.send_failed', {
        requestId: input.requestId,
        err: result.error,
      })
      return { status: 'failed', error: result.error ?? 'Unbekannter Versandfehler' }
    }

    await finishDelivery(logId, {
      status: 'sent',
      recipient_email: recipient.email,
      provider_message_id: result.id ?? null,
    })
    logger.info('rental_request_email.sent', { requestId: input.requestId, messageId: result.id })
    return { status: 'sent', messageId: result.id }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await finishDelivery(logId, {
      status: 'failed',
      recipient_email: recipient.email,
      error: message,
    })
    logger.warn('rental_request_email.send_exception', { requestId: input.requestId, err: message })
    return { status: 'failed', error: message }
  }
}
