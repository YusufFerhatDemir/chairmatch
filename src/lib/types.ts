// ═══ Core Entity Types ═══

export interface Salon {
  id: string
  owner_id: string
  name: string
  slug: string | null
  category: SalonCategory
  description: string | null
  phone: string | null
  email: string | null
  website: string | null
  street: string | null
  house_number: string | null
  postal_code: string | null
  city: string | null
  state: string | null
  opening_hours: OpeningHours | null
  logo_url: string | null
  cover_url: string | null
  gallery: GalleryItem[]
  avg_rating: number
  review_count: number
  is_verified: boolean
  is_active: boolean
  subscription_tier: SubscriptionTier
  created_at: string
  updated_at: string
  // Relations
  services?: Service[]
  staff?: Staff[]
  reviews?: Review[]
  offers?: Offer[]
  rental_equipment?: RentalEquipment[]
  // Computed / display fields (from legacy data)
  tagline?: string
  tags?: string[]
  discount?: number
  brand_color?: string
  is_promoted?: boolean
  free_slots?: number
  boost?: number
  specialists?: string[]
}

export type SalonCategory = 'barber' | 'friseur' | 'kosmetik' | 'aesthetik' | 'nail' | 'massage' | 'lash' | 'arzt' | 'opraum'

export type SubscriptionTier = 'starter' | 'premium' | 'gold'

export interface Service {
  id: string
  salon_id: string
  name: string
  description: string | null
  category: string | null
  duration_minutes: number
  price_cents: number
  currency: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Staff {
  id: string
  salon_id: string
  user_id: string | null
  name: string
  title: string | null
  avatar_url: string | null
  specialties: string[]
  is_active: boolean
  created_at: string
  // Display fields
  initials?: string
  color?: string
  rating?: number
}

export interface Booking {
  id: string
  customer_id: string
  salon_id: string
  service_id: string
  staff_id: string | null
  booking_date: string
  start_time: string
  end_time: string
  status: BookingStatus
  price_cents: number
  notes: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  // Relations
  salon?: Salon
  service?: Service
  staff?: Staff
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

export interface Review {
  id: string
  customer_id: string
  salon_id: string
  booking_id: string | null
  rating: number
  comment: string | null
  reply: string | null
  replied_at: string | null
  created_at: string
  // Display fields
  username?: string
}

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  preferred_language: AppLanguage
  created_at: string
  updated_at: string
}

export type UserRole = 'kunde' | 'anbieter' | 'admin' | 'super_admin'

export type AppLanguage = 'de' | 'en' | 'tr'

export interface Offer {
  id: string
  salon_id: string
  title: string
  description: string | null
  discount_percent: number | null
  discount_fixed_cents: number | null
  valid_from: string
  valid_until: string | null
  is_active: boolean
  created_at: string
  salon?: Salon
}

export interface RentalEquipment {
  id: string
  salon_id: string
  type: RentalType
  name: string
  description: string | null
  price_per_day_cents: number
  price_per_month_cents: number | null
  is_available: boolean
  images: string[]
  created_at: string
}

export type RentalType = 'stuhl' | 'liege' | 'raum' | 'opraum'

export interface RentalBooking {
  id: string
  equipment_id: string
  renter_id: string
  start_date: string
  end_date: string
  total_cents: number
  status: BookingStatus
  created_at: string
}

export interface LoyaltyCard {
  id: string
  customer_id: string
  salon_id: string
  stamps: number
  stamps_required: number
  reward: string
  is_redeemed: boolean
  created_at: string
}

export interface Favorite {
  id: string
  customer_id: string
  salon_id: string
  created_at: string
}

// ═══ UI Types ═══

export interface OpeningHours {
  mo: string | null
  di: string | null
  mi: string | null
  do: string | null
  fr: string | null
  sa: string | null
  so: string | null
}

export interface GalleryItem {
  background?: string
  accent?: string
  service_name?: string
  url?: string
}

export interface Notification {
  id: string
  title: string
  body: string
  time: string
  read: boolean
  icon: string
}

export interface CategoryInfo {
  id: SalonCategory | 'angebote' | 'termin'
  label: string
  sub: string
  icon?: string
}

export interface PromoCode {
  code: string
  discount: number
  type: 'percent' | 'fixed'
}

export type ThemeMode = 'dark' | 'light'

export type TabId = 'home' | 'explore' | 'favorites' | 'offers' | 'account'

export type DetailTab = 'info' | 'services' | 'team' | 'reviews' | 'gallery'
