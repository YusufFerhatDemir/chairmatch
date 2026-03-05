import { Helmet } from 'react-helmet-async'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/stores/salonStore'
import { useUIStore } from '@/stores/uiStore'
import { Header } from '@/components/layout/Header'
import { Stars } from '@/components/ui/Stars'
import { Skeleton } from '@/components/ui/Skeleton'
import { t } from '@/i18n'

export function ExplorePage() {
  const navigate = useNavigate()
  const { salons, loading } = useStore()
  const search = useUIStore(s => s.search)
  const setSearch = useUIStore(s => s.setSearch)
  const filterCity = useUIStore(s => s.filterCity)
  const [showFilter, setShowFilter] = useState(false)

  const filtered = salons.filter(s => {
    const q = search.toLowerCase()
    if (q && !s.name.toLowerCase().includes(q) && !s.category.toLowerCase().includes(q) && !(s.city || '').toLowerCase().includes(q)) return false
    if (filterCity && s.city !== filterCity) return false
    return true
  })

  return (
    <div>
      <Helmet>
        <title>Salons entdecken | ChairMatch</title>
        <meta name="description" content="Entdecke die besten Salons, Barbershops und Kosmetikstudios in deiner Nähe." />
        <link rel="canonical" href="https://chairmatch.de/explore" />
      </Helmet>
      <Header>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="inp"
            placeholder={t('search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, paddingLeft: 36 }}
            aria-label={t('search_placeholder')}
          />
          <button
            onClick={() => setShowFilter(!showFilter)}
            style={{ color: 'var(--gold)', fontSize: 22, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label={t('filter')}
          >
            ☰
          </button>
        </div>
      </Header>

      <div style={{ padding: 'var(--pad)' }}>
        <div className="lsm" style={{ marginBottom: 12 }}>{filtered.length} {t('results')}</div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4].map(i => <Skeleton key={i} height={100} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(salon => (
              <button
                key={salon.id}
                className="card fu"
                onClick={() => navigate(`/salon/${salon.slug || salon.id}`)}
                style={{ textAlign: 'left', width: '100%', display: 'flex', gap: 12, padding: 12, cursor: 'pointer' }}
              >
                <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
                  {salon.cover_url ? (
                    <img src={salon.cover_url} alt={salon.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'var(--c3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--stone2)' }}>
                      ✂
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-md)' }}>{salon.name}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', marginTop: 2 }}>
                    {salon.city} · {salon.category}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Stars rating={salon.avg_rating} count={salon.review_count} size={11} />
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--stone)' }}>
                {t('no_results')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
