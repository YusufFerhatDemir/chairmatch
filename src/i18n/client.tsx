'use client'

/**
 * Client-seitige i18n: Provider, Hooks und das Setzen/Lesen des Locale-Cookies.
 *
 * Verwendung:
 *   const t = useTranslations('home')
 *   t('bookNow')
 *
 *   const { locale, setLocale } = useLocale()
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  RTL_LOCALES,
  isLocale,
  type Locale,
} from './config'
import { getMessages, resolvePath, format, type Messages } from './messages'

interface I18nContextValue {
  locale: Locale
  messages: Messages
  setLocale: (next: Locale) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

function readCookieLocale(): Locale | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/)
  const v = match?.[1]
  return isLocale(v) ? v : null
}

function writeCookieLocale(locale: Locale) {
  if (typeof document === 'undefined') return
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`
}

function applyHtmlAttributes(locale: Locale) {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  html.lang = locale
  html.dir = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr'
}

interface ProviderProps {
  initialLocale?: Locale
  children: ReactNode
}

export function I18nProvider({ initialLocale = DEFAULT_LOCALE, children }: ProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  // Beim Mount: Cookie hat Vorrang (User-Auswahl überlebt SSR-Default)
  useEffect(() => {
    const fromCookie = readCookieLocale()
    if (fromCookie && fromCookie !== locale) {
      setLocaleState(fromCookie)
    }
    applyHtmlAttributes(fromCookie ?? locale)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    writeCookieLocale(next)
    applyHtmlAttributes(next)
    // Sanftes Re-Render der Server-Components mit neuer Sprache (falls Sprache
    // serverseitig beeinflusst — z.B. Greeting). Reload statt router.refresh,
    // damit auch <html lang/dir> sofort konsistent ist.
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }, [])

  const messages = useMemo(() => getMessages(locale), [locale])

  const value = useMemo<I18nContextValue>(
    () => ({ locale, messages, setLocale }),
    [locale, messages, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Fallback ohne Provider — defensives Default-Verhalten.
    return {
      locale: DEFAULT_LOCALE,
      messages: getMessages(DEFAULT_LOCALE),
      setLocale: () => undefined,
    }
  }
  return ctx
}

export function useLocale() {
  const { locale, setLocale } = useI18n()
  return { locale, setLocale }
}

/**
 * Liefert eine Translate-Funktion, optional gebunden an einen Namespace.
 *
 *   const t = useTranslations()           // t('home.bookNow')
 *   const t = useTranslations('home')     // t('bookNow')
 *
 * Platzhalter werden im {placeholder}-Format ersetzt.
 */
export function useTranslations(namespace?: string) {
  const { messages } = useI18n()
  return useCallback(
    (key: string, values?: Record<string, string | number>): string => {
      const fullKey = namespace ? `${namespace}.${key}` : key
      const raw = resolvePath(messages, fullKey)
      if (typeof raw !== 'string') return fullKey
      return format(raw, values)
    },
    [messages, namespace],
  )
}

export function useIsRTL(): boolean {
  const { locale } = useI18n()
  return RTL_LOCALES.includes(locale)
}
