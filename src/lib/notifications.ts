import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * Tabellenname der In-App-Benachrichtigungen.
 *
 * Heisst live `notification_log` (Migration 20260317_payments_and_compliance).
 * Der Code hat bis 2026-08-23 auf `notifications` geschrieben — eine Tabelle,
 * die es in der Produktionsdatenbank nie gab. PostgREST antwortete darauf mit
 * PGRST205, `createNotification` schluckte das als `console.error` und gab
 * `null` zurueck: JEDE In-App-Benachrichtigung fiel still aus, ohne dass ein
 * Aufrufer es gemerkt haette (kein Aufrufer prueft den Rueckgabewert).
 *
 * Deshalb steht der Name jetzt genau einmal hier. Wer ihn aendert, aendert
 * ihn ueberall — Lesen und Schreiben koennen nicht mehr auseinanderlaufen.
 */
export const NOTIFICATION_TABLE = 'notification_log'

export type NotificationType =
  | 'info'
  | 'booking'
  | 'payment'
  | 'message'
  | 'offer'
  | 'system'
  | 'compliance'

/**
 * Create an in-app notification for a user.
 *
 * @param userId - Target user ID
 * @param title - Short notification title
 * @param body - Notification body text
 * @param type - Notification category
 * @param referenceId - Optional ID of the related entity (booking, salon, etc.)
 * @param referenceType - Optional entity type ('booking', 'salon', 'document', etc.)
 * @returns The created notification ID, or null on error
 */
export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: NotificationType,
  referenceId?: string,
  referenceType?: string
): Promise<string | null> {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(NOTIFICATION_TABLE)
    .insert({
      user_id: userId,
      title,
      body,
      type,
      reference_id: referenceId || null,
      reference_type: referenceType || null,
      is_read: false,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createNotification] Error:', error.message)
    return null
  }

  return data.id
}

/**
 * Create notifications for multiple users at once.
 *
 * @param userIds - Array of target user IDs
 * @param title - Short notification title
 * @param body - Notification body text
 * @param type - Notification category
 * @param referenceId - Optional related entity ID
 * @param referenceType - Optional entity type
 * @returns Number of successfully created notifications
 */
export async function createBulkNotifications(
  userIds: string[],
  title: string,
  body: string,
  type: NotificationType,
  referenceId?: string,
  referenceType?: string
): Promise<number> {
  if (userIds.length === 0) return 0

  const supabase = getSupabaseAdmin()

  const rows = userIds.map(userId => ({
    user_id: userId,
    title,
    body,
    type,
    reference_id: referenceId || null,
    reference_type: referenceType || null,
    is_read: false,
  }))

  const { data, error } = await supabase
    .from(NOTIFICATION_TABLE)
    .insert(rows)
    .select('id')

  if (error) {
    console.error('[createBulkNotifications] Error:', error.message)
    return 0
  }

  return data?.length ?? 0
}
