import type { Metadata } from 'next'
import { getProducts } from '@/modules/marketplace/marketplace.service'
import ShopClient from './ShopClient'

export const metadata: Metadata = {
  title: 'Shop – Beauty-Produkte | ChairMatch',
  description: 'Pflegeprodukte, Styling & Kosmetik direkt von deinem Salon empfohlen. Shampoo, Bartöl, Hautpflege und mehr.',
}

export default async function ShopPage() {
  const { data: products } = await getProducts({ limit: 20, target: 'b2c' })
  return <ShopClient initialProducts={products} />
}
