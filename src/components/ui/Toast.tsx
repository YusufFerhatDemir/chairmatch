'use client'

import { useEffect, useState, useCallback } from 'react'

let showToastFn: ((msg: string) => void) | null = null

export function showToast(msg: string) {
  showToastFn?.(msg)
}

export function Toast() {
  const [message, setMessage] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  const show = useCallback((msg: string) => {
    setMessage(msg)
    setVisible(true)
  }, [])

  useEffect(() => {
    showToastFn = show
    return () => { showToastFn = null }
  }, [show])

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => {
        setVisible(false)
        setMessage(null)
      }, 2500)
      return () => clearTimeout(t)
    }
  }, [visible])

  if (!visible || !message) return null
  return <div className="toast" role="alert" aria-live="polite">{message}</div>
}
