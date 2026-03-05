import { ReactNode } from 'react'
import { useUIStore } from '@/stores/uiStore'

interface ShellProps {
  children: ReactNode
}

export function Shell({ children }: ShellProps) {
  const theme = useUIStore(s => s.theme)
  return (
    <div className={`shell ${theme === 'light' ? 'light' : ''}`} role="application" aria-label="ChairMatch App">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-gold focus:text-black">
        Zum Inhalt springen
      </a>
      {children}
    </div>
  )
}
