import type { Metadata } from 'next'
import { getProducts } from '@/modules/marketplace/marketplace.service'
import { breadcrumbSchema } from '@/lib/seo'
import ShopClient from './ShopClient'

export const metadata: Metadata = {
  title: 'Shop – Beauty-Produkte | ChairMatch',
  description: 'Pflegeprodukte, Styling & Kosmetik direkt von deinem Salon empfohlen. Shampoo, Bartöl, Hautpflege und mehr.',
  alternates: { canonical: 'https://www.chairmatch.de/shop' },
}

export default async function ShopPage() {
  const { data: products } = await getProducts({ limit: 20, target: 'b2c' })
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
          { name: 'Start', url: '/' },
          { name: 'Shop', url: '/shop' },
        ])) }}
      />
      <ShopClient initialProducts={products} />
    </>
  )
}
