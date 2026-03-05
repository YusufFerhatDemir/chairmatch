interface LogoProps {
  size?: number
  animate?: boolean
}

export function Logo({ size = 60, animate = true }: LogoProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        animation: animate ? 'logoFloat 3s ease-in-out infinite, logoGlow 4s ease-in-out infinite' : undefined,
      }}
    >
      <svg viewBox="0 0 120 120" width={size} height={size}>
        <defs>
          <linearGradient id="chairGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5D860" />
            <stop offset="50%" stopColor="#C8A84B" />
            <stop offset="100%" stopColor="#8B7330" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="55" fill="none" stroke="url(#chairGold)" strokeWidth="2" opacity="0.5"
          strokeDasharray="10 5" style={{ animation: 'rimRotate 20s linear infinite' }} />
        <text x="60" y="68" textAnchor="middle" fontFamily="Cinzel" fontSize="32" fontWeight="700"
          fill="url(#chairGold)">C</text>
        <circle cx="60" cy="60" r="48" fill="none" stroke="url(#chairGold)" strokeWidth="1.5" opacity="0.3" />
      </svg>
    </div>
  )
}
