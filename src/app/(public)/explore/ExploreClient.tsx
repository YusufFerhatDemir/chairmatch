'use client'

import { useState, useEffect } from 'react'
import { PROVS } from '@/lib/demo-data'
import { haversine, formatDistance, requestUserLocation } from '@/lib/geo'

interface Salon {
  id: string
  name: string
  slug: string | null
  description: string | null
  city: string | null
  avg_rating: number
  services: { id: string; name: string }[]
}

type SortMode = 'rating' | 'nearest'

export default function ExploreClient({ salons: dbSalons }: { salons: Salon[] }) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('rating')

  useEffect(() => {
    const saved = localStorage.getItem('cm_user_location')
    if (saved) {
      try { setUserLocation(JSON.parse(saved)) } catch {}
    } else {
      requestUserLocation().then(loc => {
        if (loc) {
          setUserLocation(loc)
          localStorage.setItem('cm_user_location', JSON.stringify(loc))
        }
      })
    }
  }, [])

  // Merge DB salons with demo data for display
  const allSalons = dbSalons.length > 0
    ? dbSalons.map(s => {
        const demo = PROVS.find(p => p.nm.toLowerCase() === s.name.toLowerCase())
        return { ...s, lat: demo?.lat || 0, lng: demo?.lng || 0 }
      })
    : PROVS.map(p => ({
        id: p.id, name: p.nm, slug: p.id, description: p.tl,
        city: p.city, avg_rating: p.rt, services: p.svs.map(sv => ({ id: sv.id, name: sv.nm })),
        lat: p.lat, lng: p.lng,
      }))

  // Calculate distances
  const salonsWithDist = allSalons.map(s => ({
    ...s,
    dist: userLocation && s.lat ? haversine(userLocation.lat, userLocation.lng, s.lat, s.lng) : null,
  }))

  // Sort
  const sorted = [...salonsWithDist].sort((a, b) => {
    if (sortMode === 'nearest' && a.dist !== null && b.dist !== null) return a.dist - b.dist
    return b.avg_rating - a.avg_rating
  })

  const cities = [...new Set(allSalons.map(s => s.city).filter(Boolean))]

  return (
    <div className="shell">
      <div className="screen">
        <div className="sticky">
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)' }}>
            Entdecken
          </h1>
        </div>

        <section style={{ padding: '0 var(--pad)' }}>
          {/* City filter chips + Sort toggle */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, alignItems: 'center' }}>
            <a href="/explore" className="badge badge-gold">Alle</a>
            {cities.map(city => (
              <a key={city} href={`/search?city=${city}`} className="badge badge-gold" style={{ opacity: 0.7 }}>
                {city}
              </a>
            ))}
          </div>

          {/* Sort options */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              onClick={() => setSortMode('rating')}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: sortMode === 'rating' ? 'var(--gold)' : 'var(--c3)',
                color: sortMode === 'rating' ? '#080706' : 'var(--stone)',
                border: 'none',
              }}
            >
              Beste Bewertung
            </button>
            <button
              onClick={() => setSortMode('nearest')}
              disabled={!userLocation}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: userLocation ? 'pointer' : 'default',
                background: sortMode === 'nearest' ? 'var(--gold)' : 'var(--c3)',
                color: sortMode === 'nearest' ? '#080706' : 'var(--stone)',
                border: 'none',
                opacity: userLocation ? 1 : 0.4,
              }}
            >
              Nächste zuerst
            </button>
          </div>

          {/* Salon list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sorted.map(s => (
              <a key={s.id} href={`/salon/${s.slug || s.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: 'var(--c3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 700, color: 'var(--cream)', flexShrink: 0,
                  }}>
                    {s.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-md)', color: 'var(--cream)' }}>{s.name}</div>
                    <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginTop: 2 }}>{s.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 'var(--font-sm)', color: 'var(--gold)' }}>★ {Number(s.avg_rating).toFixed(1)}</span>
                      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--stone2)' }}>{s.city}</span>
                      {s.dist !== null && (
                        <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, background: 'rgba(74,138,90,.1)', color: '#6ABF80', fontWeight: 700 }}>
                          {formatDistance(s.dist)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
