import { ReactNode } from 'react'

interface ScreenProps {
  children: ReactNode
  className?: string
}

export function Screen({ children, className = '' }: ScreenProps) {
  return (
    <main id="main-content" className={`screen ${className}`} role="main" tabIndex={-1}>
      {children}
    </main>
  )
}
