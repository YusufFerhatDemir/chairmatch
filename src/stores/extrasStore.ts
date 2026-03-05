import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

/* ═══ TYPES ═══ */

export interface LoyaltyStamp {
  id: string
  user_id: string
  salon_id: string | null
  booking_id: string | null
  stamp_count: number
  redeemed: boolean
  redeemed_at: string | null
  created_at: string
}

export interface LoyaltyConfig {
  id: string
  stamps_required: number
  reward_description: string
  is_active: boolean
}

export interface NewsletterSub {
  id: string
  email: string
  user_id: string | null
  is_active: boolean
  source: string
  subscribed_at: string
  unsubscribed_at: string | null
}

export interface Referral {
  id: string
  referrer_id: string
  referred_id: string | null
  referral_code: string
  status: string
  reward_cents: number
  paid_out: boolean
  created_at: string
}

export interface ReferralConfig {
  id: string
  reward_cents: number
  is_active: boolean
  description: string
}

/* ═══ STATS ═══ */

export interface ExtrasStats {
  // Loyalty
  totalStamps: number
  redeemedStamps: number
  activeUsers: number

  // Newsletter
  totalSubscribers: number
  activeSubscribers: number

  // Referral
  totalReferrals: number
  completedReferrals: number
  totalPayoutCents: number
}

/* ═══ STORE ═══ */

interface ExtrasState {
  // Data
  loyaltyConfig: LoyaltyConfig | null
  referralConfig: ReferralConfig | null
  subscribers: NewsletterSub[]
  referrals: Referral[]
  stats: ExtrasStats

  loading: boolean
  error: string | null

  // Actions
  loadAll: () => Promise<void>
  updateLoyaltyConfig: (data: Partial<LoyaltyConfig>) => Promise<boolean>
  updateReferralConfig: (data: Partial<ReferralConfig>) => Promise<boolean>
  removeSubscriber: (id: string) => Promise<boolean>
  markReferralPaid: (id: string) => Promise<boolean>
}

export const useExtrasStore = create<ExtrasState>((set, get) => ({
  loyaltyConfig: null,
  referralConfig: null,
  subscribers: [],
  referrals: [],
  stats: {
    totalStamps: 0, redeemedStamps: 0, activeUsers: 0,
    totalSubscribers: 0, activeSubscribers: 0,
    totalReferrals: 0, completedReferrals: 0, totalPayoutCents: 0,
  },
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null })
    try {
      // Loyalty config
      const { data: lcData } = await supabase.from('loyalty_config').select('*').limit(1).single()
      const loyaltyConfig = lcData ? {
        id: (lcData as Record<string, unknown>).id as string,
        stamps_required: (lcData as Record<string, unknown>).stamps_required as number,
        reward_description: (lcData as Record<string, unknown>).reward_description as string,
        is_active: (lcData as Record<string, unknown>).is_active as boolean,
      } : null

      // Loyalty stamps stats
      const { data: stamps } = await supabase.from('loyalty_stamps').select('user_id, redeemed')
      const stampList = (stamps || []) as { user_id: string; redeemed: boolean }[]
      const totalStamps = stampList.length
      const redeemedStamps = stampList.filter(s => s.redeemed).length
      const activeUsers = new Set(stampList.map(s => s.user_id)).size

      // Referral config
      const { data: rcData } = await supabase.from('referral_config').select('*').limit(1).single()
      const referralConfig = rcData ? {
        id: (rcData as Record<string, unknown>).id as string,
        reward_cents: (rcData as Record<string, unknown>).reward_cents as number,
        is_active: (rcData as Record<string, unknown>).is_active as boolean,
        description: (rcData as Record<string, unknown>).description as string,
      } : null

      // Referrals
      const { data: refData } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      const referrals: Referral[] = (refData || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        referrer_id: r.referrer_id as string,
        referred_id: r.referred_id as string | null,
        referral_code: r.referral_code as string,
        status: r.status as string,
        reward_cents: (r.reward_cents as number) || 0,
        paid_out: (r.paid_out as boolean) || false,
        created_at: r.created_at as string,
      }))

      const totalReferrals = referrals.length
      const completedReferrals = referrals.filter(r => r.status === 'completed').length
      const totalPayoutCents = referrals.filter(r => r.paid_out).reduce((s, r) => s + r.reward_cents, 0)

      // Newsletter
      const { data: subData } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false })
        .limit(200)
      const subscribers: NewsletterSub[] = (subData || []).map((n: Record<string, unknown>) => ({
        id: n.id as string,
        email: n.email as string,
        user_id: n.user_id as string | null,
        is_active: (n.is_active as boolean) ?? true,
        source: (n.source as string) || 'website',
        subscribed_at: n.subscribed_at as string,
        unsubscribed_at: n.unsubscribed_at as string | null,
      }))

      const totalSubscribers = subscribers.length
      const activeSubscribers = subscribers.filter(s => s.is_active).length

      set({
        loyaltyConfig,
        referralConfig,
        subscribers,
        referrals,
        stats: {
          totalStamps, redeemedStamps, activeUsers,
          totalSubscribers, activeSubscribers,
          totalReferrals, completedReferrals, totalPayoutCents,
        },
        loading: false,
      })
    } catch (err) {
      set({ loading: false, error: String(err) })
    }
  },

  updateLoyaltyConfig: async (data) => {
    const config = get().loyaltyConfig
    if (!config) return false
    const ud: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.stamps_required !== undefined) ud.stamps_required = data.stamps_required
    if (data.reward_description !== undefined) ud.reward_description = data.reward_description
    if (data.is_active !== undefined) ud.is_active = data.is_active

    const { error } = await supabase.from('loyalty_config').update(ud as never).eq('id', config.id)
    if (error) { set({ error: error.message }); return false }
    await get().loadAll()
    return true
  },

  updateReferralConfig: async (data) => {
    const config = get().referralConfig
    if (!config) return false
    const ud: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.reward_cents !== undefined) ud.reward_cents = data.reward_cents
    if (data.is_active !== undefined) ud.is_active = data.is_active
    if (data.description !== undefined) ud.description = data.description

    const { error } = await supabase.from('referral_config').update(ud as never).eq('id', config.id)
    if (error) { set({ error: error.message }); return false }
    await get().loadAll()
    return true
  },

  removeSubscriber: async (id) => {
    const { error } = await supabase.from('newsletter_subscribers')
      .update({ is_active: false, unsubscribed_at: new Date().toISOString() } as never)
      .eq('id', id)
    if (error) { set({ error: error.message }); return false }
    await get().loadAll()
    return true
  },

  markReferralPaid: async (id) => {
    const { error } = await supabase.from('referrals')
      .update({ paid_out: true } as never)
      .eq('id', id)
    if (error) { set({ error: error.message }); return false }
    set(s => ({
      referrals: s.referrals.map(r => r.id === id ? { ...r, paid_out: true } : r),
    }))
    return true
  },
}))
