import { z } from 'zod'

export const createReviewSchema = z.object({
  salonId: z.string().uuid(),
  bookingId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

export const replySchema = z.object({
  reviewId: z.string().uuid(),
  reply: z.string().min(1).max(1000),
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type ReplyInput = z.infer<typeof replySchema>
