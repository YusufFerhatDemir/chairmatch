/**
 * Global OG-Image für Root + Default-Fallback aller Routen.
 *
 * Wird automatisch von Next.js als og:image für die Root-Page genutzt
 * (und als Default für Routen ohne eigene opengraph-image.tsx).
 *
 * Größe: 1200x630 (Twitter Large Card + OpenGraph Standard).
 */

import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'ChairMatch — Beauty Workspace Sharing in Deutschland'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0907 0%, #1a1612 50%, #2a2018 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#f4ead5',
          padding: 80,
          position: 'relative',
        }}
      >
        {/* Gold accent bar */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 8,
          background: 'linear-gradient(90deg, transparent, #d4af37 50%, transparent)',
        }} />

        {/* Logo / Brand */}
        <div style={{
          fontSize: 92,
          fontWeight: 700,
          color: '#d4af37',
          letterSpacing: -2,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'baseline',
        }}>
          ChairMatch
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 38,
          color: '#f4ead5',
          textAlign: 'center',
          lineHeight: 1.3,
          marginBottom: 16,
          maxWidth: 900,
          display: 'flex',
        }}>
          Beauty Workspace Sharing
        </div>
        <div style={{
          fontSize: 26,
          color: '#9a8c78',
          textAlign: 'center',
          lineHeight: 1.4,
          maxWidth: 900,
          display: 'flex',
        }}>
          Stühle, Liegen & Kabinen tageweise mieten und vermieten.
        </div>

        {/* Bottom strip */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          left: 80,
          right: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 18,
          color: '#9a8c78',
        }}>
          <div style={{ display: 'flex' }}>chairmatch.de</div>
          <div style={{ display: 'flex' }}>★ Verifiziert · Sichere Zahlung · Made in Germany</div>
        </div>

        {/* Gold accent bar bottom */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: 8,
          background: 'linear-gradient(90deg, transparent, #d4af37 50%, transparent)',
        }} />
      </div>
    ),
    size
  )
}
