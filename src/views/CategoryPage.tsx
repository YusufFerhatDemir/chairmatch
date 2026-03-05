import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/stores/salonStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { Stars } from '@/components/ui/Stars'
import { Header } from '@/components/layout/Header'
import { t } from '@/i18n'

export function CategoryPage() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const { salons } = useStore()
  const { categories, loadCategories } = useCategoryStore()

  useEffect(() => {
    if (categories.length === 0) loadCategories()
  }, [categories.length, loadCategories])

  const category = categories.find(c => c.slug === categoryId)
  const filtered = salons.filter(s => s.category === categoryId)

  return (
    <div>
      <Helmet>
        <title>{`${category?.label || categoryId} Salons | ChairMatch`}</title>
        <meta name="description" content={`Finde die besten ${category?.label || categoryId} Salons in deiner Nähe auf ChairMatch.`} />
        <link rel="canonical" href={`https://chairmatch.de/category/${categoryId}`} />
      </Helmet>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ color: 'var(--cream)', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 36, minHeight: 36 }} aria-label={t('back')}>←</button>
          <div className="cinzel" style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{category?.label || categoryId}</div>
        </div>
      </Header>
      <div style={{ padding: 'var(--pad)' }}>
        <div className="lsm" style={{ marginBottom: 12 }}>{filtered.length} {t('results')}</div>
        {filtered.length === 0 ? (
          <p style={{ color: 'var(--stone)', textAlign: 'center', paddingTop: 40 }}>{t('no_results')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(salon => (
              <button key={salon.id} className="card fu" onClick={() => navigate(`/salon/${salon.slug || salon.id}`)}
                style={{ textAlign: 'left', width: '100%', display: 'flex', gap: 12, padding: 12, cursor: 'pointer' }}>
                <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'var(--c3)' }}>
                  {salon.cover_url && <img src={salon.cover_url} alt={salon.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{salon.name}</div>
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
