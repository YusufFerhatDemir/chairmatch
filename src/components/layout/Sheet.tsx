import { ReactNode, useCallback, useEffect, useRef } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  'aria-label'?: string
}

export function Sheet({ open, onClose, children, 'aria-label': ariaLabel }: SheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleKeyDown)

      // Focus first focusable element inside the sheet
      requestAnimationFrame(() => {
        const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable && focusable.length > 0) {
          focusable[0].focus()
        }
      })
    } else {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="overlay active"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div ref={sheetRef} className="sheet" style={{ padding: 'var(--pad)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div />
          <button
            onClick={onClose}
            aria-label="Schließen"
            style={{ fontSize: 20, color: 'var(--stone)', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
