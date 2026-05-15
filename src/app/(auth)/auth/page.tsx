'use client'

import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'
import { useTranslations } from '@/i18n/client'

export default function AuthPage() {
  const t = useTranslations()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login'
  const [tab, setTab] = useState<'login' | 'register'>(initialTab)
  // Tab auch beim Param-Wechsel synchronisieren (z.B. wenn User Link mit ?tab=register oeffnet)
  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'register' || t === 'login') setTab(t)
  }, [searchParams])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [needs2FA, setNeeds2FA] = useState(false)
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
      totpCode: needs2FA ? totpCode : undefined,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      // 2FA-Pflicht erkannt — UI wechselt auf 2FA-Step
      if (result.error.includes('TOTP_REQUIRED')) {
        setNeeds2FA(true)
        setError(null)
        return
      }
      setError(result.error === 'CredentialsSignin' ? t('auth.wrongEmailPw') : result.error)
    } else {
      // Role-based redirect — Session-API mit Timeout, sonst Fallback auf /
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        const res = await fetch('/api/auth/session', { signal: controller.signal })
        clearTimeout(timeoutId)
        const session = await res.json()
        const role = session?.user?.role
        if (role === 'super_admin') router.push('/admin/super')
        else if (role === 'admin') router.push('/admin')
        else if (role === 'investor') router.push('/investor')
        else if (role === 'anbieter') router.push('/provider')
        else router.push('/')
      } catch {
        // Session-API langsam — User ist eingeloggt, lieber sofort weiter zur Home
        router.push('/')
      }
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

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
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || t('auth.registerFailed'))
        return
      }

      // Auto-login after register
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(t('auth.registerSuccess'))
        setTab('login')
      } else {
        router.push('/')
      }
    } catch (err) {
      const isAbort = (err as Error)?.name === 'AbortError'
      setError(isAbort ? 'Zeitüberschreitung. Bitte erneut versuchen.' : 'Netzwerkfehler. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
        <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none', marginBottom: 24 }}>
          ← {t('common.back')}
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ animation: 'logoFloat 3s ease-in-out infinite', display: 'inline-block' }}>
            <BrandLogo size={96} variant="glow" priority={true} />
          </div>
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', textAlign: 'center', marginTop: 12 }}>
            {tab === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
          </h1>
        </div>

        {/* Tab toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }} role="tablist">
          <button
            onClick={() => setTab('login')}
            className={tab === 'login' ? 'bgold' : 'boutline'}
            style={{ flex: 1 }}
            role="tab"
            aria-selected={tab === 'login'}
          >
            {t('auth.login')}
          </button>
          <button
            onClick={() => setTab('register')}
            className={tab === 'register' ? 'bgold' : 'boutline'}
            style={{ flex: 1 }}
            role="tab"
            aria-selected={tab === 'register'}
          >
            {t('auth.register')}
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
            <label>
              <span className="sr-only">{t('auth.fullName')}</span>
              <input
                className="inp"
                type="text"
                placeholder={t('auth.fullName')}
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                autoComplete="name"
              />
            </label>
          )}
          <label>
            <span className="sr-only">{t('auth.email')}</span>
            <input
              className="inp"
              type="email"
              placeholder={t('auth.email')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            <span className="sr-only">{t('auth.password')}</span>
            <input
              className="inp"
              type="password"
              placeholder={tab === 'register' ? t('auth.passwordMin') : t('auth.password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={tab === 'register' ? 10 : 1}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {/* 2FA-Code-Step: erscheint wenn Server TOTP_REQUIRED zurückgibt */}
          {tab === 'login' && needs2FA && (
            <>
              <div style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, padding: 12, marginTop: 4 }}>
                <p style={{ fontSize: 12, color: 'var(--gold2)', margin: '0 0 4px', fontWeight: 700 }}>🔐 Zwei-Faktor-Authentifizierung</p>
                <p style={{ fontSize: 11, color: 'var(--stone)', margin: 0 }}>
                  Gib den 6-stelligen Code aus deiner Authenticator-App ein, oder einen Recovery-Code.
                </p>
              </div>
              <label>
                <span className="sr-only">2FA-Code</span>
                <input
                  className="inp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456 oder Recovery-Code"
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value)}
                  autoFocus
                  style={{ textAlign: 'center', letterSpacing: '0.3em', fontFamily: 'monospace' }}
                  required
                />
              </label>
            </>
          )}
          {tab === 'register' && password.length > 0 && (() => {
            const checks = [
              { ok: password.length >= 10, label: '10+ Zeichen' },
              { ok: /[A-Z]/.test(password), label: 'Großbuchstabe' },
              { ok: /[0-9]/.test(password), label: 'Zahl' },
              { ok: /[^A-Za-z0-9]/.test(password), label: 'Sonderzeichen' },
            ]
            const passed = checks.filter(c => c.ok).length
            const color = passed <= 1 ? 'var(--red)' : passed <= 2 ? '#D4A020' : passed <= 3 ? '#C8A84B' : 'var(--green)'
            return (
              <div style={{ marginTop: -4 }} role="status" aria-live="polite" aria-label={`Passwortstärke: ${passed} von 4`}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < passed ? color : 'var(--c3)' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
                  {checks.map(c => (
                    <span key={c.label} style={{ fontSize: 10, color: c.ok ? 'var(--green)' : 'var(--stone2)' }}>
                      {c.ok ? '✓' : '○'} {c.label}
                    </span>
                  ))}
                </div>
              </div>
            )
          })()}
          {tab === 'login' && (
            <Link href="/auth/forgot-password" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'underline', alignSelf: 'flex-end' }}>
              {t('auth.forgotPassword')}
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
            {loading ? t('common.loading') : tab === 'login' ? t('auth.login') : t('auth.register')}
          </button>
        </form>
      </div>
    </div>
  )
}
