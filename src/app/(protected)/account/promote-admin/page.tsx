'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'

export default function PromoteAdminPage() {
  const sessionHook = useSession()
  const session = sessionHook.data
  const update = sessionHook.update
  const router = useRouter()
  const [setupKey, setSetupKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handlePromote = async () => {
    if (!setupKey.trim()) {
      setError('Bitte ADMIN_SETUP_KEY eingeben.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/setup/promote-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupKey: setupKey.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Fehler beim Promote.')
        setLoading(false)
        return
      }
      setSuccess(true)
      // Session refreshen, damit die neue Rolle sofort greift
      try {
        if (typeof update === 'function') {
          await update()
        }
      } catch {
        // best-effort
      }
      // Kurze Verzögerung, dann Redirect zu /admin/mis
      setTimeout(() => {
        router.push('/admin/mis')
      }, 1500)
    } catch (e) {
      setError((e as Error).message || 'Netzwerkfehler.')
      setLoading(false)
    }
  }

  const role = (session?.user as { role?: string })?.role || ''
  const alreadyAdmin = ['admin', 'super_admin'].includes(role)

  return (
    <div className="shell">
      <div className="screen" style={{ padding: '20px var(--pad) 0', minHeight: '100vh' }}>
        {/* Logo Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30 }}>
          <BrandLogo size={36} variant="dark" animateStar />
          <div>
            <p className="cinzel" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2, color: 'var(--gold2)', lineHeight: 1 }}>
              CHAIR<span style={{ color: 'var(--gold3)' }}>MATCH</span>
            </p>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--stone)', marginTop: 2 }}>SUPER-ADMIN SETUP</p>
          </div>
        </div>

        {/* Hero-Card */}
        <div
          style={{
            padding: 24,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #2A1F08 0%, #1A1408 50%, #0A0604 100%)',
            border: '1px solid rgba(212,175,55,0.4)',
            boxShadow: '0 8px 32px rgba(212,175,55,0.15), inset 0 1px 0 rgba(212,175,55,0.1)',
            marginBottom: 20,
            textAlign: 'center',
          }}
        >
          <div style={{
            width: 72,
            height: 72,
            margin: '0 auto 18px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4AF37 0%, #B89030 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 38,
            boxShadow: '0 4px 18px rgba(212,175,55,0.45)',
          }}>
            🔑
          </div>
          <p className="cinzel" style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--gold2)',
            letterSpacing: '0.05em',
            marginBottom: 8,
          }}>
            Super-Admin Promote
          </p>
          <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.5 }}>
            Befördere dein Konto zum Super-Admin mit dem Setup-Key aus <code style={{ color: 'var(--gold)', fontSize: 12 }}>.env.local</code>.
          </p>
        </div>

        {/* Status / aktuelle Rolle */}
        {session?.user && (
          <div className="card" style={{ padding: 14, marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: 'var(--stone)', marginBottom: 4 }}>Eingeloggt als</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>{session.user.email}</p>
            <p style={{ fontSize: 11, marginTop: 6 }}>
              <span style={{ color: 'var(--stone)' }}>Aktuelle Rolle: </span>
              <span className="badge badge-gold" style={{ fontSize: 9 }}>{role || 'kunde'}</span>
            </p>
          </div>
        )}

        {alreadyAdmin ? (
          <div
            style={{
              padding: 18,
              borderRadius: 12,
              background: 'rgba(74,138,90,0.1)',
              border: '1px solid rgba(74,138,90,0.3)',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 28, marginBottom: 8 }}>✓</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', marginBottom: 8 }}>
              Du bist bereits {role}
            </p>
            <Link
              href="/admin/mis"
              style={{
                display: 'inline-block',
                marginTop: 8,
                padding: '10px 20px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #D4AF37, #B89030)',
                color: '#060504',
                fontWeight: 800,
                fontSize: 13,
                textDecoration: 'none',
                letterSpacing: '0.05em',
              }}
            >
              → Zum MIS-Portal
            </Link>
          </div>
        ) : success ? (
          <div
            style={{
              padding: 18,
              borderRadius: 12,
              background: 'rgba(74,138,90,0.15)',
              border: '1px solid rgba(74,138,90,0.4)',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 32, marginBottom: 10 }}>✨</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#4ade80', marginBottom: 6 }}>
              Erfolgreich befördert!
            </p>
            <p style={{ fontSize: 12, color: 'var(--stone)' }}>
              Weiterleitung zum MIS-Portal...
            </p>
          </div>
        ) : (
          <>
            {/* Setup-Key Input */}
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="setupKey"
                style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  color: 'var(--gold)',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                ADMIN_SETUP_KEY
              </label>
              <input
                id="setupKey"
                type="password"
                autoComplete="off"
                value={setupKey}
                onChange={(e) => { setSetupKey(e.target.value); setError(null) }}
                placeholder="cm-setup-..."
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: '#0A0604',
                  border: '1px solid rgba(212,175,55,0.3)',
                  color: 'var(--cream)',
                  fontSize: 14,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  letterSpacing: '0.04em',
                  outline: 'none',
                }}
                onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(212,175,55,0.7)' }}
                onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(212,175,55,0.3)' }}
              />
              <p style={{ fontSize: 10, color: 'var(--stone)', marginTop: 6, lineHeight: 1.4 }}>
                Aus <code style={{ color: 'var(--gold)' }}>.env.local</code> → <code>ADMIN_SETUP_KEY</code>
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: 'rgba(192,64,64,0.1)',
                  border: '1px solid rgba(192,64,64,0.3)',
                  marginBottom: 14,
                  fontSize: 12,
                  color: '#f87171',
                }}
              >
                ⚠ {error}
              </div>
            )}

            {/* Button */}
            <button
              onClick={handlePromote}
              disabled={loading || !setupKey.trim()}
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: 12,
                background: loading || !setupKey.trim()
                  ? 'rgba(212,175,55,0.2)'
                  : 'linear-gradient(135deg, #D4AF37 0%, #B89030 100%)',
                color: loading || !setupKey.trim() ? 'var(--stone)' : '#060504',
                fontWeight: 800,
                fontSize: 14,
                border: 'none',
                cursor: loading || !setupKey.trim() ? 'not-allowed' : 'pointer',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                boxShadow: loading || !setupKey.trim()
                  ? 'none'
                  : '0 4px 18px rgba(212,175,55,0.3)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Wird befördert...' : '⚡ Mich zum Super-Admin machen'}
            </button>
          </>
        )}

        {/* Back-Link */}
        <div style={{ marginTop: 30, textAlign: 'center' }}>
          <Link
            href="/account"
            style={{
              fontSize: 12,
              color: 'var(--stone)',
              textDecoration: 'none',
            }}
          >
            ← Zurück zum Konto
          </Link>
        </div>

        {/* Sicherheits-Hinweis */}
        <div
          style={{
            marginTop: 24,
            padding: 12,
            borderRadius: 8,
            background: 'rgba(212,175,55,0.04)',
            border: '1px solid rgba(212,175,55,0.1)',
            fontSize: 11,
            color: 'var(--stone)',
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: 'var(--gold)' }}>Sicherheitshinweis:</strong> Nach erfolgreicher Beförderung sollte <code style={{ color: 'var(--gold)' }}>ADMIN_SETUP_KEY</code> aus <code>.env.local</code> entfernt werden, um weitere unberechtigte Promotes zu verhindern.
        </div>

        <div style={{ height: 60 }} />
      </div>
    </div>
  )
}
