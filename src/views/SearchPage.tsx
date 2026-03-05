import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/stores/salonStore'
import { useUIStore } from '@/stores/uiStore'
import { Stars } from '@/components/ui/Stars'
import { t } from '@/i18n'

export function SearchPage() {
  const navigate = useNavigate()
  const { salons } = useStore()
  const search = useUIStore(s => s.search)
  const setSearch = useUIStore(s => s.setSearch)

  const results = search.length >= 2
    ? salons.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()) || (s.city || '').toLowerCase().includes(search.toLowerCase()))
    : []

  return (
    <div style={{ padding: 'var(--pad)' }}>
      <Helmet>
        <title>Suche | ChairMatch</title>
        <meta name="description" content="Suche nach Salons, Services und Kategorien." />
        <link rel="canonical" href="https://chairmatch.de/search" />
      </Helmet>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} style={{ color: 'var(--cream)', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 36, minHeight: 36 }} aria-label={t('back')}>←</button>
        <input
          className="inp"
          placeholder={t('search_placeholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          style={{ flex: 1 }}
        />
      </div>
      {search.length < 2 ? (
        <p style={{ color: 'var(--stone)', textAlign: 'center', paddingTop: 40 }}>{t('search_hint')}</p>
      ) : results.length === 0 ? (
        <p style={{ color: 'var(--stone)', textAlign: 'center', paddingTop: 40 }}>{t('no_results')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {results.map(salon => (
            <button key={salon.id} className="card" onClick={() => { setSearch(''); navigate(`/salon/${salon.slug || salon.id}`) }}
              style={{ textAlign: 'left', width: '100%', padding: 12, display: 'flex', gap: 10, cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-md)' }}>{salon.name}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>{salon.city} · {salon.category}</div>
                <Stars rating={salon.avg_rating} size={11} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
