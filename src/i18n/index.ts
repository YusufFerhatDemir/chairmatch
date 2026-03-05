import { de } from './de'
import { en } from './en'
import { tr } from './tr'

export type TranslationKey = keyof typeof de

const translations = { de, en, tr } as const

export type AppLanguage = keyof typeof translations

let currentLang: AppLanguage = 'de'

export function setLanguage(lang: AppLanguage) {
  currentLang = lang
}

export function getLanguage(): AppLanguage {
  return currentLang
}

export function t(key: TranslationKey): string {
  return translations[currentLang]?.[key] || translations.de[key] || key
}

export { translations }
