import { create } from 'zustand'
import type { ThemeMode, AppLanguage, TabId, Notification } from '../lib/types'
import { DEFAULT_NOTIFICATIONS } from '../lib/constants'

function safeGetItem(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function safeSetItem(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* noop */ }
}

interface UIState {
  theme: ThemeMode
  language: AppLanguage
  activeTab: TabId
  searchQuery: string
  searchOpen: boolean
  showFilter: boolean
  filterCity: string
  filterMinRating: number
  filterMaxPrice: number
  filterOnlyAvail: boolean
  filterOnlyDisc: boolean
  catFilter: string
  viewMode: 'list' | 'map'
  notifications: Notification[]
  consentGiven: boolean | null
  cookieConsent: boolean
  toastMessage: string | null
  search: string

  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setLanguage: (lang: AppLanguage) => void
  setActiveTab: (tab: TabId) => void
  setSearchQuery: (q: string) => void
  toggleSearch: () => void
  toggleFilter: () => void
  setCatFilter: (cat: string) => void
  setFilterCity: (city: string) => void
  setFilterMinRating: (r: number) => void
  setFilterMaxPrice: (p: number) => void
  setFilterOnlyAvail: (v: boolean) => void
  setFilterOnlyDisc: (v: boolean) => void
  setViewMode: (m: 'list' | 'map') => void
  resetFilters: () => void
  activeFilterCount: () => number
  markNotificationRead: (id: string) => void
  setConsent: (v: boolean) => void
  setCookieConsent: (v: boolean) => void
  showToast: (msg: string) => void
  clearToast: () => void
  setSearch: (q: string) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: (safeGetItem('cm_theme') as ThemeMode) || 'dark',
  language: (safeGetItem('cm_lang') as AppLanguage) || 'de',
  activeTab: 'home',
  searchQuery: '',
  searchOpen: false,
  showFilter: false,
  filterCity: 'all',
  filterMinRating: 0,
  filterMaxPrice: 500,
  filterOnlyAvail: false,
  filterOnlyDisc: false,
  catFilter: 'all',
  viewMode: 'list',
  notifications: [...DEFAULT_NOTIFICATIONS],
  consentGiven: safeGetItem('cm_consent') ? safeGetItem('cm_consent') === 'full' : null,
  cookieConsent: safeGetItem('cm_consent') === 'full',
  toastMessage: null,
  search: '',

  setTheme: (theme) => {
    safeSetItem('cm_theme', theme)
    document.body.classList.toggle('light', theme === 'light')
    set({ theme })
  },
  setLanguage: (language) => {
    safeSetItem('cm_lang', language)
    document.documentElement.lang = language
    set({ language })
  },
  setActiveTab: (activeTab) => set({ activeTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
  toggleFilter: () => set((s) => ({ showFilter: !s.showFilter })),
  setCatFilter: (catFilter) => set({ catFilter }),
  setFilterCity: (filterCity) => set({ filterCity }),
  setFilterMinRating: (filterMinRating) => set({ filterMinRating }),
  setFilterMaxPrice: (filterMaxPrice) => set({ filterMaxPrice }),
  setFilterOnlyAvail: (filterOnlyAvail) => set({ filterOnlyAvail }),
  setFilterOnlyDisc: (filterOnlyDisc) => set({ filterOnlyDisc }),
  setViewMode: (viewMode) => set({ viewMode }),
  resetFilters: () => set({ filterCity: 'all', filterMinRating: 0, filterMaxPrice: 500, filterOnlyAvail: false, filterOnlyDisc: false }),
  activeFilterCount: () => {
    const s = get()
    let c = 0
    if (s.filterCity !== 'all') c++
    if (s.filterMinRating > 0) c++
    if (s.filterMaxPrice < 500) c++
    if (s.filterOnlyAvail) c++
    if (s.filterOnlyDisc) c++
    return c
  },
  markNotificationRead: (id) => set((s) => ({
    notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
  })),
  setConsent: (v) => {
    safeSetItem('cm_consent', v ? 'full' : 'essential')
    set({ consentGiven: v })
  },
  toggleTheme: () => {
    const current = get().theme
    const next: ThemeMode = current === 'dark' ? 'light' : 'dark'
    safeSetItem('cm_theme', next)
    document.body.classList.toggle('light', next === 'light')
    set({ theme: next })
  },
  setCookieConsent: (v) => {
    safeSetItem('cm_consent', v ? 'full' : 'essential')
    set({ cookieConsent: v, consentGiven: v })
  },
  showToast: (msg) => set({ toastMessage: msg }),
  clearToast: () => set({ toastMessage: null }),
  setSearch: (search) => set({ search }),
}))
