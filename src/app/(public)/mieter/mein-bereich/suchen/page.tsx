'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'
import { useTranslations } from '@/i18n/client'
import { apiGet } from '@/lib/client-api'
import type { RentalListing } from '@/modules/rentals/rental-listing.types'

/**
 * Stuhl-Suche (Mieter) — /mieter/mein-bereich/suchen
 *
 * Diese Seite war bis 2026-08-27 die Schauseite eines Marktplatzes ohne
 * Ware. Sie holte die Inserate im BROWSER mit dem ANON-Key und einem
 * eingebetteten Join auf `salons`. Live antwortet PostgREST darauf mit
 *
 *   42501  permission denied for function is_admin_or_super
 *
 * — die RLS-Policy auf `salons` ruft eine Funktion auf, die `anon` nicht
 * ausfuehren darf, und der Fehler kippt die GANZE Abfrage, nicht nur die
 * Einbettung. Der `catch`-Zweig legte daraufhin `MOCK_INSERATE` vor: sechs
 * erfundene Plaetze mit erfundenen Preisen ("Salon Anna · Stuhl, 15 €/h",
 * "Premium OP-Raum Bonn, 500 €/Tag"), jedem Besucher dieselben. Selbst wenn
 * die Abfrage durchgelaufen waere, haette der Code die echten Zeilen mit
 * Erfundenem aufgefuellt: `verified: true` fuer jedes Inserat, drei
 * Standard-Merkmale statt der gepflegten, "Verfuegbar" als Freitext und ein
 * Stundenpreis als Tagespreis geteilt durch acht — auch dort, wo der
 * Vermieter gar keinen Stundenpreis anbietet.
 *
 * Jetzt: GET /api/rental-listings (serverseitig, Service-Client, an der
 * kaputten anon-Policy vorbei). Angezeigt wird nur, was in der Datenbank
 * steht. Kein Treffer heisst kein Treffer.
 */

const EMPTY: RentalListing[] = []

/** Cent → "38 €" bzw. "38,50 €" — ohne Nachkommastellen, wenn glatt. */
function euro(cents: number): string {
  const value = cents / 100
  return `${value.toLocaleString('de-DE', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} €`
}

const TYPE_LABELS: Record<string, string> = {
  stuhl: 'Stuhl',
  liege: 'Liege',
  raum: 'Raum',
  opraum: 'OP-Raum',
  kabine: 'Kabine',
}

