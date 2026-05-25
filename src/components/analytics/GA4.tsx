'use client'

import { GoogleAnalytics } from '@next/third-parties/google'

/**
 * GA4-Integration via @next/third-parties.
 *
 * Wird nur gerendert, wenn `NEXT_PUBLIC_GA4_MEASUREMENT_ID` gesetzt ist.
 * Consent steuert Google-seitig: ConsentModeBootstrap setzt default=denied,
 * der ConsentBanner sendet bei Zustimmung `gtag('consent', 'update', ...)`.
 * GA4 sendet im denied-Zustand keine Cookies, schickt aber Cookieless-Pings
 * (Behavioral Modeling) — DSGVO-konform, weil keine ID-bezogenen Daten.
 */
export default function GA4() {
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
  if (!measurementId || measurementId.startsWith('G-XXXXX')) return null
  return <GoogleAnalytics gaId={measurementId} />
}
