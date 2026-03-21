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

  if (!data) return { title: 'Produkt nicht gefunden | ChairMatch' }

  return {
    title: `${data.name}${data.brand ? ` – ${data.brand}` : ''} | ChairMatch Shop`,
    description: data.description || `${data.name} – jetzt im ChairMatch Shop bestellen.`,
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

  return <ProductDetailClient product={product} />
}
