'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PROVS, type DemoProvider } from '@/lib/demo-data'
import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { useTranslations } from '@/i18n/client'

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

const CATEGORY_LABELS: Record<string, string> = {
  barber: 'Barbershop', friseur: 'Friseur', kosmetik: 'Kosmetik', aesthetik: 'Ästhetik',
  nail: 'Nagelstudio', massage: 'Massage', lash: 'Lash & Brows', arzt: 'Arzt / Klinik',
  opraum: 'OP-Raum', medical: 'Medical Beauty', pmu: 'Permanent Make-Up',
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

export default function CategoryClient({ categoryId, category, dbSalons }: Props) {
  const router = useRouter()
  const t = useTranslations()
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cm_favorites')
      if (saved) setFavorites(JSON.parse(saved))
    } catch {}
  }, [])

  function toggleFav(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
      try { localStorage.setItem('cm_favorites', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const dbNames = new Set(dbSalons.map(s => s.name.toLowerCase()))
  const demoProviders = dbSalons.length > 0
    ? PROVS.filter(p => p.cat === categoryId && !dbNames.has(p.nm.toLowerCase()))
    : PROVS.filter(p => p.cat === categoryId)

  const total = demoProviders.length + dbSalons.length
  const categoryLabel = category?.label || CATEGORY_LABELS[categoryId] || categoryId
  const bgGradient = CATEGORY_FALLBACK_BG[categoryId] || 'linear-gradient(135deg,#3A3025,#1F1A0F)'

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '22px 14px 0',
    }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="cat-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#BF953F" />
            <stop offset="22%" stopColor="#FCF6BA" />
            <stop offset="45%" stopColor="#B38728" />
            <stop offset="67%" stopColor="#FBF5B7" />
            <stop offset="100%" stopColor="#AA771C" />
          </linearGradient>
        </defs>
      </svg>

      <div style={{
        width: '100%', maxWidth: 430, background: 'var(--bg)',
        borderRadius: 38, overflow: 'hidden',
        border: '1px solid rgba(196,168,106,0.12)',
        boxShadow: '0 50px 120px rgba(0,0,0,0.78)',
        marginBottom: 24,
      }}>
        {/* Top bar */}
        <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(196,168,106,0.08)',
              border: '1px solid rgba(196,168,106,0.22)',
              color: 'var(--gold2)', fontSize: 18, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >‹</button>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>
            {categoryLabel}
          </span>
        </div>

        {/* Header */}
        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>
              CHAIRMATCH
            </h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        {/* Title */}
        <div style={{ padding: '0 20px 14px' }}>
          <Breadcrumbs items={[{ name: categoryLabel, url: `/category/${categoryId}` }]} />
          <h2 className="cinzel text-gold-metallic" style={{ fontSize: 26, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>
            {categoryLabel} Termine
          </h2>
          {category?.description && (
            <p style={{ fontSize: 13, color: 'var(--stone)' }}>{category.description}</p>
          )}
          <p style={{ fontSize: 11, color: 'var(--gold2)', fontWeight: 600, letterSpacing: 1, marginTop: 6, textTransform: 'uppercase' }}>
            {total} {t('common.found') || 'gefunden'}
          </p>
        </div>

        {/* List */}
        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {total === 0 ? (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              background: 'rgba(176,144,96,0.04)',
              border: '1px dashed rgba(176,144,96,0.25)',
              borderRadius: 18,
            }}>
              <p className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 8 }}>
                Bald verfügbar
              </p>
              <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6 }}>
                Noch keine Anbieter in dieser Kategorie. Bist du Anbieter?{' '}
                <Link href="/anbieter/onboarding" style={{ color: 'var(--gold2)', fontWeight: 700, textDecoration: 'none' }}>
                  Jetzt anmelden
                </Link>
              </p>
            </div>
          ) : (
            <>
              {dbSalons.map((s) => (
                <Link key={s.id} href={`/salon/${s.slug || s.id}`} style={{ textDecoration: 'none' }}>
                  <SalonCard
                    name={s.name}
                    city={s.city || ''}
                    rating={s.avg_rating}
                    reviewCount={s.review_count}
                    services={s.services.map(x => x.name).slice(0, 3)}
                    verified={s.is_verified}
                    bgGradient={bgGradient}
                    isFav={favorites.includes(s.id)}
                    onFav={(e) => toggleFav(s.id, e)}
                  />
                </Link>
              ))}
              {demoProviders.map((p: DemoProvider) => (
                <Link key={p.id} href={`/salon/${p.id}`} style={{ textDecoration: 'none' }}>
                  <SalonCard
                    name={p.nm}
                    city={p.city}
                    rating={p.rt}
                    reviewCount={p.rc}
                    services={(p.svs || []).map(s => s.nm).slice(0, 3)}
                    verified={false}
                    bgGradient={bgGradient}
                    isFav={favorites.includes(p.id)}
                    onFav={(e) => toggleFav(p.id, e)}
                    fromPrice={p.svs?.[0]?.pr}
                  />
                </Link>
              ))}
            </>
          )}
        </div>

        <BottomNav role="mieter" />
      </div>
    </div>
  )
}

