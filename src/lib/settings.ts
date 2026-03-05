import { prisma } from './prisma'
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

export const getCachedSettings = unstable_cache(
  async (category: string): Promise<AppSettingRow[]> => {
    return prisma.appSetting.findMany({
      where: { category },
      orderBy: { sortOrder: 'asc' },
    })
  },
  ['app-settings'],
  { tags: ['app-settings'], revalidate: 3600 }
)

export const getCachedAllSettings = unstable_cache(
  async (): Promise<AppSettingRow[]> => {
    return prisma.appSetting.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    })
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

export const getCachedOnboardingSlides = unstable_cache(
  async (): Promise<OnboardingSlideRow[]> => {
    return prisma.onboardingSlide.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
  },
  ['onboarding-slides'],
  { tags: ['onboarding-slides'], revalidate: 3600 }
)

export const getAllOnboardingSlides = unstable_cache(
  async (): Promise<OnboardingSlideRow[]> => {
    return prisma.onboardingSlide.findMany({
      orderBy: { sortOrder: 'asc' },
    })
  },
  ['onboarding-slides-all'],
  { tags: ['onboarding-slides'], revalidate: 3600 }
)
