export type Review = {
  id: string
  customer_id: string
  salon_id: string
  booking_id: string | null
  rating: number
  comment: string | null
  reply: string | null
  replied_at: string | null
  created_at: string
  updated_at: string
}

export type User = {
  id: string
  full_name: string | null
  email: string
  role: string
}

export type ReviewWithAuthor = Review & {
  customer?: Pick<User, 'id' | 'full_name'> | null
}

export type AggregateRatings = {
  avgRating: number
  reviewCount: number
}
