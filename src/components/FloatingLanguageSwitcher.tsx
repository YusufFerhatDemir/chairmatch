'use client'

/**
 * Schwebender Sprach-Switcher (unten rechts) für Public-Pages.
 * Wird auf Admin/Provider/Owner/Investor/Auth/Onboarding-Routen
 * ausgeblendet, um nicht mit der UI zu kollidieren.
 */
import { usePathname } from 'next/navigation'
import LanguageSwitcher from './LanguageSwitcher'

const HIDDEN_PREFIXES = [
  '/admin',
  '/provider',
  '/owner',
  '/investor',
  '/auth',
  '/register',
]

export default function FloatingLanguageSwitcher() {
  const pathname = usePathname() || '/'
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null
  return <LanguageSwitcher variant="floating" />
}
