'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Client-Component-Wrapper für "In Warenkorb"-Button.
 *
 * Robust gegen langsame APIs (5s Timeout). Bei Auth-Fehler: Redirect auf
 * /auth mit callbackUrl zurück zum Produkt.
 */
export function AddToCartButton({
  productId,
  inStock,
  productSlug,
}: {
  productId: string
  inStock: boolean
  productSlug: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'adding' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)

  async function handleClick() {
    if (!inStock || status === 'adding') return
    setStatus('adding')
    setErrMsg(null)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (res.status === 401) {
        // User nicht eingeloggt → zurück zum Produkt nach Login
        router.push(`/auth?next=/products/${encodeURIComponent(productSlug)}`)
        return
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setErrMsg(body.error || 'Fehler — bitte später erneut versuchen')
        setStatus('err')
        return
      }

      setStatus('ok')
      // Nach 2s zurück auf idle (User kann mehr in den Warenkorb legen)
      setTimeout(() => setStatus('idle'), 2000)
    } catch (e) {
      const isAbort = (e as Error)?.name === 'AbortError'
      setErrMsg(isAbort ? 'Zeitüberschreitung — versuche es erneut' : 'Netzwerkfehler')
      setStatus('err')
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={!inStock || status === 'adding'}
        style={{
          width: '100%',
          padding: '12px 20px',
          background: inStock ? 'var(--gold)' : 'var(--c2)',
          color: inStock ? '#080706' : 'var(--stone)',
          border: 'none',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 14,
          cursor: !inStock || status === 'adding' ? 'wait' : 'pointer',
          opacity: status === 'adding' ? 0.7 : 1,
        }}
      >
        {!inStock
          ? 'Aktuell nicht verfügbar'
          : status === 'adding'
            ? 'Füge hinzu …'
            : status === 'ok'
              ? '✓ Im Warenkorb'
              : 'In Warenkorb'}
      </button>
      {errMsg && (
        <p style={{ fontSize: 11, color: 'var(--red)', margin: '6px 0 0', textAlign: 'center' }}>
          {errMsg}
        </p>
      )}
    </>
  )
}
