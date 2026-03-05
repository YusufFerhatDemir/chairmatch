import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/stores/salonStore'
import { Header } from '@/components/layout/Header'
import { Stars } from '@/components/ui/Stars'
import { t } from '@/i18n'

export function FavoritesPage() {
  const navigate = useNavigate()
  const { salons, favorites } = useStore()
  const favSalons = salons.filter(s => favorites.includes(s.id))

  return (
    <div>
      <Helmet>
        <title>Favoriten | ChairMatch</title>
        <meta name="description" content="Deine gespeicherten Lieblingssalons auf einen Blick." />
        <link rel="canonical" href="https://chairmatch.de/favorites" />
      </Helmet>
      <Header>
        <div className="cinzel" style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{t('favorites')}</div>
      </Header>
      <div style={{ padding: 'var(--pad)' }}>
        {favSalons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--stone)' }}>
            <div style={{ marginBottom: 12, fontSize: 44 }}>♡</div>
            <div>{t('no_favorites')}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {favSalons.map(salon => (
              <button
                key={salon.id}
                className="card"
                onClick={() => navigate(`/salon/${salon.slug || salon.id}`)}
                style={{ textAlign: 'left', width: '100%', display: 'flex', gap: 12, padding: 12, cursor: 'pointer' }}
              >
                <div style={{ width: 70, height: 70, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'var(--c3)' }}>
                  {salon.cover_url && <img src={salon.cover_url} alt={salon.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-md)' }}>{salon.name}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', marginTop: 2 }}>{salon.city}</div>
                  <Stars rating={salon.avg_rating} count={salon.review_count} size={11} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
