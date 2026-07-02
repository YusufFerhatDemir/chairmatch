'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export interface MapListing {
  id: string
  name: string | null
  type: string
  priceDayCents: number | null
  city: string | null
  lat: number
  lng: number
  salonName: string | null
  salonSlug: string | null
  verified: boolean
  rating: number | null
  beispiel?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  stuhl: 'Stuhl', liege: 'Liege', raum: 'Raum', opraum: 'OP-Raum',
}

const eur = (cents: number) => new Intl.NumberFormat('de-DE', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
}).format(cents / 100)

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Gleiche Stadt = gleicher Zentroid → Pins deterministisch im Kreis verteilen. */
function spread(listings: MapListing[]): MapListing[] {
  const byCoord = new Map<string, MapListing[]>()
  for (const l of listings) {
    const key = `${l.lat.toFixed(3)},${l.lng.toFixed(3)}`
    const arr = byCoord.get(key) ?? []
    arr.push(l)
    byCoord.set(key, arr)
  }
  const out: MapListing[] = []
  for (const group of byCoord.values()) {
    if (group.length === 1) {
      out.push(group[0])
      continue
    }
    group.forEach((l, i) => {
      const angle = (2 * Math.PI * i) / group.length
      const radius = 0.004 * (1 + Math.floor(i / 12))
      out.push({ ...l, lat: l.lat + radius * Math.cos(angle), lng: l.lng + radius * Math.sin(angle) })
    })
  }
  return out
}

export default function RentalsMap({ listings }: { listings: MapListing[] }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let disposed = false
    // Leaflet greift auf window zu — darf nur im Browser geladen werden
    let map: import('leaflet').Map | null = null

    import('leaflet').then((L) => {
      if (disposed || !containerRef.current) return

      map = L.map(containerRef.current, { scrollWheelZoom: true })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map)

      const placed = spread(listings)
      const bounds: Array<[number, number]> = []

      for (const l of placed) {
        const priceLabel = l.priceDayCents ? eur(l.priceDayCents) : '€ ?'
        const icon = L.divIcon({
          className: '',
          html: `<div style="
            background: linear-gradient(135deg,#BF953F,#FCF6BA 50%,#B38728);
            color:#1a1000;font-weight:700;font-size:12px;
            padding:4px 10px;border-radius:14px;white-space:nowrap;
            box-shadow:0 2px 8px rgba(0,0,0,0.45);border:1px solid #8a6a2a;
            ${l.beispiel ? 'opacity:0.75;' : ''}">${priceLabel}</div>`,
          iconSize: undefined,
          iconAnchor: [24, 14],
        })

        const name = escapeHtml(l.name || TYPE_LABELS[l.type] || 'Arbeitsplatz')
        const salon = l.salonName ? escapeHtml(l.salonName) : ''
        const stars = l.rating ? `★ ${l.rating.toFixed(1)}` : ''
        const popupHtml = `
          <div style="font-family:inherit;min-width:180px">
            <strong>${name}</strong>${l.beispiel ? ' <em style="font-size:11px">(Beispiel)</em>' : ''}<br/>
            <span style="font-size:12px;color:#555">
              ${TYPE_LABELS[l.type] || escapeHtml(l.type)}${salon ? ' · ' + salon : ''}${l.city ? ' · ' + escapeHtml(l.city) : ''}
            </span><br/>
            <span style="font-size:12px;color:#8a6a2a">
              ${l.priceDayCents ? eur(l.priceDayCents) + ' / Tag' : 'Preis auf Anfrage'}
              ${stars ? ' · ' + stars : ''}${l.verified ? ' · ✓ verifiziert' : ''}
            </span><br/>
            ${l.beispiel ? '' : `<a href="/inserat/${l.id}" style="font-size:12px;font-weight:700">Details ansehen →</a>`}
          </div>`

        L.marker([l.lat, l.lng], { icon }).addTo(map!).bindPopup(popupHtml)
        bounds.push([l.lat, l.lng])
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
      } else {
        map.setView([51.163, 10.447], 6) // Deutschland-Mitte
      }
    })

    return () => {
      disposed = true
      map?.remove()
    }
  }, [listings])

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        style={{
          height: 'min(520px, 60vh)',
          borderRadius: 16,
          border: '1px solid rgba(196,168,106,0.25)',
          overflow: 'hidden',
          background: '#e8e4dc',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute', top: 12, right: 12, zIndex: 500,
          background: 'rgba(10,9,7,0.85)', border: '1px solid rgba(196,168,106,0.4)',
          borderRadius: 20, padding: '6px 14px', color: 'var(--gold2, #C4A86A)',
          fontSize: 12, fontWeight: 700, pointerEvents: 'none',
        }}
      >
        {listings.length} verfügbare Plätze
      </div>
    </div>
  )
}
