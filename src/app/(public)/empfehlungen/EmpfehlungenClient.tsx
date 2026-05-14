'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import AffiliateProductCard from '@/components/AffiliateProductCard'
import { BackButton } from '@/components/BackButton'
import type { AffiliateProductRow } from './page'

const CATEGORIES = ['Haarpflege', 'Gesichtspflege', 'Make-up', 'Tools'] as const

interface Props {
  products: AffiliateProductRow[]
}

export default function EmpfehlungenClient({ products }: Props) {
  const [activeCat, setActiveCat] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!activeCat) return products
    return products.filter(p => (p.category || '').toLowerCase() === activeCat.toLowerCase())
  }, [products, activeCat])

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <div style={{ marginBottom: 14 }}>
          <BackButton href="/" label="Zurück" />
        </div>
        {/* Hero */}
        <div
          style={{
            padding: '24px 4px 18px',
            textAlign: 'center',
            borderBottom: '1px solid rgba(176,144,96,0.18)',
            marginBottom: 18,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              fontSize: 10,
              letterSpacing: 3,
              color: 'var(--gold2)',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Premium · Kuratiert
          </span>
          <h1
            className="cinzel"
            style={{
              fontSize: 'var(--font-xl)',
              color: 'var(--gold2)',
              margin: 0,
              backgroundImage: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Pflege-Empfehlungen
          </h1>
          <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginTop: 6 }}>
            Premium-Produkte für dein neues Look-Niveau — handverlesen.
          </p>
        </div>

        {/* Kategorien */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 20,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          <button
            onClick={() => setActiveCat(null)}
            className={!activeCat ? 'bgold' : 'boutline'}
            style={{ padding: '6px 14px', fontSize: 11, whiteSpace: 'nowrap' }}
          >
            Alle
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={activeCat === c ? 'bgold' : 'boutline'}
              style={{ padding: '6px 14px', fontSize: 11, whiteSpace: 'nowrap' }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Produktgrid */}
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              border: '1px dashed rgba(176,144,96,0.25)',
              borderRadius: 12,
              background: 'var(--c2)',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🛍️</div>
            <p style={{ color: 'var(--cream)', fontWeight: 600, marginBottom: 4 }}>
              Keine Empfehlungen verfügbar
            </p>
            <p style={{ color: 'var(--stone)', fontSize: 13, marginBottom: 16 }}>
              {activeCat
                ? `Aktuell sind keine Produkte in der Kategorie „${activeCat}" gelistet.`
                : 'Bald gibt es hier kuratierte Pflege-Empfehlungen.'}
            </p>
            <Link href="/" style={{ color: 'var(--gold2)', textDecoration: 'none', fontSize: 13 }}>
              ← Zur Startseite
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 12,
            }}
          >
            {filtered.map(p => (
              <AffiliateProductCard
                key={p.id}
                product={{
                  id: p.id,
                  product_name: p.product_name,
                  image_url: p.image_url,
                  price_cents: p.price_cents,
                  partner: p.partner,
                  category: p.category,
                }}
                source="empfehlungen"
              />
            ))}
          </div>
        )}

        <p
          style={{
            fontSize: 10,
            color: 'var(--stone)',
            textAlign: 'center',
            marginTop: 24,
            lineHeight: 1.5,
          }}
        >
          Diese Empfehlungen enthalten Affiliate-Links. Beim Kauf über einen dieser Links
          erhält ChairMatch eine kleine Provision — dich kostet das nichts extra.
        </p>

        <div style={{ height: 60 }} />
      </div>
    </div>
  )
}
