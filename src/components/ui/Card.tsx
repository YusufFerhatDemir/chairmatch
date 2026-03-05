import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: boolean
}

export function Card({ children, padding = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`card ${className}`}
      style={padding ? { padding: 'var(--pad)' } : undefined}
      {...props}
    >
      {children}
    </div>
  )
}
