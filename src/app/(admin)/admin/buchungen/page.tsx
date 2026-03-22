export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import AdminBookingActions from './actions'

export default async function BuchungenPage() {
  await requireRole(['admin', 'super_admin'])

  const supabase = getSupabaseAdmin()
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, salon:salons(name), service:services(name), customer:profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 16 }}>
        Buchungen ({(bookings ?? []).length})
      </h2>
      <AdminBookingActions bookings={bookings ?? []} />
    </div>
  )
}
