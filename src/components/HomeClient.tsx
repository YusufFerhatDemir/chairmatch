 'use client'

import { BrandLogo } from '@/components/BrandLogo'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PROVS, SPECS, SEARCH_SUGGESTIONS, CITIES, getProviderSpecs, type DemoProvider, type DemoRental } from '@/lib/demo-data'
import { PROMO_CODES, RENTAL_ICONS } from '@/lib/constants'

interface Category {
  id: string
  slug: string
  label: string
  description: string | null
  icon_url: string | null
  sort_order: number
  is_active: boolean
}

interface DBSalon {
  id: string
  name: string
  slug: string | null
  description: string | null
  city: string | null
  logo_url: string | null
  avg_rating: number
  is_verified: boolean
  review_count: number
  category?: string
  subscription_tier?: string
  tagline?: string
  tags?: string[]
  discount?: number
  brand_color?: string
  is_promoted?: boolean
  free_slots?: number
  street?: string | null
  services: { id: string; name: string; price_cents?: number }[]
  rental_equipment?: { type: string; price_per_day_cents: number }[]
}

interface Props {
  categories: Category[]
  dbSalons: DBSalon[]
  greeting: string
  topOfferPercent: number | null
}

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ opacity: i <= Math.round(rating) ? 1 : 0.3, color: '#D4AF37', fontSize: size, textShadow: i <= Math.round(rating) ? '0 0 6px rgba(212,175,55,0.5)' : 'none' }}>★</span>
      ))}
    </span>
  )
}

const CAT_ICONS: Record<string, string> = {
  barber: '/icons/01_barbershop_256x384.png',
  friseur: '/icons/02_friseur_256x384.png',
  kosmetik: '/icons/03_kosmetik_256x384.png',
  aesthetik: '/icons/04_aesthetik_256x384.png',
  nail: '/icons/05_nagelstudio_256x384.png',
  massage: '/icons/06_massage_256x384.png',
  lash: '/icons/07_lash_brows_256x384.png',
  arzt: '/icons/08_arzt_klinik_256x384.png',
  opraum: '/icons/09_op_raum_256x384.png',
  angebote: '/icons/10_angebote_256x384.png',
  termin: '/icons/11_termin_256x384.png',
}

function CategoryIcon({ slug, label }: { slug: string; label: string }) {
  const src = CAT_ICONS[slug]
  if (!src) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
      loading="lazy"
      decoding="async"
    />
  )
}

