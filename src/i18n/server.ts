/**
 * Server-seitige i18n-Helpers.
 *
 * `getLocale()` liest das `NEXT_LOCALE`-Cookie und fällt sonst auf den
 * Accept-Language-Header zurück (best-effort). Standard ist Deutsch.
 */
import { cookies, headers } from 'next/headers'
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, isLocale, type Locale } from './config'
import { getMessages, resolvePath, format, type Messages } from './messages'

export async function getLocale(): Promise<Locale> {
  try {
    const c = await cookies()
    const fromCookie = c.get(LOCALE_COOKIE)?.value
    if (isLocale(fromCookie)) return fromCookie
  } catch {
    // cookies() darf in manchen Kontexten nicht aufgerufen werden
  }

  try {
    const h = await headers()
    const accept = h.get('accept-language') || ''
    // Format: "de-DE,de;q=0.9,en-US;q=0.8" — nimm den primären Sprachcode
    const primary = accept.split(',')[0]?.split('-')[0]?.toLowerCase().trim()
    if (primary && LOCALES.includes(primary as Locale)) return primary as Locale
  } catch {
    // headers() darf in manchen Kontexten nicht aufgerufen werden
  }

  return DEFAULT_LOCALE
}

export async function getServerMessages(): Promise<{ locale: Locale; messages: Messages }> {
  const locale = await getLocale()
  return { locale, messages: getMessages(locale) }
}

/**
 * Server-seitiger Translator. Verwendung in Server-Components / RSC:
 *   const t = await getTranslations('home')
 *   t('bookNow')
 */
export async function getTranslations(namespace?: string) {
  const { messages } = await getServerMessages()
  return (key: string, values?: Record<string, string | number>): string => {
    const fullKey = namespace ? `${namespace}.${key}` : key
    const raw = resolvePath(messages, fullKey)
    if (typeof raw !== 'string') return fullKey
    return format(raw, values)
  }
}
