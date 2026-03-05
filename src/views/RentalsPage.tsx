import { Helmet } from 'react-helmet-async'
import { Header } from '@/components/layout/Header'
import { t } from '@/i18n'

export function RentalsPage() {
  return (
    <div>
      <Helmet>
        <title>B2B Vermietung | ChairMatch</title>
        <meta name="description" content="Miete Stuhlplätze, Räume und Equipment bei Top-Salons." />
        <link rel="canonical" href="https://chairmatch.de/rentals" />
      </Helmet>
      <Header>
        <div className="cinzel" style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{t('rentals')}</div>
      </Header>
      <div style={{ padding: 'var(--pad)', textAlign: 'center', paddingTop: 60 }}>
        <div style={{ marginBottom: 12, fontSize: 44, color: 'var(--stone)' }}>🪑</div>
        <p style={{ color: 'var(--stone)' }}>{t('rentals_coming_soon')}</p>
      </div>
    </div>
  )
}
