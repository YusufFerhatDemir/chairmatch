'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import type { BreadcrumbItem } from '@/lib/seo'

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
  breadcrumbs?: BreadcrumbItem[]
}

const CATEGORY_FALLBACK_BG: Record<string, string> = {
  barber: 'linear-gradient(135deg,#5C4A28,#2A1F10)',
  friseur: 'linear-gradient(135deg,#3A3025,#1F1A0F)',
  kosmetik: 'linear-gradient(135deg,#4A3A28,#241910)',
  aesthetik: 'linear-gradient(135deg,#5C4A30,#2A1F15)',
  nail: 'linear-gradient(135deg,#4A3025,#241510)',
  massage: 'linear-gradient(135deg,#3A2818,#1A1208)',
  lash: 'linear-gradient(135deg,#4A2A20,#241510)',
  arzt: 'linear-gradient(135deg,#3A4A28,#1F2A10)',
  opraum: 'linear-gradient(135deg,#2A3A4A,#101F2A)',
}

function formatYears(salonCreatedYear = 2023): string {
  const years = new Date().getFullYear() - salonCreatedYear
  return years > 0 ? `${years} J` : 'NEU'
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 1) return 'heute'
    if (diff < 2) return 'gestern'
    if (diff < 7) return `vor ${diff} Tagen`
    if (diff < 30) return `vor ${Math.floor(diff / 7)} Wochen`
    return d.toLocaleDateString('de-DE')
  } catch { return '' }
}

