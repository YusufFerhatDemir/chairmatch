import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import ProductDetailClient from './ProductDetailClient'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('products')
    .select('name, brand, description')
    .eq('slug', slug)
    .single()

  if (!data) return { title: 'Produkt nicht gefunden | ChairMatch', robots: { index: false, follow: true } }

  const title = `${data.name}${data.brand ? ` – ${data.brand}` : ''} | ChairMatch Shop`
  const description = data.description || `${data.name} – jetzt im ChairMatch Shop bestellen.`
  const url = `https://www.chairmatch.de/shop/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'ChairMatch',
      locale: 'de_DE',
      type: 'website',
    },
    twitter: { card: 'summary', title, description },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const supabase = getSupabaseAdmin()
  const { data: product } = await supabase
    .from('products')
    .select('*, product_categories(slug, name), sellers(company_name, seller_type, salon_id), product_variants(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!product) {
    return (
      <div className="shell">
        <div className="screen" style={{ padding: 'var(--pad)', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'var(--font-xl)', color: 'var(--cream)', marginTop: 40 }}>Produkt nicht gefunden</h1>
          <a href="/shop" style={{ color: 'var(--gold)', marginTop: 16, display: 'inline-block' }}>← Zurück zum Shop</a>
        </div>
      </div>
    )
  }

  const priceEur = typeof product.price_cents === 'number' ? (product.price_cents / 100).toFixed(2) : null
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    image: product.image_url || undefined,
    sku: product.sku || product.id,
    url: `https://www.chairmatch.de/shop/${slug}`,
    offers: priceEur ? {
      '@type': 'Offer',
      price: priceEur,
      priceCurrency: 'EUR',
      availability: (product.stock_quantity ?? 1) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `https://www.chairmatch.de/shop/${slug}`,
      seller: { '@type': 'Organization', name: product.sellers?.company_name || 'ChairMatch' },
    } : undefined,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <ProductDetailClient product={product} />
    </>
  )
}
