'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, ChevronLeft, Star } from 'lucide-react'

interface Variant {
  id: string
  name: string
  price_cents: number
  is_active: boolean
}

interface ProductData {
  id: string
  name: string
  slug: string
  description: string | null
  price_cents: number
  compare_at_price_cents: number | null
  brand: string | null
  images: { url: string; alt: string; sort_order: number }[]
  tags: string[]
  is_featured: boolean
  stock_quantity: number
  is_unlimited_stock: boolean
  product_categories?: { slug: string; name: string } | null
  sellers?: { company_name: string | null; seller_type: string } | null
  product_variants?: Variant[]
}

interface Props {
  product: ProductData
}

export default function ProductDetailClient({ product: p }: Props) {
  const variants = (p.product_variants || []).filter(v => v.is_active)
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(variants[0] || null)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)

  const activePrice = selectedVariant?.price_cents || p.price_cents
  const images = p.images?.length > 0 ? p.images : [{ url: '', alt: p.name, sort_order: 0 }]
  const inStock = p.is_unlimited_stock || p.stock_quantity > 0

  async function handleAddToCart() {
    setAdding(true)
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: p.id,
          variantId: selectedVariant?.id || null,
          quantity,
        }),
      })
      if (res.status === 401) {
        window.location.href = '/auth'
        return
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="shell">
      <div className="screen">
        {/* Back */}
        <div style={{ padding: '16px var(--pad) 0' }}>
          <Link href="/shop" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={16} /> Zurück zum Shop
          </Link>
        </div>

        {/* Image */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: 'var(--c2)', overflow: 'hidden' }}>
          {images[imgIdx]?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[imgIdx].url} alt={images[imgIdx].alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={64} style={{ color: 'var(--stone)' }} />
            </div>
          )}
          {p.is_featured && (
            <span style={{ position: 'absolute', top: 12, left: 12, fontSize: 10, padding: '4px 10px', borderRadius: 20, fontWeight: 700, background: 'linear-gradient(135deg, var(--gold), var(--gold2))', color: '#1a1a2e' }}>
              EMPFOHLEN
            </span>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div style={{ display: 'flex', gap: 6, padding: '8px var(--pad)', overflowX: 'auto' }}>
            {images.map((img, i) => (
              <button key={i} onClick={() => setImgIdx(i)} style={{
                width: 48, height: 48, borderRadius: 8, overflow: 'hidden', border: i === imgIdx ? '2px solid var(--gold)' : '1px solid var(--border)',
                padding: 0, background: 'none', cursor: 'pointer', flexShrink: 0,
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {img.url && <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </button>
            ))}
          </div>
        )}

        {/* Details */}
        <div style={{ padding: '16px var(--pad)' }}>
          {p.brand && <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 4 }}>{p.brand}</p>}
          <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>{p.name}</h1>

          {p.product_categories && (
            <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'var(--c3)', color: 'var(--stone)', marginBottom: 12, display: 'inline-block' }}>
              {p.product_categories.name}
            </span>
          )}

          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--gold2)' }}>{(activePrice / 100).toFixed(2)} €</span>
            {p.compare_at_price_cents && p.compare_at_price_cents > activePrice && (
              <>
                <span style={{ fontSize: 14, color: 'var(--stone)', textDecoration: 'line-through' }}>{(p.compare_at_price_cents / 100).toFixed(2)} €</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#3a2a1a', color: '#e8a84b', fontWeight: 700 }}>
                  -{Math.round((1 - activePrice / p.compare_at_price_cents) * 100)}%
                </span>
              </>
            )}
          </div>

          {/* Variants */}
          {variants.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 6 }}>Variante</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {variants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={selectedVariant?.id === v.id ? 'bgold' : 'boutline'}
                    style={{ padding: '6px 14px', fontSize: 12 }}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Add to cart */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--btn-radius)' }}>
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ width: 36, height: 36, background: 'none', border: 'none', color: 'var(--cream)', cursor: 'pointer', fontSize: 18 }}>-</button>
              <span style={{ width: 32, textAlign: 'center', color: 'var(--cream)', fontSize: 14 }}>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} style={{ width: 36, height: 36, background: 'none', border: 'none', color: 'var(--cream)', cursor: 'pointer', fontSize: 18 }}>+</button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={adding || !inStock}
              className="bgold"
              style={{ flex: 1, padding: '12px 0', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <ShoppingBag size={16} />
              {!inStock ? 'Ausverkauft' : adding ? 'Wird hinzugefügt...' : 'In den Warenkorb'}
            </button>
          </div>

          {/* Description */}
          {p.description && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>Beschreibung</h3>
              <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.description}</p>
            </div>
          )}

          {/* Tags */}
          {p.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {p.tags.map(t => (
                <span key={t} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'var(--c3)', color: 'var(--stone)' }}>#{t}</span>
              ))}
            </div>
          )}

          {/* Seller */}
          {p.sellers && (
            <div style={{ padding: '12px 14px', background: 'var(--c2)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Star size={16} style={{ color: 'var(--gold)' }} />
              <div>
                <p style={{ fontSize: 12, color: 'var(--cream)', fontWeight: 600 }}>
                  Verkäufer: {p.sellers.company_name || 'Salon'}
                </p>
                <p style={{ fontSize: 10, color: 'var(--stone)' }}>
                  {p.sellers.seller_type === 'salon' ? 'Salon-Shop' : p.sellers.seller_type === 'grosshaendler' ? 'Großhändler' : 'Affiliate'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}