export default function HomeClient({ categories, dbSalons, greeting, topOfferPercent }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [nlEmail, setNlEmail] = useState('')
  const [nlStatus, setNlStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const [showFilter, setShowFilter] = useState(false)
  const [filterCity, setFilterCity] = useState('all')
  const [filterMinRating, setFilterMinRating] = useState(0)
  const [filterMaxPrice, setFilterMaxPrice] = useState(500)
  const [filterOnlyAvail, setFilterOnlyAvail] = useState(false)
  const [filterOnlyDisc, setFilterOnlyDisc] = useState(false)

  useEffect(() => {
    // Load favorites: try DB first, fallback to localStorage
    fetch('/api/favorites').then(r => r.json()).then(data => {
      if (data.favorites?.length > 0) {
        setFavorites(data.favorites)
        localStorage.setItem('cm_favorites', JSON.stringify(data.favorites))
      } else {
        const saved = localStorage.getItem('cm_favorites')
        if (saved) setFavorites(JSON.parse(saved))
      }
    }).catch(() => {
      const saved = localStorage.getItem('cm_favorites')
      if (saved) setFavorites(JSON.parse(saved))
    })
  }, [])

  function toggleFav(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setFavorites(prev => {
      const isAdding = !prev.includes(id)
      const next = isAdding ? [...prev, id] : prev.filter(f => f !== id)
      localStorage.setItem('cm_favorites', JSON.stringify(next))
      // Sync to DB (fire-and-forget)
      fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId: id, action: isAdding ? 'add' : 'remove' }),
      }).catch(() => {})
      return next
    })
  }

  // DB salons → real providers. If DB is empty, show demo data as fallback.
  const dbProviders: DemoProvider[] = dbSalons.map(s => ({
    id: s.id, nm: s.name, st: s.street || '',
    city: s.city || '', cat: s.category || 'friseur',
    rt: s.avg_rating || 4.5, rc: s.review_count || 0,
    tl: s.tagline || s.description?.slice(0, 60) || '',
    tags: s.tags || [], disc: s.discount || 0, bc: s.brand_color || '',
    prom: s.is_promoted || false, ver: s.is_verified,
    live: true, frei: s.free_slots || 0, boost: 0,
    tier: (s.subscription_tier || 'free') as DemoProvider['tier'],
    logo: s.logo_url || null, sps: [],
    svs: s.services?.map(sv => ({ id: sv.id, nm: sv.name, pr: sv.price_cents ? sv.price_cents / 100 : 0, dur: 30 })) || [],
    rental: s.rental_equipment?.map(r => ({ type: r.type as DemoRental['type'], pr: r.price_per_day_cents / 100 })) || [],
    revs: [], gal: [],
  }))
  const providers = dbProviders.length > 0 ? dbProviders : PROVS

  function getFiltered(): DemoProvider[] {
    let list = [...providers]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        p.nm.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.tags.some(tg => tg.toLowerCase().includes(q)) ||
        p.cat.toLowerCase().includes(q) ||
        p.tl.toLowerCase().includes(q) ||
        p.svs.some(sv => sv.nm.toLowerCase().includes(q))
      )
    }
    if (filterCity !== 'all') list = list.filter(p => p.city === filterCity)
    if (filterMinRating > 0) list = list.filter(p => p.rt >= filterMinRating)
    if (filterMaxPrice < 500) list = list.filter(p => p.svs.some(sv => sv.pr <= filterMaxPrice))
    if (filterOnlyAvail) list = list.filter(p => p.live)
    if (filterOnlyDisc) list = list.filter(p => p.disc > 0)
    // Sort: boosted first, then by rating
    list.sort((a, b) => b.boost - a.boost || b.rt - a.rt)
    return list
  }

  function resetFilters() {
    setFilterCity('all')
    setFilterMinRating(0)
    setFilterMaxPrice(500)
    setFilterOnlyAvail(false)
    setFilterOnlyDisc(false)
  }

  const filtered = getFiltered()

  return (
    <>
      {/* Logo Header + Greeting */}
      <div style={{ padding: '20px var(--pad) 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexShrink: 1 }}>
          <BrandLogo size={42} variant="dark" animateStar={false} />
          <div style={{ minWidth: 0 }}>
            <p className="cinzel text-gold-metallic" style={{ fontSize: 17, fontWeight: 700, letterSpacing: 3, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              CHAIRMATCH
            </p>
            <p className="text-gold-accent" style={{ fontSize: 8, letterSpacing: 3, marginTop: 2 }}>DEUTSCHLAND</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)' }}>{greeting}</p>
          <p style={{ fontSize: 11, color: 'var(--stone)' }}>Deutschlandweit buchen</p>
        </div>
      </div>

      {/* Promo Banner */}
      {topOfferPercent && (
        <div style={{ margin: '14px var(--pad)' }}>
          <div className="card" style={{ padding: 18, background: 'linear-gradient(135deg, #1E1A08, #141008)' }}>
            <span style={{ marginBottom: 10, display: 'inline-flex', fontSize: 10, padding: '4px 10px', borderRadius: 20, fontWeight: 700, background: 'linear-gradient(135deg,#BF953F,#FCF6BA,#B38728)', color: '#1a1000' }}>SONDERANGEBOT</span>
            <p className="cinzel text-gold-metallic" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>
              Spare bis zu {topOfferPercent}%<br />auf erste Buchung
            </p>
            <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 12 }}>Code: CHAIR2026</p>
            <Link href="/offers" className="bgold" style={{ width: 'auto', padding: '11px 22px', fontSize: 13, display: 'inline-block', textDecoration: 'none' }}>
              Jetzt buchen
            </Link>
          </div>
        </div>
      )}

      {/* Inline Search */}
      <div style={{ padding: '0 var(--pad) 10px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--c2)', borderRadius: 13, border: searchFocused ? '1px solid var(--gold)' : '1px solid rgba(176,144,96,0.1)' }}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="Stadt, Name, Service..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--cream)', fontSize: 14 }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--stone)', fontSize: 16, cursor: 'pointer', padding: 0 }}>✕</button>
          )}
          <button onClick={() => setShowFilter(!showFilter)} style={{ background: 'none', border: 'none', color: showFilter ? 'var(--gold)' : 'var(--stone)', fontSize: 18, cursor: 'pointer', padding: 0 }}>
            ☰
          </button>
        </div>
        {/* Search Suggestions */}
        {searchFocused && !searchQuery && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {SEARCH_SUGGESTIONS.map(s => (
              <button key={s} onClick={() => setSearchQuery(s)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(176,144,96,.08)', border: '1px solid rgba(176,144,96,.15)', color: 'var(--gold2)', cursor: 'pointer' }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Sheet */}
      {showFilter && (
        <div style={{ margin: '0 var(--pad) 14px', padding: 16, background: 'var(--c2)', borderRadius: 16, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontSize: 16, fontWeight: 800 }}>Filter</p>
            <button onClick={resetFilters} style={{ fontSize: 13, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>Zurücksetzen</button>
          </div>
          {/* City */}
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 8 }}>Stadt</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            <button onClick={() => setFilterCity('all')} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: filterCity === 'all' ? 'var(--gold)' : 'var(--c3)', color: filterCity === 'all' ? '#080706' : 'var(--stone)', border: 'none' }}>Alle</button>
            {CITIES.map(c => (
              <button key={c} onClick={() => setFilterCity(c)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: filterCity === c ? 'var(--gold)' : 'var(--c3)', color: filterCity === c ? '#080706' : 'var(--stone)', border: 'none' }}>{c}</button>
            ))}
          </div>
          {/* Rating */}
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 8 }}>Mindestbewertung</p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {[0, 4, 4.5, 4.8, 5].map(r => (
              <button key={r} onClick={() => setFilterMinRating(r)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: filterMinRating === r ? 'var(--gold)' : 'var(--c3)', color: filterMinRating === r ? '#080706' : 'var(--stone)', border: 'none' }}>
                {r === 0 ? 'Alle' : `★ ${r}+`}
              </button>
            ))}
          </div>
          {/* Price */}
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 8 }}>Maximalpreis: {filterMaxPrice}€</p>
          <input type="range" min={20} max={500} step={10} value={filterMaxPrice} onChange={e => setFilterMaxPrice(Number(e.target.value))} style={{ width: '100%', marginBottom: 14, accentColor: 'var(--gold)' }} />
          {/* Toggles */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <button onClick={() => setFilterOnlyAvail(!filterOnlyAvail)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: 'var(--c3)', borderRadius: 12, border: filterOnlyAvail ? '1px solid var(--gold)' : '1px solid var(--border)', cursor: 'pointer' }}>
              <span style={{ width: 18, height: 18, borderRadius: 4, border: '1.5px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--gold)', background: filterOnlyAvail ? 'rgba(176,144,96,.15)' : 'transparent' }}>{filterOnlyAvail ? '✓' : ''}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cream)' }}>Nur Verfügbare</span>
            </button>
            <button onClick={() => setFilterOnlyDisc(!filterOnlyDisc)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: 'var(--c3)', borderRadius: 12, border: filterOnlyDisc ? '1px solid var(--gold)' : '1px solid var(--border)', cursor: 'pointer' }}>
              <span style={{ width: 18, height: 18, borderRadius: 4, border: '1.5px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--gold)', background: filterOnlyDisc ? 'rgba(176,144,96,.15)' : 'transparent' }}>{filterOnlyDisc ? '✓' : ''}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cream)' }}>Nur Rabatte</span>
            </button>
          </div>
          <button onClick={() => setShowFilter(false)} className="bgold" style={{ width: '100%' }}>
            Anwenden ({filtered.length})
          </button>
        </div>
      )}

      {/* Categories Grid */}
      <section style={{ padding: '0 var(--pad)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p className="text-gold-accent" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Kategorien</p>
          <Link href="/explore" className="text-gold-accent" style={{ fontSize: 12, textDecoration: 'none' }}>Alle</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {categories.map((cat) => (
            <a key={cat.id} href={`/category/${cat.slug}`} style={{ textDecoration: 'none' }}>
              <div className="catcard">
                <div className="caticon">
                  <CategoryIcon slug={cat.slug} label={cat.label} />
                </div>
                <div className="catlbl">{cat.label}</div>
                <div className="catsub">{cat.description || ''}</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Vermietung CTA: Stuhl / Kabine / OP-Raum für Anbieter */}
      <section style={{ padding: '16px var(--pad) 0' }}>
        <div className="card" style={{ padding: 16 }}>
          <p className="text-gold-metallic" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', marginBottom: 6 }}>STUHL · KABINE · OP-RAUM</p>
          <p style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.45, marginBottom: 12 }}>
            Als Barber, Friseur, Masseur oder Praxis: Stuhl, Liege oder OP-Raum tageweise mieten – oder selbst vermieten.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/rentals" className="bgold" style={{ padding: '10px 16px', fontSize: 12, textDecoration: 'none', borderRadius: 'var(--btn-radius)' }}>
              Angebote finden
            </Link>
            <Link href="/register/anbieter" className="boutline" style={{ padding: '10px 16px', fontSize: 12, textDecoration: 'none', borderRadius: 'var(--btn-radius)' }}>
              Anbieter werden
            </Link>
          </div>
        </div>
      </section>

      {/* Top Specialists Scroll */}
      <section style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 var(--pad) 12px' }}>
          <p className="text-gold-accent" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Top Spezialisten</p>
          <span className="badge badge-green" style={{ fontSize: 9 }}>Heute verfügbar</span>
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 var(--pad) 4px', WebkitOverflowScrolling: 'touch' }}>
          {SPECS.map(s => (
            <div key={s.id} style={{ flexShrink: 0, textAlign: 'center', width: 68 }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: s.col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, border: '2px solid rgba(176,144,96,.2)', margin: '0 auto 5px', color: 'var(--cream)' }}>
                {s.ini}
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cream)' }}>{s.nm.split(' ')[0]}</p>
              <p style={{ fontSize: 9, color: 'var(--stone)' }}>{s.role.split(' ')[0]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Provider Cards */}
      <section style={{ padding: '20px var(--pad) 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p className="text-gold-accent" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Alle Anbieter</p>
          <span style={{ fontSize: 12, color: 'var(--stone)' }}>{filtered.length} gefunden</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(p => (
            <ProviderCard key={p.id} p={p} favorites={favorites} toggleFav={toggleFav} />
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section style={{ padding: '24px var(--pad)' }}>
        <div className="card" style={{ padding: 18, textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold2)', marginBottom: 6 }}>Newsletter</p>
          <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 12 }}>Exklusive Angebote & neue Salons direkt in dein Postfach</p>
          {nlStatus === 'ok' ? (
            <p style={{ fontSize: 13, color: 'var(--gold2)', fontWeight: 700 }}>Erfolgreich angemeldet!</p>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="email" placeholder="E-Mail Adresse" className="inp" style={{ flex: 1 }} value={nlEmail} onChange={e => setNlEmail(e.target.value)} />
              <button className="bgold" style={{ padding: '10px 16px', fontSize: 12, whiteSpace: 'nowrap' }} onClick={async () => {
                if (!nlEmail) return
                try {
                  const res = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: nlEmail }) })
                  setNlStatus(res.ok ? 'ok' : 'err')
                } catch { setNlStatus('err') }
              }}>Anmelden</button>
            </div>
          )}
          {nlStatus === 'err' && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>Fehler — bitte erneut versuchen.</p>}
        </div>
      </section>

      <div style={{ height: 80 }} />
    </>
  )
}

