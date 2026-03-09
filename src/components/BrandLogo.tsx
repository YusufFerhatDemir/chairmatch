'use client'

import Image from 'next/image'
import type { CSSProperties } from 'react'

interface BrandLogoProps {
  size?: number
  variant?: 'dark' | 'glow'
  animateStar?: boolean
  className?: string
  style?: CSSProperties
}

export function BrandLogo({
  size = 64,
  variant = 'glow',
  animateStar = true,
  className,
  style,
}: BrandLogoProps) {
  const src =
    variant === 'dark'
      ? '/brand/chairmatch_logo_pin_symbol_dark_512.png'
      : '/brand/chairmatch_logo_pin_symbol_gradient_512.png'

  const dimension = size

  const rootClass = [
    'brand-logo',
    animateStar ? 'brand-logo--star-animate' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={rootClass}
      style={{
        width: dimension,
        height: dimension,
        ...style,
      }}
    >
      <Image
        src={src}
        alt="ChairMatch"
        width={dimension}
        height={dimension}
        className="brand-logo__img"
        priority={false}
      />
    </div>
  )
}

