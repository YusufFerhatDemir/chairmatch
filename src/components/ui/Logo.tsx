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
        display: 'inline-block',
        animation: animate ? 'logoFloat 3s ease-in-out infinite, logoGlow 3s ease-in-out infinite' : undefined,
      }}
    >
      <img
        src="/icons/logo_symbol_512x512.png"
        width={size}
        height={size}
        alt="ChairMatch"
        style={{ objectFit: 'contain' }}
      />
    </div>
  )
}
