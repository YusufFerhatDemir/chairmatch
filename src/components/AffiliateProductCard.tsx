'use client'

import { ShoppingBag } from 'lucide-react'

export interface AffiliateProductCardData {
  id: string
  product_name: string
  image_url: string | null
  price_cents: number | null
  partner: string
  category: string | null
}

interface Props {
  product: AffiliateProductCardData
  source?: string
}

function fmtEuro(cents: number | null): string {
  if (cents == null) return ''
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

/**
 * Public-facing affiliate product card with black-gold styling.
 * Klick → /api/affiliate/track/:productId (302-Redirect zur Partner-URL)
 */
export default function AffiliateProductCard({ product, source }: Props) {
  const trackUrl = source
    ? `/api/affiliate/track/${product.id}?source=${encodeURIComponent(source)}`
    : `/api/affiliate/track/${product.id}`

  return (
    <a
      href={trackUrl}
      target="_blank"
      rel="nofollow sponsored noopener"
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
          border: '1px solid rgba(176,144,96,0.18)',
          background: 'linear-gradient(180deg, var(--c2), var(--c1))',
          transition: 'transform 0.18s ease, border-color 0.18s ease',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Gold-Akzent-Streifen */}
        <div
          style={{
            height: 2,
            background: 'linear-gradient(90deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)',
          }}
        />

        {/* Bild */}
        <div
          style={{
            width: '100%',
            height: 160,
            background: 'var(--c3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.product_name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
            />
          ) : (
            <ShoppingBag size={36} style={{ color: 'var(--stone)' }} />
          )}
          <span
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              fontSize: 9,
              padding: '3px 8px',
              borderRadius: 12,
              fontWeight: 700,
              background: 'rgba(0,0,0,0.6)',
              color: 'var(--gold2)',
              border: '1px solid rgba(176,144,96,0.4)',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            Anzeige · {product.partner}
          </span>
        </div>

        {/* Inhalt */}
        <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {product.category && (
            <span style={{ fontSize: 10, color: 'var(--stone)', textTransform: 'uppercase', letterSpacing: 1 }}>
              {product.category}
            </span>
          )}
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--cream)',
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 36,
            }}
          >
            {product.product_name}
          </h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 8 }}>
            {product.price_cents != null && (
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold2)' }}>
                {fmtEuro(product.price_cents)}
              </span>
            )}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--gold2)',
                letterSpacing: 0.5,
              }}
            >
              Jetzt ansehen →
            </span>
          </div>
        </div>
      </div>
    </a>
  )
}
