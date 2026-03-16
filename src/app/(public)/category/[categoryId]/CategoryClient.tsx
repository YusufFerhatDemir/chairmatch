'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PROVS, type DemoProvider } from '@/lib/demo-data'

interface DBSalon {
  id: string
  name: string
  slug: string | null
  description: string | null
  city: string | null
  avg_rating: number
  is_verified: boolean
  review_count: number
  subscription_tier: string
  services: { id: string; name: string; sort_order: number }[]
}

interface Props {
  categoryId: string
  category: { id: string; slug: string; label: string; description: string | null } | null
  dbSalons: DBSalon[]
}

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ opacity: i <= Math.round(rating) ? 1 : 0.3, color: 'var(--gold)', fontSize: 12 }}>★</span>
      ))}
    </span>
  )
}

export default function CategoryClient({ categoryId, category, dbSalons }: Props) {
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('cm_favorites')
    if (saved) setFavorites(JSON.parse(saved))
  }, [])

  function toggleFav(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
      localStorage.setItem('cm_favorites', JSON.stringify(next))
      return next
    })
  }

  // Get demo providers for this category, excluding any that exist in DB (by name match)
  const dbNames = new Set(dbSalons.map(s => s.name.toLowerCase()))
  const demoProviders = dbSalons.length > 0
    ? PROVS.filter(p => p.cat === categoryId && !dbNames.has(p.nm.toLowerCase()))
    : PROVS.filter(p => p.cat === categoryId)

  // Category label fallback
  const categoryLabels: Record<string, string> = {
    barber: 'Barbershop', friseur: 'Friseur', kosmetik: 'Kosmetik', aesthetik: 'Ästhetik',
    nail: 'Nagelstudio', massage: 'Massage', lash: 'Lash & Brows', arzt: 'Arzt / Klinik', opraum: 'OP-Raum',
  }

  return (
    <div className="shell">
      <div className="screen">
        <div className="sticky">
          <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Zurück</Link>
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginTop: 8 }}>
            {category?.label || categoryLabels[categoryId] || categoryId}
          </h1>
          {category?.description && (
            <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginTop: 4 }}>{category.description}</p>
          )}
          <p style={{ fontSize: 12, color: 'var(--stone)', marginTop: 6 }}>
            {demoProviders.length + dbSalons.length} Anbieter gefunden
          </p>
        </div>

        <section style={{ padding: '0 var(--pad)' }}>
          {demoProviders.length === 0 && dbSalons.length === 0 ? (
            <p style={{ color: 'var(--stone)', padding: '40px 0', textAlign: 'center' }}>
              Keine Anbieter in dieser Kategorie gefunden.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Demo providers */}
              {demoProviders.map(p => (
                <a key={p.id} href={`/salon/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{
                    overflow: 'hidden',
                    border: p.tier === 'gold' ? '1.5px solid rgba(190,133,16,.3)' : p.tier === 'premium' ? '1.5px solid rgba(190,133,16,.15)' : undefined,
                  }}>
                    <div style={{
                      height: 3,
                      background: p.tier === 'gold' ? 'linear-gradient(90deg,#BE8510,#D09820,#BE8510)' : p.tier === 'premium' ? 'linear-gradient(90deg,#9A70C8,#BE8510)' : p.bc,
                    }} />
                    <div style={{ padding: '13px 15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7, gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 5 }}>
                            {p.tier === 'gold' && <span className="badge badge-gold" style={{ fontSize: 9, padding: '3px 8px' }}>👑 GOLD</span>}
                            {p.tier === 'premium' && <span className="badge badge-gold" style={{ fontSize: 9, padding: '3px 8px' }}>⚡ PREMIUM</span>}
                            {p.ver && <span className="badge badge-green" style={{ fontSize: 9, padding: '3px 8px' }}>✓ Verifiziert</span>}
                            {p.disc > 0 && <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, background: 'rgba(232,80,64,.12)', color: 'var(--red)', fontWeight: 700 }}>−{p.disc}%</span>}
                          </div>
                          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nm}</p>
                          <p style={{ fontSize: 12, color: 'var(--stone)' }}>{p.st} · {p.city}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                          <button onClick={(e) => toggleFav(p.id, e)} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: favorites.includes(p.id) ? 'var(--red)' : 'var(--stone)' }}>
                            {favorites.includes(p.id) ? '♥' : '♡'}
                          </button>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Stars rating={p.rt} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold2)' }}>{p.rt}</span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--stone)' }}>({p.rc})</span>
                        </div>
                      </div>
                      {p.rental.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                          {p.rental.map((r, i) => (
                            <span key={i} style={{ fontSize: 10, padding: '3px 7px', borderRadius: 6, background: 'rgba(190,133,16,.08)', border: '1px solid rgba(190,133,16,.15)', color: 'var(--gold2)', fontWeight: 600 }}>
                              {r.type === 'stuhl' ? '💺' : r.type === 'liege' ? '🛏' : r.type === 'opraum' ? '🏥' : '🚪'} {r.pr}€/Tag
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.live ? '#4A8A5A' : '#C04040' }} />
                            <span style={{ fontSize: 11, color: p.live ? '#6ABF80' : 'var(--stone)' }}>{p.live ? `${p.frei} frei` : 'Ausgebucht'}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold2)' }}>ab {Math.min(...p.svs.map(s => s.pr))} €</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
              {/* DB salons */}
              {dbSalons.map(s => (
                <a key={s.id} href={`/salon/${s.slug || s.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '13px 15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {s.is_verified && <span className="badge badge-green" style={{ fontSize: 9, padding: '3px 8px', marginBottom: 5, display: 'inline-flex' }}>✓ Verifiziert</span>}
                          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--cream)' }}>{s.name}</p>
                          <p style={{ fontSize: 12, color: 'var(--stone)' }}>{s.city}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Stars rating={Number(s.avg_rating)} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold2)' }}>{Number(s.avg_rating).toFixed(1)}</span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--stone)' }}>({s.review_count})</span>
                        </div>
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
