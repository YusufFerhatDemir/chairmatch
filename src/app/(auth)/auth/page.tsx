'use client'

import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck, BadgeCheck, Building2, Eye, Sparkles, User, ArrowRight,
} from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { useTranslations } from '@/i18n/client'

/**
 * /auth — Default-Ansicht: V11 Welcome-Splitter (2x2 Rollen-Grid + Gold-CTA).
 *
 * Login/Register-Form erscheint nur wenn `?tab=login`, `?tab=register` oder
 * `?callbackUrl=...` in der URL ist. Sonst zeigt /auth den V11-Splitter.
 */
export default function AuthPage() {
  const t = useTranslations()
  const searchParams = useSearchParams()
  const showSplitter = !searchParams.get('tab') && !searchParams.get('callbackUrl')
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login'
  const [tab, setTab] = useState<'login' | 'register'>(initialTab)
  useEffect(() => {
    const tp = searchParams.get('tab')
    if (tp === 'register' || tp === 'login') setTab(tp)
  }, [searchParams])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [agbAccepted, setAgbAccepted] = useState(false)
  const [datenschutzAccepted, setDatenschutzAccepted] = useState(false)
  const [marketingAccepted, setMarketingAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (showSplitter) {
    return <WelcomeSplitterV11 />
  }

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
      setError(result.error || t('auth.wrongEmailPw'))
    } else {
      const res = await fetch('/api/auth/session')
      const session = await res.json()
      const role = session?.user?.role
      if (role === 'super_admin') router.push('/admin/super')
      else if (role === 'admin') router.push('/admin')
      else if (role === 'investor') router.push('/investor')
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
      setError(data.error || t('auth.registerFailed'))
      setLoading(false)
      return
    }

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)
    if (result?.error) {
      setError(t('auth.registerSuccess'))
      setTab('login')
    } else {
      router.push('/')
    }
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
        <Link href="/auth" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none', marginBottom: 24 }}>
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

/**
 * V11 Welcome-Splitter — Default-Ansicht für /auth ohne Query-Params.
 *
 * Layout (1:1 wie im Cowork-Mockup vom 2026-05-15 abgenommen):
 *   1. Pin-Logo XL + "CHAIRMATCH" + "DEUTSCHLAND" + Tagline
 *   2. Gold-CTA "Jetzt kostenlos registrieren" → /auth?tab=register
 *   3. Outline-CTA "Bereits Konto? Anmelden" → /auth?tab=login
 *   4. "Ich bin …" Trennlinien-Sektion
 *   5. 2x2 Grid: Kunde / Anbieter / Mieter / Vermieter mit Pin-Logo 1:1 in jeder Karte
 *   6. "Ohne Anmeldung entdecken" → /
 *   7. Trust-Section: Sichere Buchung · Geprüfte Anbieter · Flexible Vermietung
 */
