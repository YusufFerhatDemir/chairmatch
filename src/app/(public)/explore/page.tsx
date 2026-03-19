export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import ExploreClient from './ExploreClient'

interface Salon {
  id: string
  name: string
  slug: string | null
  description: string | null
  city: string | null
  avg_rating: number
  services: { id: string; name: string }[]
}

export default async function ExplorePage() {
  let salons: Salon[] = []

  try {
    const supabase = getSupabaseAdmin()

    const { data: salonData } = await supabase
      .from('salons')
      .select('id, name, slug, description, city, avg_rating, services(id, name)')
      .eq('is_active', true)
      .order('avg_rating', { ascending: false })

    if (salonData) salons = salonData as unknown as Salon[]
  } catch {
    // DB connection failed — render empty state
  }

  return <ExploreClient salons={salons} />
}
