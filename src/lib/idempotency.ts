import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

/**
 * Idempotency-Helper: Garantiert dass eine API-Operation pro `(key, user, resource)`
 * Tupel nur EINMAL ausgeführt wird. Bei Wiederholung wird die ursprüngliche Antwort
 * zurückgegeben.
 *
 * Anwendungsfall: Doppelklick auf "Buchen" → erster Request legt Booking an,
 * zweiter Request bekommt aus der Cache-Tabelle die gleiche Antwort.
 *
 * Cleanup: Einträge älter als 24h sind irrelevant — eigener Cron-Job räumt auf.
 */

const TTL_HOURS = 24

export interface IdempotencyResult<T> {
  /** true, wenn dieser Key bereits gespeichert war */
  cached: boolean
  status: number
  body: T | null
}

/**
 * Prüft ob für (key, userId, resourceType) bereits eine Antwort gespeichert ist.
 * Wenn ja: cached Response zurückgeben. Wenn nein: null.
 */
export async function getIdempotentResponse<T = unknown>(
  key: string,
  userId: string,
  resourceType: string
): Promise<IdempotencyResult<T> | null> {
  if (!key || key.length < 8) return null

  try {
    const admin = getSupabaseAdmin()
    const cutoff = new Date(Date.now() - TTL_HOURS * 60 * 60 * 1000).toISOString()

    const { data } = await admin
      .from('idempotency_keys')
      .select('response_status, response_body, created_at')
      .eq('key', key)
      .eq('user_id', userId)
      .eq('resource_type', resourceType)
      .gte('created_at', cutoff)
      .maybeSingle()

    if (!data) return null

    return {
      cached: true,
      status: (data as { response_status: number }).response_status,
      body: (data as { response_body: T | null }).response_body,
    }
  } catch (e) {
    logger.warn('idempotency.lookup_failed', { key, err: String(e) })
    return null
  }
}

/**
 * Speichert die Antwort eines Operation-Outcomes für späteres Replay.
 * Idempotency-Key ist nicht der primary key — bei Konflikt (race-condition mit
 * gleichzeitigem Request) wird einfach der erste behalten.
 */
export async function storeIdempotentResponse(
  key: string,
  userId: string,
  resourceType: string,
  resourceId: string | null,
  status: number,
  body: unknown
): Promise<void> {
  if (!key || key.length < 8) return

  try {
    const admin = getSupabaseAdmin()
    await admin
      .from('idempotency_keys')
      .insert({
        key,
        user_id: userId,
        resource_type: resourceType,
        resource_id: resourceId,
        response_status: status,
        response_body: body,
      })
      // Race-Condition: zweiter Insert würde Primary-Key-Conflict werfen → ignorieren
      .select()
  } catch (e) {
    // Konflikt = okay (anderer Request war schneller); andere Fehler nur loggen
    const msg = String(e)
    if (!msg.includes('duplicate key') && !msg.includes('23505')) {
      logger.warn('idempotency.store_failed', { key, err: msg })
    }
  }
}
