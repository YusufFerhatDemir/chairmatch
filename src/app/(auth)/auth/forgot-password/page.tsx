'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error || 'Anfrage fehlgeschlagen.')
      return
    }
    setDone(true)
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
        <Link href="/auth" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none', marginBottom: 24 }}>
          ← Zurück
        </Link>
        <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', textAlign: 'center', marginBottom: 32 }}>
          Passwort zurücksetzen
        </h1>

        {done ? (
          <p style={{ fontSize: 14, color: 'var(--stone)', textAlign: 'center', lineHeight: 1.7 }}>
            Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet. Prüfe deinen Posteingang (auch Spam).
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {error && (
              <div style={{ background: 'rgba(232,80,64,0.1)', border: '1px solid rgba(232,80,64,0.3)', borderRadius: 12, padding: 12, color: 'var(--red)', fontSize: 'var(--font-sm)' }}>
                {error}
              </div>
            )}
            <input
              className="inp"
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="bgold" disabled={loading}>
              {loading ? 'Wird gesendet...' : 'Link senden'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
