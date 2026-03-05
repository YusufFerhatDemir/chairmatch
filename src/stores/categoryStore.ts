import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface Category {
  id: string
  slug: string
  label: string
  description: string | null
  icon_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CategoryState {
  categories: Category[]
  loading: boolean
  error: string | null

  loadCategories: () => Promise<void>
  getActiveCategories: () => Category[]
  addCategory: (data: Partial<Category>) => Promise<boolean>
  updateCategory: (id: string, data: Partial<Category>) => Promise<boolean>
  deleteCategory: (id: string) => Promise<boolean>
  toggleActive: (id: string) => Promise<boolean>
  reorder: (id: string, newOrder: number) => Promise<boolean>
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  loading: false,
  error: null,

  loadCategories: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      set({ loading: false, error: error.message })
      return
    }

    set({
      categories: (data || []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        slug: c.slug as string,
        label: c.label as string,
        description: c.description as string | null,
        icon_url: c.icon_url as string | null,
        sort_order: c.sort_order as number,
        is_active: c.is_active as boolean,
        created_at: c.created_at as string,
        updated_at: c.updated_at as string,
      })),
      loading: false,
    })
  },

  getActiveCategories: () => {
    return get().categories.filter(c => c.is_active)
  },

  addCategory: async (data) => {
    const maxOrder = Math.max(0, ...get().categories.map(c => c.sort_order))
    const { error } = await supabase
      .from('categories')
      .insert({
        slug: data.slug || '',
        label: data.label || '',
        description: data.description || null,
        icon_url: data.icon_url || null,
        sort_order: data.sort_order ?? maxOrder + 1,
        is_active: data.is_active ?? true,
      } as never)

    if (error) {
      set({ error: error.message })
      return false
    }
    await get().loadCategories()
    return true
  },

  updateCategory: async (id, data) => {
    const updateData: Record<string, unknown> = {}
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.label !== undefined) updateData.label = data.label
    if (data.description !== undefined) updateData.description = data.description
    if (data.icon_url !== undefined) updateData.icon_url = data.icon_url
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const { error } = await supabase
      .from('categories')
      .update(updateData as never)
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }
    await get().loadCategories()
    return true
  },

  deleteCategory: async (id) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }
    await get().loadCategories()
    return true
  },

  toggleActive: async (id) => {
    const cat = get().categories.find(c => c.id === id)
    if (!cat) return false
    return get().updateCategory(id, { is_active: !cat.is_active })
  },

  reorder: async (id, newOrder) => {
    return get().updateCategory(id, { sort_order: newOrder })
  },
}))
