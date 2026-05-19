'use client'

import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'
import { useRouter } from 'next/navigation'
import { useState, useEffect, type ReactNode } from 'react'

export interface SubPageProps {
  parentHref: string
  parentLabel: string
  title: string
  subtitle: string
  /** Storage-Key (z.B. 'cm_anbieter_beschreibung') — wenn gesetzt, wird Inhalt persistiert in localStorage */
  storageKey?: string
  /** Welche Rolle für Bottom-Nav */
  role?: 'anbieter' | 'vermieter' | 'mieter'
  children: ReactNode
  showSave?: boolean
  /** Manuelle Save-Funktion. Wenn null/undefined und storageKey gesetzt, wird auto-saved (alle data-storage Felder im DOM). */
  onSave?: () => Promise<void> | void
}

export default function MeinBereichSubPage({
  parentHref, parentLabel, title, subtitle, storageKey, role,
  children, showSave = true, onSave,
}: SubPageProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)

  // Auto-save: collect all data-storage="..." input/textarea values into localStorage[storageKey]
  async function doSave() {
    if (saving) return
    setSaving(true)
    try {
      if (onSave) {
        await onSave()
      } else if (storageKey && typeof window !== 'undefined') {
        const nodes = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-storage]')
        const obj: Record<string, string | boolean | number> = {}
        nodes.forEach((n) => {
          const k = n.getAttribute('data-storage') || n.name || n.id
          if (!k) return
          if ((n as HTMLInputElement).type === 'checkbox') {
            obj[k] = (n as HTMLInputElement).checked
          } else {
            obj[k] = n.value
          }
        })
        try { localStorage.setItem(storageKey, JSON.stringify(obj)) } catch {}
      }
      // small artificial delay so user sees feedback
      await new Promise((r) => setTimeout(r, 350))
      setSavedToast(true)
      setTimeout(() => {
        setSavedToast(false)
        router.push(parentHref)
      }, 1100)
    } finally {
      setSaving(false)
    }
  }

  // Restore values on mount (best-effort)
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const obj = JSON.parse(raw)
      const nodes = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-storage]')
      nodes.forEach((n) => {
        const k = n.getAttribute('data-storage') || n.name || n.id
        if (!k || !(k in obj)) return
        const v = obj[k]
        if ((n as HTMLInputElement).type === 'checkbox') {
          ;(n as HTMLInputElement).checked = !!v
        } else {
          n.value = String(v)
        }
      })
    } catch {}
  }, [storageKey])

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '22px 14px 0',
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
        marginBottom: 24,
        position: 'relative',
      }}>
        {/* Toast */}
        {savedToast && (
          <div style={{
            position: 'absolute', left: '50%', top: 60, transform: 'translateX(-50%)',
            background: '#4A8A5A', color: '#0B0B0F',
            padding: '10px 18px', borderRadius: 14,
            fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 20px 50px rgba(74,138,90,0.4)',
            zIndex: 50,
          }}>
            <span>✓</span><span>Gespeichert</span>
          </div>
        )}

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
              disabled={saving}
              style={{
                flex: 1, padding: 14, borderRadius: 14,
                background: 'transparent', color: 'var(--stone)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1,
              }}
            >Abbrechen</button>
            <button
              onClick={doSave}
              disabled={saving}
              style={{
                flex: 2, padding: 14, borderRadius: 14,
                background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
                color: '#1a1000', border: 'none',
                fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: saving ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 0 18px rgba(196,168,106,0.25)',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? (
                <>
                  <span style={{ display: 'inline-flex', gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1a1000', animation: 'cmpulse 1s infinite' }} />
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1a1000', animation: 'cmpulse 1s infinite 0.2s' }} />
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1a1000', animation: 'cmpulse 1s infinite 0.4s' }} />
                  </span>
                  <span>Speichern</span>
                </>
              ) : (
                <>
                  <span>Speichern</span>
                  <span>✓</span>
                </>
              )}
            </button>
          </div>
        )}

        {role && <BottomNav role={role} />}
      </div>

      <style>{`
        @keyframes cmpulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
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
