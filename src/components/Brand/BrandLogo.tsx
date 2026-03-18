'use client'

import { useState, type CSSProperties } from 'react'
import styles from './BrandLogo.module.css'

interface BrandLogoProps {
  /** Pixel size (width & height) */
  size?: number
  /** "dark" = dark-bg asset, "glow" = gradient asset */
  variant?: 'dark' | 'glow'
  /** Enable subtle star-pulse overlay */
  animateStar?: boolean
  className?: string
  style?: CSSProperties
  /** img loading priority */
  priority?: boolean
}

const ASSETS = {
  dark: '/brand/chairmatch_logo_pin_symbol_dark_512.png',
  glow: '/brand/chairmatch_logo_pin_symbol_gradient_512.png',
} as const

export function BrandLogo({
  size = 64,
  variant = 'dark',
  animateStar = true,
  className,
  style,
  priority = false,
}: BrandLogoProps) {
  const [imgError, setImgError] = useState(false)
  const src = ASSETS[variant]

  const rootClass = [
    styles.root,
    animateStar ? styles.starPulse : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={rootClass}
      style={{ width: size, height: size, ...style }}
    >
      {imgError ? (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="ChairMatch Logo">
          <rect width="64" height="64" rx="16" fill="#141108" />
          <text x="32" y="38" textAnchor="middle" fill="#B09060" fontSize="14" fontWeight="700" fontFamily="sans-serif">CM</text>
        </svg>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt="ChairMatch Logo"
          width={size}
          height={size}
          className={styles.img}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  )
}
