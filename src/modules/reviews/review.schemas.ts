import { z } from 'zod'

/**
 * Drei Review-Typen für den Marketplace:
 *
 * - customer_to_salon: Endkunde bewertet Salon nach Behandlungs-Termin
 *   (sofort published, kein Double-Blind)
 *
 * - tenant_to_provider: Stuhl-Mieter bewertet Stuhl-Anbieter nach Marketplace-Booking
 *   (Double-Blind 14d, gleichzeitige Freischaltung)
 *
 * - provider_to_tenant: Stuhl-Anbieter bewertet Stuhl-Mieter nach Marketplace-Booking
 *   (Double-Blind 14d, gleichzeitige Freischaltung)
 */
export const REVIEW_TYPES = ['customer_to_salon', 'tenant_to_provider', 'provider_to_tenant'] as const
export type ReviewType = (typeof REVIEW_TYPES)[number]

export const createReviewSchema = z.object({
  /** Pflicht: Booking-ID — Reviews ohne Booking sind nicht erlaubt (Anti-Spam) */
  bookingId: z.string().uuid(),
  /** Bewertungstyp */
  reviewType: z.enum(REVIEW_TYPES),
  /** Für customer_to_salon UND tenant_to_provider: Salon-ID */
  salonId: z.string().uuid().optional(),
  /** Für provider_to_tenant: User-ID des Mieters */
  revieweeUserId: z.string().uuid().optional(),
  /** Sterne 1-5 */
  rating: z.number().int().min(1).max(5),
  /** Kommentar — optional, max 1000 Zeichen */
  comment: z.string().max(1000).optional(),
})

export const replySchema = z.object({
  reviewId: z.string().uuid(),
  reply: z.string().min(1).max(1000),
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type ReplyInput = z.infer<typeof replySchema>
