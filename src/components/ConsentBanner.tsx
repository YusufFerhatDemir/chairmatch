'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/i18n/client'

const STORAGE_KEY = 'cm_cookie_consent'
const SESSION_KEY = 'cm_session_id'

type ConsentChoices = {
  necessary: boolean
  statistics: boolean
  marketing: boolean
}

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11)
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export default function ConsentBanner() {
  const t = useTranslations('consent')
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [choices, setChoices] = useState<ConsentChoices>({
    necessary: true,
    statistics: false,
    marketing: false,
  })

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) setVisible(true)
    else {
      try {
        const parsed = JSON.parse(stored) as ConsentChoices
        setChoices(parsed)
      } catch {
        setVisible(true)
      }
    }
  }, [])

  async function save(selected: ConsentChoices) {
    const sessionId = getSessionId()
    try {
      await fetch('/api/cookies/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, choices: selected }),
      })
    } catch {
      /* ignore */
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected))
    setVisible(false)
  }

  function acceptAll() {
    const all: ConsentChoices = { necessary: true, statistics: true, marketing: true }
    setChoices(all)
    save(all)
  }

  function acceptNecessaryOnly() {
    const necessary: ConsentChoices = { necessary: true, statistics: false, marketing: false }
    setChoices(necessary)
    save(necessary)
  }

  function saveCustom() {
    save(choices)
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'var(--c1)',
        borderTop: '1px solid rgba(176,144,96,0.15)',
        padding: '16px var(--pad)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6, margin: 0 }}>
        {t('text')}{' '}
        <Link href="/datenschutz" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>
          {t('learnMore')}
        </Link>
      </p>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--stone)' }}>
            <input
              type="checkbox"
              checked={choices.necessary}
              disabled
              readOnly
            />
            {t('necessary')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--stone)' }}>
            <input
              type="checkbox"
              checked={choices.statistics}
              onChange={(e) => setChoices((c) => ({ ...c, statistics: e.target.checked }))}
            />
            {t('statistics')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--stone)' }}>
            <input
              type="checkbox"
              checked={choices.marketing}
              onChange={(e) => setChoices((c) => ({ ...c, marketing: e.target.checked }))}
            />
            {t('marketing')}
          </label>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button className="bgold" onClick={acceptAll} style={{ padding: '10px 16px', fontSize: 13 }}>
          {t('acceptAll')}
        </button>
        <button
          style={{
            padding: '10px 16px',
            fontSize: 13,
            background: 'transparent',
            border: '1px solid var(--stone)',
            color: 'var(--stone)',
            borderRadius: 8,
          }}
          onClick={acceptNecessaryOnly}
        >
          {t('acceptNecessary')}
        </button>
        {!expanded ? (
          <button
            style={{
              padding: '10px 16px',
              fontSize: 13,
              background: 'transparent',
              border: 'none',
              color: 'var(--gold2)',
              textDecoration: 'underline',
            }}
            onClick={() => setExpanded(true)}
          >
            {t('settings')}
          </button>
        ) : (
          <button
            className="bgold"
            onClick={saveCustom}
            style={{ padding: '10px 16px', fontSize: 13 }}
          >
            {t('saveSelection')}
          </button>
        )}
      </div>
    </div>
  )
}
