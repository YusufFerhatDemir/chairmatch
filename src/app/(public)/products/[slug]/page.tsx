/**
 * /products/[slug] — Produkt-Detail-Page mit Schema.org Product+Offer.
 *
 * Conversion-Optimiert: Hauptbild, Preis, In-Stock-Badge, Anbieter,
 * "In Warenkorb"-CTA (Cart-API existiert), B2B-Hinweis wenn relevant.
 */

export const revalidate = 600 // 10 Min ISR

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { breadcrumbSchema } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { AddToCartButton } from './AddToCartButton'

interface Props {
  params: Promise<{ slug: string }>
}

interface ProductDetail {
  id: string
  slug: string | null
  name: string
  brand: string | null
  description: string | null
  price_cents: number
  currency: string | null
  images: string[] | null
  target: 'b2c' | 'b2b' | 'both' | null
  stock_quantity: number | null
  category_id: string | null
  seller_id: string | null
  salon_id: string | null
  is_active: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  product_categories?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sellers?: any
}

async function loadProduct(slug: string): Promise<ProductDetail | null> {
  try {
    const supabase = getSupabaseAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bySlug } = await (supabase as any)
      .from('products')
      .select('*, product_categories(slug, name), sellers(company_name, seller_type, salon_id)')
      .eq('slug', slug)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    if (bySlug) return bySlug as ProductDetail

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: byId } = await (supabase as any)
      .from('products')
      .select('*, product_categories(slug, name), sellers(company_name, seller_type, salon_id)')
      .eq('id', slug)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    return byId as ProductDetail | null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await loadProduct(slug)

  if (!product) {
    return { title: 'Produkt nicht gefunden — ChairMatch', robots: { index: false, follow: true } }
  }

  const priceEur = (product.price_cents / 100).toFixed(2)
  const brand = product.brand || ''
  const title = `${product.name}${brand ? ` von ${brand}` : ''} — ${priceEur} € | ChairMatch`

  return {
    title,
    description: product.description?.slice(0, 155) || `${product.name} jetzt online kaufen bei ChairMatch. ${priceEur} € — verifizierter Anbieter, sichere Zahlung.`,
    keywords: [product.name, product.brand, product.product_categories?.name, 'kaufen', 'ChairMatch'].filter(Boolean).join(', '),
    alternates: { canonical: `https://chairmatch.de/products/${slug}` },
    openGraph: {
      title,
      description: product.description?.slice(0, 200) || product.name,
      url: `https://chairmatch.de/products/${slug}`,
      type: 'website',
      locale: 'de_DE',
      siteName: 'ChairMatch',
      images: product.images?.[0] ? [{ url: product.images[0] }] : undefined,
    },
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const product = await loadProduct(slug)

  if (!product) notFound()

  const priceEur = product.price_cents / 100
  const image = product.images?.[0]
  const inStock = (product.stock_quantity ?? 0) > 0 || product.stock_quantity === null

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `https://chairmatch.de/products/${slug}#product`,
    name: product.name,
    description: product.description || `${product.name} bei ChairMatch.`,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    image: product.images || undefined,
    category: product.product_categories?.name,
    offers: {
      '@type': 'Offer',
      url: `https://chairmatch.de/products/${slug}`,
      priceCurrency: product.currency || 'EUR',
      price: priceEur.toFixed(2),
      availability: `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`,
      seller: {
        '@type': 'Organization',
        name: product.sellers?.company_name || 'ChairMatch',
      },
    },
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
            { name: 'Start', url: '/' },
            { name: 'Produkte', url: '/products' },
            { name: product.name, url: `/products/${slug}` },
          ])) }}
        />

        <Breadcrumbs items={[
          { name: 'Produkte', url: '/products' },
          { name: product.name, url: `/products/${slug}` },
        ]} />

        {/* HERO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
          {/* Hauptbild */}
          <div style={{
            aspectRatio: '1/1',
            borderRadius: 14,
            overflow: 'hidden',
            background: image
              ? `url(${image}) center/cover`
              : 'linear-gradient(135deg, var(--c2), var(--c3))',
            border: '1px solid var(--border)',
            position: 'relative',
          }}>
            {product.target === 'b2b' && (
              <span style={{
                position: 'absolute', top: 12, right: 12,
                background: 'rgba(0,0,0,0.7)', color: 'var(--gold2)',
                fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
              }}>
                NUR FÜR PROFIS (B2B)
              </span>
            )}
          </div>

          {/* Info */}
          <div>
            {product.brand && (
              <p style={{ fontSize: 11, color: 'var(--gold2)', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px' }}>
                {product.brand}
              </p>
            )}
            <h1 className="cinzel" style={{
              fontSize: 24, fontWeight: 700, color: 'var(--cream)',
              margin: '0 0 8px', lineHeight: 1.2,
            }}>
              {product.name}
            </h1>
            {product.product_categories?.name && (
              <p style={{ fontSize: 12, color: 'var(--stone)', margin: '0 0 14px' }}>
                Kategorie: {product.product_categories.name}
              </p>
            )}

            {/* Preis-Card */}
            <section style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(176,144,96,0.04))',
              border: '2px solid var(--gold)',
              borderRadius: 14, padding: 18, marginBottom: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--gold2)' }}>
                  {priceEur.toFixed(2)} €
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                  background: inStock ? 'rgba(74,138,90,0.18)' : 'rgba(232,80,64,0.14)',
                  color: inStock ? 'var(--green)' : 'var(--red)',
                }}>
                  {inStock ? '✓ Sofort verfügbar' : '✗ Ausverkauft'}
                </span>
              </div>
              <AddToCartButton
                productId={product.id}
                inStock={inStock}
                productSlug={slug}
              />
              <p style={{ fontSize: 10, color: 'var(--stone2)', margin: '8px 0 0', textAlign: 'center' }}>
                Sichere Zahlung über Stripe · Versand 1-3 Werktage
              </p>
            </section>
          </div>
        </div>

        {/* Beschreibung */}
        {product.description && (
          <section style={{ marginBottom: 20 }}>
            <h2 className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 10 }}>
              Beschreibung
            </h2>
            <p style={{ color: 'var(--cream)', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {product.description}
            </p>
          </section>
        )}

        {/* Anbieter */}
        {product.sellers?.company_name && (
          <section style={{
            background: 'var(--c2)', borderRadius: 12, padding: 16, marginBottom: 20,
            border: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: 11, color: 'var(--stone)', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
              Verkäufer
            </p>
            <p style={{ fontSize: 14, color: 'var(--cream)', fontWeight: 600, margin: '4px 0' }}>
              {product.sellers.company_name}
            </p>
            <p style={{ fontSize: 11, color: 'var(--stone)', margin: 0 }}>
              {product.sellers.seller_type === 'salon' ? 'Verifizierter Salon' : 'Verifizierter Händler'} · ChairMatch
            </p>
          </section>
        )}

        {/* Trust */}
        <section style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
          <TrustRow icon="✓" text="Verifizierter Verkäufer (Gewerbeschein geprüft)" />
          <TrustRow icon="✓" text="Stripe-gesicherte Zahlung" />
          <TrustRow icon="✓" text="14-Tage-Rückgabe-Garantie nach EU-Recht" />
          <TrustRow icon="✓" text="Versand aus Deutschland" />
        </section>

        <p style={{ fontSize: 10, color: 'var(--stone2)', textAlign: 'center' }}>
          Alle Preise inkl. MwSt. (sofern nicht Kleinunternehmer §19 UStG)
        </p>
      </div>
    </div>
  )
}

function TrustRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--stone)' }}>
      <span style={{ color: 'var(--green)' }}>{icon}</span> {text}
    </div>
  )
}
