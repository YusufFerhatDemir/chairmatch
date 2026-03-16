'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [agbAccepted, setAgbAccepted] = useState(false)
  const [datenschutzAccepted, setDatenschutzAccepted] = useState(false)
  const [marketingAccepted, setMarketingAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError(result.error || 'E-Mail oder Passwort falsch.')
    } else {
      // Role-based redirect
      const res = await fetch('/api/auth/session')
      const session = await res.json()
      const role = session?.user?.role
      if (role === 'super_admin') router.push('/admin/super')
      else if (role === 'admin') router.push('/admin')
      else if (role === 'anbieter') router.push('/provider')
      else router.push('/')
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        fullName,
        agbAccepted,
        datenschutzAccepted,
        marketingAccepted,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Registrierung fehlgeschlagen.')
      setLoading(false)
      return
    }

    // Auto-login after register
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)
    if (result?.error) {
      setError('Registrierung erfolgreich. Bitte anmelden.')
      setTab('login')
    } else {
      router.push('/')
    }
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
        <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none', marginBottom: 24 }}>
          ← Zurück
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ animation: 'logoFloat 3s ease-in-out infinite, logoGlow 3s ease-in-out infinite', display: 'inline-block' }}>
            <BrandLogo size={64} variant="glow" animateStar />
          </div>
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', textAlign: 'center', marginTop: 12 }}>
            {tab === 'login' ? 'Anmelden' : 'Registrieren'}
          </h1>
        </div>

        {/* Tab toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            onClick={() => setTab('login')}
            className={tab === 'login' ? 'bgold' : 'boutline'}
            style={{ flex: 1 }}
          >
            Anmelden
          </button>
          <button
            onClick={() => setTab('register')}
            className={tab === 'register' ? 'bgold' : 'boutline'}
            style={{ flex: 1 }}
          >
            Registrieren
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(232, 80, 64, 0.1)', border: '1px solid rgba(232, 80, 64, 0.3)',
            borderRadius: 12, padding: 12, marginBottom: 16, color: 'var(--red)', fontSize: 'var(--font-sm)',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={tab === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tab === 'register' && (
            <input
              className="inp"
              type="text"
              placeholder="Vollständiger Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          )}
          <input
            className="inp"
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="inp"
            type="password"
            placeholder={tab === 'register' ? 'Passwort (min. 10 Zeichen, 1 Großbuchstabe, 1 Zahl, 1 Sonderzeichen)' : 'Passwort'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={tab === 'register' ? 10 : 1}
          />
          {tab === 'login' && (
            <Link href="/auth/forgot-password" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline', alignSelf: 'flex-end' }}>
              Passwort vergessen?
            </Link>
          )}
          {tab === 'register' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--stone)' }}>
                <input type="checkbox" checked={agbAccepted} onChange={e => setAgbAccepted(e.target.checked)} required style={{ marginTop: 2 }} />
                <span>Ich akzeptiere die <Link href="/agb" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>AGB</Link> (Pflicht)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--stone)' }}>
                <input type="checkbox" checked={datenschutzAccepted} onChange={e => setDatenschutzAccepted(e.target.checked)} required style={{ marginTop: 2 }} />
                <span>Ich akzeptiere die <Link href="/datenschutz" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>Datenschutzerklärung</Link> (Pflicht)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--stone)' }}>
                <input type="checkbox" checked={marketingAccepted} onChange={e => setMarketingAccepted(e.target.checked)} style={{ marginTop: 2 }} />
                <span>Ich möchte Newsletter und Angebote erhalten (optional)</span>
              </label>
            </div>
          )}
          <button type="submit" className="bgold" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Laden...' : tab === 'login' ? 'Anmelden' : 'Registrieren'}
          </button>
        </form>
      </div>
    </div>
  )
}
