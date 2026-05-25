'use client'

import { useEffect } from 'react'
import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals'
import { getSessionId } from '@/lib/consent'

/**
 * Web-Vitals RUM — misst Core Web Vitals im echten Browser-Traffic und
 * sendet sie an /api/analytics/vitals.
 *
 * Metriken:
 *   LCP   — Largest Contentful Paint  (Ladegeschwindigkeit)
 *   INP   — Interaction to Next Paint (Responsiveness, INP ersetzt FID)
 *   CLS   — Cumulative Layout Shift   (visuelle Stabilität)
 *   FCP   — First Contentful Paint    (Wahrnehmung)
 *   TTFB  — Time to First Byte        (Server-Reaktion)
 *
 * Verwendet sendBeacon (oder fetch keepalive) damit beim Tab-Close
 * keine Messung verloren geht.
 */
export default function WebVitalsReporter() {
  useEffect(() => {
    const session_id = getSessionId()

    function report(metric: Metric) {
      const payload = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        navigationType: metric.navigationType,
        session_id,
        path: window.location.pathname,
      }
      const body = JSON.stringify(payload)
      try {
        if ('sendBeacon' in navigator) {
          const blob = new Blob([body], { type: 'application/json' })
          const ok = navigator.sendBeacon('/api/analytics/vitals', blob)
          if (ok) return
        }
        fetch('/api/analytics/vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {})
      } catch {
        /* RUM darf die App nie crashen */
      }
    }

    onCLS(report)
    onINP(report)
    onLCP(report)
    onFCP(report)
    onTTFB(report)
  }, [])

  return null
}
