'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PROVS, getProviderSpecs, type DemoProvider, type DemoSpec } from '@/lib/demo-data'

interface SalonData {
  id: string
  name: string
  slug: string | null
  description: string | null
  category: string
  city: string | null
  street: string | null
  avg_rating: number
  review_count: number
  is_verified: boolean
  subscription_tier: string
  tagline?: string | null
  tags?: string[] | null
  phone?: string | null
  opening_hours?: Record<string, { open: string; close: string } | null> | null
}

interface SalonService {
  id: string
  name: string
  duration_minutes: number
  price_cents: number
}

interface SalonStaff {
  id: string
  name: string
  title: string | null
  avatar_url: string | null
}

interface SalonReview {
  id: string
  rating: number
  comment: string | null
  reply: string | null
  customer?: { full_name: string | null } | null
  created_at: string
}

interface SalonRental {
  id: string
  type: string
  name: string
  price_per_day_cents: number
  description: string | null
}

interface Props {
  salon: SalonData
  services: SalonService[]
  staff: SalonStaff[]
  reviews: SalonReview[]
  rentals: SalonRental[]
}

type TabId = 'info' | 'services' | 'team' | 'bewertungen' | 'galerie' | 'vermietung'

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ opacity: i <= Math.round(rating) ? 1 : 0.3, color: '#E8C86A', fontSize: size }}>★</span>
      ))}
    </span>
  )
}

function ReviewCard({ review: r }: { review: SalonReview }) {
  const [reported, setReported] = useState(false)
  const isDemoId = typeof r.id === 'string' && r.id.startsWith('dr')
  async function handleReport() {
    if (reported || isDemoId) return
    const res = await fetch(`/api/reviews/${r.id}/report`, { method: 'POST' })
    if (res.ok) setReported(true)
  }
  return (
    <div style={{ padding: '13px 15px', background: 'var(--c2)', borderRadius: 13, marginBottom: 8, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)' }}>{r.customer?.full_name || 'Gast'}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--stone)' }}>{r.created_at}</span>
          {!isDemoId && (
            <button
              onClick={handleReport}
              disabled={reported}
              style={{ fontSize: 10, color: reported ? 'var(--stone)' : 'var(--stone)', background: 'none', border: 'none', cursor: reported ? 'default' : 'pointer', textDecoration: 'underline' }}
            >
              {reported ? 'Gemeldet' : 'Melden'}
            </button>
          )}
        </div>
      </div>
      <Stars rating={r.rating} />
      {r.comment && <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6, marginTop: 5 }}>{r.comment}</p>}
      {r.reply && (
        <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--stone)', fontStyle: 'italic' }}>Antwort: {r.reply}</p>
        </div>
      )}
    </div>
  )
}

