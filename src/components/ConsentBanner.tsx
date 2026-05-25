'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from '@/i18n/client'
import {
  applyConsent,
  choicesToConsentState,
  consentStateToChoices,
  emitConsentChanged,
  getSessionId,
  readStoredConsent,
  type ConsentChoicesUI,
} from '@/lib/consent'

export default function ConsentBanner() {
  const t = useTranslations('consent')
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [choices, setChoices] = useState<ConsentChoicesUI>({
    necessary: true,
    statistics: false,
    marketing: false,
  })

  useEffect(() => {
    const stored = readStoredConsent()
    if (!stored) {
      setVisible(true)
    } else {
      setChoices(consentStateToChoices(stored))
    }
  }, [])

  async function save(selected: ConsentChoicesUI) {
    const consentState = choicesToConsentState(selected)
    applyConsent(consentState)
    emitConsentChanged(consentState)

    const sessionId = getSessionId()
    try {
      await fetch('/api/cookies/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, choices: selected }),
      })
    } catch {
      /* server-side persistence ist best-effort */
    }
    setVisible(false)
  }

  function acceptAll() {
    const all: ConsentChoicesUI = { necessary: true, statistics: true, marketing: true }
    setChoices(all)
    save(all)
  }

  function acceptNecessaryOnly() {
    const necessary: ConsentChoicesUI = { necessary: true, statistics: false, marketing: false }
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
