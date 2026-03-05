import type { Review, User } from '@prisma/client'

export type ReviewWithAuthor = Review & {
  customer?: Pick<User, 'id' | 'fullName'> | null
}

export type AggregateRatings = {
  avgRating: number
  reviewCount: number
}
