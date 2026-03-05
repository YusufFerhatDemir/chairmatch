'use server'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/modules/auth/session'
import { revalidateTag } from 'next/cache'
import { saveSettingsSchema, slideSchema, reorderSlidesSchema } from './super-admin.schemas'
import { uploadToStorage } from '@/lib/supabase-server'

async function requireSuperAdmin() {
  return requireRole(['super_admin'])
}

// ─── Settings ───

export async function saveSettings(category: string, settings: { key: string; value: string }[]) {
  await requireSuperAdmin()

  const parsed = saveSettingsSchema.safeParse({ category, settings })
  if (!parsed.success) return { error: 'Ungültige Eingabe' }

  for (const s of parsed.data.settings) {
    await prisma.appSetting.upsert({
      where: { category_key: { category: parsed.data.category, key: s.key } },
      update: { value: s.value, updatedAt: new Date() },
      create: { category: parsed.data.category, key: s.key, value: s.value },
    })
  }

  await prisma.auditLog.create({
    data: {
      action: 'settings.update',
      entity: 'app_settings',
      details: { category, keys: settings.map(s => s.key) },
    },
  })

  revalidateTag('app-settings')
  return { success: true }
}

export async function getSettings(category?: string) {
  await requireSuperAdmin()

  if (category) {
    return prisma.appSetting.findMany({
      where: { category },
      orderBy: { sortOrder: 'asc' },
    })
  }
  return prisma.appSetting.findMany({
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  })
}

// ─── Onboarding Slides ───

export async function getSlides() {
  await requireSuperAdmin()
  return prisma.onboardingSlide.findMany({ orderBy: { sortOrder: 'asc' } })
}

export async function createSlide(data: { title: string; subtitle: string; icon?: string | null; imageUrl?: string | null }) {
  await requireSuperAdmin()

  const parsed = slideSchema.safeParse({ ...data, sortOrder: 0, isActive: true })
  if (!parsed.success) return { error: 'Ungültige Eingabe' }

  const maxOrder = await prisma.onboardingSlide.aggregate({ _max: { sortOrder: true } })
  const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1

  const slide = await prisma.onboardingSlide.create({
    data: { ...parsed.data, sortOrder: nextOrder },
  })

  revalidateTag('onboarding-slides')
  return { success: true, slide }
}

export async function updateSlide(id: string, data: Partial<{ title: string; subtitle: string; icon: string | null; imageUrl: string | null; isActive: boolean }>) {
  await requireSuperAdmin()

  const slide = await prisma.onboardingSlide.update({
    where: { id },
    data: { ...data, updatedAt: new Date() },
  })

  revalidateTag('onboarding-slides')
  return { success: true, slide }
}

export async function deleteSlide(id: string) {
  await requireSuperAdmin()

  await prisma.onboardingSlide.delete({ where: { id } })

  revalidateTag('onboarding-slides')
  return { success: true }
}

export async function reorderSlides(orderedIds: string[]) {
  await requireSuperAdmin()

  const parsed = reorderSlidesSchema.safeParse({ orderedIds })
  if (!parsed.success) return { error: 'Ungültige Eingabe' }

  for (let i = 0; i < parsed.data.orderedIds.length; i++) {
    await prisma.onboardingSlide.update({
      where: { id: parsed.data.orderedIds[i] },
      data: { sortOrder: i },
    })
  }

  revalidateTag('onboarding-slides')
  return { success: true }
}

// ─── Image Upload ───

export async function uploadImage(formData: FormData) {
  await requireSuperAdmin()

  const file = formData.get('file') as File
  if (!file) return { error: 'Keine Datei' }

  const bucket = (formData.get('bucket') as string) || 'app-assets'
  const folder = (formData.get('folder') as string) || 'uploads'
  const ext = file.name.split('.').pop() || 'png'
  const path = `${folder}/${Date.now()}.${ext}`

  try {
    const url = await uploadToStorage(bucket, path, file)
    return { success: true, url }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ─── Category Icon ───

export async function updateCategoryIcon(categoryId: string, iconUrl: string) {
  await requireSuperAdmin()

  const cat = await prisma.category.update({
    where: { id: categoryId },
    data: { iconUrl, updatedAt: new Date() },
  })

  revalidateTag('app-settings')
  return { success: true, category: cat }
}
