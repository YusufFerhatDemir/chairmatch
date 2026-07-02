export type RentalType = 'stuhl' | 'liege' | 'raum' | 'opraum'

export interface RentalSalon {
  id: string
  name: string
  slug: string | null
  city: string | null
  street: string | null
  avg_rating: number | null
  review_count: number | null
  is_verified: boolean | null
  description: string | null
}

export interface Rental {
  id: string
  name: string | null
  type: RentalType | string
  description: string | null
  price_per_day_cents: number
  price_per_month_cents: number | null
  images: string[] | null
  salon: RentalSalon | null
}

export const TYPE_LABELS: Record<string, string> = {
  stuhl: 'Stuhl',
  liege: 'Liege / Kabine',
  raum: 'Raum',
  opraum: 'OP-Raum',
}

export const TYPE_ICONS: Record<string, string> = {
  stuhl: 'chair-rolling',
  liege: 'bed-outline',
  raum: 'door-open',
  opraum: 'medical-bag',
}
