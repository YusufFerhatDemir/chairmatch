'use client'
// build-trigger: 1779181523

import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef, type ReactNode } from 'react'

/** Werte der `[data-storage]`-Felder einer Unterseite. */
export type SubPageValues = Record<string, string | boolean | number>

export interface SubPageProps {
  parentHref: string
  parentLabel: string
  title: string
  subtitle: string
  /**
   * Nur noch Fallback fuer Seiten ohne DB-Anbindung: wenn weder `loadValues`
   * noch `onSave` gesetzt sind, laufen Laden und Speichern ueber
   * localStorage[storageKey].
   */
  storageKey?: string
  /** Welche Rolle für Bottom-Nav */
  role?: 'anbieter' | 'vermieter' | 'mieter'
  children: ReactNode
  showSave?: boolean
  /**
   * Speichert die gesammelten Formularwerte. Wirft die Funktion, bleibt der
   * Nutzer auf der Seite und sieht die Fehlermeldung — es wird NICHT
   * "Gespeichert" angezeigt und nicht zurueck navigiert.
   */
  onSave?: (values: SubPageValues) => Promise<void> | void
  /**
   * Laedt die Startwerte (z.B. aus der DB). `null` = noch nichts gespeichert,
   * die Default-Werte der Felder bleiben stehen.
   */
  loadValues?: () => Promise<SubPageValues | null>
}

/** Fehlermeldung aus einem unbekannten Wurf herausziehen. */
function errorText(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

function storageNodes(): NodeListOf<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  return document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-storage]')
}

function collectValues(): SubPageValues {
  const obj: SubPageValues = {}
  storageNodes().forEach((n) => {
    const k = n.getAttribute('data-storage') || n.name || n.id
    if (!k) return
    if ((n as HTMLInputElement).type === 'checkbox') {
      obj[k] = (n as HTMLInputElement).checked
    } else {
      obj[k] = n.value
    }
  })
  return obj
}

function applyValues(values: SubPageValues) {
  storageNodes().forEach((n) => {
    const k = n.getAttribute('data-storage') || n.name || n.id
    if (!k || !(k in values)) return
    const v = values[k]
    if ((n as HTMLInputElement).type === 'checkbox') {
      ;(n as HTMLInputElement).checked = !!v
    } else {
      n.value = String(v)
    }
    // React-kontrollierte Felder muessen von der Wertaenderung erfahren.
    n.dispatchEvent(new Event('input', { bubbles: true }))
    n.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

export default function MeinBereichSubPage({
  parentHref, parentLabel, title, subtitle, storageKey, role,
  children, showSave = true, onSave, loadValues,
}: SubPageProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)
  const [loading, setLoading] = useState(!!loadValues)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function doSave() {
    if (saving || loading) return
    setSaving(true)
    setSaveError(null)
    try {
      if (onSave) {
        await onSave(collectValues())
      } else if (storageKey && typeof window !== 'undefined') {
        try { localStorage.setItem(storageKey, JSON.stringify(collectValues())) } catch {}
      }
    } catch (err) {
      setSaveError(errorText(err, 'Speichern fehlgeschlagen. Bitte erneut versuchen.'))
      setSaving(false)
      return
    }
    setSaving(false)
    setSavedToast(true)
    setTimeout(() => {
      setSavedToast(false)
      router.push(parentHref as Route)
    }, 1100)
  }

  // `loadValues` kommt aus den Seiten meist als Inline-Arrow — waere es eine
  // Dependency des Effects, liefe der Fetch bei jedem Render erneut.
  const loadRef = useRef(loadValues)
  loadRef.current = loadValues
  const hasLoader = !!loadValues

  // Startwerte laden: bevorzugt aus der DB, sonst aus localStorage.
  useEffect(() => {
    let cancelled = false
    const load = loadRef.current

    if (load) {
      setLoading(true)
      setLoadError(null)
      load()
        .then((values) => {
          if (cancelled) return
          if (values) applyValues(values)
        })
        .catch((err) => {
          if (!cancelled) setLoadError(errorText(err, 'Daten konnten nicht geladen werden.'))
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => { cancelled = true }
    }

    if (!storageKey || typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) applyValues(JSON.parse(raw))
    } catch { /* defekter Cache — Defaults stehen lassen */ }
    return () => { cancelled = true }
  }, [storageKey, hasLoader])

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
            onClick={() => router.push(parentHref as Route)}
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
        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 18, opacity: loading ? 0.45 : 1, transition: 'opacity 160ms' }}>
          {children}
        </div>

        {loading && (
          <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--stone)' }}>
            <span style={{ display: 'inline-flex', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold2)', animation: 'cmpulse 1s infinite' }} />
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold2)', animation: 'cmpulse 1s infinite 0.2s' }} />
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold2)', animation: 'cmpulse 1s infinite 0.4s' }} />
            </span>
            <span>Daten werden geladen…</span>
          </div>
        )}

        {(loadError || saveError) && (
          <div
            role="alert"
            style={{
              margin: '0 20px 16px', padding: '11px 14px', borderRadius: 12,
              background: 'rgba(232,80,64,0.10)', border: '1px solid rgba(232,80,64,0.32)',
              color: '#FF8888', fontSize: 12, lineHeight: 1.5,
            }}
          >
            {saveError || loadError}
          </div>
        )}

        {showSave && (
          <div style={{ padding: '0 20px 24px', display: 'flex', gap: 10 }}>
            <button
              onClick={() => router.push(parentHref as Route)}
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
              disabled={saving || loading}
              style={{
                flex: 2, padding: 14, borderRadius: 14,
                background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
                color: '#1a1000', border: 'none',
                fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: saving ? 'wait' : loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 0 18px rgba(196,168,106,0.25)',
                opacity: saving || loading ? 0.7 : 1,
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
