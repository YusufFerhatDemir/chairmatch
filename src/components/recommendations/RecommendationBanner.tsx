'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ShoppingBag, X } from 'lucide-react'

interface Recommendation {
  id: string
  message: string | null
  products: {
    id: string
    name: string
    slug: string
    price_cents: number
    images: { url: string }[]
    brand: string | null
  } | null
  staff: {
    name: string
    title: string | null
  } | null
}

export function RecommendationBanner() {
  const { data: session } = useSession()
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!session?.user) return
    fetch('/api/recommendations')
      .then(r => r.ok ? r.json() : [])
      .then(d => setRecs(d))
      .catch(() => {})
  }, [session?.user])

  if (dismissed || recs.length === 0) return null

  async function markViewed(id: string) {
    await fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'view', recommendationId: id }),
    }).catch(() => {})
  }

  async function handleAddToCart(productId: string, recId: string) {
    markViewed(recId)
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: 1 }),
    })
    if (res.ok) {
      setRecs(prev => prev.filter(r => r.id !== recId))
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, color: 'var(--cream)' }}>
          Dein Spezialist empfiehlt
        </h3>
        <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', color: 'var(--stone)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {recs.map(rec => {
          const product = rec.products
          if (!product) return null
          return (
            <div key={rec.id} style={{ minWidth: 200, maxWidth: 220, flexShrink: 0 }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {product.images?.[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.images[0].url} alt={product.name} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: 120, background: 'var(--c3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingBag size={28} style={{ color: 'var(--stone)' }} />
                  </div>
                )}
                <div style={{ padding: '10px 12px' }}>
                  {rec.staff && (
                    <p style={{ fontSize: 10, color: 'var(--gold)', marginBottom: 4 }}>
                      Empfohlen von {rec.staff.name}
                    </p>
                  )}
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                  {product.brand && <p style={{ fontSize: 10, color: 'var(--stone)' }}>{product.brand}</p>}
                  {rec.message && <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 4, fontStyle: 'italic' }}>&ldquo;{rec.message}&rdquo;</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold2)' }}>{(product.price_cents / 100).toFixed(2)} €</span>
                    <button
                      onClick={() => handleAddToCart(product.id, rec.id)}
                      className="bgold"
                      style={{ padding: '6px 12px', fontSize: 11 }}
                    >
                      Bestellen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
