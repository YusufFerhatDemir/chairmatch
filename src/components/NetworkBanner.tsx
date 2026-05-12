'use client'

import { useEffect, useState } from 'react'

/**
 * Fixed top banner that surfaces network status.
 *  - "Keine Internetverbindung" when navigator says offline
 *  - Brief "Verbindung wiederhergestellt" flash when back online
 *
 * Listens to window.online / window.offline. Initial state pulled from
 * navigator.onLine after mount so SSR hydration stays stable.
 */
export default function NetworkBanner() {
  const [online, setOnline] = useState<boolean>(true)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    // Initial sync — happens on the client only.
    if (typeof navigator !== 'undefined') {
      setOnline(navigator.onLine !== false)
    }

    function handleOnline() {
      setOnline(true)
      setShowReconnected(true)
      window.setTimeout(() => setShowReconnected(false), 2500)
    }
    function handleOffline() {
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online && !showReconnected) return null

  const offline = !online

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0)',
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '10px 16px',
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 0.3,
        color: offline ? '#080706' : '#080706',
        background: offline
          ? 'linear-gradient(90deg, #e8b04b, #c89240)'
          : 'linear-gradient(90deg, #4A8A5A, #3A7A4A)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <span aria-hidden style={{ fontSize: 14 }}>
        {offline ? '⚠' : '✓'}
      </span>
      <span>
        {offline
          ? 'Keine Internetverbindung — wir versuchen es weiter, sobald du wieder online bist.'
          : 'Verbindung wiederhergestellt'}
      </span>
    </div>
  )
}
