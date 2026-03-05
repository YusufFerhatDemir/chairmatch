import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import type { Review } from '@/lib/types'

export function useReviews(salonId?: string) {
  const user = useAuthStore(s => s.user)
  const showToast = useUIStore(s => s.showToast)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)

  async function loadReviews(id?: string) {
    const sid = id || salonId
    if (!sid) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('salon_id', sid)
        .order('created_at', { ascending: false })
      setReviews((data || []) as unknown as Review[])
    } finally {
      setLoading(false)
    }
  }

  async function submitReview(rating: number, comment: string, bookingId?: string) {
    if (!user || !salonId) return
    const { error } = await (supabase.from('reviews') as any).insert({
      customer_id: user.id,
      salon_id: salonId,
      rating,
      comment: comment || null,
      booking_id: bookingId || null,
    })
    if (error) {
      showToast('Fehler beim Speichern der Bewertung')
    } else {
      showToast('Bewertung gespeichert!')
      await loadReviews()
    }
  }

  return { reviews, loading, loadReviews, submitReview }
}
