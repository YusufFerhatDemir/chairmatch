'use client'

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
  // Vereinheitlichtes Logo: wir nutzen das PWA/App-Icon (/icon-512.png),
  // damit es überall (Startseite, Onboarding, Login) gleich aussieht und
  // keine 404-Probleme durch fehlende /brand-Assets mehr entstehen.
  const src = '/icon-512.png'

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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="ChairMatch"
        width={dimension}
        height={dimension}
        className="brand-logo__img"
        style={{ objectFit: 'contain', display: 'block' }}
      />
    </div>
  )
}

