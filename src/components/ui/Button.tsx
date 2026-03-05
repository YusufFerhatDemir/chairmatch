import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'outline' | 'ghost'
  children: ReactNode
  loading?: boolean
  fullWidth?: boolean
}

export function Button({ variant = 'gold', children, loading, fullWidth = true, className = '', ...props }: ButtonProps) {
  const base = variant === 'gold' ? 'bgold' : variant === 'outline' ? 'boutline' : ''
  const width = fullWidth ? 'width:100%' : ''
  return (
    <button
      className={`${base} ${className}`}
      style={!fullWidth ? { width: 'auto' } : undefined}
      disabled={loading || props.disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || props.disabled || undefined}
      {...props}
    >
      {loading ? '...' : children}
    </button>
  )
}
