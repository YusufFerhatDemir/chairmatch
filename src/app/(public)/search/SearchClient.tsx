'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PROVS } from '@/lib/demo-data'
import { haversine, formatDistance, requestUserLocation, geocodeCity } from '@/lib/geo'
import { sortSalons } from '@/lib/search-sort'
import { LadefehlerHinweis } from '@/components/LadefehlerHinweis'

interface Salon {
  id: string
  name: string
  slug: string | null
  city: string | null
  avg_rating: number
  category?: string | null
  /** Naeherungskoordinaten, serverseitig aus dem Stadtnamen bestimmt. */
  lat?: number | null
  lng?: number | null
}

type SortMode = 'rating' | 'nearest'

const CITIES = ['Frankfurt', 'Berlin', 'München', 'Hamburg', 'Köln', 'Düsseldorf', 'Stuttgart']

export default function SearchClient({
  salons,
  initialQ,
  initialCity,
  initialPlz,
  ladeFehler = false,
}: {
  salons: Salon[]
  initialQ: string
  initialCity: string
  initialPlz: string
  ladeFehler?: boolean
}) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('rating')
  const [plzInput, setPlzInput] = useState(initialPlz)
  const [plzLocation, setPlzLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [plzLoading, setPlzLoading] = useState(false)

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

  // PLZ geocoding on mount if initialPlz provided
  useEffect(() => {
    if (initialPlz) {
      handlePlzSearch(initialPlz)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handlePlzSearch(plz?: string) {
    const q = plz || plzInput
    if (!q || q.length < 4) return
    setPlzLoading(true)
    const loc = await geocodeCity(q)
    setPlzLoading(false)
    if (loc) {
      setPlzLocation(loc)
      setSortMode('nearest')
    }
  }

  // Use PLZ location or user location for distance
  const refLocation = plzLocation || userLocation

  /*
   * Die Koordinaten kommen jetzt vom Server (Naeherung ueber den Stadtnamen,
   * siehe search/page.tsx). `PROVS` bleibt als Rueckfall fuer Zeilen ohne
   * Stadt stehen — vorher war es die EINZIGE Quelle, weshalb jeder echte
   * Salon `dist = null` hatte und in der Umkreissortierung gar nicht vorkam.
   */
  const salonsWithGeo = salons.map(s => {
    const demo =
      s.lat == null
        ? PROVS.find(p => p.id === s.id || p.nm.toLowerCase() === s.name.toLowerCase())
        : undefined
    const lat = s.lat ?? demo?.lat ?? 0
    const lng = s.lng ?? demo?.lng ?? 0
    const dist = refLocation && lat ? haversine(refLocation.lat, refLocation.lng, lat, lng) : null
    return { ...s, lat, lng, dist }
  })

  // Sortierung: Eintraege OHNE Entfernung ans Ende, nicht dazwischen.
  // Warum das ein echter Fehler war, steht in lib/search-sort.ts.
  const sorted = sortSalons(salonsWithGeo, sortMode)

  const title = initialQ ? `Suche: "${initialQ}"` : initialCity ? `Salons in ${initialCity}` : 'Suche'

  return (
    <div className="shell">
      <div className="screen">
        <div className="sticky">
          <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
            &larr; Zur&uuml;ck
          </Link>
          <h1 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginTop: 8 }}>
            {title}
          </h1>

          <form action="/search" method="GET" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input aria-label="Salon, Service, Stadt..."
              type="text"
              name="q"
              defaultValue={initialQ}
              placeholder="Salon, Service, Stadt..."
              autoComplete="off"
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 12,
                border: '1px solid rgba(176,144,96,0.2)', background: 'var(--c2)',
                color: 'var(--cream)', fontSize: 14, outline: 'none',
              }}
            />
            <button type="submit" className="bgold" style={{ width: 'auto', padding: '12px 18px', fontSize: 14, flexShrink: 0 }}>
              Suchen
            </button>
          </form>

          {/* PLZ search */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input aria-label="PLZ eingeben..."
              type="text"
              placeholder="PLZ eingeben..."
              value={plzInput}
              onChange={e => setPlzInput(e.target.value)}
              maxLength={5}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 12,
                border: '1px solid rgba(176,144,96,0.15)', background: 'var(--c2)',
                color: 'var(--cream)', fontSize: 13, outline: 'none',
              }}
            />
            <button
              type="button"
              className="boutline"
              onClick={() => handlePlzSearch()}
              disabled={plzLoading}
              style={{ minHeight: 44, padding: '0 16px', fontSize: 12, whiteSpace: 'nowrap', borderRadius: 12 }}
            >
              {plzLoading ? '...' : '📍 PLZ suchen'}
            </button>
          </div>

          {/* City quick filters */}
          {!initialQ && !initialCity && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {CITIES.map(c => (
                <a
                  key={c}
                  href={`/search?city=${encodeURIComponent(c)}`}
                  className="boutline"
                  style={{
                    // 40 px statt der bisherigen ~25 px: die Stadt-Chips und
                    // die Sortierknoepfe waren die kleinsten Ziele der Seite,
                    // und diese Seite wird fast nur auf dem Handy benutzt.
                    minHeight: 40, display: 'inline-flex', alignItems: 'center',
                    padding: '0 16px', fontSize: 12, whiteSpace: 'nowrap',
                    textDecoration: 'none', borderRadius: 20,
                  }}
                >
                  {c}
                </a>
              ))}
            </div>
          )}

          {/* Sort options */}
          {refLocation && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={() => setSortMode('rating')}
                aria-pressed={sortMode === 'rating'}
                style={{
                  minHeight: 40, padding: '0 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: sortMode === 'rating' ? 'var(--gold)' : 'var(--c3)',
                  color: sortMode === 'rating' ? '#080706' : 'var(--stone)', border: 'none',
                }}
              >
                Beste Bewertung
              </button>
              <button
                onClick={() => setSortMode('nearest')}
                aria-pressed={sortMode === 'nearest'}
                style={{
                  minHeight: 40, padding: '0 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: sortMode === 'nearest' ? 'var(--gold)' : 'var(--c3)',
                  color: sortMode === 'nearest' ? '#080706' : 'var(--stone)', border: 'none',
                }}
              >
                Nächste zuerst
              </button>
            </div>
          )}

          <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginTop: 8 }}>
            {sorted.length} Ergebnis{sorted.length !== 1 ? 'se' : ''}
            {plzLocation && plzInput && <span> · Umkreis von PLZ {plzInput}</span>}
          </p>
        </div>

        <section style={{ padding: '0 var(--pad)' }}>
          {/* Ohne diesen Hinweis ist ein Abfragefehler nicht von „nichts
              gefunden" zu unterscheiden: die Treffer werden mit den
              Demo-Anbietern zusammengelegt, die Liste bleibt also gefuellt. */}
          {ladeFehler && (
            <LadefehlerHinweis text="Die Suche konnte gerade nicht vollständig geladen werden." />
          )}
          {sorted.length === 0 && (initialQ || initialCity) ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: 'var(--stone)', fontSize: 14, marginBottom: 8 }}>
                Keine Ergebnisse f&uuml;r diese Suche.
              </p>
              <p style={{ color: 'var(--stone)', fontSize: 12 }}>
                Versuche einen anderen Suchbegriff oder eine andere Stadt.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sorted.map(s => (
                <a key={s.id} href={`/salon/${s.slug || s.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: 'var(--c3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 700, color: 'var(--cream)', flexShrink: 0,
                    }}>
                      {s.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--cream)' }}>{s.name}</div>
                      <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>★ {Number(s.avg_rating).toFixed(1)} · {s.city}</span>
                        {s.category && <span> · {s.category}</span>}
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
          )}
        </section>
        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}
