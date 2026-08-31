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
  { from: 'pending', to: 'confirmed', actor: 'provider' },
  { from: 'pending', to: 'cancelled', actor: 'customer' },
  /*
   * Der Salon darf eine Anfrage auch ABLEHNEN — diese Zeile fehlte.
   *
   * `pending` ist ein belegender Status (`BLOCKING_STATUSES`): eine offene
   * Anfrage sperrt den Slot in `checkConflict` und in `/api/availability`
   * fuer alle anderen. Der Anbieter hatte dafuer aber nur den Knopf
   * „Bestaetigen"; `cancelBooking` wies ihn mit „Stornierung nicht moeglich"
   * ab, weil `pending -> cancelled` nur fuer `customer` eingetragen war, und
   * `PATCH /api/bookings/[id]` kannte den Zielstatus `cancelled` gar nicht.
   *
   * Damit gab es keinen Weg, eine Anfrage abzulehnen, die der Salon nicht
   * annehmen kann (Urlaub, Doppelbelegung ausserhalb des Systems, Kunde
   * meldet sich nicht). Sie blieb offen stehen und blockierte den Termin
   * dauerhaft — bis sie irgendwann in der Vergangenheit lag.
   */
  { from: 'pending', to: 'cancelled', actor: 'provider' },
  { from: 'confirmed', to: 'completed', actor: 'provider' },
  { from: 'confirmed', to: 'cancelled', actor: 'customer' },
  { from: 'confirmed', to: 'cancelled', actor: 'provider' },
  { from: 'confirmed', to: 'no_show', actor: 'provider' },
]
