'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'
import { useTranslations } from '@/i18n/client'
import { supabase } from '@/lib/supabase'

interface Inserat {
  id: string
  name: string
  city: string
  district: string
  distance: number
  verified: boolean
  pricePerHour: number
  pricePerDay: number
  equipment: string[]
  available: string
  type: 'stuhl' | 'liege' | 'raum' | 'kabine'
}

const MOCK_INSERATE: Inserat[] = [
  { id: 'i1', name: 'Salon Anna · Stuhl', city: 'Köln', district: 'Köln-Innenstadt', distance: 1.2, verified: true, pricePerHour: 15, pricePerDay: 90, equipment: ['Spiegel','Föhn','WLAN','Klima','Sterilisator','Wasser','Glätteisen'], available: 'Heute frei', type: 'stuhl' },
  { id: 'i2', name: 'Lounge Maximilian', city: 'Köln', district: 'Köln-Ehrenfeld', distance: 2.4, verified: false, pricePerHour: 20, pricePerDay: 130, equipment: ['Spiegel','Klima','Glätteisen','Föhn','WLAN','Wasser'], available: 'Morgen frei', type: 'stuhl' },
  { id: 'i3', name: 'Studio Rio · Liege', city: 'Köln', district: 'Köln-Sülz', distance: 3.8, verified: true, pricePerHour: 25, pricePerDay: 160, equipment: ['Liege','Sterilisator','Wasser','WLAN'], available: 'Diese Woche', type: 'liege' },
  { id: 'i4', name: 'Atelier Klein', city: 'Köln', district: 'Köln-Deutz', distance: 4.1, verified: false, pricePerHour: 12, pricePerDay: 80, equipment: ['Spiegel','Föhn','WLAN'], available: 'Diese Woche', type: 'stuhl' },
  { id: 'i5', name: 'Beauty Spot · Kabine', city: 'Köln', district: 'Köln-Lindenthal', distance: 5.2, verified: true, pricePerHour: 30, pricePerDay: 200, equipment: ['Kabine','Sterilisator','Klima','WLAN','Liege'], available: 'Nächste Woche', type: 'kabine' },
  { id: 'i6', name: 'Premium OP-Raum', city: 'Bonn', district: 'Bonn-Zentrum', distance: 8.4, verified: true, pricePerHour: 80, pricePerDay: 500, equipment: ['OP-Tisch','Sterilisator','Klima','Notruf'], available: 'Auf Anfrage', type: 'raum' },
]

const ALL_EQUIPMENT = ['Spiegel','Föhn','Glätteisen','Sterilisator','WLAN','Klima','Wasser','Liege','Kabine']

