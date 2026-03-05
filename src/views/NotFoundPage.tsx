import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div style={{ padding: 'var(--pad)', textAlign: 'center', paddingTop: 80 }}>
      <Helmet>
        <title>404 | ChairMatch</title>
        <meta name="description" content="Seite nicht gefunden." />
      </Helmet>
      <Logo size={60} />
      <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginTop: 20, marginBottom: 8 }}>404</h1>
      <p style={{ color: 'var(--stone)', marginBottom: 24 }}>Seite nicht gefunden</p>
      <Button variant="outline" onClick={() => navigate('/')} fullWidth={false}>Zur Startseite</Button>
    </div>
  )
}
