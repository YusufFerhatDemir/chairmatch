import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  const supabase = getSupabaseAdmin()

  const [
    { count: userCount },
    { count: salonCount },
    { count: bookingCount },
    { count: reviewCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('salons').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }),
  ])

  // Cities
  const { data: salonCities } = await supabase.from('salons').select('city').not('city', 'is', null)
  const cities = new Set((salonCities || []).map(s => s.city).filter(Boolean))

  // Categories
  const { data: salonCats } = await supabase.from('salons').select('category').not('category', 'is', null)
  const catCounts: Record<string, number> = {}
  for (const s of salonCats || []) {
    if (s.category) catCounts[s.category] = (catCounts[s.category] || 0) + 1
  }

  return NextResponse.json({
    users: userCount ?? 0,
    salons: salonCount ?? 0,
    bookings: bookingCount ?? 0,
    reviews: reviewCount ?? 0,
    cities: cities.size,
    cityList: Array.from(cities).slice(0, 20),
    categories: catCounts,
  })
}
