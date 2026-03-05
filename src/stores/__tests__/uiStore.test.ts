import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      theme: 'dark',
      language: 'de',
      activeTab: 'home',
      searchQuery: '',
      catFilter: 'all',
      filterCity: 'all',
      filterMinRating: 0,
      filterMaxPrice: 500,
      filterOnlyAvail: false,
      filterOnlyDisc: false,
      toastMessage: null,
    })
  })

  it('toggles theme', () => {
    useUIStore.getState().toggleTheme()
    expect(useUIStore.getState().theme).toBe('light')
    useUIStore.getState().toggleTheme()
    expect(useUIStore.getState().theme).toBe('dark')
  })

  it('sets language', () => {
    useUIStore.getState().setLanguage('en')
    expect(useUIStore.getState().language).toBe('en')
  })

  it('shows and clears toast', () => {
    useUIStore.getState().showToast('Hello')
    expect(useUIStore.getState().toastMessage).toBe('Hello')
    useUIStore.getState().clearToast()
    expect(useUIStore.getState().toastMessage).toBeNull()
  })

  it('counts active filters', () => {
    useUIStore.setState({ filterCity: 'Berlin', filterOnlyDisc: true })
    expect(useUIStore.getState().activeFilterCount()).toBe(2)
  })

  it('resets filters', () => {
    useUIStore.setState({ filterCity: 'Berlin', filterMinRating: 4 })
    useUIStore.getState().resetFilters()
    expect(useUIStore.getState().filterCity).toBe('all')
    expect(useUIStore.getState().filterMinRating).toBe(0)
  })
})
