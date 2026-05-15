'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface HealthData {
  timestamp: string
  deploy_commit: string
  env: string
  services: Record<string, boolean>
  db: Record<string, number | string>
  errors_last_24h: number | string
  successful_logins_last_24h: number | string
  launch_readiness: {
    score: number
    configured: number
    total: number
    missing: string[]
  }
}

const SERVICE_LABELS: Record<string, { name: string; required: boolean }> = {
  supabase: { name: 'Supabase (DB + Auth)', required: true },
  nextauth_secret: { name: 'NextAuth Secret', required: true },
  cron_secret: { name: 'Cron Secret', required: true },
  resend_email: { name: 'Resend (E-Mails)', required: true },
  stripe: { name: 'Stripe (Zahlungen)', required: true },
  twilio_sms: { name: 'Twilio (SMS)', required: false },
  sentry: { name: 'Sentry (Crash Reports)', required: false },
  google_maps: { name: 'Google Maps', required: false },
  vapid: { name: 'Push-Notifications', required: false },
}

export default function HealthPage() {
  const router = useRouter()
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/health')
      .then(r => {
        if (r.status === 403) {
          router.push('/')
          return null
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => { if (d) setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [router])

  if (loading) {
    return (
      <div className="shell"><div className="screen" style={{ padding: 20 }}>
        <p style={{ color: 'var(--stone)' }}>Lade Status …</p>
      </div></div>
    )
  }

  if (error || !data) {
    return (
      <div className="shell"><div className="screen" style={{ padding: 20 }}>
        <p style={{ color: 'var(--red)' }}>Fehler: {error || 'Keine Daten'}</p>
      </div></div>
    )
  }

  const score = data.launch_readiness.score
  const scoreColor = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--gold)' : 'var(--red)'

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 20, maxWidth: 720, margin: '0 auto' }}>
        <h1 className="cinzel" style={{ color: 'var(--gold2)', fontSize: 22, marginBottom: 6 }}>System Health</h1>
        <p style={{ color: 'var(--stone)', fontSize: 12, marginBottom: 24 }}>
          Deploy <code>{data.deploy_commit}</code> · env: <code>{data.env}</code> · {new Date(data.timestamp).toLocaleString('de-DE')}
        </p>

        {/* Launch-Readiness-Card */}
        <div style={{ background: 'var(--c2)', borderRadius: 14, padding: 20, marginBottom: 16, border: `2px solid ${scoreColor}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ color: 'var(--cream)', fontSize: 16, margin: 0 }}>Launch-Readiness</h2>
            <span style={{ color: scoreColor, fontSize: 32, fontWeight: 800 }}>{score}%</span>
          </div>
          <p style={{ color: 'var(--stone)', fontSize: 13, margin: '0 0 8px' }}>
            {data.launch_readiness.configured}/{data.launch_readiness.total} Services konfiguriert
          </p>
          {data.launch_readiness.missing.length > 0 && (
            <p style={{ fontSize: 11, color: 'var(--red)', margin: 0 }}>
              Fehlt: {data.launch_readiness.missing.join(', ')}
            </p>
          )}
        </div>

        {/* Services */}
        <h3 style={{ color: 'var(--cream)', fontSize: 15, margin: '20px 0 10px' }}>Externe Services</h3>
        <div style={{ background: 'var(--c2)', borderRadius: 12, overflow: 'hidden' }}>
          {Object.entries(data.services).map(([key, ok]) => {
            const meta = SERVICE_LABELS[key] || { name: key, required: false }
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ flex: 1, color: ok ? 'var(--cream)' : 'var(--stone)', fontSize: 13 }}>
                  {meta.name}
                  {meta.required && <span style={{ marginLeft: 6, color: 'var(--red)', fontSize: 10 }}>PFLICHT</span>}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                  background: ok ? 'rgba(74,138,90,0.15)' : 'rgba(232,80,64,0.12)',
                  color: ok ? 'var(--green)' : 'var(--red)',
                }}>
                  {ok ? '✓ aktiv' : '✗ fehlt'}
                </span>
              </div>
            )
          })}
        </div>

        {/* DB Stats */}
        <h3 style={{ color: 'var(--cream)', fontSize: 15, margin: '20px 0 10px' }}>Datenbank</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {Object.entries(data.db).map(([table, count]) => (
            <div key={table} style={{ background: 'var(--c2)', borderRadius: 10, padding: 10 }}>
              <p style={{ fontSize: 11, color: 'var(--stone)', margin: 0 }}>{table}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold2)', margin: '2px 0 0' }}>{count}</p>
            </div>
          ))}
        </div>

        {/* Last 24h Stats */}
        <h3 style={{ color: 'var(--cream)', fontSize: 15, margin: '20px 0 10px' }}>Letzte 24 Stunden</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <div style={{ background: 'var(--c2)', borderRadius: 10, padding: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--stone)', margin: 0 }}>Erfolgreiche Logins</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)', margin: '2px 0 0' }}>{data.successful_logins_last_24h}</p>
          </div>
          <div style={{ background: 'var(--c2)', borderRadius: 10, padding: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--stone)', margin: 0 }}>Errors</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: typeof data.errors_last_24h === 'number' && data.errors_last_24h > 10 ? 'var(--red)' : 'var(--cream)', margin: '2px 0 0' }}>
              {data.errors_last_24h}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
