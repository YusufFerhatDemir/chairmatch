/**
 * Consent Mode v2 (Google) — zentrale Verwaltung.
 *
 * 4 granulare Kategorien gemäss DSGVO + Google-Anforderungen:
 *   - analytics_storage     → GA4, Web-Vitals an Drittsysteme
 *   - ad_storage            → Werbe-Cookies (Meta Pixel etc.)
 *   - ad_user_data          → Übermittlung von User-Daten an Werbe-Netzwerke
 *   - ad_personalization    → Personalisierte Werbung
 *
 * Default ist immer "denied" (Opt-in-Modell, EU-Standard).
 * Erst nach expliziter Zustimmung des Users via Banner wird "granted" gesetzt.
 *
 * Server-Persistenz läuft weiter über /api/cookies/consent (Tabelle cookie_consents).
 * Browser-Persistenz: localStorage-Key `cm_cookie_consent_v2`.
 */

export type ConsentCategory =
  | 'analytics_storage'
  | 'ad_storage'
  | 'ad_user_data'
  | 'ad_personalization'

export type ConsentState = Record<ConsentCategory, 'granted' | 'denied'>

export type ConsentChoicesUI = {
  necessary: true
  statistics: boolean
  marketing: boolean
}

export const STORAGE_KEY_V2 = 'cm_cookie_consent_v2'
export const STORAGE_KEY_LEGACY = 'cm_cookie_consent'
export const SESSION_KEY = 'cm_session_id'

export const DEFAULT_DENIED: ConsentState = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
}

export function choicesToConsentState(c: ConsentChoicesUI): ConsentState {
  return {
    analytics_storage: c.statistics ? 'granted' : 'denied',
    ad_storage: c.marketing ? 'granted' : 'denied',
    ad_user_data: c.marketing ? 'granted' : 'denied',
    ad_personalization: c.marketing ? 'granted' : 'denied',
  }
}

export function consentStateToChoices(s: ConsentState): ConsentChoicesUI {
  return {
    necessary: true,
    statistics: s.analytics_storage === 'granted',
    marketing: s.ad_storage === 'granted',
  }
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * Initialisiert dataLayer + setzt Consent-Default (denied).
 * Muss VOR jedem GA/Pixel-Tag laufen. Wird per <script> im <head> im
 * ConsentModeBootstrap injiziert (synchron, blocking).
 */
export function bootstrapConsentDefault(): void {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function gtag(...args: any[]) {
    window.dataLayer!.push(args)
  }
  if (!window.gtag) window.gtag = gtag as (...args: unknown[]) => void
  window.gtag('consent', 'default', {
    ...DEFAULT_DENIED,
    wait_for_update: 500,
  })
}

/** Sendet ein Consent-Update an gtag + speichert lokal. */
export function applyConsent(state: ConsentState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state))
  } catch {
    /* localStorage kann durch Private-Modus blockiert sein */
  }
  if (window.gtag) {
    window.gtag('consent', 'update', state)
  }
}

/** Liest den Consent-State aus localStorage. Migriert ggf. Legacy-Format. */
export function readStoredConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null
  try {
    const v2 = localStorage.getItem(STORAGE_KEY_V2)
    if (v2) return JSON.parse(v2) as ConsentState
    const legacy = localStorage.getItem(STORAGE_KEY_LEGACY)
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<ConsentChoicesUI>
      const choices: ConsentChoicesUI = {
        necessary: true,
        statistics: !!parsed.statistics,
        marketing: !!parsed.marketing,
      }
      const migrated = choicesToConsentState(choices)
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated))
      return migrated
    }
  } catch {
    return null
  }
  return null
}

export function hasAnalyticsConsent(): boolean {
  const s = readStoredConsent()
  return s?.analytics_storage === 'granted'
}

export function hasAdConsent(): boolean {
  const s = readStoredConsent()
  return s?.ad_storage === 'granted'
}

const CONSENT_CHANGED_EVENT = 'chairmatch:consent-changed'

export function emitConsentChanged(state: ConsentState): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: state }))
}

export function onConsentChanged(handler: (s: ConsentState) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const listener = (e: Event) => handler((e as CustomEvent<ConsentState>).detail)
  window.addEventListener(CONSENT_CHANGED_EVENT, listener)
  return () => window.removeEventListener(CONSENT_CHANGED_EVENT, listener)
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11)
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return 's_' + Date.now()
  }
}
