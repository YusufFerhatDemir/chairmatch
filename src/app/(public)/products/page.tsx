/**
 * /products — Public Produkt-Listing mit Filtern.
 *
 * Phase 1: Hygiene-Produkte, Pflege, Werkzeuge, Verbrauchsmaterial.
 * Backend: getProducts() in marketplace.service (B2B/B2C/both targeting).
 *
 * Conversion-Optimiert: Filter (Kategorie, B2B/B2C, Salon), Suche, Featured-Boost.
 */

export const revalidate = 300 // 5 Min ISR

import type { Metadata } from 'next'
import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { breadcrumbSchema } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'

export const metadata: Metadata = {
  title: 'Beauty-Produkte & Hygiene — Marketplace | ChairMatch',
  description: 'Profi-Produkte für Friseur, Barber, Kosmetik & Beauty: Hygiene, Pflege, Werkzeuge, Verbrauchsmaterial. B2B-Preise für verifizierte Beauty-Profis.',
  keywords: 'friseur produkte b2b, beauty hygiene, salon shop, profi pflege, barber zubehör',
  alternates: { canonical: 'https://chairmatch.de/products' },
  openGraph: {
    title: 'Beauty-Marketplace — ChairMatch',
    description: 'Profi-Produkte für Beauty-Selbstständige & Salons.',
    url: 'https://chairmatch.de/products',
    locale: 'de_DE',
    siteName: 'ChairMatch',
  },
}

interface ProductRow {
  id: string
  slug: string | null
  name: string
  brand: string | null
  description: string | null
  price_cents: number
  images: string[] | null
  target: 'b2c' | 'b2b' | 'both' | null
  is_featured: boolean | null
  category_id: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  product_categories?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sellers?: any
}

interface CategoryRow {
  id: string
  slug: string
  name: string
}

interface Props {
  searchParams: Promise<{ category?: string; target?: string; q?: string }>
}

async function loadData(filters: { category?: string; target?: string; q?: string }) {
  try {
    const supabase = getSupabaseAdmin()

    // Categories
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cats } = await (supabase as any)
      .from('product_categories')
      .select('id, slug, name')
      .order('name')

    // Products with filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = (supabase as any)
      .from('products')
      .select('id, slug, name, brand, description, price_cents, images, target, is_featured, category_id, product_categories(slug, name), sellers(company_name, seller_type)')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60)

    if (filters.category) {
      const cat = (cats || []).find((c: CategoryRow) => c.slug === filters.category)
      if (cat) q = q.eq('category_id', cat.id)
    }
    if (filters.target && ['b2c', 'b2b', 'both'].includes(filters.target)) {
      q = q.eq('target', filters.target)
    }
    if (filters.q) {
      const clean = filters.q.replace(/[%_]/g, '')
      q = q.or(`name.ilike.%${clean}%,brand.ilike.%${clean}%`)
    }

    const { data: products } = await q

    return {
      categories: (cats || []) as CategoryRow[],
      products: (products || []) as ProductRow[],
    }
  } catch {
    return { categories: [], products: [] }
  }
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams
  const { categories, products } = await loadData({
    category: sp.category,
    target: sp.target,
    q: sp.q,
  })

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
            { name: 'Start', url: '/' },
            { name: 'Produkte', url: '/products' },
          ])) }}
        />

        <Breadcrumbs items={[{ name: 'Produkte', url: '/products' }]} />

        <h1 className="cinzel" style={{
          fontSize: 28, fontWeight: 700, color: 'var(--gold2)',
          marginBottom: 8, lineHeight: 1.2,
        }}>
          Beauty-Marketplace
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
          Hygiene, Pflege, Werkzeuge & Verbrauchsmaterial für Profis. Verifizierte Anbieter, B2B-Preise für Beauty-Selbstständige.
        </p>

        {/* Filter-Bar */}
        <section style={{
          background: 'var(--c2)', borderRadius: 12, padding: 14, marginBottom: 20,
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
          border: '1px solid var(--border)',
        }}>
          <FilterChip href="/products" active={!sp.category && !sp.target}>Alle</FilterChip>
          <FilterChip href="/products?target=b2b" active={sp.target === 'b2b'}>B2B (Profis)</FilterChip>
          <FilterChip href="/products?target=b2c" active={sp.target === 'b2c'}>Endkunde</FilterChip>
          <div style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 6px' }} />
          {categories.slice(0, 8).map((c) => (
            <FilterChip
              key={c.id}
              href={`/products?category=${c.slug}`}
              active={sp.category === c.slug}
            >
              {c.name}
            </FilterChip>
          ))}
        </section>

        {/* Search */}
        <form method="get" action="/products" style={{ marginBottom: 20 }}>
          <input
            type="search"
            name="q"
            defaultValue={sp.q || ''}
            placeholder="Suche nach Marke, Produkt …"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--c2)',
              color: 'var(--cream)',
              fontSize: 14,
            }}
          />
        </form>

        {/* Grid */}
        {products.length === 0 ? (
          <EmptyState />
        ) : (
          <section style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 12,
          }}>
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </section>
        )}

        {/* CTA für Anbieter */}
        <section style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.10), rgba(176,144,96,0.04))',
          border: '1px solid var(--gold)',
          borderRadius: 14, padding: 20, marginTop: 32, textAlign: 'center',
        }}>
          <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', margin: '0 0 8px' }}>
            Verkaufe Profi-Produkte auf ChairMatch
          </h2>
          <p style={{ color: 'var(--stone)', fontSize: 13, marginBottom: 14 }}>
            Eigene Marke oder Großhändler? Liste deine Produkte vor 1000+ verifizierten Beauty-Profis.
          </p>
          <Link
            href="/register/anbieter"
            className="bgold"
            style={{ display: 'inline-block', padding: '10px 22px', textDecoration: 'none', fontSize: 13 }}
          >
            Als Verkäufer registrieren →
          </Link>
        </section>
      </div>
    </div>
  )
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href as never} style={{
      padding: '6px 12px',
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 600,
      textDecoration: 'none',
      color: active ? '#080706' : 'var(--cream)',
      background: active ? 'var(--gold)' : 'transparent',
      border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </Link>
  )
}

