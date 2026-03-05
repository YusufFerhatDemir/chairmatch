import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface WhatsAppMessage {
  id: string
  user_id: string | null
  phone: string
  message_type: string
  booking_id: string | null
  message_text: string
  status: string
  wa_message_id: string | null
  error_details: string | null
  created_at: string
  updated_at: string
}

export interface WhatsAppTemplate {
  id: string
  template_key: string
  title: string
  body_template: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface WhatsAppStats {
  total: number
  sent: number
  delivered: number
  read: number
  failed: number
  pending: number
}

interface WhatsAppState {
  messages: WhatsAppMessage[]
  templates: WhatsAppTemplate[]
  stats: WhatsAppStats
  loading: boolean
  error: string | null
  messageFilter: string // 'all' | message_type

  loadMessages: (limit?: number) => Promise<void>
  loadTemplates: () => Promise<void>
  updateTemplate: (id: string, data: Partial<WhatsAppTemplate>) => Promise<boolean>
  toggleTemplateActive: (id: string) => Promise<boolean>
  setMessageFilter: (f: string) => void
  getFilteredMessages: () => WhatsAppMessage[]
  getStats: () => WhatsAppStats
}

export const useWhatsAppStore = create<WhatsAppState>((set, get) => ({
  messages: [],
  templates: [],
  stats: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0, pending: 0 },
  loading: false,
  error: null,
  messageFilter: 'all',

  loadMessages: async (limit = 100) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      set({ loading: false, error: error.message })
      return
    }

    const msgs: WhatsAppMessage[] = (data || []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      user_id: m.user_id as string | null,
      phone: m.phone as string,
      message_type: m.message_type as string,
      booking_id: m.booking_id as string | null,
      message_text: m.message_text as string,
      status: m.status as string,
      wa_message_id: m.wa_message_id as string | null,
      error_details: m.error_details as string | null,
      created_at: m.created_at as string,
      updated_at: m.updated_at as string,
    }))

    // Compute stats
    const stats: WhatsAppStats = {
      total: msgs.length,
      sent: msgs.filter(m => m.status === 'sent').length,
      delivered: msgs.filter(m => m.status === 'delivered').length,
      read: msgs.filter(m => m.status === 'read').length,
      failed: msgs.filter(m => m.status === 'failed').length,
      pending: msgs.filter(m => m.status === 'pending').length,
    }

    set({ messages: msgs, stats, loading: false })
  },

  loadTemplates: async () => {
    const { data, error } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      set({ error: error.message })
      return
    }

    set({
      templates: (data || []).map((t: Record<string, unknown>) => ({
        id: t.id as string,
        template_key: t.template_key as string,
        title: t.title as string,
        body_template: t.body_template as string,
        description: t.description as string | null,
        is_active: (t.is_active as boolean) ?? true,
        created_at: t.created_at as string,
        updated_at: t.updated_at as string,
      })),
    })
  },

  updateTemplate: async (id, data) => {
    const ud: Record<string, unknown> = {}
    if (data.title !== undefined) ud.title = data.title
    if (data.body_template !== undefined) ud.body_template = data.body_template
    if (data.description !== undefined) ud.description = data.description
    if (data.is_active !== undefined) ud.is_active = data.is_active
    ud.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('whatsapp_templates')
      .update(ud as never)
      .eq('id', id)

    if (error) { set({ error: error.message }); return false }
    await get().loadTemplates()
    return true
  },

  toggleTemplateActive: async (id) => {
    const t = get().templates.find(x => x.id === id)
    if (!t) return false
    return get().updateTemplate(id, { is_active: !t.is_active })
  },

  setMessageFilter: (f) => set({ messageFilter: f }),

  getFilteredMessages: () => {
    const { messages, messageFilter } = get()
    if (messageFilter === 'all') return messages
    return messages.filter(m => m.message_type === messageFilter)
  },

  getStats: () => get().stats,
}))
