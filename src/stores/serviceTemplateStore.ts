import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface ServiceTemplate {
  id: string
  category: string
  name: string
  duration_minutes: number
  default_price: number
  sort_order: number
  is_active: boolean
  created_at: string
}

interface ServiceTemplateState {
  templates: ServiceTemplate[]
  loading: boolean
  error: string | null

  loadTemplates: () => Promise<void>
  addTemplate: (data: Partial<ServiceTemplate>) => Promise<boolean>
  updateTemplate: (id: string, data: Partial<ServiceTemplate>) => Promise<boolean>
  deleteTemplate: (id: string) => Promise<boolean>
  getByCategory: (cat: string) => ServiceTemplate[]
}

export const useServiceTemplateStore = create<ServiceTemplateState>((set, get) => ({
  templates: [],
  loading: false,
  error: null,

  loadTemplates: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('service_templates')
      .select('*')
      .order('category')
      .order('sort_order', { ascending: true })

    if (error) {
      set({ loading: false, error: error.message })
      return
    }

    set({
      templates: (data || []).map((t: Record<string, unknown>) => ({
        id: t.id as string,
        category: t.category as string,
        name: t.name as string,
        duration_minutes: (t.duration_minutes as number) || 30,
        default_price: Number(t.default_price) || 0,
        sort_order: (t.sort_order as number) || 0,
        is_active: (t.is_active as boolean) ?? true,
        created_at: t.created_at as string,
      })),
      loading: false,
    })
  },

  addTemplate: async (data) => {
    const { error } = await supabase
      .from('service_templates')
      .insert({
        category: data.category || 'barber',
        name: data.name || '',
        duration_minutes: data.duration_minutes || 30,
        default_price: data.default_price || 0,
        sort_order: data.sort_order || 0,
        is_active: data.is_active ?? true,
      } as never)

    if (error) { set({ error: error.message }); return false }
    await get().loadTemplates()
    return true
  },

  updateTemplate: async (id, data) => {
    const ud: Record<string, unknown> = {}
    if (data.name !== undefined) ud.name = data.name
    if (data.category !== undefined) ud.category = data.category
    if (data.duration_minutes !== undefined) ud.duration_minutes = data.duration_minutes
    if (data.default_price !== undefined) ud.default_price = data.default_price
    if (data.sort_order !== undefined) ud.sort_order = data.sort_order
    if (data.is_active !== undefined) ud.is_active = data.is_active

    const { error } = await supabase
      .from('service_templates')
      .update(ud as never)
      .eq('id', id)

    if (error) { set({ error: error.message }); return false }
    await get().loadTemplates()
    return true
  },

  deleteTemplate: async (id) => {
    const { error } = await supabase.from('service_templates').delete().eq('id', id)
    if (error) { set({ error: error.message }); return false }
    await get().loadTemplates()
    return true
  },

  getByCategory: (cat) => get().templates.filter(t => t.category === cat),
}))
