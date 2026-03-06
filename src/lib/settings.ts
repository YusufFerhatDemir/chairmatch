import { getSupabaseAdmin } from './supabase-server'
import { unstable_cache } from 'next/cache'

export type AppSettingRow = {
  id: string
  category: string
  key: string
  value: string
  valueType: string
  label: string | null
  sortOrder: number
}

function mapSetting(s: Record<string, unknown>): AppSettingRow {
  return {
    id: s.id as string,
    category: s.category as string,
    key: s.key as string,
    value: s.value as string,
    valueType: (s.value_type as string) || 'string',
    label: s.label as string | null,
    sortOrder: (s.sort_order as number) || 0,
  }
}

export const getCachedSettings = unstable_cache(
  async (category: string): Promise<AppSettingRow[]> => {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('app_settings')
      .select('*')
      .eq('category', category)
      .order('sort_order', { ascending: true })
    return (data || []).map(mapSetting)
  },
  ['app-settings'],
  { tags: ['app-settings'], revalidate: 3600 }
)

export const getCachedAllSettings = unstable_cache(
  async (): Promise<AppSettingRow[]> => {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('app_settings')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })
    return (data || []).map(mapSetting)
  },
  ['app-settings-all'],
  { tags: ['app-settings'], revalidate: 3600 }
)

export async function getSettingValue(category: string, key: string, fallback: string): Promise<string> {
  const settings = await getCachedSettings(category)
  const found = settings.find(s => s.key === key)
  return found?.value ?? fallback
}

export async function getSettingsMap(category: string): Promise<Record<string, string>> {
  const settings = await getCachedSettings(category)
  const map: Record<string, string> = {}
  for (const s of settings) {
    map[s.key] = s.value
  }
  return map
}

export type OnboardingSlideRow = {
  id: string
  title: string
  subtitle: string
  imageUrl: string | null
  icon: string | null
  sortOrder: number
  isActive: boolean
}

function mapSlide(s: Record<string, unknown>): OnboardingSlideRow {
  return {
    id: s.id as string,
    title: s.title as string,
    subtitle: s.subtitle as string,
    imageUrl: s.image_url as string | null,
    icon: s.icon as string | null,
    sortOrder: (s.sort_order as number) || 0,
    isActive: s.is_active as boolean,
  }
}

export const getCachedOnboardingSlides = unstable_cache(
  async (): Promise<OnboardingSlideRow[]> => {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('onboarding_slides')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    return (data || []).map(mapSlide)
  },
  ['onboarding-slides-v2'],
  { tags: ['onboarding-slides'], revalidate: 300 }
)

export const getAllOnboardingSlides = unstable_cache(
  async (): Promise<OnboardingSlideRow[]> => {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase
      .from('onboarding_slides')
      .select('*')
      .order('sort_order', { ascending: true })
    return (data || []).map(mapSlide)
  },
  ['onboarding-slides-all'],
  { tags: ['onboarding-slides'], revalidate: 3600 }
)
