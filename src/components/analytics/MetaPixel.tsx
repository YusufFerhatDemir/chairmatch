'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { hasAdConsent, onConsentChanged } from '@/lib/consent'

/**
 * Meta Pixel — Browser-Side.
 *
 * Wird nur geladen wenn:
 *   1. NEXT_PUBLIC_META_PIXEL_ID gesetzt (kein Platzhalter)
 *   2. User hat ad_storage-Consent erteilt
 *
 * Consent-Änderungen werden live beobachtet (onConsentChanged), damit
 * der Pixel ohne Reload aktiviert/deaktiviert werden kann.
 *
 * Server-Side-Komplement: /api/analytics/meta-capi (Conversion API).
 */
export default function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    setConsented(hasAdConsent())
    const off = onConsentChanged((s) => setConsented(s.ad_storage === 'granted'))
    return off
  }, [])

  if (!pixelId || pixelId.startsWith('XXXXX') || !consented) return null

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}
