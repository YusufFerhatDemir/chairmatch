/**
 * (protected)/layout.tsx — Auth-Wall für alle Routes in dieser Gruppe.
 *
 * Falls keine Session: Redirect zu /auth mit callbackUrl zurück zur Original-Page.
 *
 * Schützt automatisch: /account, /account/bewertungen, /booking/[salonId],
 * /messages, /favorites, etc.
 */

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getServerSession } from '@/modules/auth/session'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  if (!session?.user) {
    // Original-Pfad aus Referer/URL extrahieren für Post-Login-Redirect
    let nextPath = '/account'
    try {
      const h = await headers()
      const url = h.get('x-url') || h.get('referer') || ''
      const u = new URL(url, 'https://chairmatch.de')
      if (u.pathname && u.pathname !== '/auth' && u.pathname.startsWith('/')) {
        nextPath = u.pathname + (u.search || '')
      }
    } catch { /* fallback to /account */ }
    redirect(`/auth?next=${encodeURIComponent(nextPath)}`)
  }
  return <>{children}</>
}