export default function SuchenPage() {
  const router = useRouter()
  const t = useTranslations()
  const [showFilter, setShowFilter] = useState(false)
  const [city, setCity] = useState('')
  const [maxPrice, setMaxPrice] = useState(0)
  const [featureFilter, setFeatureFilter] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [favs, setFavs] = useState<string[]>([])

  const [listings, setListings] = useState<RentalListing[]>(EMPTY)
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    try {
      const f = JSON.parse(localStorage.getItem('cm_inserate_favs') || '[]')
      if (Array.isArray(f)) setFavs(f.filter((x): x is string => typeof x === 'string'))
      const draft = JSON.parse(localStorage.getItem('cm_mieter_suchen') || '{}')
      if (typeof draft.city === 'string') setCity(draft.city)
      if (Number(draft.maxPrice) > 0) setMaxPrice(Number(draft.maxPrice))
    } catch {}
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiGet<{ listings: RentalListing[] }>('/api/rental-listings?limit=100')
        if (cancelled) return
        setListings(res.listings ?? EMPTY)
        setFehler(null)
      } catch (err) {
        if (cancelled) return
        // Kein Ersatzbestand. Eine Fehlermeldung ist unangenehm, ein
        // erfundenes Inserat ist schlimmer: darauf schreibt jemand eine
        // Anfrage, die nirgends ankommt.
        setListings(EMPTY)
        setFehler(err instanceof Error ? err.message : 'Inserate konnten nicht geladen werden')
      } finally {
        if (!cancelled) setLaedt(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  /** Filterbare Merkmale: was die geladenen Inserate wirklich mitbringen. */
  const availableFeatures = useMemo(() => {
    const set = new Set<string>()
    for (const l of listings) for (const f of l.features) set.add(f)
    return [...set].sort((a, b) => a.localeCompare(b, 'de'))
  }, [listings])

  function toggleFav(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const next = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id]
    setFavs(next)
    try { localStorage.setItem('cm_inserate_favs', JSON.stringify(next)) } catch {}
  }

  function toggleFeature(feature: string) {
    const n = new Set(featureFilter)
    if (n.has(feature)) n.delete(feature); else n.add(feature)
    setFeatureFilter(n)
  }

  const filtered = useMemo(() => {
    const needleCity = city.trim().toLowerCase()
    const needleQuery = query.trim().toLowerCase()
    const maxCents = maxPrice > 0 ? maxPrice * 100 : null

    return listings
      .filter(l => {
        if (needleCity) {
          const hay = `${l.salon?.city ?? ''} ${l.salon?.name ?? ''}`.toLowerCase()
          if (!hay.includes(needleCity)) return false
        }
        if (needleQuery) {
          const hay = `${l.name} ${l.description ?? ''} ${l.salon?.name ?? ''} ${l.salon?.city ?? ''}`.toLowerCase()
          if (!hay.includes(needleQuery)) return false
        }
        if (maxCents !== null && l.pricePerDayCents > maxCents) return false
        for (const f of featureFilter) if (!l.features.includes(f)) return false
        return true
      })
      // Nach Tagespreis, weil das die einzige Groesse ist, die jedes Inserat
      // fuehrt. Nach "Naehe" zu sortieren war ohnehin nie moeglich: an den
      // Salons haengen keine Koordinaten.
      .sort((a, b) => a.pricePerDayCents - b.pricePerDayCents)
  }, [listings, city, query, maxPrice, featureFilter])

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '22px 14px 0',
    }}>
      <div style={{
        width: '100%', maxWidth: 430, background: 'var(--bg)',
        borderRadius: 38, overflow: 'hidden',
        border: '1px solid rgba(196,168,106,0.12)',
        boxShadow: '0 50px 120px rgba(0,0,0,0.78)',
        marginBottom: 24,
      }}>
        <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            aria-label="Zurück"
            onClick={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(196,168,106,0.08)', border: '1px solid rgba(196,168,106,0.22)', color: 'var(--gold2)', fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
          >‹</button>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>Stühle suchen</span>
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>CHAIRMATCH</h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        <div style={{ padding: '0 20px 16px' }}>
          <h2 className="cinzel text-gold-metallic" style={{ fontSize: 24, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>Stühle suchen</h2>
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>Alle eingestellten Plätze auf ChairMatch</p>
        </div>

        {/* Search Bar */}
        <div style={{ margin: '0 16px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--c2)', border: '1px solid rgba(196,168,106,0.2)', borderRadius: 14, padding: '10px 14px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#search-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <svg width="0" height="0"><defs>
            <linearGradient id="search-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BF953F"/><stop offset="50%" stopColor="#FCF6BA"/><stop offset="100%" stopColor="#AA771C"/>
            </linearGradient>
          </defs></svg>
          <input aria-label="Stadt, Name, Beschreibung..." type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Stadt, Name, Beschreibung..."
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--cream)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
          <button onClick={() => setShowFilter(!showFilter)}
            style={{ background: 'rgba(196,168,106,0.1)', border: '1px solid rgba(196,168,106,0.25)', color: 'var(--gold2)', padding: '6px 10px', borderRadius: 8, fontSize: 11, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}
          >{t('search.filter')}</button>
        </div>

        {/* Aktive Filter */}
        {(city || maxPrice > 0 || featureFilter.size > 0) && (
          <div style={{ padding: '0 16px 14px', display: 'flex', gap: 6, overflowX: 'auto', flexWrap: 'nowrap' }}>
            {city && (
              <button onClick={() => setCity('')}
                style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 11, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase', background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)', color: '#1a1000', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
              >📍 {city} ✕</button>
            )}
            {maxPrice > 0 && (
              <button onClick={() => setMaxPrice(0)}
                style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 11, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase', background: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728)', color: '#1a1000', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >≤ {maxPrice} €/Tag ✕</button>
            )}
            {[...featureFilter].map(f => (
              <button key={f} onClick={() => toggleFeature(f)}
                style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 11, letterSpacing: 1, fontWeight: 700, background: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728)', color: '#1a1000', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >{f} ✕</button>
            ))}
          </div>
        )}

        {/* Filter Sheet */}
        {showFilter && (
          <div style={{ margin: '0 16px 14px', background: 'var(--c1)', border: '1px solid rgba(196,168,106,0.18)', borderRadius: 14, padding: 14 }}>
            <h3 className="cinzel" style={{ fontSize: 13, color: 'var(--gold2)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>{t('search.filter')}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              <label style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }} htmlFor="suche-stadt">Stadt</label>
              <input id="suche-stadt" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="z.B. Köln"
                style={{ padding: '10px 12px', background: 'var(--c2)', color: 'var(--cream)', border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              <label style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }} htmlFor="suche-max-budget">Max. Budget pro Tag (€) — 0 = egal</label>
              <input id="suche-max-budget" type="number" min={0} value={maxPrice} onChange={(e) => setMaxPrice(Math.max(0, Number(e.target.value) || 0))}
                style={{ padding: '10px 12px', background: 'var(--c2)', color: 'var(--cream)', border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit' }} />
            </div>

            {/* Nur die Merkmale, die in den geladenen Inseraten wirklich
                vorkommen — eine feste Wunschliste haette Filter angeboten,
                die garantiert null Treffer liefern. */}
            {availableFeatures.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Ausstattung muss haben</span>
                <div role="group" aria-label="Ausstattung muss haben" style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {availableFeatures.map(f => (
                    <button key={f} onClick={() => toggleFeature(f)}
                      style={{ fontSize: 10.5, padding: '4px 9px', borderRadius: 8, background: featureFilter.has(f) ? 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728)' : 'rgba(176,144,96,0.08)', color: featureFilter.has(f) ? '#1a1000' : 'var(--gold2)', border: featureFilter.has(f) ? 'none' : '1px solid rgba(176,144,96,0.2)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: featureFilter.has(f) ? 700 : 600 }}
                    >{f}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setCity(''); setMaxPrice(0); setFeatureFilter(new Set()); setQuery('') }}
                style={{ flex: 1, padding: 10, borderRadius: 10, background: 'transparent', color: 'var(--stone)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'inherit', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
              >Zurücksetzen</button>
              <button onClick={() => setShowFilter(false)}
                style={{ flex: 2, padding: 10, borderRadius: 10, background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)', color: '#1a1000', border: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >{filtered.length} Treffer anzeigen</button>
            </div>
          </div>
        )}

        {/* Count + Sort */}
        {!laedt && !fehler && (
          <div style={{ padding: '0 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--gold2)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {filtered.length} {filtered.length === 1 ? 'Inserat' : 'Inserate'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--stone)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
              Sortiert: <span style={{ color: 'var(--gold2)' }}>Preis</span>
            </span>
          </div>
        )}

        {/* Results */}
        <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {laedt && (
            <p style={{ fontSize: 12, color: 'var(--stone)', textAlign: 'center', padding: 24 }}>Inserate werden geladen …</p>
          )}

          {!laedt && fehler && (
            <div role="alert" style={{ padding: 24, textAlign: 'center', background: 'rgba(232,80,64,0.06)', border: '1px solid rgba(232,80,64,0.25)', borderRadius: 18 }}>
              <p style={{ fontSize: 13, color: '#FF8888', lineHeight: 1.6 }}>{fehler}</p>
            </div>
          )}

          {!laedt && !fehler && filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', background: 'rgba(176,144,96,0.04)', border: '1px dashed rgba(176,144,96,0.25)', borderRadius: 18 }}>
              <p className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 8 }}>
                {listings.length === 0 ? 'Noch keine Inserate' : 'Nichts gefunden'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6 }}>
                {listings.length === 0
                  ? 'Sobald Salons Plätze einstellen, stehen sie hier.'
                  : t('search.emptyHint')}
              </p>
            </div>
          )}

          {!laedt && !fehler && filtered.map(i => (
            <div key={i.id} onClick={() => router.push(`/inserat/${i.id}` as never)} style={{
              background: 'linear-gradient(145deg, rgba(191,149,63,0.05) 0%, var(--c1) 50%, rgba(179,135,40,0.03) 100%)',
              border: '1px solid rgba(191,149,63,0.22)',
              borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 0 12px rgba(191,149,63,0.08), 0 14px 32px rgba(0,0,0,0.4)',
              cursor: 'pointer',
            }}>
              <div style={{
                width: '100%', aspectRatio: '16/9',
                background: i.images[0]
                  ? `center/cover no-repeat url(${JSON.stringify(i.images[0])})`
                  : 'linear-gradient(135deg,#3A3025,#1F1A0F)',
                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {!i.images[0] && (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(196,168,106,0.5)" strokeWidth="1" style={{ opacity: 0.4 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>
                  </svg>
                )}
                <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(11,11,15,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(196,168,106,0.3)', color: 'var(--gold2)', fontSize: 9, padding: '3px 8px', borderRadius: 8, fontWeight: 700, letterSpacing: 1 }}>
                  {TYPE_LABELS[i.type] ?? i.type}
                </span>
                <button onClick={(e) => toggleFav(i.id, e)}
                  aria-label={favs.includes(i.id) ? 'Aus Merkliste entfernen' : 'Auf Merkliste setzen'}
                  style={{ position: 'absolute', bottom: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(11,11,15,0.8)', color: favs.includes(i.id) ? '#E85040' : 'var(--cream)', border: '1px solid rgba(196,168,106,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer' }}
                >{favs.includes(i.id) ? '♥' : '♡'}</button>
              </div>
              <div style={{ padding: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 700 }}>{i.name}</p>
                <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>
                  {[i.salon?.name, i.salon?.city].filter(Boolean).join(' · ') || 'Salon nicht hinterlegt'}
                </p>

                {i.features.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '8px 0' }}>
                    {i.features.slice(0, 3).map(f => (
                      <span key={f} style={{ fontSize: 10, padding: '3px 7px', borderRadius: 6, background: 'rgba(176,144,96,0.1)', color: 'var(--gold2)', fontWeight: 600 }}>{f}</span>
                    ))}
                    {i.features.length > 3 && (
                      <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 6, background: 'rgba(176,144,96,0.1)', color: 'var(--gold2)', fontWeight: 600 }}>+{i.features.length - 3}</span>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 8, borderTop: '1px solid rgba(196,168,106,0.1)' }}>
                  <span style={{ fontSize: 10, color: 'var(--stone)', fontWeight: 600 }}>
                    {i.pricePerHourCents !== null ? `${euro(i.pricePerHourCents)} / Stunde` : 'Tagespreis'}
                  </span>
                  <span className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700 }}>
                    {euro(i.pricePerDayCents)}
                    <span style={{ fontSize: 9, color: 'var(--stone)', fontFamily: 'DM Sans, sans-serif', marginLeft: 3 }}>/Tag</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <BottomNav role="mieter" />
      </div>
    </div>
  )
}
