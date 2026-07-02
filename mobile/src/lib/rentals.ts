import { supabase } from './supabase'
import type { Rental } from './types'

const SELECT =
  'id, name, type, description, price_per_day_cents, price_per_month_cents, images, salon:salons(id, name, slug, city, street, avg_rating, review_count, is_verified, description)'

export interface RentalFilters {
  type?: string
  city?: string
  maxPricePerDayCents?: number
}

export async function fetchRentals(filters: RentalFilters = {}): Promise<Rental[]> {
  let query = supabase
    .from('rental_equipment')
    .select(SELECT)
    .eq('is_available', true)
    .order('price_per_day_cents', { ascending: true })
    .limit(100)

  if (filters.type) query = query.eq('type', filters.type)
  if (filters.maxPricePerDayCents) query = query.lte('price_per_day_cents', filters.maxPricePerDayCents)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  let rentals = (data ?? []) as unknown as Rental[]

  // Stadt-Filter clientseitig (Filter auf eingebettete Relation, Datenmenge ist klein)
  if (filters.city) {
    const needle = filters.city.trim().toLowerCase()
    rentals = rentals.filter((r) => r.salon?.city?.toLowerCase().includes(needle))
  }

  return rentals
}

export async function fetchRental(id: string): Promise<Rental | null> {
  const { data, error } = await supabase
    .from('rental_equipment')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as unknown as Rental) ?? null
}

export async function fetchCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from('rental_equipment')
    .select('salon:salons(city)')
    .eq('is_available', true)
    .limit(200)
  if (error) throw new Error(error.message)
  const cities = new Set<string>()
  for (const row of (data ?? []) as unknown as { salon: { city: string | null } | null }[]) {
    if (row.salon?.city) cities.add(row.salon.city)
  }
  return [...cities].sort((a, b) => a.localeCompare(b, 'de'))
}
