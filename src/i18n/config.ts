/**
 * i18n configuration.
 *
 * Sprachen: Deutsch (default), Englisch, Türkisch, Arabisch (RTL).
 * Strategie: localePrefix: 'never' — die Sprache wird ausschließlich
 * über das Cookie `NEXT_LOCALE` gesteuert. Es gibt keine `/de/...`-URLs.
 */

export const LOCALES = ['de', 'en', 'tr', 'ar'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'de'

export const LOCALE_COOKIE = 'NEXT_LOCALE'
/** 1 Jahr Persistenz */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** Sprachen, die rechts-nach-links rendern */
export const RTL_LOCALES: readonly Locale[] = ['ar'] as const

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value)
}

export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale)
}

export const LOCALE_META: Record<Locale, { label: string; flag: string; nativeLabel: string; htmlLang: string }> = {
  de: { label: 'Deutsch', nativeLabel: 'Deutsch', flag: '🇩🇪', htmlLang: 'de-DE' },
  en: { label: 'English', nativeLabel: 'English', flag: '🇬🇧', htmlLang: 'en-US' },
  tr: { label: 'Türkçe', nativeLabel: 'Türkçe', flag: '🇹🇷', htmlLang: 'tr-TR' },
  ar: { label: 'العربية', nativeLabel: 'العربية', flag: '🇸🇦', htmlLang: 'ar-SA' },
}
