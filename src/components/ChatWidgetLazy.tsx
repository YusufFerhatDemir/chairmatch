'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// ChatWidget (~1000 Zeilen + FAQ-Daten) aus dem Initial-Bundle jeder Seite
// heraushalten: eigener Chunk, geladen erst wenn der Main-Thread idle ist.
// ssr:false ist korrekt — das Widget rendert nur einen Floating-Button,
// kein SEO-relevanter Inhalt.
const ChatWidget = dynamic(() => import('@/components/ChatWidget'), { ssr: false })

export default function ChatWidgetLazy() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 3000 })
      return () => window.cancelIdleCallback(id)
    }
    const t = setTimeout(() => setReady(true), 2000)
    return () => clearTimeout(t)
  }, [])

  return ready ? <ChatWidget /> : null
}
