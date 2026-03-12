'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type ConsentChoices = { necessary: boolean; statistics: boolean; marketing: boolean }

const STORAGE_KEY = 'cm_cookie_consent'
const SESSION_KEY = 'cm_session_id'

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11)
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export default function CookieSettingsPage() {
  const [choices, setChoices] = useState<ConsentChoices>({
    necessary: true,
    statistics: false,
    marketing: false,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setChoices(JSON.parse(stored))
      } catch {
        /* ignore */
      }
    }
  }, [])

  async function handleSave() {
    const sessionId = getSessionId()
    try {
      await fetch('/api/cookies/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, choices }),
      })
    } catch {
      /* ignore */
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choices))
    setSaved(true)
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
          ← Zurück
        </Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 16, marginBottom: 24 }}>
          Cookie-Einstellungen
        </h1>

        <div style={{ color: 'var(--stone)', fontSize: 'var(--font-md)', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 16 }}>
            Sie können Ihre Cookie-Einwilligung jederzeit anpassen.{' '}
            <Link href="/datenschutz" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>
              Mehr erfahren
            </Link>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input type="checkbox" checked={choices.necessary} disabled readOnly />
              <span style={{ color: 'var(--cream)' }}>Notwendig</span> — immer aktiv (Session, Auth)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={choices.statistics}
                onChange={(e) => setChoices((c) => ({ ...c, statistics: e.target.checked }))}
              />
              <span style={{ color: 'var(--cream)' }}>Statistik / Performance</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={choices.marketing}
                onChange={(e) => setChoices((c) => ({ ...c, marketing: e.target.checked }))}
              />
              <span style={{ color: 'var(--cream)' }}>Marketing</span>
            </label>
          </div>

          <button className="bgold" onClick={handleSave} style={{ padding: '12px 24px', fontSize: 14 }}>
            Einstellungen speichern
          </button>
          {saved && <p style={{ marginTop: 12, color: 'var(--gold2)', fontSize: 13 }}>Gespeichert.</p>}
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
