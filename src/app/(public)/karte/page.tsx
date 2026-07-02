export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { cityToCoords } from '@/lib/geo/city-coords'
import RentalsMap, { type MapListing } from '@/components/RentalsMap'

export const metadata: Metadata = {
  title: 'Stuhl-Karte: Verfügbare Plätze in Echtzeit',
  description:
    'Alle verfügbaren Friseurstühle, Kosmetik-Kabinen und Behandlungsräume auf einer interaktiven Karte — mit Tagespreis direkt am Pin. Finde freie Plätze in deiner Nähe.',
  keywords: 'stuhlmiete karte, friseurstuhl in der nähe, salonplatz karte, beauty workspace map',
  alternates: { canonical: 'https://www.chairmatch.de/karte' },
  openGraph: {
    title: 'Stuhl-Karte: Verfügbare Plätze in Echtzeit | ChairMatch',
    description: 'Interaktive Karte aller verfügbaren Stühle, Kabinen und Räume — Tagespreis direkt am Pin.',
    url: 'https://www.chairmatch.de/karte',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
  },
}

interface RentalRow {
  id: string
  name: string | null
  type: string
  price_per_day_cents: number | null
  salon: {
    name: string
    slug: string | null
    city: string | null
    avg_rating: number | null
    is_verified: boolean | null
  } | null
}

const DEMO_LISTINGS: MapListing[] = [
  { id: 'demo-b', name: 'Friseurstuhl Mitte', type: 'stuhl', priceDayCents: 4500, city: 'Berlin', lat: 52.5233, lng: 13.4127, salonName: 'Beispiel-Salon', salonSlug: null, verified: true, rating: 4.8, beispiel: true },
  { id: 'demo-h', name: 'Kosmetik-Kabine', type: 'raum', priceDayCents: 5500, city: 'Hamburg', lat: 53.5511, lng: 9.9937, salonName: 'Beispiel-Studio', salonSlug: null, verified: true, rating: 4.9, beispiel: true },
  { id: 'demo-m', name: 'Barber-Stuhl Glockenbach', type: 'stuhl', priceDayCents: 6500, city: 'München', lat: 48.1351, lng: 11.582, salonName: 'Beispiel-Barbershop', salonSlug: null, verified: false, rating: 4.7, beispiel: true },
]

const FILTERS = [
  { key: 'stuhl', label: 'Stühle' },
  { key: 'liege', label: 'Liegen' },
  { key: 'raum', label: 'Räume' },
  { key: 'opraum', label: 'OP-Räume' },
]

interface Props {
  searchParams: Promise<{ type?: string }>
}

export default async function KartePage({ searchParams }: Props) {
  const { type: filterType } = await searchParams

  let listings: MapListing[] = []
  let ohnePosition = 0
  let demo = false

  try {
    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('rental_equipment')
      .select('id, name, type, price_per_day_cents, salon:salons(name, slug, city, avg_rating, is_verified)')
      .eq('is_available', true)
      .limit(1000)

    if (filterType && FILTERS.some(f => f.key === filterType)) {
      query = query.eq('type', filterType)
    }

    const { data, error } = await query
    if (error) throw error

    for (const row of (data ?? []) as unknown as RentalRow[]) {
      const coords = cityToCoords(row.salon?.city ?? null)
      if (!coords) {
        ohnePosition++
        continue
      }
      listings.push({
        id: row.id,
        name: row.name,
        type: row.type,
        priceDayCents: row.price_per_day_cents,
        city: row.salon?.city ?? null,
        lat: coords.lat,
        lng: coords.lng,
        salonName: row.salon?.name ?? null,
        salonSlug: row.salon?.slug ?? null,
        verified: row.salon?.is_verified ?? false,
        rating: row.salon?.avg_rating ?? null,
      })
    }
  } catch {
    // DB nicht erreichbar — unten Demo-Fallback
  }

  if (listings.length === 0) {
    listings = filterType ? DEMO_LISTINGS.filter(d => d.type === filterType) : DEMO_LISTINGS
    demo = true
  }

  return (
    <div className="shell">
      <div className="screen">
        <div style={{ padding: '0 var(--pad)' }}>
          <Link href="/rentals" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
            &larr; Listenansicht
          </Link>
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginTop: 8 }}>
            Stuhl-Karte
          </h1>
          <p style={{ color: 'var(--cream)', fontSize: 'var(--font-sm)', marginTop: 8, lineHeight: 1.45 }}>
            Alle verfügbaren Plätze auf einen Blick — Tagespreis direkt am Pin. Tippe auf einen Pin für Details.
          </p>

          <div style={{ display: 'flex', gap: 6, marginTop: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {FILTERS.map(f => {
              const isActive = filterType === f.key
              return (
                <a
                  key={f.key}
                  href={isActive ? '/karte' : `/karte?type=${f.key}`}
                  className={isActive ? 'bgold' : 'boutline'}
                  style={{ padding: '8px 16px', fontSize: 12, whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block', borderRadius: 20 }}
                >
                  {f.label}
                </a>
              )
            })}
          </div>

          {demo && (
            <p style={{ color: 'var(--stone)', fontSize: 12, marginTop: 10, background: 'var(--c1)', borderRadius: 10, padding: '8px 12px' }}>
              Gerade keine Live-Inserate mit Kartenposition — du siehst Beispiel-Pins.
              Alle echten Angebote findest du in der <Link href="/rentals" style={{ color: 'var(--gold2)' }}>Listenansicht</Link>.
            </p>
          )}
        </div>

        <section style={{ padding: '14px var(--pad) 8px' }}>
          <RentalsMap listings={listings} />
          {ohnePosition > 0 && (
            <p style={{ color: 'var(--stone)', fontSize: 12, marginTop: 8 }}>
              +{ohnePosition} weitere Inserate ohne Kartenposition — siehe{' '}
              <Link href="/rentals" style={{ color: 'var(--gold2)' }}>Listenansicht</Link>.
            </p>
          )}
        </section>

        <section style={{ padding: '8px var(--pad) 40px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <span style={{ color: 'var(--stone)', fontSize: 12 }}>
            <span style={{ display: 'inline-block', width: 26, textAlign: 'center', background: 'linear-gradient(135deg,#BF953F,#FCF6BA 50%,#B38728)', color: '#1a1000', borderRadius: 10, fontWeight: 700, fontSize: 10, padding: '2px 0', marginRight: 6 }}>€</span>
            Pin = Tagespreis
          </span>
          <Link href="/rentals" style={{ color: 'var(--gold2)', fontSize: 12, textDecoration: 'none' }}>
            Zur Listenansicht →
          </Link>
          <Link href="/match" style={{ color: 'var(--gold2)', fontSize: 12, textDecoration: 'none' }}>
            ✨ Match-Finder starten →
          </Link>
        </section>
      </div>
    </div>
  )
}
