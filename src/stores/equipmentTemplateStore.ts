import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface EquipmentTemplate {
  id: string
  category: string
  name: string
  default_price_per_day: number
  icon: string
  sort_order: number
  is_active: boolean
  created_at: string
}

interface EquipmentTemplateState {
  templates: EquipmentTemplate[]
  loading: boolean
  error: string | null

  loadTemplates: () => Promise<void>
  addTemplate: (data: Partial<EquipmentTemplate>) => Promise<boolean>
  updateTemplate: (id: string, data: Partial<EquipmentTemplate>) => Promise<boolean>
  deleteTemplate: (id: string) => Promise<boolean>
  getByCategory: (cat: string) => EquipmentTemplate[]
}

export const useEquipmentTemplateStore = create<EquipmentTemplateState>((set, get) => ({
  templates: [],
  loading: false,
  error: null,

  loadTemplates: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('equipment_templates')
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
        default_price_per_day: Number(t.default_price_per_day) || 0,
        icon: (t.icon as string) || '',
        sort_order: (t.sort_order as number) || 0,
        is_active: (t.is_active as boolean) ?? true,
        created_at: t.created_at as string,
      })),
      loading: false,
    })
  },

  addTemplate: async (data) => {
    const { error } = await supabase
      .from('equipment_templates')
      .insert({
        category: data.category || 'barber',
        name: data.name || '',
        default_price_per_day: data.default_price_per_day || 0,
        icon: data.icon || '',
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
    if (data.default_price_per_day !== undefined) ud.default_price_per_day = data.default_price_per_day
    if (data.icon !== undefined) ud.icon = data.icon
    if (data.sort_order !== undefined) ud.sort_order = data.sort_order
    if (data.is_active !== undefined) ud.is_active = data.is_active

    const { error } = await supabase
      .from('equipment_templates')
      .update(ud as never)
      .eq('id', id)

    if (error) { set({ error: error.message }); return false }
    await get().loadTemplates()
    return true
  },

  deleteTemplate: async (id) => {
    const { error } = await supabase.from('equipment_templates').delete().eq('id', id)
    if (error) { set({ error: error.message }); return false }
    await get().loadTemplates()
    return true
  },

  getByCategory: (cat) => get().templates.filter(t => t.category === cat),
}))
