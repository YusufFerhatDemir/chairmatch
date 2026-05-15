import type { Metadata } from 'next'
import { getProducts } from '@/modules/marketplace/marketplace.service'
import ShopClient from './ShopClient'

// FIX: dynamic-Rendering verhindert Build-Fehler durch fehlende ENV-Vars
// während Static-Pre-Render (Supabase wird zur Build-Zeit aufgerufen).
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Shop – Beauty-Produkte | ChairMatch',
  description: 'Pflegeprodukte, Styling & Kosmetik direkt von deinem Salon empfohlen. Shampoo, Bartöl, Hautpflege und mehr.',
}

export default async function ShopPage() {
  try {
    const { data: products } = await getProducts({ limit: 20, target: 'b2c' })
    return <ShopClient initialProducts={products} />
  } catch {
    // Falls Supabase nicht erreichbar → leeres Shop-UI zeigen statt zu crashen
    return <ShopClient initialProducts={[]} />
  }
}