function WelcomeSplitterV11() {
  const ROLES = [
    { id: 'kunde',     title: 'Kunde',     sub1: 'Ich suche',     sub2: 'Termine',  href: '/explore' },
    { id: 'anbieter',  title: 'Anbieter',  sub1: 'Ich biete',     sub2: 'Services', href: '/anbieter/wie-es-funktioniert' },
    { id: 'mieter',    title: 'Mieter',    sub1: 'Stuhl / Kabine', sub2: 'mieten',   href: '/mieter/wie-es-funktioniert' },
    { id: 'vermieter', title: 'Vermieter', sub1: 'Stuhl / Kabine', sub2: 'vermieten', href: '/vermieter/wie-es-funktioniert' },
  ]

  return (
    <div className="shell">
      <div className="screen" style={{ padding: '32px 20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ maxWidth: 520, width: '100%' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 26 }}>
            <BrandLogo size={130} variant="glow" animateStar={true} priority={true} />
            <p className="cinzel text-gold-metallic" style={{
              fontSize: 34, fontWeight: 600, letterSpacing: '0.16em',
              margin: '16px 0 6px',
            }}>
              CHAIRMATCH
            </p>
            <p className="cinzel" style={{
              fontSize: 13, color: 'var(--stone)', letterSpacing: '0.45em',
              margin: '0 0 18px',
            }}>
              DEUTSCHLAND
            </p>
            <p style={{
              fontSize: 14, color: 'var(--cream)', lineHeight: 1.55,
              margin: 0, padding: '0 8px',
            }}>
              Die Plattform für Termine, Services und die Vermietung von Stühlen &amp; Kabinen.
            </p>
          </div>

          {/* Gold-Primary-CTA */}
          <Link
            href={"/auth?tab=register"}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, width: '100%',
              padding: '15px 22px',
              background: 'var(--gold-gradient)',
              color: '#1A1308',
              fontSize: 15, fontWeight: 600, letterSpacing: '0.02em',
              border: 'none', borderRadius: 12,
              textDecoration: 'none', cursor: 'pointer',
              marginBottom: 10,
              boxShadow: '0 6px 24px rgba(196,168,106,0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            <Sparkles size={18} color="#1A1308" strokeWidth={2.2} />
            <span>Jetzt kostenlos registrieren</span>
            <ArrowRight size={18} color="#1A1308" strokeWidth={2.4} style={{ marginLeft: 'auto' }} />
          </Link>

          {/* Outline-Secondary-CTA */}
          <Link
            href={"/auth?tab=login"}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, width: '100%',
              padding: '13px 22px',
              background: 'transparent',
              color: 'var(--cream)',
              fontSize: 14, letterSpacing: '0.02em',
              border: '1px solid rgba(196,168,106,0.4)', borderRadius: 12,
              textDecoration: 'none', cursor: 'pointer',
              marginBottom: 28,
            }}
          >
            <User size={16} color="var(--gold)" strokeWidth={2} />
            <span>Bereits Konto? Anmelden</span>
          </Link>

          {/* Ich bin ... Trennlinien */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 14,
            marginBottom: 18,
          }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, var(--gold2))' }} />
            <span className="cinzel" style={{
              fontSize: 15, color: 'var(--gold2)',
              letterSpacing: '0.28em', whiteSpace: 'nowrap',
            }}>
              Ich bin …
            </span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--gold2), transparent)' }} />
          </div>

          {/* 2x2 Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            marginBottom: 18,
          }}>
            {ROLES.map((role) => (
              <Link
                key={role.id}
                href={role.href}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'space-between',
                  padding: '22px 16px 18px',
                  background: 'var(--c2)',
                  border: '1px solid rgba(176,144,96,0.22)',
                  borderRadius: 14,
                  textDecoration: 'none',
                  minHeight: 200,
                  transition: 'all .25s',
                }}
                aria-label={role.title}
              >
                <div style={{ marginBottom: 14 }}>
                  <BrandLogo size={58} variant="glow" animateStar={false} priority={false} />
                </div>
                <p className="cinzel" style={{
                  fontSize: 20, fontWeight: 500, color: 'var(--gold2)',
                  margin: '0 0 10px', lineHeight: 1.2,
                }}>
                  {role.title}
                </p>
                <p style={{
                  fontSize: 13, color: 'var(--cream)', lineHeight: 1.4,
                  margin: '0 0 14px', textAlign: 'center', minHeight: 34,
                }}>
                  {role.sub1}<br />{role.sub2}
                </p>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  border: '1px solid rgba(196,168,106,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--gold2)', fontSize: 14, lineHeight: 1,
                }}>
                  ›
                </div>
              </Link>
            ))}
          </div>

          {/* Ohne Anmeldung entdecken */}
          <Link
            href="/"
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 12,
              padding: '14px 20px',
              background: 'transparent',
              border: '1px solid rgba(196,168,106,0.45)',
              borderRadius: 14,
              color: 'var(--cream)',
              fontSize: 14, letterSpacing: '0.02em',
              textDecoration: 'none',
              marginBottom: 24,
            }}
          >
            <Eye size={18} color="var(--gold2)" strokeWidth={2} />
            <span>Ohne Anmeldung entdecken</span>
            <span style={{ color: 'var(--gold2)', fontSize: 14, marginLeft: 'auto' }}>›</span>
          </Link>

          {/* Trust-Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 0,
            paddingTop: 22,
            borderTop: '1px solid rgba(176,144,96,0.22)',
          }}>
            {[
              { Icon: ShieldCheck, title: 'Sichere', subtitle: 'Buchung' },
              { Icon: BadgeCheck, title: 'Geprüfte', subtitle: 'Anbieter' },
              { Icon: Building2, title: 'Flexible', subtitle: 'Vermietung' },
            ].map((b, idx) => (
              <div
                key={b.title}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', textAlign: 'center',
                  padding: '0 6px',
                  borderLeft: idx > 0 ? '1px solid rgba(196,168,106,0.18)' : 'none',
                }}
              >
                <b.Icon
                  size={30}
                  color="var(--gold2)"
                  strokeWidth={1.7}
                  style={{ filter: 'drop-shadow(0 0 8px rgba(196,168,106,0.35))', marginBottom: 8 }}
                />
                <p style={{
                  fontSize: 13, color: 'var(--cream)', fontWeight: 500,
                  margin: '0 0 2px', lineHeight: 1.2,
                }}>
                  {b.title}
                </p>
                <p style={{
                  fontSize: 12, color: 'var(--stone)',
                  margin: 0, lineHeight: 1.2,
                }}>
                  {b.subtitle}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
