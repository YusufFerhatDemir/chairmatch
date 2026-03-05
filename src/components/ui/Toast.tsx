import { useEffect, useState } from 'react'
import { useUIStore } from '@/stores/uiStore'

export function Toast() {
  const { toastMessage, clearToast } = useUIStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (toastMessage) {
      setVisible(true)
      const t = setTimeout(() => {
        setVisible(false)
        clearToast()
      }, 2500)
      return () => clearTimeout(t)
    }
  }, [toastMessage, clearToast])

  if (!visible || !toastMessage) return null
  return <div className="toast" role="alert" aria-live="polite">{toastMessage}</div>
}
