'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

/**
 * BackButton — deutlich sichtbarer, konsistenter Zurück-Button.
 *
 * Designed nach User-Feedback: vorherige Version war zu klein + zu blass.
 *
 * Drei Modi:
 *  - `href="..."` → Link mit definiertem Ziel (z.B. "Zurück zur Übersicht")
 *  - `onClick={fn}` → Custom-Handler (z.B. Modal schließen, Step zurück im Wizard)
 *  - default (kein href, kein onClick) → Browser-History-back() mit Fallback "/"
 *
 * Größe:
 *  - default: 40px Höhe, gut tappbar (Apple HIG 44px Touch-Target via Padding)
 *  - sm: 32px für inline-Use
 *
 * Style: gold-Border + cream-Text, Hover invertiert. Pfeil-Icon prominent.
 */

interface Props {
  /** Optional: explizites Ziel (Link). Wenn nicht gesetzt: router.back() */
  href?: string
  /** Optional: benutzerdefinierter Click-Handler (überschreibt href) */
  onClick?: () => void
  /** Label nach dem Pfeil. Default: "Zurück" */
  label?: string
  /** Größe: 'sm' für inline, 'md' (default) für Page-Header */
  size?: 'sm' | 'md'
  /** Style-Variante */
  variant?: 'default' | 'subtle' | 'ghost'
  /** Optional: zusätzliche Styles */
  style?: React.CSSProperties
}

export function BackButton({
  href,
  onClick,
  label = 'Zurück',
  size = 'md',
  variant = 'default',
  style,
}: Props) {
  const router = useRouter()

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: size === 'sm' ? '6px 12px' : '8px 14px',
    fontSize: size === 'sm' ? 12 : 13,
    fontWeight: 600,
    textDecoration: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background .15s, border-color .15s, color .15s',
    minHeight: size === 'sm' ? 32 : 40,
    lineHeight: 1,
    ...style,
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      color: 'var(--cream)',
      background: 'var(--c2)',
      border: '1px solid var(--border)',
    },
    subtle: {
      color: 'var(--stone)',
      background: 'transparent',
      border: '1px solid transparent',
    },
    ghost: {
      color: 'var(--cream)',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--border)',
    },
  }

  const finalStyle = { ...baseStyle, ...variantStyles[variant] }

  const content = (
    <>
      <svg
        width={size === 'sm' ? 12 : 14}
        height={size === 'sm' ? 12 : 14}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M19 12H5M5 12l7-7M5 12l7 7"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{label}</span>
    </>
  )

  // Mode 1: Custom onClick
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={finalStyle}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--gold)'
          ;(e.currentTarget as HTMLButtonElement).style.color = '#080706'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gold)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = variantStyles[variant].background as string
          ;(e.currentTarget as HTMLButtonElement).style.color = variantStyles[variant].color as string
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = (variantStyles[variant].border as string)?.split(' ')[2] || 'transparent'
        }}
        aria-label={label}
      >
        {content}
      </button>
    )
  }

  // Mode 2: Explicit href
  if (href) {
    return (
      <Link
        href={href as never}
        style={finalStyle}
        aria-label={label}
      >
        {content}
      </Link>
    )
  }

  // Mode 3: Default — browser back with fallback
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back()
        } else {
          router.push('/')
        }
      }}
      style={finalStyle}
      aria-label={label}
    >
      {content}
    </button>
  )
}
