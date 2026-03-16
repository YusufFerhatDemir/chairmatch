import { BrandLogo } from '@/components/BrandLogo'

interface LogoProps {
  size?: number
  animate?: boolean
}

export function Logo({ size = 60, animate = true }: LogoProps) {
  return (
    <BrandLogo size={size} variant="dark" animateStar={animate} />
  )
}
