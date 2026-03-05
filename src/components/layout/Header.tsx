import { ReactNode } from 'react'

interface HeaderProps {
  children: ReactNode
  sticky?: boolean
}

export function Header({ children, sticky = true }: HeaderProps) {
  return (
    <div className={sticky ? 'sticky' : ''} style={!sticky ? { padding: '14px var(--pad)' } : undefined}>
      {children}
    </div>
  )
}
