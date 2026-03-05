import type { Booking, Salon, Service } from '@prisma/client'

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
