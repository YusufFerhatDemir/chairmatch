export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'
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
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/admin" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Admin</Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 8, marginBottom: 16 }}>
          Buchungen ({(bookings ?? []).length})
        </h1>
        <AdminBookingActions bookings={bookings ?? []} />
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
