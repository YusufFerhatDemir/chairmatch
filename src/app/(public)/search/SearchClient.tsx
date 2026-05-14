'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PROVS } from '@/lib/demo-data'
import { haversine, formatDistance, requestUserLocation, geocodeCity } from '@/lib/geo'
import { BackButton } from '@/components/BackButton'

interface Salon {
  id: string
  name: string
  slug: string | null
  city: string | null
  avg_rating: number
  category?: string | null
}

type SortMode = 'rating' | 'nearest'

const CITIES = ['Frankfurt', 'Berlin', 'München', 'Hamburg', 'Köln', 'Düsseldorf', 'Stuttgart']

export default function SearchClient({
  salons,
  initialQ,
  initialCity,
  initialPlz,
  availableCities,
  dbTimedOut,
}: {
  salons: Salon[]
  initialQ: string
  initialCity: string
  initialPlz: string
  availableCities?: string[]
  dbTimedOut?: boolean
}) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('rating')
  const [plzInput, setPlzInput] = useState(initialPlz)
  const [plzLocation, setPlzLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [plzLoading, setPlzLoading] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)
  const [locationAsked, setLocationAsked] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('cm_user_location')
    if (saved) {
      try { setUserLocation(JSON.parse(saved)) } catch {}
    }
    // KEIN automatisches Geo-Prompt mehr beim Page-Load — User soll explizit klicken
    // (sonst zeigt der Browser-Prompt sofort, ohne dass User es will)
  }, [])

  async function askForLocation() {
    setLocationAsked(true)
    const loc = await requestUserLocation()
    if (loc) {
      setUserLocation(loc)
      localStorage.setItem('cm_user_location', JSON.stringify(loc))
      setSortMode('nearest')
    } else {
      setLocationDenied(true)
    }
  }

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

  // Enrich with demo provider lat/lng
  const salonsWithGeo = salons.map(s => {
    const demo = PROVS.find(p => p.id === s.id || p.nm.toLowerCase() === s.name.toLowerCase())
    const lat = demo?.lat || 0
    const lng = demo?.lng || 0
    const dist = refLocation && lat ? haversine(refLocation.lat, refLocation.lng, lat, lng) : null
    return { ...s, lat, lng, dist }
  })

  // Sort
  const sorted = [...salonsWithGeo].sort((a, b) => {
    if (sortMode === 'nearest' && a.dist !== null && b.dist !== null) return a.dist - b.dist
    return b.avg_rating - a.avg_rating
  })

  const title = initialQ ? `Suche: "${initialQ}"` : initialCity ? `Salons in ${initialCity}` : 'Suche'

  return (
    <div className="shell">
      <div className="screen">
        <div className="sticky">
          <div style={{ marginBottom: 10 }}>
            <BackButton href="/" label="Zurück zur Startseite" />
          </div>
          <h1 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--cream)', marginTop: 4 }}>
            {title}
          </h1>

          <form action="/search" method="GET" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
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
            <input
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
              style={{ padding: '10px 14px', fontSize: 12, whiteSpace: 'nowrap', borderRadius: 12 }}
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
                  style={{ padding: '6px 14px', fontSize: 11, whiteSpace: 'nowrap', textDecoration: 'none', borderRadius: 20 }}
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
                style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: sortMode === 'rating' ? 'var(--gold)' : 'var(--c3)',
                  color: sortMode === 'rating' ? '#080706' : 'var(--stone)', border: 'none',
                }}
              >
                Beste Bewertung
              </button>
              <button
                onClick={() => setSortMode('nearest')}
                style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
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
          {dbTimedOut && (
            <div style={{
              background: 'rgba(232, 180, 80, 0.08)',
              border: '1px solid rgba(232, 180, 80, 0.3)',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              fontSize: 12,
              color: 'var(--gold2)',
            }}>
              ⚡ Verbindung gerade etwas langsam. Wir zeigen dir trotzdem Ergebnisse — lade die Seite neu für aktuelle Daten.
            </div>
          )}

          {sorted.length === 0 && (initialQ || initialCity) ? (
            <EmptyState
              query={initialQ}
              city={initialCity}
              availableCities={availableCities || []}
              userLocation={userLocation}
              locationDenied={locationDenied}
              locationAsked={locationAsked}
              onAskLocation={askForLocation}
            />
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

/**
 * Empty-State: rich, mit konkreten Aktionen statt "versuche was anderes".
 *
 * Strategie:
 * 1) Standort-Prompt: "Salons in deiner Nähe finden" (1-Click)
 * 2) Beliebte Städte: max. 6 mit Salons
 * 3) Magazin-Link: "Wie funktioniert Stuhl-Miete?"
 * 4) Anbieter-CTA: "Hier gibt's noch keinen Salon? Werde der erste!"
 * 5) Wait-List: "Benachrichtige mich, wenn Salons in [Stadt] verfügbar sind"
 */
function EmptyState({
  query,
  city,
  availableCities,
  userLocation,
  locationDenied,
  locationAsked,
  onAskLocation,
}: {
  query: string
  city: string
  availableCities: string[]
  userLocation: { lat: number; lng: number } | null
  locationDenied: boolean
  locationAsked: boolean
  onAskLocation: () => void
}) {
  const [waitListEmail, setWaitListEmail] = useState('')
  const [waitListStatus, setWaitListStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')

  const searchedTerm = query || city
  const topCities = availableCities.slice(0, 8)

  async function joinWaitList() {
    if (!waitListEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setWaitListStatus('err')
      return
    }
    setWaitListStatus('sending')
    try {
      const res = await fetch('/api/wait-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: waitListEmail,
          city: city || query || '',
          source: 'search_empty_state',
        }),
      })
      setWaitListStatus(res.ok ? 'ok' : 'err')
    } catch {
      setWaitListStatus('err')
    }
  }

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🔍</div>
        <h2 style={{ color: 'var(--cream)', fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>
          Noch keine Salons {city ? `in ${city}` : 'für diese Suche'}
        </h2>
        <p style={{ color: 'var(--stone)', fontSize: 13, margin: 0 }}>
          ChairMatch ist gerade am Wachsen — wir bauen den Marketplace Stadt für Stadt auf.
        </p>
      </div>

      {/* Aktion 1: Standort */}
      {!userLocation && !locationDenied && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.10), rgba(176,144,96,0.04))',
          border: '2px solid var(--gold)',
          borderRadius: 14,
          padding: 18,
          marginBottom: 14,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: 'var(--cream)', fontWeight: 600, margin: '0 0 6px' }}>
            📍 Salons in deiner Nähe finden
          </p>
          <p style={{ fontSize: 12, color: 'var(--stone)', margin: '0 0 14px' }}>
            Wir zeigen dir alle Salons im Umkreis von 50 km.
          </p>
          <button
            onClick={onAskLocation}
            disabled={locationAsked && !locationDenied}
            className="bgold"
            style={{
              padding: '10px 22px',
              fontSize: 13,
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              cursor: locationAsked && !locationDenied ? 'wait' : 'pointer',
              opacity: locationAsked && !locationDenied ? 0.5 : 1,
            }}
          >
            {locationAsked && !locationDenied ? 'Frage Standort an …' : 'Standort freigeben'}
          </button>
        </div>
      )}

      {locationDenied && (
        <div style={{
          background: 'var(--c2)', borderRadius: 12, padding: 14, marginBottom: 14,
          border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 12, color: 'var(--stone)', margin: 0 }}>
            ℹ️ Standort-Zugriff blockiert. Du kannst stattdessen oben deine PLZ eingeben.
          </p>
        </div>
      )}

      {/* Aktion 2: Verfügbare Städte */}
      {topCities.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--stone)', margin: '0 0 8px', textAlign: 'center' }}>
            Oder suche in einer dieser Städte:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {topCities.map((c) => (
              <a
                key={c}
                href={`/search?city=${encodeURIComponent(c)}`}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  background: 'var(--c2)',
                  color: 'var(--cream)',
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  border: '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                }}
              >
                {c}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Aktion 3: Wait-List */}
      {searchedTerm && (
        <div style={{
          background: 'var(--c2)', borderRadius: 12, padding: 16, marginBottom: 14,
          border: '1px solid var(--border)',
        }}>
          {waitListStatus === 'ok' ? (
            <p style={{ fontSize: 13, color: 'var(--green)', margin: 0, textAlign: 'center' }}>
              ✓ Eingetragen! Wir melden uns, sobald Salons in {searchedTerm} verfügbar sind.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--cream)', fontWeight: 600, margin: '0 0 4px' }}>
                🔔 Benachrichtige mich
              </p>
              <p style={{ fontSize: 11, color: 'var(--stone)', margin: '0 0 10px' }}>
                Trage deine Email ein — wir melden uns, sobald Salons in <strong>{searchedTerm}</strong> verfügbar sind.
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="email"
                  placeholder="deine@email.de"
                  value={waitListEmail}
                  onChange={(e) => setWaitListEmail(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--c1)',
                    color: 'var(--cream)',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={joinWaitList}
                  disabled={waitListStatus === 'sending'}
                  className="bgold"
                  style={{
                    padding: '8px 14px',
                    fontSize: 12,
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: waitListStatus === 'sending' ? 'wait' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {waitListStatus === 'sending' ? '…' : 'Eintragen'}
                </button>
              </div>
              {waitListStatus === 'err' && (
                <p style={{ fontSize: 11, color: 'var(--red)', margin: '6px 0 0' }}>
                  Bitte gültige Email eingeben.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Aktion 4: Anbieter-CTA */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(176,144,96,0.02))',
        border: '1px solid var(--gold)',
        borderRadius: 14,
        padding: 18,
        marginBottom: 14,
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, color: 'var(--cream)', fontWeight: 600, margin: '0 0 6px' }}>
          💼 Du bist Salon-Inhaber{searchedTerm ? ` in ${searchedTerm}` : ''}?
        </p>
        <p style={{ fontSize: 12, color: 'var(--stone)', margin: '0 0 12px', lineHeight: 1.5 }}>
          Werde der erste verifizierte Anbieter und sichere dir <strong style={{ color: 'var(--gold2)' }}>6 Monate 0% Provision</strong>
          {' '}als Founding-Salon.
        </p>
        <a
          href="/register/anbieter"
          className="bgold"
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            fontSize: 13,
            textDecoration: 'none',
            borderRadius: 10,
            fontWeight: 700,
          }}
        >
          Jetzt als Anbieter starten →
        </a>
      </div>

      {/* Aktion 5: Lernen */}
      <div style={{
        background: 'var(--c2)', borderRadius: 12, padding: 14, marginBottom: 14,
        border: '1px solid var(--border)',
      }}>
        <p style={{ fontSize: 12, color: 'var(--stone)', margin: '0 0 8px' }}>
          📖 Erfahre wie ChairMatch funktioniert:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <a href="/magazin/wie-funktioniert-stuhl-miete" style={{ color: 'var(--gold)', fontSize: 12, textDecoration: 'none' }}>
            → Wie funktioniert Stuhl-Miete?
          </a>
          <a href="/mieter/wie-es-funktioniert" style={{ color: 'var(--gold)', fontSize: 12, textDecoration: 'none' }}>
            → Als Mieter starten
          </a>
          <a href="/freelancer-rechner" style={{ color: 'var(--gold)', fontSize: 12, textDecoration: 'none' }}>
            → Freelancer-Rechner: Was verdiene ich selbstständig?
          </a>
        </div>
      </div>
    </div>
  )
}
