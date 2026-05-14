import { ImageResponse } from 'next/og'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const alt = 'Stuhlplatz auf ChairMatch'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props { params: { slug: string } }

interface ListingShape {
  name: string
  price_cents: number
  salon_id: string
  category: string | null
}

async function load(slug: string) {
  try {
    const supabase = getSupabaseAdmin()
    let listing: ListingShape | null = null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bySlugRes: any = await (supabase as any)
      .from('services')
      .select('name, price_cents, salon_id, category')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle()
    listing = (bySlugRes?.data as ListingShape) || null

    if (!listing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const byIdRes: any = await (supabase as any)
        .from('services')
        .select('name, price_cents, salon_id, category')
        .eq('id', slug)
        .limit(1)
        .maybeSingle()
      listing = (byIdRes?.data as ListingShape) || null
    }
    if (!listing) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const salonRes: any = await (supabase as any)
      .from('salons')
      .select('name, city')
      .eq('id', listing.salon_id)
      .limit(1)
      .maybeSingle()
    const salon = salonRes?.data as { name?: string; city?: string } | null

    return {
      name: listing.name,
      priceEur: Math.round(listing.price_cents / 100),
      category: listing.category || 'Stuhlplatz',
      salonName: salon?.name || 'Salon',
      city: salon?.city || 'Deutschland',
    }
  } catch {
    return null
  }
}

export default async function Image({ params }: Props) {
  const data = await load(params.slug)
  const fallback = !data

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(135deg, #0a0907, #1a1612 50%, #2a2018)',
        color: '#f4ead5', padding: 80,
        fontFamily: 'system-ui, sans-serif',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }} />

        <div style={{ fontSize: 26, color: '#d4af37', fontWeight: 700, marginBottom: 36, display: 'flex' }}>
          ChairMatch
        </div>

        <div style={{ fontSize: 22, color: '#9a8c78', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, display: 'flex' }}>
          {fallback ? 'Stuhlplatz' : `${data!.category} · ${data!.city}`}
        </div>

        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, marginBottom: 16, maxWidth: 1040, display: 'flex' }}>
          {fallback ? 'Stuhlplatz mieten' : (data!.name.length > 40 ? data!.name.slice(0, 37) + '…' : data!.name)}
        </div>

        {!fallback && (
          <>
            <div style={{ fontSize: 28, color: '#9a8c78', marginBottom: 28, display: 'flex' }}>
              bei {data!.salonName}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div style={{ fontSize: 96, fontWeight: 900, color: '#d4af37', display: 'flex' }}>
                {data!.priceEur} €
              </div>
              <div style={{ fontSize: 32, color: '#9a8c78', display: 'flex' }}>/ Tag</div>
            </div>
          </>
        )}

        <div style={{ position: 'absolute', bottom: 40, left: 80, right: 80, display: 'flex', justifyContent: 'space-between', fontSize: 18, color: '#9a8c78' }}>
          <div style={{ display: 'flex' }}>chairmatch.de</div>
          <div style={{ display: 'flex' }}>Verifizierte Anbieter · Sichere Zahlung</div>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }} />
      </div>
    ),
    size,
  )
}
