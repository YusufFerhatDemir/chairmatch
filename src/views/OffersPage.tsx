import { Helmet } from 'react-helmet-async'
import { Header } from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { t } from '@/i18n'

export function OffersPage() {
  return (
    <div>
      <Helmet>
        <title>Angebote | ChairMatch</title>
        <meta name="description" content="Exklusive Rabatte und Aktionen bei Top-Salons." />
        <link rel="canonical" href="https://chairmatch.de/offers" />
      </Helmet>
      <Header>
        <div className="cinzel" style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{t('offers')}</div>
      </Header>
      <div style={{ padding: 'var(--pad)' }}>
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--stone)' }}>
          <div style={{ marginBottom: 12, fontSize: 44 }}>❋</div>
          <div>{t('no_offers')}</div>
        </div>
      </div>
    </div>
  )
}
