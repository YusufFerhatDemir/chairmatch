export type Booking = {
  id: string
  customer_id: string
  salon_id: string
  service_id: string | null
  staff_id: string | null
  booking_date: string
  start_time: string
  end_time: string
  status: string
  price_cents: number
  notes: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
}

export type Salon = {
  id: string
  name: string
  slug: string
  category: string
  city: string
  avg_rating: number
  review_count: number
  is_active: boolean
  owner_id: string
  created_at: string
  updated_at: string
}

export type Service = {
  id: string
  salon_id: string
  name: string
  price_cents: number
  duration_minutes: number
  sort_order: number
  is_active: boolean
}

export type BookingWithRelations = Booking & {
  salon: Salon
  service?: Service | null
}

export type StatusTransition = {
  from: string
  to: string
  actor: 'customer' | 'provider' | 'system'
}

export const VALID_TRANSITIONS: StatusTransition[] = [
  { from: 'PENDING', to: 'CONFIRMED', actor: 'provider' },
  { from: 'PENDING', to: 'CANCELLED', actor: 'customer' },
  { from: 'CONFIRMED', to: 'COMPLETED', actor: 'provider' },
  { from: 'CONFIRMED', to: 'CANCELLED', actor: 'customer' },
  { from: 'CONFIRMED', to: 'CANCELLED', actor: 'provider' },
  { from: 'CONFIRMED', to: 'NO_SHOW', actor: 'provider' },
]
