export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import Link from 'next/link'
import CategoryClient from './CategoryClient'

interface Props {
  params: Promise<{ categoryId: string }>
}

export default async function CategoryPage({ params }: Props) {
  const { categoryId } = await params

  let category: { id: string; slug: string; label: string; description: string | null } | null = null
  let salons: {
    id: string
    name: string
    slug: string | null
    description: string | null
    city: string | null
    avg_rating: number
    is_verified: boolean
    review_count: number
    subscription_tier: string
    services: { id: string; name: string; sort_order: number }[]
  }[] = []

  try {
    const supabase = getSupabaseAdmin()

    const { data: cat } = await supabase
      .from('categories')
      .select('id, slug, label, description')
      .eq('slug', categoryId)
      .limit(1)
      .single()

    if (cat) category = cat

    const { data: salonData } = await supabase
      .from('salons')
      .select('id, name, slug, description, city, avg_rating, is_verified, review_count, subscription_tier, services(id, name, sort_order)')
      .eq('category', categoryId)
      .eq('is_active', true)
      .order('avg_rating', { ascending: false })

    if (salonData) salons = salonData as typeof salons
  } catch {
    // DB connection failed
  }

  return <CategoryClient categoryId={categoryId} category={category} dbSalons={salons} />
}
