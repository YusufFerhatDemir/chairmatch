export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import EmpfehlungenClient from './EmpfehlungenClient'

export const metadata: Metadata = {
  title: 'Pflege-Empfehlungen | ChairMatch',
  description: 'Premium Beauty- und Haarpflegeprodukte, kuratiert von ChairMatch. Affiliate-Empfehlungen unserer Partner.',
}

export interface AffiliateProductRow {
  id: string
  partner: string
  product_name: string
  product_url: string
  category: string | null
  commission_rate: number | null
  image_url: string | null
  price_cents: number | null
  is_active: boolean
}

export default async function EmpfehlungenPage() {
  let products: AffiliateProductRow[] = []

  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('affiliate_products')
      .select('id, partner, product_name, product_url, category, commission_rate, image_url, price_cents, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (data) products = data as AffiliateProductRow[]
  } catch {
    // ignore — render empty state
  }

  return <EmpfehlungenClient products={products} />
}
