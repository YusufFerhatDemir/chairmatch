import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface PromoCodeEntry {
  id: string
  code: string
  discount: number
  type: 'percent' | 'fixed'
  max_uses: number | null
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

interface PromoCodeState {
  codes: PromoCodeEntry[]
  loading: boolean
  error: string | null

  loadCodes: () => Promise<void>
  addCode: (data: Partial<PromoCodeEntry>) => Promise<boolean>
  updateCode: (id: string, data: Partial<PromoCodeEntry>) => Promise<boolean>
  deleteCode: (id: string) => Promise<boolean>
  toggleActive: (id: string) => Promise<boolean>
  validateCode: (code: string) => Promise<PromoCodeEntry | null>
}

export const usePromoCodeStore = create<PromoCodeState>((set, get) => ({
  codes: [],
  loading: false,
  error: null,

  loadCodes: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      set({ loading: false, error: error.message })
      return
    }

    set({
      codes: (data || []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        code: c.code as string,
        discount: Number(c.discount) || 0,
        type: (c.type as 'percent' | 'fixed') || 'percent',
        max_uses: c.max_uses as number | null,
        used_count: (c.used_count as number) || 0,
        expires_at: c.expires_at as string | null,
        is_active: (c.is_active as boolean) ?? true,
        created_at: c.created_at as string,
      })),
      loading: false,
    })
  },

  addCode: async (data) => {
    const { error } = await supabase
      .from('promo_codes')
      .insert({
        code: (data.code || '').toUpperCase(),
        discount: data.discount || 0,
        type: data.type || 'percent',
        max_uses: data.max_uses || null,
        expires_at: data.expires_at || null,
        is_active: data.is_active ?? true,
      } as never)

    if (error) { set({ error: error.message }); return false }
    await get().loadCodes()
    return true
  },

  updateCode: async (id, data) => {
    const ud: Record<string, unknown> = {}
    if (data.code !== undefined) ud.code = data.code.toUpperCase()
    if (data.discount !== undefined) ud.discount = data.discount
    if (data.type !== undefined) ud.type = data.type
    if (data.max_uses !== undefined) ud.max_uses = data.max_uses
    if (data.expires_at !== undefined) ud.expires_at = data.expires_at
    if (data.is_active !== undefined) ud.is_active = data.is_active

    const { error } = await supabase
      .from('promo_codes')
      .update(ud as never)
      .eq('id', id)

    if (error) { set({ error: error.message }); return false }
    await get().loadCodes()
    return true
  },

  deleteCode: async (id) => {
    const { error } = await supabase.from('promo_codes').delete().eq('id', id)
    if (error) { set({ error: error.message }); return false }
    await get().loadCodes()
    return true
  },

  toggleActive: async (id) => {
    const c = get().codes.find(x => x.id === id)
    if (!c) return false
    return get().updateCode(id, { is_active: !c.is_active })
  },

  validateCode: async (code) => {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (error || !data) return null

    const d = data as Record<string, unknown>
    const entry: PromoCodeEntry = {
      id: d.id as string,
      code: d.code as string,
      discount: Number(d.discount) || 0,
      type: (d.type as 'percent' | 'fixed') || 'percent',
      max_uses: d.max_uses as number | null,
      used_count: (d.used_count as number) || 0,
      expires_at: d.expires_at as string | null,
      is_active: true,
      created_at: d.created_at as string,
    }

    // Check expiry
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) return null
    // Check max uses
    if (entry.max_uses !== null && entry.used_count >= entry.max_uses) return null

    return entry
  },
}))
