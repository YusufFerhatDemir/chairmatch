'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

/**
 * 2FA-Aktivierungs-Flow.
 *
 * 1. POST /api/auth/2fa/setup → bekommt secret + qrUrl
 * 2. User scannt QR mit Authenticator-App (Google, Authy, Microsoft, 1Password)
 * 3. User gibt erzeugten Code ein
 * 4. POST /api/auth/2fa/verify → aktiviert 2FA bei korrektem Code
 */
export default function TwoFAPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState<'check' | 'qr' | 'verify' | 'done'>('check')
  const [qrUrl, setQrUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [alreadyEnabled, setAlreadyEnabled] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth?callbackUrl=/account/security/2fa')
  }, [status, router])

  useEffect(() => {
    if (!session?.user?.id) return
    fetch('/api/auth/2fa/setup')
      .then(r => r.json())
      .then(d => {
        if (d.enabled) {
          setAlreadyEnabled(true)
          setStep('done')
        } else {
          setStep('qr')
          startSetup()
        }
      })
      .catch(() => setError('Status konnte nicht geladen werden.'))
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  async function startSetup() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Setup fehlgeschlagen.')
        return
      }
      setQrUrl(data.qrUrl)
      setSecret(data.secret)
    } catch {
      setError('Verbindungsfehler.')
    } finally {
      setLoading(false)
    }
  }

  async function verify() {
    if (loading) return
    if (!/^\d{6}$/.test(code)) { setError('Code muss 6 Ziffern lang sein.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Code falsch — versuche es nochmal.')
        return
      }
      setStep('done')
    } catch {
      setError('Verbindungsfehler.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return <div className="shell"><div className="screen" style={{ padding: 20 }}>
      <p style={{ color: 'var(--stone)' }}>Lade …</p>
    </div></div>
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/account/security" style={{ color: 'var(--stone)', fontSize: 14, textDecoration: 'none' }}>← Zurück</Link>
        <h1 className="cinzel" style={{ color: 'var(--gold2)', fontSize: 22, marginTop: 12, marginBottom: 8 }}>Zwei-Faktor-Authentifizierung</h1>

        {error && (
          <div role="alert" style={{ background: 'rgba(232,80,64,0.1)', border: '1px solid rgba(232,80,64,0.3)', borderRadius: 12, padding: 12, marginBottom: 16, color: 'var(--red)', fontSize: 13 }}>
            {error}
          </div>
        )}

        {step === 'check' && (
          <p style={{ color: 'var(--stone)' }}>Lade Status …</p>
        )}

        {step === 'qr' && qrUrl && (
          <>
            <p style={{ color: 'var(--stone)', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--cream)' }}>Schritt 1:</strong> Scanne den QR-Code mit einer Authenticator-App
              (z.B. <em>Google Authenticator</em>, <em>Authy</em>, <em>1Password</em> oder <em>Microsoft Authenticator</em>).
            </p>

            <div style={{ background: '#fff', padding: 20, borderRadius: 14, display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              {/* QR-Code via Google Chart API rendered. Alternativ: serverseitig SVG generieren */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrUrl)}`}
                alt="2FA QR Code"
                width={240} height={240}
              />
            </div>

            <details style={{ marginBottom: 20, background: 'var(--c2)', borderRadius: 10, padding: 12 }}>
              <summary style={{ cursor: 'pointer', color: 'var(--stone)', fontSize: 13 }}>QR-Code geht nicht? Code manuell eingeben</summary>
              <p style={{ fontSize: 12, color: 'var(--stone)', marginTop: 10 }}>Trage diesen Code in deine Authenticator-App ein:</p>
              <p style={{ fontFamily: 'monospace', fontSize: 14, color: 'var(--gold2)', background: '#000', padding: 10, borderRadius: 6, wordBreak: 'break-all', marginTop: 6 }}>
                {secret}
              </p>
            </details>

            <p style={{ color: 'var(--stone)', fontSize: 14, marginBottom: 12 }}>
              <strong style={{ color: 'var(--cream)' }}>Schritt 2:</strong> Tippe den 6-stelligen Code aus der App ein:
            </p>

            <input
              className="inp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') verify() }}
              style={{ textAlign: 'center', fontSize: 22, letterSpacing: '0.6em' }}
            />

            <button className="bgold" disabled={loading || code.length !== 6} onClick={verify} style={{ marginTop: 16, width: '100%' }}>
              {loading ? 'Prüfe …' : '2FA aktivieren'}
            </button>
          </>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(74,138,90,.15)', border: '2px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'var(--green)', margin: '0 auto 16px' }}>
              ✓
            </div>
            <h2 style={{ color: 'var(--cream)', fontSize: 18, margin: '0 0 8px' }}>
              {alreadyEnabled ? '2FA bereits aktiv' : '2FA erfolgreich aktiviert'}
            </h2>
            <p style={{ color: 'var(--stone)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              Bei zukünftigen Logins wirst du nach dem 6-stelligen Code aus deiner Authenticator-App gefragt.
            </p>
            <p style={{ fontSize: 11, color: 'var(--stone2)', marginBottom: 20, padding: 10, background: 'rgba(212,175,55,0.08)', borderRadius: 8, border: '1px solid rgba(212,175,55,0.2)' }}>
              ⚠️ Wichtig: Bewahre deine Authenticator-App sicher auf. Bei Verlust kannst du nur über Support den Account zurücksetzen.
            </p>
            <Link href="/account/security" className="bgold" style={{ display: 'inline-block', padding: '12px 24px', textDecoration: 'none' }}>
              Zurück zur Sicherheit
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
