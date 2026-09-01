import { InputHTMLAttributes, forwardRef, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = '', ...props }, ref) => {
  const generatedId = useId()
  const errorId = useId()
  // `props.id` gewinnt, falls der Aufrufer selbst eine ID setzt.
  const inputId = props.id ?? generatedId
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label className="lsm" htmlFor={inputId}>{label}</label>}
      <input
        ref={ref}
        className={`inp ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
        id={inputId}
      />
      {error && <span id={errorId} style={{ color: 'var(--red)', fontSize: 'var(--font-xs)' }}>{error}</span>}
    </div>
  )
})
Input.displayName = 'Input'
