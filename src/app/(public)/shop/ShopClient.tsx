'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, ShoppingBag } from 'lucide-react'
import { PRODUCT_CATEGORIES_B2C } from '@/lib/constants'

interface ProductItem {
  id: string
  name: string
  slug: string
  price_cents: number
  compare_at_price_cents: number | null
  brand: string | null
  images: { url: string; alt: string }[]
  is_featured: boolean
  product_categories?: { slug: string; name: string } | null
}

interface Props {
  initialProducts: ProductItem[]
}

export default function ShopClient({ initialProducts }: Props) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(20)
  const [hasMore, setHasMore] = useState(initialProducts.length >= 20)

  const doSearch = useCallback(async (q: string, cat: string | null, reset = true) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '20', target: 'b2c' })
    if (q) params.set('q', q)
    if (cat) params.set('category', cat)
    if (!reset) params.set('offset', String(offset))

    try {
      const res = await fetch(`/api/products?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (reset) {
          setProducts(data)
          setOffset(20)
        } else {
          setProducts(prev => [...prev, ...data])
          setOffset(prev => prev + 20)
        }
        setHasMore(data.length >= 20)
      }
    } finally {
      setLoading(false)
    }
  }, [offset])

  function handleCategoryClick(slug: string | null) {
    setCategory(slug)
    doSearch(search, slug, true)
  }

  function handleSearch() {
    doSearch(search, category, true)
  }

  async function handleAddToCart(productId: string) {
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: 1 }),
    })
    if (!res.ok) {
      // Redirect to auth if not logged in
      if (res.status === 401) window.location.href = '/auth'
    }
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginBottom: 4 }}>Shop</h1>
        <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginBottom: 16 }}>Beauty-Produkte von deinem Salon empfohlen</p>

        {/* Search */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--stone)' }} />
            <input
              className="inp"
              placeholder="Produkt suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              style={{ width: '100%', paddingLeft: 36 }}
            />
          </div>
          <button className="bgold" onClick={handleSearch} style={{ padding: '0 16px', fontSize: 13 }}>Suchen</button>
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          <button
            onClick={() => handleCategoryClick(null)}
            className={!category ? 'bgold' : 'boutline'}
            style={{ padding: '6px 14px', fontSize: 11, whiteSpace: 'nowrap' }}
          >
            Alle
          </button>
          {PRODUCT_CATEGORIES_B2C.map(c => (
            <button
              key={c.slug}
              onClick={() => handleCategoryClick(c.slug)}
              className={category === c.slug ? 'bgold' : 'boutline'}
              style={{ padding: '6px 14px', fontSize: 11, whiteSpace: 'nowrap' }}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>

        {/* Product grid */}
        {products.length === 0 && !loading ? (
          <p style={{ color: 'var(--stone)', textAlign: 'center', padding: 40 }}>Keine Produkte gefunden.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {products.map(p => (
              <div key={p.id} style={{ position: 'relative' }}>
                <Link href={`/shop/${p.slug}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {p.images?.[0]?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0].url} alt={p.name} style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: 150, background: 'linear-gradient(135deg, var(--c2), var(--c3))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBag size={32} style={{ color: 'var(--stone)' }} />
                      </div>
                    )}
                    {p.is_featured && (
                      <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, padding: '3px 8px', borderRadius: 20, fontWeight: 700, background: 'linear-gradient(135deg, var(--gold), var(--gold2))', color: '#1a1a2e' }}>
                        EMPFOHLEN
                      </span>
                    )}
                    <div style={{ padding: '10px 12px' }}>
                      {p.brand && <p style={{ fontSize: 10, color: 'var(--stone)', marginBottom: 2 }}>{p.brand}</p>}
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold2)' }}>{(p.price_cents / 100).toFixed(2)} €</span>
                        {p.compare_at_price_cents && p.compare_at_price_cents > p.price_cents && (
                          <span style={{ fontSize: 11, color: 'var(--stone)', textDecoration: 'line-through' }}>{(p.compare_at_price_cents / 100).toFixed(2)} €</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => handleAddToCart(p.id)}
                  style={{
                    position: 'absolute', bottom: 54, right: 8,
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--gold)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  aria-label="In den Warenkorb"
                >
                  <ShoppingBag size={14} color="#1a1a2e" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <button
              className="boutline"
              onClick={() => doSearch(search, category, false)}
              disabled={loading}
              style={{ fontSize: 13, padding: '10px 24px' }}
            >
              {loading ? 'Laden...' : 'Mehr laden'}
            </button>
          </div>
        )}

        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}
