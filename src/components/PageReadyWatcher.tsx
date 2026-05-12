'use client'

import { useEffect, useState } from 'react'

const SESSION_FLAG = 'cm_slowpage_prompted'
const TIMEOUT_MS = 8000

/**
 * Watches document.readyState. If the page is still loading after
 * TIMEOUT_MS (8s) the user gets a non-blocking, brand-styled prompt
 * offering a manual reload. Fires at most once per session.
 */
export default function PageReadyWatcher() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    if (document.readyState === 'complete') return

    // Already prompted in this session — stay quiet.
    try {
      if (sessionStorage.getItem(SESSION_FLAG)) return
    } catch {
      /* sessionStorage may be unavailable (privacy mode) — proceed anyway */
    }

    const timer = window.setTimeout(() => {
      if (document.readyState !== 'complete') {
        setShow(true)
        try {
          sessionStorage.setItem(SESSION_FLAG, '1')
        } catch {
          /* ignore */
        }
      }
    }, TIMEOUT_MS)

    function handleReady() {
      if (document.readyState === 'complete') {
        clearTimeout(timer)
      }
    }
    document.addEventListener('readystatechange', handleReady)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('readystatechange', handleReady)
    }
  }, [])

  if (!show) return null

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0) + 84px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9998,
        background: 'rgba(8,7,6,0.96)',
        border: '1px solid rgba(200,168,75,0.35)',
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        color: '#e0e0e0',
        fontSize: 13,
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        maxWidth: 'calc(100vw - 32px)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <span style={{ color: '#c8a84b' }}>⏳</span>
      <span>Seite lädt langsam.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          padding: '6px 14px',
          background: 'linear-gradient(135deg, #c8a84b, #e8d06a)',
          color: '#080706',
          border: 'none',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Reload
      </button>
      <button
        type="button"
        onClick={() => setShow(false)}
        aria-label="Schließen"
        style={{
          background: 'transparent',
          color: '#888',
          border: 'none',
          fontSize: 18,
          lineHeight: 1,
          cursor: 'pointer',
          padding: '0 4px',
        }}
      >
        ×
      </button>
    </div>
  )
}
