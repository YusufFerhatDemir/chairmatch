/**
 * Dynamische OG-Image für Salon-Detail-Pages.
 * Zeigt Salon-Name, Stadt, Kategorie + Bewertung.
 */

import { ImageResponse } from 'next/og'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { PROVS } from '@/lib/demo-data'

export const runtime = 'nodejs' // Supabase admin braucht Node
export const alt = 'Salon auf ChairMatch'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props {
  params: { slug: string }
}

interface SalonOgData {
  name: string
  city: string
  category: string
  rating: number | null
  reviewCount: number | null
}

async function load(slug: string): Promise<SalonOgData> {
  // Demo-Salons
  const demo = PROVS.find(p => p.id === slug)
  if (demo) {
    return {
      name: demo.nm,
      city: demo.city,
      category: demo.cat,
      rating: demo.rt,
      reviewCount: demo.rc,
    }
  }
  // DB
  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('salons')
      .select('name, city, category, avg_rating, review_count')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle()
    if (data) {
      return {
        name: data.name || 'Salon',
        city: data.city || 'Deutschland',
        category: data.category || 'Beauty',
        rating: data.avg_rating ?? null,
        reviewCount: data.review_count ?? null,
      }
    }
  } catch {
    // fallthrough
  }
  return { name: 'Salon', city: 'Deutschland', category: 'Beauty', rating: null, reviewCount: null }
}

export default async function Image({ params }: Props) {
  const data = await load(params.slug)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a0907 0%, #1a1612 50%, #2a2018 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#f4ead5',
          padding: 80,
          position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 8,
          background: 'linear-gradient(90deg, transparent, #d4af37 50%, transparent)',
        }} />

        {/* Brand small */}
        <div style={{
          fontSize: 26,
          color: '#d4af37',
          fontWeight: 700,
          letterSpacing: -0.5,
          marginBottom: 40,
          display: 'flex',
        }}>
          ChairMatch
        </div>

        {/* Category badge */}
        <div style={{
          fontSize: 22,
          color: '#9a8c78',
          textTransform: 'uppercase',
          letterSpacing: 2,
          marginBottom: 12,
          display: 'flex',
        }}>
          {data.category} · {data.city}
        </div>

        {/* Salon-Name */}
        <div style={{
          fontSize: 78,
          fontWeight: 800,
          color: '#f4ead5',
          lineHeight: 1.05,
          marginBottom: 24,
          maxWidth: 1040,
          display: 'flex',
        }}>
          {data.name.length > 36 ? data.name.slice(0, 33) + '…' : data.name}
        </div>

        {/* Rating */}
        {data.rating && data.reviewCount ? (
          <div style={{
            fontSize: 28,
            color: '#d4af37',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            ★ {data.rating.toFixed(1)}
            <span style={{ color: '#9a8c78', fontSize: 22 }}>
              ({data.reviewCount} Bewertungen)
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 22, color: '#9a8c78', display: 'flex' }}>
            Termin online buchen · ohne Telefonstress
          </div>
        )}

        {/* Bottom */}
        <div style={{
          position: 'absolute',
          bottom: 40, left: 80, right: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 18,
          color: '#9a8c78',
        }}>
          <div style={{ display: 'flex' }}>chairmatch.de/salon/{params.slug}</div>
          <div style={{ display: 'flex' }}>Verifiziert · Sichere Zahlung</div>
        </div>

        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: 8,
          background: 'linear-gradient(90deg, transparent, #d4af37 50%, transparent)',
        }} />
      </div>
    ),
    size
  )
}
