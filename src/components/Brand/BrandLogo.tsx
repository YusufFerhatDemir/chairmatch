'use client'

import type { CSSProperties } from 'react'
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="ChairMatch"
        width={size}
        height={size}
        className={styles.img}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </div>
  )
}
