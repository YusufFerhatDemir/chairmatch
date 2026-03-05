import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface OnboardingSlide {
  id: string
  sort_order: number
  title: string
  subtitle: string
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface OnboardingState {
  slides: OnboardingSlide[]
  loading: boolean
  error: string | null

  loadSlides: () => Promise<void>
  getActiveSlides: () => OnboardingSlide[]
  addSlide: (data: Partial<OnboardingSlide>) => Promise<boolean>
  updateSlide: (id: string, data: Partial<OnboardingSlide>) => Promise<boolean>
  deleteSlide: (id: string) => Promise<boolean>
  toggleActive: (id: string) => Promise<boolean>
  reorder: (id: string, newOrder: number) => Promise<boolean>
  uploadImage: (file: File) => Promise<string | null>
  deleteImage: (url: string) => Promise<boolean>
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  slides: [],
  loading: false,
  error: null,

  loadSlides: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('onboarding_slides')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      set({ loading: false, error: error.message })
      return
    }

    set({
      slides: (data || []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        sort_order: s.sort_order as number,
        title: s.title as string,
        subtitle: s.subtitle as string,
        image_url: s.image_url as string | null,
        is_active: s.is_active as boolean,
        created_at: s.created_at as string,
        updated_at: s.updated_at as string,
      })),
      loading: false,
    })
  },

  getActiveSlides: () => {
    return get().slides.filter(s => s.is_active).sort((a, b) => a.sort_order - b.sort_order)
  },

  addSlide: async (data) => {
    const maxOrder = Math.max(0, ...get().slides.map(s => s.sort_order))
    const { error } = await supabase
      .from('onboarding_slides')
      .insert({
        title: data.title || '',
        subtitle: data.subtitle || '',
        image_url: data.image_url || null,
        sort_order: data.sort_order ?? maxOrder + 1,
        is_active: data.is_active ?? true,
      } as never)

    if (error) {
      set({ error: error.message })
      return false
    }
    await get().loadSlides()
    return true
  },

  updateSlide: async (id, data) => {
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle
    if (data.image_url !== undefined) updateData.image_url = data.image_url
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const { error } = await supabase
      .from('onboarding_slides')
      .update(updateData as never)
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }
    await get().loadSlides()
    return true
  },

  deleteSlide: async (id) => {
    const { error } = await supabase
      .from('onboarding_slides')
      .delete()
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }
    await get().loadSlides()
    return true
  },

  toggleActive: async (id) => {
    const slide = get().slides.find(s => s.id === id)
    if (!slide) return false
    return get().updateSlide(id, { is_active: !slide.is_active })
  },

  reorder: async (id, newOrder) => {
    return get().updateSlide(id, { sort_order: newOrder })
  },

  uploadImage: async (file: File) => {
    const ext = file.name.split('.').pop() || 'png'
    const fileName = `slide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error } = await supabase.storage
      .from('onboarding-images')
      .upload(fileName, file, { upsert: true })

    if (error) {
      set({ error: error.message })
      return null
    }

    const { data: urlData } = supabase.storage
      .from('onboarding-images')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  },

  deleteImage: async (url: string) => {
    // Extract filename from URL
    const parts = url.split('/onboarding-images/')
    if (parts.length < 2) return false
    const fileName = parts[1].split('?')[0]

    const { error } = await supabase.storage
      .from('onboarding-images')
      .remove([fileName])

    if (error) {
      set({ error: error.message })
      return false
    }
    return true
  },
}))
