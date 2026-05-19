'use client'

import { BrandLogo } from '@/components/BrandLogo'
import { useRouter } from 'next/navigation'
import { type ReactNode } from 'react'

export interface SubPageProps {
  /** Übergeordneter Bereich (für Zurück-Button + Hint oben rechts) */
  parentHref: string
  parentLabel: string
  /** Titel der Sub-Seite */
  title: string
  /** Untertitel / kurze Erklärung */
  subtitle: string
  /** Body Content (Aktuell-Box, Aktion, Tipps etc.) */
  children: ReactNode
  /** Optional: Speichern + Abbrechen Buttons unten */
  showSave?: boolean
  onSave?: () => void
}

export default function MeinBereichSubPage({
  parentHref, parentLabel, title, subtitle, children, showSave = true, onSave,
}: SubPageProps) {
  const router = useRouter()

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '22px 14px 40px',
    }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="cm-gold-pin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#BF953F" />
            <stop offset="22%" stopColor="#FCF6BA" />
            <stop offset="45%" stopColor="#B38728" />
            <stop offset="67%" stopColor="#FBF5B7" />
            <stop offset="100%" stopColor="#AA771C" />
          </linearGradient>
        </defs>
      </svg>

      <div style={{
        width: '100%', maxWidth: 430, background: 'var(--bg)',
        borderRadius: 38, overflow: 'hidden',
        border: '1px solid rgba(196,168,106,0.12)',
        boxShadow: '0 50px 120px rgba(0,0,0,0.78)',
      }}>
        {/* Top bar */}
        <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => router.push(parentHref)}
            aria-label="Zurück"
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(196,168,106,0.08)',
              border: '1px solid rgba(196,168,106,0.22)',
              color: 'var(--gold2)', fontSize: 18, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >‹</button>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>
            {parentLabel}
          </span>
        </div>

        {/* Logo Header */}
        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>
              CHAIRMATCH
            </h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        {/* Title */}
        <div style={{ padding: '0 20px 18px' }}>
          <h2 className="cinzel text-gold-metallic" style={{ fontSize: 26, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>
            {title}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>{subtitle}</p>
        </div>

        {/* Body */}
        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {children}
        </div>

        {showSave && (
          <div style={{ padding: '0 20px 24px', display: 'flex', gap: 10 }}>
            <button
              onClick={() => router.push(parentHref)}
              style={{
                flex: 1, padding: 14, borderRadius: 14,
                background: 'transparent', color: 'var(--stone)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >Abbrechen</button>
            <button
              onClick={() => {
                if (onSave) onSave()
                router.push(parentHref)
              }}
              style={{
                flex: 2, padding: 14, borderRadius: 14,
                background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
                color: '#1a1000', border: 'none',
                fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 0 18px rgba(196,168,106,0.25)',
              }}
            >
              <span>Speichern</span>
              <span>✓</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/** Reusable Box-Komponenten ───────────────────────────────────── */

export function AktuellBox({ children, label = 'Aktuell' }: { children: ReactNode; label?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      background: 'linear-gradient(145deg, rgba(191,149,63,0.05) 0%, var(--c1) 50%, rgba(179,135,40,0.03) 100%)',
      border: '1px solid rgba(191,149,63,0.22)',
      borderRadius: 18, padding: 24,
    }}>
      <span style={{ fontSize: 10, letterSpacing: 2, color: 'var(--stone)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
      {children}
    </div>
  )
}

export function TippsBox({ title, tipps }: { title: string; tipps: string[] }) {
  return (
    <div style={{
      background: 'rgba(176,144,96,0.06)',
      border: '1px solid rgba(176,144,96,0.18)',
      borderRadius: 14, padding: '14px 16px',
    }}>
      <p style={{ fontSize: 11, letterSpacing: 2, color: 'var(--gold2)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
        {title}
      </p>
      {tipps.map((t, i) => (
        <p key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--cream)', lineHeight: 1.5, marginBottom: 5 }}>
          <span style={{ color: 'var(--gold2)', fontWeight: 700, flexShrink: 0 }}>✓</span>
          <span>{t}</span>
        </p>
      ))}
    </div>
  )
}

export function GoldButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: 14, borderRadius: 14,
        background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
        color: '#1a1000', border: 'none',
        fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: '0 0 20px rgba(196,168,106,0.25)',
      }}
    >
      {children}
    </button>
  )
}
