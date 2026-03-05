import { Helmet } from 'react-helmet-async'
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useStore } from '@/stores/salonStore'
import { Stars } from '@/components/ui/Stars'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { t } from '@/i18n'
import { formatPriceEur } from '@/lib/utils'

type DetailTab = 'services' | 'reviews' | 'info' | 'gallery'

export function SalonDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { salons, loading, favorites, toggleFavorite } = useStore()
  const [tab, setTab] = useState<DetailTab>('services')

  const salon = salons.find(s => s.slug === slug || s.id === slug)

  if (loading) return <div style={{ padding: 'var(--pad)' }}><Skeleton height={200} /><div style={{ marginTop: 12 }}><Skeleton height={30} width="60%" /></div></div>

  if (!salon) return (
    <div style={{ padding: 'var(--pad)', textAlign: 'center', paddingTop: 60 }}>
      <div style={{ marginBottom: 12, fontSize: 48, color: 'var(--stone)' }}>🔍</div>
      <p style={{ color: 'var(--stone)' }}>{t('salon_not_found')}</p>
      <Button variant="outline" onClick={() => navigate('/')} style={{ marginTop: 16, width: 'auto', display: 'inline-block' }}>{t('back_home')}</Button>
    </div>
  )

  const isFav = favorites.includes(salon.id)
  const services = (salon as any).services || []
  const reviews = (salon as any).reviews || []

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'services', label: t('services') },
    { id: 'reviews', label: t('reviews') },
    { id: 'info', label: t('info') },
    { id: 'gallery', label: t('gallery') },
  ]

  return (
    <div>
      <Helmet>
        <title>{`${salon?.name} | ChairMatch`}</title>
        <meta name="description" content={salon?.description || `${salon?.name} — Jetzt Termin buchen bei ChairMatch.`} />
        <link rel="canonical" href={`https://chairmatch.de/salon/${salon?.slug || salon?.id}`} />
      </Helmet>
      {/* Cover */}
      <div style={{ position: 'relative' }}>
        {salon.cover_url ? (
          <img src={salon.cover_url} alt={salon.name} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: 200, background: 'var(--c3)' }} />
        )}
        <button
          onClick={() => navigate(-1)}
          style={{ position: 'absolute', top: 12, left: 12, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}
          aria-label={t('back')}
        >
          ←
        </button>
        <button
          className={`heart ${isFav ? 'liked' : ''}`}
          onClick={() => toggleFavorite(salon.id)}
          style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
          aria-label={isFav ? t('remove_favorite') : t('add_favorite')}
        >
          {isFav ? <span style={{ color: '#E85040' }}>♥</span> : <span style={{ color: '#fff' }}>♡</span>}
        </button>
      </div>

      {/* Salon info */}
      <div style={{ padding: 'var(--pad)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', fontWeight: 700, flex: 1 }}>{salon.name}</h1>
          {salon.is_verified && <Badge variant="gold">✓ Verifiziert</Badge>}
        </div>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginBottom: 8 }}>
          {[salon.street, salon.house_number, salon.postal_code, salon.city].filter(Boolean).join(', ')}
        </div>
        <Stars rating={salon.avg_rating} count={salon.review_count} />

        <Button onClick={() => navigate(`/booking/${salon.id}`)} style={{ marginTop: 16 }}>
          {t('book_now')}
        </Button>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginTop: 20, borderBottom: '1px solid var(--border)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 'var(--font-sm)',
                fontWeight: 700,
                color: tab === t.id ? 'var(--gold)' : 'var(--stone)',
                borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
                transition: 'color 0.2s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ marginTop: 16 }}>
          {tab === 'services' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {services.length === 0 && <p style={{ color: 'var(--stone)' }}>{t('no_services')}</p>}
              {services.map((svc: any) => (
                <div key={svc.id} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-md)' }}>{svc.name}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', marginTop: 2 }}>{svc.duration_minutes} Min.</div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{formatPriceEur(svc.price_cents)}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'reviews' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reviews.length === 0 && <p style={{ color: 'var(--stone)' }}>{t('no_reviews')}</p>}
              {reviews.map((rev: any) => (
                <div key={rev.id} className="card" style={{ padding: 14 }}>
                  <Stars rating={rev.rating} size={12} />
                  {rev.comment && <p style={{ marginTop: 6, fontSize: 'var(--font-sm)', color: 'var(--cream)', lineHeight: 1.5 }}>{rev.comment}</p>}
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', marginTop: 6 }}>{new Date(rev.created_at).toLocaleDateString('de-DE')}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'info' && (
            <div>
              {salon.description && <p style={{ fontSize: 'var(--font-sm)', color: 'var(--cream)', lineHeight: 1.6, marginBottom: 16 }}>{salon.description}</p>}
              {salon.phone && (
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  📞 {salon.phone}
                </div>
              )}
              {salon.email && (
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  ✉ {salon.email}
                </div>
              )}
              {salon.website && (
                <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🌐 {salon.website}
                </div>
              )}
            </div>
          )}
          {tab === 'gallery' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {(salon.gallery as string[] || []).map((img, i) => (
                <img key={i} src={String(img)} alt={`${salon.name} ${i + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} loading="lazy" />
              ))}
              {(!salon.gallery || salon.gallery.length === 0) && <p style={{ color: 'var(--stone)', gridColumn: 'span 3', textAlign: 'center', padding: 20 }}>{t('no_gallery')}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
