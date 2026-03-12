'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (!hash && typeof window !== 'undefined') {
      setError('Kein gültiger Reset-Link. Bitte erneut anfordern.')
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwörter stimmen nicht überein.')
      return
    }
    if (password.length < 10) {
      setError('Mindestens 10 Zeichen, 1 Großbuchstabe, 1 Zahl, 1 Sonderzeichen.')
      return
    }
    setLoading(true)
    setError(null)
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setDone(true)
    setTimeout(() => router.push('/auth'), 2000)
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
        <Link href="/auth" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none', marginBottom: 24 }}>
          ← Zurück
        </Link>
        <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', textAlign: 'center', marginBottom: 32 }}>
          Neues Passwort
        </h1>

        {done ? (
          <p style={{ fontSize: 14, color: 'var(--stone)', textAlign: 'center', lineHeight: 1.7 }}>
            Passwort wurde geändert. Du wirst zur Anmeldung weitergeleitet.
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
              type="password"
              placeholder="Neues Passwort (min. 10 Zeichen)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={10}
            />
            <input
              className="inp"
              type="password"
              placeholder="Passwort bestätigen"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
            <button type="submit" className="bgold" disabled={loading}>
              {loading ? 'Wird gespeichert...' : 'Passwort ändern'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