function ProviderCard({ p, favorites, toggleFav }: { p: DemoProvider; favorites: string[]; toggleFav: (id: string, e: React.MouseEvent) => void }) {
  const minPrice = p.svs.length > 0 ? Math.min(...p.svs.map(s => s.pr)) : 0

  return (
    <a href={`/salon/${p.id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{
        overflow: 'hidden',
        border: p.tier === 'gold' ? '1.5px solid rgba(176,144,96,.3)' : p.tier === 'premium' ? '1.5px solid rgba(176,144,96,.15)' : undefined,
        boxShadow: p.tier === 'gold' ? '0 0 20px rgba(176,144,96,.08)' : undefined,
      }}>
        {/* Tier stripe */}
        <div style={{
          height: 3,
          background: p.tier === 'gold'
            ? 'linear-gradient(90deg,#AA771C,#D4AF37,#FCF6BA,#D4AF37,#AA771C)'
            : p.tier === 'premium'
              ? 'linear-gradient(90deg,#9A70C8,#D4AF37)'
              : p.bc,
        }} />

        <div style={{ padding: '13px 15px' }}>
          {/* Badges & Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7, gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Tier badges */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 5 }}>
                {p.tier === 'gold' && <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 20, fontWeight: 700, background: 'linear-gradient(135deg,#BF953F,#FCF6BA,#B38728)', color: '#1a1000' }}>👑 GOLD</span>}
                {p.tier === 'premium' && <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 20, fontWeight: 700, background: 'linear-gradient(135deg,#9A70C8,#C8A0F0)', color: '#1a1020' }}>⚡ PREMIUM</span>}
                {p.ver && <span className="badge badge-green" style={{ fontSize: 9, padding: '3px 8px' }}>✓ Verifiziert</span>}
                {p.disc > 0 && <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, background: 'rgba(232,80,64,.12)', color: 'var(--red)', fontWeight: 700 }}>−{p.disc}%</span>}
              </div>
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--cream)' }}>{p.nm}</p>
              </div>
              {/* Address */}
              <p style={{ fontSize: 12, color: 'var(--stone)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.st} · {p.city}
              </p>
            </div>
            {/* Right: Fav + Rating */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              <button onClick={(e) => toggleFav(p.id, e)} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: favorites.includes(p.id) ? 'var(--red)' : 'var(--stone)' }}>
                {favorites.includes(p.id) ? '♥' : '♡'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Stars rating={p.rt} />
                <span className="text-gold-accent" style={{ fontSize: 12, fontWeight: 700 }}>{p.rt}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--stone)' }}>({p.rc})</span>
            </div>
          </div>

          {/* Rental badges */}
          {p.rental.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
              {p.rental.map((r, i) => (
                <span key={i} style={{ fontSize: 10, padding: '3px 7px', borderRadius: 6, background: 'rgba(176,144,96,.08)', border: '1px solid rgba(176,144,96,.15)', color: 'var(--gold2)', fontWeight: 600 }}>
                  {RENTAL_ICONS[r.type] ? <img src={RENTAL_ICONS[r.type]} width={16} height={16} alt={r.type} style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 4px rgba(176,144,96,0.4))', borderRadius: 3, verticalAlign: 'middle', marginRight: 3 }} /> : null}{r.pr}€/Tag
                </span>
              ))}
            </div>
          )}

          {/* Availability & Price */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {p.frei > 0 && (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4A8A5A' }} />
                  <span style={{ fontSize: 11, color: '#6ABF80' }}>{p.frei} frei</span>
                </div>
              )}
              <span style={{ fontSize: 10, color: '#6ABF80', fontWeight: 600 }}>● Offen</span>
            </div>
            {minPrice > 0 && (
              <span className="text-gold-metallic" style={{ fontSize: 15, fontWeight: 800 }}>
                ab {minPrice} €
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  )
}