export default function SalonDetailClient({ salon, services, staff, reviews, rentals }: Props) {
  const [tab, setTab] = useState<TabId>('info')
  const [isFav, setIsFav] = useState(false)

  // Try to find matching demo provider for richer data
  const demoP = PROVS.find(p => p.id === salon.id || p.nm === salon.name)
  const demoSpecs = demoP ? getProviderSpecs(demoP) : []

  // Use demo data if DB data is sparse
  const displayServices = services.length > 0 ? services : (demoP?.svs || []).map(s => ({
    id: s.id, name: s.nm, duration_minutes: s.dur, price_cents: s.pr * 100,
  }))
  const displayReviews = reviews.length > 0 ? reviews : (demoP?.revs || []).map((r, i) => ({
    id: `dr${i}`, rating: r.s, comment: r.t, reply: null, customer: { full_name: r.u }, created_at: r.d,
  }))
  const displayRentals = rentals.length > 0 ? rentals : (demoP?.rental || []).map((r, i) => ({
    id: `rl${i}`, type: r.type, name: r.type === 'stuhl' ? 'Stuhl' : r.type === 'liege' ? 'Liege' : r.type === 'opraum' ? 'OP-Raum' : 'Raum',
    price_per_day_cents: r.pr * 100, description: null,
  }))
  const displayStaff = staff.length > 0 ? staff : demoSpecs.map(s => ({
    id: s.id, name: s.nm, title: s.role, avatar_url: null,
  }))

  const displayRating = demoP ? demoP.rt : Number(salon.avg_rating)
  const displayReviewCount = demoP ? demoP.rc : salon.review_count
  const displayTags = demoP?.tags || salon.tags || []
  const displayTagline = demoP?.tl || salon.tagline || salon.description || ''

  const isB2B = typeof window !== 'undefined' && sessionStorage.getItem('cm_role') === 'B2B'
  const baseTabs: TabId[] = ['info', 'services', 'team', 'bewertungen', 'galerie']
  if (isB2B && displayRentals.length > 0) baseTabs.splice(1, 0, 'vermietung')

  const tabLabels: Record<TabId, string> = {
    info: 'Info', services: 'Services', team: 'Team',
    bewertungen: 'Bewertungen', galerie: 'Galerie', vermietung: 'Vermietung',
  }

  useEffect(() => {
    const favs = JSON.parse(localStorage.getItem('cm_favorites') || '[]')
    setIsFav(favs.includes(salon.id) || favs.includes(demoP?.id))
  }, [salon.id, demoP?.id])

  function toggleFav() {
    const favs: string[] = JSON.parse(localStorage.getItem('cm_favorites') || '[]')
    const id = demoP?.id || salon.id
    const next = favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id]
    localStorage.setItem('cm_favorites', JSON.stringify(next))
    setIsFav(!isFav)
  }

  const dayLabels: Record<string, string> = { mo: 'Mo', di: 'Di', mi: 'Mi', do: 'Do', fr: 'Fr', sa: 'Sa', so: 'So' }
  const openingHours = salon.opening_hours || {}

  const demoGal = demoP?.gal || []

  return (
    <div className="shell">
      <div className="screen">
        {/* Header */}
        <div style={{ padding: '20px var(--pad)', background: 'var(--c1)' }}>
          <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Zurück</Link>
          <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 12 }}>{salon.name}</h1>
          {displayTagline && <p style={{ color: 'var(--stone)', fontSize: 'var(--font-md)', marginTop: 4 }}>{displayTagline}</p>}
          <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Stars rating={displayRating} size={14} />
              <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{displayRating.toFixed(1)}</span>
            </div>
            <span style={{ color: 'var(--stone2)', fontSize: 'var(--font-sm)' }}>{displayReviewCount} Bewertungen</span>
            <span style={{ color: 'var(--stone2)', fontSize: 'var(--font-sm)' }}>{salon.city}</span>
          </div>
          {/* Tags */}
          {displayTags.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
              {displayTags.map(t => (
                <span key={t} className="badge badge-gold" style={{ fontSize: 10, padding: '3px 8px' }}>{t}</span>
              ))}
            </div>
          )}
          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            {salon.phone && (
              <a href={`https://wa.me/${salon.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 12, background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                💬 WhatsApp
              </a>
            )}
            <button onClick={toggleFav} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 12, background: 'var(--c2)', border: '1px solid var(--border)', color: isFav ? 'var(--red)' : 'var(--cream)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {isFav ? '♥ Gespeichert' : '♡ Merken'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ padding: '12px var(--pad)', display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {baseTabs.map(tb => (
            <button key={tb} onClick={() => setTab(tb)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, flexShrink: 0,
              background: tab === tb ? 'var(--gold)' : 'var(--c3)',
              color: tab === tb ? '#080706' : 'var(--stone)',
              border: tab === tb ? '1px solid var(--gold)' : '1px solid var(--border)',
              cursor: 'pointer',
            }}>
              {tabLabels[tb]}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '0 var(--pad) 16px' }}>
          {/* INFO TAB */}
          {tab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Opening Hours */}
              <div className="card" style={{ padding: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold2)', marginBottom: 8 }}>Öffnungszeiten</p>
                {Object.entries(dayLabels).map(([key, label]) => {
                  const h = openingHours[key] as { open: string; close: string } | null | undefined
                  return (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ color: 'var(--cream)' }}>{label}</span>
                      <span style={{ color: 'var(--stone)' }}>{h ? `${h.open} – ${h.close}` : 'Geschlossen'}</span>
                    </div>
                  )
                })}
              </div>

              {/* Top 4 Services Preview */}
              {displayServices.length > 0 && (
                <div className="card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold2)' }}>Services</p>
                    <button onClick={() => setTab('services')} style={{ fontSize: 12, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>Alle →</button>
                  </div>
                  {displayServices.slice(0, 4).map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ color: 'var(--cream)' }}>{s.name}</span>
                      <span style={{ color: 'var(--gold2)', fontWeight: 700 }}>{(s.price_cents / 100).toFixed(0)} €</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Rental */}
              {displayRentals.length > 0 && (
                <div className="card" style={{ padding: 14 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold2)', marginBottom: 8 }}>Vermietung</p>
                  {displayRentals.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 13, color: 'var(--cream)' }}>
                        {r.type === 'stuhl' ? '💺' : r.type === 'liege' ? '🛏' : r.type === 'opraum' ? '🏥' : '🚪'} {r.name}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold2)' }}>{(r.price_per_day_cents / 100).toFixed(0)}€/Tag</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Warum ChairMatch */}
              <div className="card" style={{ padding: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold2)', marginBottom: 10 }}>Warum ChairMatch?</p>
                {[
                  ['Faire Konditionen', 'Beste Preise garantiert'],
                  ['Direktbuchung', 'Kein Umweg'],
                  ['Verifiziert', 'Gewerbeschein geprüft'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: 'var(--gold2)' }}>{k}</span>
                    <span style={{ color: 'var(--stone)', fontSize: 12 }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Book Button */}
              <Link href={`/booking/${salon.id}`} className="bgold" style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}>
                Termin buchen
              </Link>
            </div>
          )}

          {/* SERVICES TAB */}
          {tab === 'services' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {displayServices.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 15px', background: 'var(--c2)', borderRadius: 13, border: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>{s.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--stone)' }}>{s.duration_minutes} min</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold2)' }}>{(s.price_cents / 100).toFixed(0)} €</span>
                    <Link href={`/booking/${salon.id}`} className="bgold" style={{ padding: '8px 14px', fontSize: 12, textDecoration: 'none' }}>Buchen</Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TEAM TAB */}
          {tab === 'team' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {(demoSpecs.length > 0 ? demoSpecs : displayStaff.map(m => ({ id: m.id, nm: m.name, role: m.title || '', rt: 0, cat: '', ini: m.name.split(' ').map(n => n[0]).join('').slice(0, 2), col: 'var(--c3)' }))).map(s => (
                <div key={s.id} style={{ flex: '1 1 calc(50% - 5px)', padding: 14, background: 'var(--c2)', borderRadius: 16, textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: s.col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, margin: '0 auto 8px', color: 'var(--cream)' }}>
                    {s.ini}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)' }}>{s.nm}</p>
                  <p style={{ fontSize: 11, color: 'var(--stone)', marginBottom: 5 }}>{s.role}</p>
                  {s.rt > 0 && <Stars rating={s.rt} />}
                </div>
              ))}
            </div>
          )}

          {/* BEWERTUNGEN TAB */}
          {tab === 'bewertungen' && (
            <div>
              {/* Rating Overview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--c2)', borderRadius: 14, border: '1px solid var(--border)', marginBottom: 14 }}>
                <p className="cinzel" style={{ fontSize: 36, fontWeight: 700, color: 'var(--gold2)' }}>{displayRating.toFixed(1)}</p>
                <div>
                  <Stars rating={displayRating} size={16} />
                  <p style={{ fontSize: 12, color: 'var(--stone)', marginTop: 4 }}>{displayReviewCount} Bewertungen</p>
                </div>
              </div>
              {/* Review Cards */}
              {displayReviews.map(r => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          )}

          {/* GALERIE TAB */}
          {tab === 'galerie' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {demoGal.length > 0 ? demoGal.map((g, i) => (
                <div key={i} className="card" style={{ padding: 14 }}>
                  <div style={{ marginBottom: 8 }}>
                    <span className="badge badge-gold" style={{ fontSize: 10 }}>{g.sv}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--stone)', marginBottom: 6 }}>Vorher</p>
                      <div style={{ height: 120, borderRadius: 12, background: `linear-gradient(135deg,${g.b},${g.b}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, opacity: .7 }}>📷</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: 16, color: 'var(--gold)' }}>→</div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--stone)', marginBottom: 6 }}>Nachher</p>
                      <div style={{ height: 120, borderRadius: 12, background: `linear-gradient(135deg,${g.a},${g.a}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✨</div>
                    </div>
                  </div>
                </div>
              )) : (
                <p style={{ color: 'var(--stone)', textAlign: 'center', padding: 40 }}>Keine Galerie-Bilder vorhanden.</p>
              )}
            </div>
          )}

          {/* VERMIETUNG TAB */}
          {tab === 'vermietung' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayRentals.map(r => (
                <div key={r.id} className="card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{r.type === 'stuhl' ? '💺' : r.type === 'liege' ? '🛏' : r.type === 'opraum' ? '🏥' : '🚪'}</span>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>{r.name}</p>
                        {r.description && <p style={{ fontSize: 12, color: 'var(--stone)' }}>{r.description}</p>}
                      </div>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold2)' }}>{(r.price_per_day_cents / 100).toFixed(0)}€/Tag</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={salon.phone ? `https://wa.me/${salon.phone.replace(/[^0-9]/g, '')}` : '#'} target="_blank" rel="noopener noreferrer" className="bgold" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', padding: '10px', fontSize: 12 }}>
                      💬 WhatsApp
                    </a>
                    <a href={`mailto:info@chairmatch.de?subject=Mietanfrage: ${salon.name} – ${r.name || r.type}&body=Hallo,%0A%0Aich interessiere mich für die Miete von: ${r.name || r.type} (${(r.price_per_day_cents / 100).toFixed(0)}€/Tag)%0A%0ASalon: ${salon.name}%0A%0AMit freundlichen Grüßen`} className="boutline" style={{ flex: 1, fontSize: 12, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>Jetzt mieten</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
