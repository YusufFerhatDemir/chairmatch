'use client'

/**
 * LanguageSwitcher
 *
 * Zwei Varianten:
 *  - variant="inline" : kompaktes Dropdown für Listen / Account-Seite
 *  - variant="floating": schwebendes Icon (unten rechts), öffnet ein
 *    Popover mit den vier Sprachen + Flaggen
 *
 * Speichert die Auswahl im Cookie `NEXT_LOCALE` (1 Jahr) und triggert ein
 * Reload, damit SSR-Strings (z. B. Greeting) sofort in der neuen Sprache
 * gerendert werden.
 */
import { useEffect, useRef, useState } from 'react'
import { LOCALES, LOCALE_META, type Locale } from '@/i18n/config'
import { useLocale, useTranslations } from '@/i18n/client'

interface Props {
  variant?: 'inline' | 'floating'
  /** Wenn `false`, wird kein floating-Wrapper-Padding angewendet (für Listen-Cells) */
  className?: string
}

export default function LanguageSwitcher({ variant = 'inline', className }: Props) {
  const { locale, setLocale } = useLocale()
  const t = useTranslations('language')
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  // Click-outside / ESC zum Schließen
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = LOCALE_META[locale]

  function pick(next: Locale) {
    setOpen(false)
    if (next !== locale) setLocale(next)
  }

  // ─── Floating (unten links — nicht im Konflikt mit Chat-Widget rechts) ─
  if (variant === 'floating') {
    return (
      <div
        ref={popoverRef}
        className={className}
        style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          left: 16,
          zIndex: 80,
        }}
      >
        {open && (
          <div
            role="listbox"
            aria-label={t('label')}
            style={{
              position: 'absolute',
              bottom: 56,
              left: 0,
              background: 'var(--c2)',
              border: '1px solid rgba(176,144,96,0.35)',
              borderRadius: 14,
              padding: 6,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              minWidth: 180,
            }}
          >
            {LOCALES.map((l) => {
              const meta = LOCALE_META[l]
              const active = l === locale
              return (
                <button
                  key={l}
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(l)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: active ? 'rgba(176,144,96,.12)' : 'transparent',
                    border: 'none',
                    borderRadius: 10,
                    color: active ? 'var(--gold2)' : 'var(--cream)',
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    textAlign: 'start',
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden="true">{meta.flag}</span>
                  <span>{meta.nativeLabel}</span>
                  {active && <span style={{ marginInlineStart: 'auto', color: 'var(--gold)' }}>✓</span>}
                </button>
              )
            })}
          </div>
        )}

        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t('label')}
          onClick={() => setOpen((v) => !v)}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(176,144,96,0.18), rgba(11,11,15,0.95))',
            border: '1.5px solid rgba(212,175,55,0.45)',
            color: 'var(--gold2)',
            fontSize: 22,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 18px rgba(0,0,0,0.5), 0 0 0 1px rgba(176,144,96,0.1)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <span aria-hidden="true">{current.flag}</span>
        </button>
      </div>
    )
  }

  // ─── Inline (z. B. Konto-Seite) ─────────────────────────────────────
  return (
    <div ref={popoverRef} className={className} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="card"
        style={{
          width: '100%',
          padding: '13px 15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          cursor: 'pointer',
          background: 'var(--c2)',
          border: '1px solid var(--border)',
          color: 'var(--cream)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <span aria-hidden="true" style={{ fontSize: 16 }}>🌐</span>
          <span style={{ color: 'var(--stone)' }}>{t('label')}:</span>
          <span style={{ fontWeight: 700 }}>{current.flag} {current.nativeLabel}</span>
        </span>
        <span aria-hidden="true" style={{ color: 'var(--stone)', fontSize: 12 }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('label')}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--c2)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 50,
          }}
        >
          {LOCALES.map((l) => {
            const meta = LOCALE_META[l]
            const active = l === locale
            return (
              <button
                key={l}
                role="option"
                aria-selected={active}
                onClick={() => pick(l)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: active ? 'rgba(176,144,96,.12)' : 'transparent',
                  border: 'none',
                  borderRadius: 10,
                  color: active ? 'var(--gold2)' : 'var(--cream)',
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'start',
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden="true">{meta.flag}</span>
                <span>{meta.nativeLabel}</span>
                {active && <span style={{ marginInlineStart: 'auto', color: 'var(--gold)' }}>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
