import { ReactNode } from 'react'

interface BadgeProps {
  variant?: 'gold' | 'green' | 'red'
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'gold', children, className = '' }: BadgeProps) {
  const cls = variant === 'gold' ? 'bgd' : variant === 'green' ? 'bgr' : 'brd'
  return <span className={`badge ${cls} ${className}`}>{children}</span>
}
