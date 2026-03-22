'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useSearchParams } from 'next/navigation'

const FALLBACK_URL = 'https://vlrviyrgggzhayepfmop.supabase.co'
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZscnZpeXJnZ2d6aGF5ZXBmbW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODIyNzYsImV4cCI6MjA4ODE1ODI3Nn0.pvcZqzAm-ARWVsSv6hKUnTwZeggVJcwYN---4jUfyA0'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)
  const supabaseRef = useRef(createClient(supabaseUrl, supabaseAnonKey))

  useEffect(() => {
    const supabase = supabaseRef.current

    // Handle PKCE flow (code in URL query params)
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
        if (err) {
          setError('Link ungültig oder abgelaufen. Bitte erneut anfordern.')
        } else {
          setReady(true)
        }
      })
      return
    }

    // Handle implicit flow (tokens in hash fragment)
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (hash && hash.includes('access_token')) {
      // Supabase client auto-detects hash tokens
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          setReady(true)
        }
      })
      return
    }

    setError('Kein gültiger Reset-Link. Bitte erneut anfordern.')
  }, [searchParams])

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
    const { error: err } = await supabaseRef.current.auth.updateUser({ password })
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
        ) : !ready && !error ? (
          <p style={{ fontSize: 14, color: 'var(--stone)', textAlign: 'center' }}>Link wird überprüft…</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {error && (
              <div style={{ background: 'rgba(232,80,64,0.1)', border: '1px solid rgba(232,80,64,0.3)', borderRadius: 12, padding: 12, color: 'var(--red)', fontSize: 'var(--font-sm)' }}>
                {error}
              </div>
            )}
            {ready && (
              <>
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
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
