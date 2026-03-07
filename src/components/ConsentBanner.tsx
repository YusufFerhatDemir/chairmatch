'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cm_consent')) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('cm_consent', 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: 'var(--c1)', borderTop: '1px solid rgba(200,168,75,0.15)',
      padding: '14px var(--pad)', display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
    }}>
      <p style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.6, margin: 0 }}>
        Wir verwenden nur technisch notwendige Cookies. Kein Tracking, keine Werbung.{' '}
        <Link href="/datenschutz" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>Mehr erfahren</Link>
      </p>
      <button className="bgold" onClick={accept} style={{ padding: '10px 20px', fontSize: 13, alignSelf: 'flex-start' }}>
        Verstanden
      </button>
    </div>
  )
}
