'use server'

import { requireRole } from '@/modules/auth/session'
import { revalidateTag } from 'next/cache'
import { saveSettingsSchema, slideSchema, reorderSlidesSchema } from './super-admin.schemas'
import { getSupabaseAdmin, uploadToStorage } from '@/lib/supabase-server'

async function requireSuperAdmin() {
  return requireRole(['super_admin'])
}

// ─── Settings ───

export async function saveSettings(category: string, settings: { key: string; value: string }[]) {
  await requireSuperAdmin()

  const parsed = saveSettingsSchema.safeParse({ category, settings })
  if (!parsed.success) return { error: 'Ungültige Eingabe' }

  const supabase = getSupabaseAdmin()

  for (const s of parsed.data.settings) {
    await supabase
      .from('app_settings')
      .upsert(
        { category: parsed.data.category, key: s.key, value: s.value, updated_at: new Date().toISOString() },
        { onConflict: 'category,key' }
      )
  }

  revalidateTag('app-settings')
  return { success: true }
}

export async function getSettings(category?: string) {
  await requireSuperAdmin()

  const supabase = getSupabaseAdmin()
  let query = supabase.from('app_settings').select('*')

  if (category) {
    query = query.eq('category', category).order('sort_order', { ascending: true })
  } else {
    query = query.order('category', { ascending: true }).order('sort_order', { ascending: true })
  }

  const { data } = await query
  return (data || []).map(s => ({
    id: s.id,
    category: s.category,
    key: s.key,
    value: s.value,
    valueType: s.value_type,
    label: s.label,
    sortOrder: s.sort_order,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }))
}

// ─── Onboarding Slides ───

export async function getSlides() {
  await requireSuperAdmin()

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('onboarding_slides')
    .select('*')
    .order('sort_order', { ascending: true })

  return (data || []).map(s => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    imageUrl: s.image_url,
    icon: s.icon,
    sortOrder: s.sort_order,
    isActive: s.is_active,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }))
}

export async function createSlide(data: { title: string; subtitle: string; icon?: string | null; imageUrl?: string | null }) {
  await requireSuperAdmin()

  const parsed = slideSchema.safeParse({ ...data, sortOrder: 0, isActive: true })
  if (!parsed.success) return { error: 'Ungültige Eingabe' }

  const supabase = getSupabaseAdmin()

  const { data: maxData } = await supabase
    .from('onboarding_slides')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()
  const nextOrder = (maxData?.sort_order ?? -1) + 1

  const { data: slide, error } = await supabase
    .from('onboarding_slides')
    .insert({
      title: parsed.data.title,
      subtitle: parsed.data.subtitle,
      icon: parsed.data.icon || null,
      image_url: parsed.data.imageUrl || null,
      sort_order: nextOrder,
      is_active: true,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidateTag('onboarding-slides')
  return { success: true, slide }
}

export async function updateSlide(id: string, data: Partial<{ title: string; subtitle: string; icon: string | null; imageUrl: string | null; isActive: boolean }>) {
  await requireSuperAdmin()

  const supabase = getSupabaseAdmin()
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.title !== undefined) updateData.title = data.title
  if (data.subtitle !== undefined) updateData.subtitle = data.subtitle
  if (data.icon !== undefined) updateData.icon = data.icon
  if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl
  if (data.isActive !== undefined) updateData.is_active = data.isActive

  const { data: slide, error } = await supabase
    .from('onboarding_slides')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidateTag('onboarding-slides')
  return { success: true, slide }
}

export async function deleteSlide(id: string) {
  await requireSuperAdmin()

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('onboarding_slides')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidateTag('onboarding-slides')
  return { success: true }
}

export async function reorderSlides(orderedIds: string[]) {
  await requireSuperAdmin()

  const parsed = reorderSlidesSchema.safeParse({ orderedIds })
  if (!parsed.success) return { error: 'Ungültige Eingabe' }

  const supabase = getSupabaseAdmin()
  for (let i = 0; i < parsed.data.orderedIds.length; i++) {
    await supabase
      .from('onboarding_slides')
      .update({ sort_order: i })
      .eq('id', parsed.data.orderedIds[i])
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

  const supabase = getSupabaseAdmin()
  const { data: cat, error } = await supabase
    .from('categories')
    .update({ icon_url: iconUrl, updated_at: new Date().toISOString() })
    .eq('id', categoryId)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidateTag('app-settings')
  return { success: true, category: cat }
}
