export const revalidate = 3600 // ISR statt force-dynamic — Marketing-Seite, 1h Cache

import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import EmpfehlungenClient from './EmpfehlungenClient'

export const metadata: Metadata = {
  title: 'Pflege-Empfehlungen | ChairMatch',
  description: 'Premium Beauty- und Haarpflegeprodukte, kuratiert von ChairMatch. Affiliate-Empfehlungen unserer Partner.',
  alternates: { canonical: 'https://www.chairmatch.de/empfehlungen' },
  openGraph: {
    title: 'Pflege-Empfehlungen | ChairMatch',
    description: 'Premium Beauty- und Haarpflegeprodukte, kuratiert von ChairMatch.',
    url: 'https://www.chairmatch.de/empfehlungen',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ChairMatch — Pflege-Empfehlungen' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pflege-Empfehlungen | ChairMatch',
    description: 'Premium Beauty- und Haarpflegeprodukte, kuratiert von ChairMatch.',
    images: ['/og-image.png'],
  },
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
  let ladeFehler = false

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('affiliate_products')
      .select('id, partner, product_name, product_url, category, commission_rate, image_url, price_cents, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[empfehlungen] Produkte konnten nicht geladen werden:', error.message)
      ladeFehler = true
    } else if (data) {
      products = data as AffiliateProductRow[]
    }
  } catch (err) {
    console.error('[empfehlungen] Datenbank nicht erreichbar:', err)
    ladeFehler = true
  }

  return <EmpfehlungenClient products={products} ladeFehler={ladeFehler} />
}