export default function SuchenPage() {
  const router = useRouter()
  const t = useTranslations()
  const [showFilter, setShowFilter] = useState(false)
  const [city, setCity] = useState('')
  const [maxPrice, setMaxPrice] = useState(100)
  const [equipFilter, setEquipFilter] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [favs, setFavs] = useState<string[]>([])
  const [dbInserate, setDbInserate] = useState<Inserat[]>([])

  useEffect(() => {
    try {
      const f = JSON.parse(localStorage.getItem('cm_inserate_favs') || '[]')
      setFavs(f)
      const draft = JSON.parse(localStorage.getItem('cm_mieter_suchen') || '{}')
      if (draft.city) setCity(draft.city)
      if (draft.maxPrice) setMaxPrice(Number(draft.maxPrice) || 100)
    } catch {}

    // DB-Fetch: rental_equipment + zugehöriger Salon (Name + Stadt)
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase
          .from('rental_equipment')
          .select('id, type, name, description, price_per_day_cents, salon:salons(name, city)')
          .eq('is_available', true)
          .limit(50)
        if (cancelled || !data) return
        const mapped: Inserat[] = (data as unknown as Array<{
          id: string; type: string; name: string; description: string | null;
          price_per_day_cents: number;
          salon: { name: string; city: string } | { name: string; city: string }[] | null;
        }>).map(r => {
          const s = Array.isArray(r.salon) ? r.salon[0] : r.salon
          const pricePerDay = Math.round(r.price_per_day_cents / 100)
          const safeType = (['stuhl','liege','raum','kabine'] as const).includes(r.type as never)
            ? (r.type as 'stuhl'|'liege'|'raum'|'kabine')
            : 'stuhl'
          return {
            id: r.id, name: r.name,
            city: s?.city || '—',
            district: s?.name || '—',
            distance: 0, verified: true,
            pricePerHour: Math.round(pricePerDay / 8),
            pricePerDay,
            equipment: ['Spiegel','WLAN','Wasser'],
            available: 'Verfügbar',
            type: safeType,
          }
        })
        setDbInserate(mapped)
      } catch { /* fallback bleibt MOCK */ }
    })()
    return () => { cancelled = true }
  }, [])

  function toggleFav(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const next = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id]
    setFavs(next)
    try { localStorage.setItem('cm_inserate_favs', JSON.stringify(next)) } catch {}
  }

  function toggleEquip(eq: string) {
    const n = new Set(equipFilter)
    if (n.has(eq)) n.delete(eq); else n.add(eq)
    setEquipFilter(n)
  }

  const ALL_INSERATE = dbInserate.length > 0 ? [...dbInserate, ...MOCK_INSERATE] : MOCK_INSERATE
  const filtered = ALL_INSERATE.filter(i => {
    if (city && !i.city.toLowerCase().includes(city.toLowerCase()) && !i.district.toLowerCase().includes(city.toLowerCase())) return false
    if (query && !i.name.toLowerCase().includes(query.toLowerCase())) return false
    if (i.pricePerDay > maxPrice) return false
    if (equipFilter.size > 0) {
      for (const e of equipFilter) if (!i.equipment.includes(e)) return false
    }
    return true
  }).sort((a, b) => a.distance - b.distance)

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
          <button onClick={() => router.back()}
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
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>Finde freie Plätze in deiner Nähe</p>
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
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Stadt, Name, Service..."
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--cream)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
          <button onClick={() => setShowFilter(!showFilter)}
            style={{ background: 'rgba(196,168,106,0.1)', border: '1px solid rgba(196,168,106,0.25)', color: 'var(--gold2)', padding: '6px 10px', borderRadius: 8, fontSize: 11, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}
          >{t('search.filter')}</button>
        </div>

        {/* Quick Chips */}
        <div style={{ padding: '0 16px 14px', display: 'flex', gap: 6, overflowX: 'auto', flexWrap: 'nowrap' }}>
          {city && (
            <button onClick={() => setCity('')}
              style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 11, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase', background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)', color: '#1a1000', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
            >📍 {city} ✕</button>
          )}
          {!city && (
            <button onClick={() => setCity('Köln')}
              style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 11, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase', background: 'rgba(176,144,96,0.08)', border: '1px solid rgba(176,144,96,0.22)', color: 'var(--gold2)', cursor: 'pointer', fontFamily: 'inherit' }}
            >📍 Köln</button>
          )}
          <button onClick={() => setMaxPrice(100)}
            style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 11, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase', background: maxPrice === 100 ? 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728)' : 'rgba(176,144,96,0.08)', border: maxPrice === 100 ? 'none' : '1px solid rgba(176,144,96,0.22)', color: maxPrice === 100 ? '#1a1000' : 'var(--gold2)', cursor: 'pointer', fontFamily: 'inherit' }}
          >€ ≤ 100/Tag</button>
          <button
            style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 11, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase', background: 'rgba(176,144,96,0.08)', border: '1px solid rgba(176,144,96,0.22)', color: 'var(--gold2)', cursor: 'pointer', fontFamily: 'inherit' }}
          >Heute frei</button>
        </div>

        {/* Filter Sheet */}
        {showFilter && (
          <div style={{ margin: '0 16px 14px', background: 'var(--c1)', border: '1px solid rgba(196,168,106,0.18)', borderRadius: 14, padding: 14 }}>
            <h3 className="cinzel" style={{ fontSize: 13, color: 'var(--gold2)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>{t('search.filter')}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              <label style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Stadt</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="z.B. Köln"
                style={{ padding: '10px 12px', background: 'var(--c2)', color: 'var(--cream)', border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              <label style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Max. Budget pro Tag (€)</label>
              <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value) || 0)}
                style={{ padding: '10px 12px', background: 'var(--c2)', color: 'var(--cream)', border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              <label style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Ausstattung muss haben</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {ALL_EQUIPMENT.map(eq => (
                  <button key={eq} onClick={() => toggleEquip(eq)}
                    style={{ fontSize: 10.5, padding: '4px 9px', borderRadius: 8, background: equipFilter.has(eq) ? 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728)' : 'rgba(176,144,96,0.08)', color: equipFilter.has(eq) ? '#1a1000' : 'var(--gold2)', border: equipFilter.has(eq) ? 'none' : '1px solid rgba(176,144,96,0.2)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: equipFilter.has(eq) ? 700 : 600 }}
                  >{eq}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setCity(''); setMaxPrice(500); setEquipFilter(new Set()); setQuery('') }}
                style={{ flex: 1, padding: 10, borderRadius: 10, background: 'transparent', color: 'var(--stone)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'inherit', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
              >Zurücksetzen</button>
              <button onClick={() => setShowFilter(false)}
                style={{ flex: 2, padding: 10, borderRadius: 10, background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)', color: '#1a1000', border: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >{filtered.length} Treffer anzeigen</button>
            </div>
          </div>
        )}

        {/* Count + Sort */}
        <div style={{ padding: '0 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--gold2)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>{filtered.length} Inserate gefunden</span>
          <span style={{ fontSize: 11, color: 'var(--stone)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
            Sortiert: <span style={{ color: 'var(--gold2)' }}>Nähe</span>
          </span>
        </div>

        {/* Results */}
        <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', background: 'rgba(176,144,96,0.04)', border: '1px dashed rgba(176,144,96,0.25)', borderRadius: 18 }}>
              <p className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 8 }}>Nichts gefunden</p>
              <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6 }}>{t('search.emptyHint')}</p>
            </div>
          ) : (
            filtered.map(i => (
              <div key={i.id} onClick={() => router.push(`/inserat/${i.id}` as never)} style={{
                background: 'linear-gradient(145deg, rgba(191,149,63,0.05) 0%, var(--c1) 50%, rgba(179,135,40,0.03) 100%)',
                border: '1px solid rgba(191,149,63,0.22)',
                borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 0 12px rgba(191,149,63,0.08), 0 14px 32px rgba(0,0,0,0.4)',
                cursor: 'pointer',
              }}>
                <div style={{
                  width: '100%', aspectRatio: '16/9',
                  background: 'linear-gradient(135deg,#3A3025,#1F1A0F)',
                  position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(196,168,106,0.5)" strokeWidth="1" style={{ opacity: 0.4 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>
                  </svg>
                  <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(11,11,15,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(196,168,106,0.3)', color: 'var(--gold2)', fontSize: 9, padding: '3px 8px', borderRadius: 8, fontWeight: 700, letterSpacing: 1 }}>📍 {i.distance.toFixed(1)} km</span>
                  {i.verified && (
                    <span style={{ position: 'absolute', top: 10, right: 10, background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)', color: '#1a1000', fontSize: 9, padding: '3px 8px', borderRadius: 8, fontWeight: 700, letterSpacing: 1 }}>✓ VERIFIZIERT</span>
                  )}
                  <button onClick={(e) => toggleFav(i.id, e)}
                    style={{ position: 'absolute', bottom: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(11,11,15,0.8)', color: favs.includes(i.id) ? '#E85040' : 'var(--cream)', border: '1px solid rgba(196,168,106,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer' }}
                  >{favs.includes(i.id) ? '♥' : '♡'}</button>
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{i.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>{i.district}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '8px 0' }}>
                    {i.equipment.slice(0, 3).map(e => (
                      <span key={e} style={{ fontSize: 10, padding: '3px 7px', borderRadius: 6, background: 'rgba(176,144,96,0.1)', color: 'var(--gold2)', fontWeight: 600 }}>{e}</span>
                    ))}
                    {i.equipment.length > 3 && (
                      <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 6, background: 'rgba(176,144,96,0.1)', color: 'var(--gold2)', fontWeight: 600 }}>+{i.equipment.length - 3}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(196,168,106,0.1)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6ABF80', fontWeight: 600 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6ABF80' }} />
                      {i.available}
                    </span>
                    <span className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700 }}>
                      <span style={{ fontSize: 9, color: 'var(--stone)', fontFamily: 'DM Sans, sans-serif', marginRight: 3 }}>ab</span>
                      {i.pricePerHour} €/h
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <BottomNav role="mieter" />
      </div>
    </div>
  )
}
