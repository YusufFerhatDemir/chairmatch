import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Booking } from '@/lib/types'

export function useBookings() {
  const user = useAuthStore(s => s.user)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) loadBookings()
  }, [user])

  async function loadBookings() {
    if (!user) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', user.id)
        .order('booking_date', { ascending: false })
      setBookings((data || []) as unknown as Booking[])
    } finally {
      setLoading(false)
    }
  }

  async function cancelBooking(id: string, reason?: string) {
    await (supabase
      .from('bookings') as any)
      .update({ status: 'cancelled', cancellation_reason: reason || null })
      .eq('id', id)
    await loadBookings()
  }

  return { bookings, loading, reload: loadBookings, cancelBooking }
}