export default function SalonDetailClient({ salon, services, reviews, rentals, breadcrumbs }: Props) {
  const router = useRouter()
  const [isFav, setIsFav] = useState(false)

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('cm_favorites') || '[]')
      setIsFav(favs.includes(salon.id))
    } catch {}
  }, [salon.id])

  function toggleFav() {
    try {
      const favs = JSON.parse(localStorage.getItem('cm_favorites') || '[]')
      const next = favs.includes(salon.id)
        ? favs.filter((x: string) => x !== salon.id)
        : [...favs, salon.id]
      localStorage.setItem('cm_favorites', JSON.stringify(next))
      setIsFav(next.includes(salon.id))
    } catch {}
  }

  const bgGradient = CATEGORY_FALLBACK_BG[salon.category] || 'linear-gradient(135deg,#3A3025,#1F1A0F)'
  const initials = salon.name.slice(0, 2).toUpperCase()
  const minPrice = services.length > 0 ? Math.min(...services.map(s => s.price_cents)) / 100 : null
  const cityLine = salon.street ? `${salon.street}, ${salon.city || ''}` : salon.city || ''

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
        {/* Hero */}
        <div style={{
          width: '100%', aspectRatio: '5/4', background: bgGradient,
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(196,168,106,0.4)" strokeWidth="1" style={{ opacity: 0.5 }}>
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
          <button
            onClick={() => router.back()}
            style={{
              position: 'absolute', top: 20, left: 20,
              width: 42, height: 42, borderRadius: '50%',
              background: 'rgba(11,11,15,0.7)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(196,168,106,0.3)',
              color: 'var(--cream)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}
          >‹</button>
          <button
            onClick={toggleFav}
            style={{
              position: 'absolute', top: 20, right: 74,
              width: 42, height: 42, borderRadius: '50%',
              background: 'rgba(11,11,15,0.7)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(196,168,106,0.3)',
              color: isFav ? '#E85040' : 'var(--cream)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}
          >{isFav ? '♥' : '♡'}</button>
          <button
            onClick={async () => {
              if (navigator.share) {
                try { await navigator.share({ title: salon.name, url: window.location.href }) } catch {}
              } else {
                try { await navigator.clipboard.writeText(window.location.href) } catch {}
              }
            }}
            style={{
              position: 'absolute', top: 20, right: 20,
              width: 42, height: 42, borderRadius: '50%',
              background: 'rgba(11,11,15,0.7)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(196,168,106,0.3)',
              color: 'var(--cream)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}
          >↗</button>
        </div>

        {/* Avatar Card */}
        <div style={{
          margin: '-32px 20px 0', position: 'relative',
          background: 'linear-gradient(145deg, rgba(191,149,63,0.08) 0%, var(--c2) 50%, rgba(179,135,40,0.05) 100%)',
          border: '1px solid rgba(191,149,63,0.25)',
          borderRadius: 20, padding: 16,
          display: 'flex', gap: 14, alignItems: 'center',
          boxShadow: '0 0 20px rgba(191,149,63,0.15), 0 14px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            width: 58, height: 58, borderRadius: '50%',
            border: '2px solid var(--gold2)',
            background: 'linear-gradient(135deg,#2A2418,#161210)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span className="cinzel text-gold-metallic" style={{ fontSize: 22, fontWeight: 600 }}>
              {initials}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--cream)' }}>{salon.name}</p>
            {cityLine && <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>{cityLine}</p>}
            {salon.is_verified && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 9, padding: '2px 7px', borderRadius: 6, fontWeight: 700, letterSpacing: 1,
                background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
                color: '#1a1000', marginTop: 6,
              }}>✓ VERIFIZIERT</span>
            )}
          </div>
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div style={{ padding: '14px 20px 0' }}>
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}

        {/* KPI Strip */}
        <div style={{ display: 'flex', gap: 8, padding: '16px 20px 0' }}>
          <div style={{ flex: 1, background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 14, padding: 10, textAlign: 'center' }}>
            <div className="cinzel text-gold-metallic" style={{ fontSize: 17, fontWeight: 600 }}>{salon.avg_rating.toFixed(1)}★</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 2, textTransform: 'uppercase' }}>{salon.review_count} Bewertungen</div>
          </div>
          <div style={{ flex: 1, background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 14, padding: 10, textAlign: 'center' }}>
            <div className="cinzel text-gold-metallic" style={{ fontSize: 17, fontWeight: 600 }}>{services.length}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 2, textTransform: 'uppercase' }}>Services</div>
          </div>
          <div style={{ flex: 1, background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 14, padding: 10, textAlign: 'center' }}>
            <div className="cinzel text-gold-metallic" style={{ fontSize: 17, fontWeight: 600 }}>{formatYears()}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 2, textTransform: 'uppercase' }}>Auf ChairMatch</div>
          </div>
        </div>

        {/* About */}
        {salon.description && (
          <div style={{ padding: '18px 20px 0' }}>
            <h3 className="cinzel text-gold-metallic" style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Über den Salon</h3>
            <p style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.6 }}>{salon.description}</p>
          </div>
        )}

        {/* Services */}
        {services.length > 0 && (
          <div style={{ padding: '18px 20px 0' }}>
            <h3 className="cinzel text-gold-metallic" style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Services &amp; Preise</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {services.map((s) => (
                <div key={s.id} style={{
                  background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
                  borderRadius: 12, padding: '12px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, cursor: 'pointer',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--cream)' }}>{s.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>{s.duration_minutes} Min</p>
                  </div>
                  <span className="cinzel text-gold-metallic" style={{ fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                    {(s.price_cents / 100).toFixed(0)} €
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opening Hours */}
        {salon.opening_hours && (
          <div style={{ padding: '18px 20px 0' }}>
            <h3 className="cinzel text-gold-metallic" style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Öffnungszeiten</h3>
            <div style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 12, padding: '12px 14px', fontSize: 12.5, lineHeight: 2, color: 'var(--cream)' }}>
              {[
                { id: 'mon', l: 'Montag' }, { id: 'tue', l: 'Dienstag' }, { id: 'wed', l: 'Mittwoch' },
                { id: 'thu', l: 'Donnerstag' }, { id: 'fri', l: 'Freitag' }, { id: 'sat', l: 'Samstag' }, { id: 'sun', l: 'Sonntag' },
              ].map(d => {
                const h = salon.opening_hours?.[d.id]
                return (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', opacity: h ? 1 : 0.5 }}>
                    <span>{d.l}</span>
                    <span style={{ color: h ? 'var(--gold2)' : undefined, fontWeight: h ? 700 : undefined }}>
                      {h ? `${h.open} – ${h.close}` : 'Ruhetag'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div style={{ padding: '18px 20px 0' }}>
            <h3 className="cinzel text-gold-metallic" style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Aktuelle Bewertungen</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reviews.slice(0, 3).map((r) => (
                <div key={r.id} style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700 }}>{r.customer?.full_name || 'Kunde'}</span>
                    <span style={{ fontSize: 10, color: 'var(--stone)' }}>{formatDate(r.created_at)}</span>
                  </div>
                  <div style={{ color: 'var(--gold)', fontSize: 12, letterSpacing: 1, marginBottom: 5 }}>
                    {'★'.repeat(Math.round(r.rating))}
                  </div>
                  {r.comment && <p style={{ fontSize: 11.5, color: 'var(--stone)', lineHeight: 1.5 }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rentals (Vermietungen falls vorhanden) */}
        {rentals.length > 0 && (
          <div style={{ padding: '18px 20px 0' }}>
            <h3 className="cinzel text-gold-metallic" style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Auch zum Mieten</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rentals.slice(0, 3).map((r) => (
                <div key={r.id} style={{
                  background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
                  borderRadius: 12, padding: '12px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 700 }}>{r.name}</p>
                    {r.description && <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>{r.description.slice(0, 50)}</p>}
                  </div>
                  <span className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700 }}>{(r.price_per_day_cents / 100).toFixed(0)} €/Tag</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ padding: '20px 20px 0' }}>
          <button
            onClick={() => router.push(`/salon/${salon.slug || salon.id}/buchen` as never)}
            style={{
              width: '100%', padding: 16, borderRadius: 14,
              background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
              color: '#1a1000', border: 'none',
              fontFamily: 'inherit', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 0 22px rgba(196,168,106,0.3)',
            }}
          >
            <span>Termin buchen</span>
            <span className="cinzel" style={{ fontWeight: 700 }}>
              {minPrice ? `ab ${minPrice} € →` : '→'}
            </span>
          </button>
        </div>

        <BottomNav role="mieter" />
      </div>
    </div>
  )
}