function ProductCard({ product }: { product: ProductRow }) {
  const slug = product.slug || product.id
  const priceEur = (product.price_cents / 100).toFixed(2)
  const image = product.images?.[0]
  return (
    <Link href={`/products/${slug}` as never} style={{
      background: 'var(--c2)',
      borderRadius: 10,
      overflow: 'hidden',
      textDecoration: 'none',
      border: '1px solid var(--border)',
      transition: 'transform .2s',
    }}>
      <div style={{
        aspectRatio: '1/1',
        background: image
          ? `url(${image}) center/cover`
          : 'linear-gradient(135deg, var(--c2), var(--c3))',
        position: 'relative',
      }}>
        {product.is_featured && (
          <span style={{
            position: 'absolute', top: 6, left: 6,
            background: 'var(--gold)', color: '#080706',
            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          }}>
            FEATURED
          </span>
        )}
        {product.target === 'b2b' && (
          <span style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,0.7)', color: 'var(--gold2)',
            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          }}>
            B2B
          </span>
        )}
      </div>
      <div style={{ padding: 10 }}>
        {product.brand && (
          <p style={{ fontSize: 10, color: 'var(--stone)', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {product.brand}
          </p>
        )}
        <p style={{ fontSize: 13, color: 'var(--cream)', fontWeight: 600, margin: '2px 0 4px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.name}
        </p>
        <p style={{ fontSize: 14, color: 'var(--gold2)', fontWeight: 700, margin: 0 }}>
          {priceEur} €
        </p>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div style={{
      background: 'var(--c2)', borderRadius: 14, padding: 40, textAlign: 'center',
      border: '1px dashed var(--border)',
    }}>
      <p style={{ fontSize: 14, color: 'var(--stone)', margin: '0 0 12px' }}>
        Keine Produkte gefunden mit diesen Filtern.
      </p>
      <Link
        href={"/products" as never}
        style={{ color: 'var(--gold)', fontSize: 13, textDecoration: 'underline' }}
      >
        Alle Produkte zeigen →
      </Link>
    </div>
  )
}
