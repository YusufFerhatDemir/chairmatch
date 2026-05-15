'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'

/**
 * Force-Password-Change-Screen.
 *
 * Provider, die mit Initial-Passwort eingeloggt sind (password_must_change=true),
 * werden von der Middleware hierher umgeleitet. Auch normaler "Passwort ändern"-Aufruf
 * geht über diese Seite (via /account/security).
 */
export default function ChangePasswordPage() {
  const router = useRouter()
  const params = useSearchParams()
  const forced = params.get('forced') === '1'
  const callbackUrl = params.get('callbackUrl') || '/account'

  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError('')

    if (pw !== pw2) {
      setError('Passwörter stimmen nicht überein.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pw }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        setError(data.error || 'Passwort-Änderung fehlgeschlagen.')
        return
      }
      // Erfolg → weiter zur Ziel-Seite
      router.replace(callbackUrl)
    } catch {
      setError('Verbindungsfehler — bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  const checks = [
    { ok: pw.length >= 10, label: '10+ Zeichen' },
    { ok: /[A-Z]/.test(pw), label: 'Großbuchstabe' },
    { ok: /[0-9]/.test(pw), label: 'Zahl' },
    { ok: /[^A-Za-z0-9]/.test(pw), label: 'Sonderzeichen' },
  ]
  const passed = checks.filter(c => c.ok).length
  const strengthColor = passed <= 1 ? 'var(--red)' : passed <= 2 ? '#D4A020' : passed <= 3 ? '#C8A84B' : 'var(--green)'
  const canSubmit = passed === 4 && pw === pw2 && !loading

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <BrandLogo size={80} variant="glow" priority={true} />
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', textAlign: 'center', marginTop: 16 }}>
            {forced ? 'Neues Passwort festlegen' : 'Passwort ändern'}
          </h1>
          {forced && (
            <p style={{ fontSize: 13, color: 'var(--stone)', textAlign: 'center', marginTop: 8, maxWidth: 360 }}>
              Du hast dich mit deinem Initial-Passwort eingeloggt. Aus Sicherheitsgründen musst du jetzt ein neues persönliches Passwort wählen.
            </p>
          )}
        </div>

        {error && (
          <div role="alert" style={{
            background: 'rgba(232, 80, 64, 0.1)', border: '1px solid rgba(232, 80, 64, 0.3)',
            borderRadius: 12, padding: 12, marginBottom: 16, color: 'var(--red)', fontSize: 'var(--font-sm)',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="inp"
            type="password"
            placeholder="Neues Passwort (min. 10 Zeichen)"
            value={pw}
            onChange={e => setPw(e.target.value)}
            minLength={10}
            autoComplete="new-password"
            required
          />
          <input
            className="inp"
            type="password"
            placeholder="Neues Passwort wiederholen"
            value={pw2}
            onChange={e => setPw2(e.target.value)}
            autoComplete="new-password"
            required
          />

          {pw.length > 0 && (
            <div style={{ marginTop: -4 }} role="status" aria-live="polite" aria-label={`Passwortstärke: ${passed} von 4`}>
              <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < passed ? strengthColor : 'var(--c3)' }} />
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
          )}

          {pw2.length > 0 && pw !== pw2 && (
            <p style={{ fontSize: 12, color: 'var(--red)', margin: 0 }}>
              Passwörter stimmen nicht überein.
            </p>
          )}

          <button
            type="submit"
            className="bgold"
            disabled={!canSubmit}
            style={{ marginTop: 8 }}
          >
            {loading ? 'Speichere…' : 'Passwort speichern'}
          </button>
        </form>
      </div>
    </div>
  )
}