function SalonCard({
  name, city, rating, reviewCount, services, verified, bgGradient, isFav, onFav, fromPrice,
}: {
  name: string
  city: string
  rating: number
  reviewCount: number
  services: string[]
  verified: boolean
  bgGradient: string
  isFav: boolean
  onFav: (e: React.MouseEvent) => void
  fromPrice?: number
}) {
  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(191,149,63,0.05) 0%, var(--c1) 50%, rgba(179,135,40,0.03) 100%)',
      border: '1px solid rgba(191,149,63,0.22)',
      borderRadius: 18, overflow: 'hidden',
      boxShadow: '0 0 12px rgba(191,149,63,0.08), 0 14px 32px rgba(0,0,0,0.4)',
      cursor: 'pointer',
    }}>
      {/* Cover-Bild (placeholder bis User Foto hochlädt) */}
      <div style={{
        width: '100%', aspectRatio: '16/9', background: bgGradient,
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#cat-gold)" strokeWidth="1.5" style={{ opacity: 0.5 }}>
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
        {verified && (
          <span style={{
            position: 'absolute', top: 10, right: 10,
            background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
            color: '#1a1000', fontSize: 9, padding: '3px 8px', borderRadius: 8, fontWeight: 700, letterSpacing: 1,
            display: 'flex', alignItems: 'center', gap: 3,
          }}>✓ VERIFIZIERT</span>
        )}
        <button
          onClick={onFav}
          style={{
            position: 'absolute', top: 10, left: 10,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(11,11,15,0.8)', color: isFav ? '#E85040' : 'var(--cream)',
            border: '1px solid rgba(196,168,106,0.3)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}
        >{isFav ? '♥' : '♡'}</button>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--cream)' }}>{name}</p>
            <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>{city}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
            <span style={{ color: 'var(--gold)', fontSize: 12, letterSpacing: 1 }}>{'★'.repeat(Math.round(rating))}</span>
            <span className="text-gold-metallic" style={{ fontSize: 13, fontWeight: 700, marginLeft: 3 }}>{rating.toFixed(1)}</span>
            <span style={{ fontSize: 10, color: 'var(--stone)', marginLeft: 2 }}>({reviewCount})</span>
          </div>
        </div>
        {services.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '8px 0' }}>
            {services.map((s, i) => (
              <span key={i} style={{
                fontSize: 10, padding: '3px 8px', borderRadius: 8,
                background: 'rgba(176,144,96,0.1)', color: 'var(--gold2)', fontWeight: 600,
              }}>{s}</span>
            ))}
          </div>
        )}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(196,168,106,0.1)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6ABF80', fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6ABF80', display: 'inline-block' }}></span>
              Heute frei
            </span>
            {fromPrice && (
              <span className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700 }}>
                <span style={{ fontSize: 9, color: 'var(--stone)', fontFamily: 'DM Sans, sans-serif', marginRight: 3 }}>ab</span>
                {fromPrice} €
              </span>
            )}
          </div>
          <span style={{
            padding: '9px 16px', borderRadius: 10,
            background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
            color: '#1a1000', fontWeight: 700, fontSize: 11.5,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>Termin buchen →</span>
        </div>
      </div>
    </div>
  )
}
