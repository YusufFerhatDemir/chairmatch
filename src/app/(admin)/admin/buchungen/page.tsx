export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'

export default async function BuchungenPage() {
  await requireRole(['admin', 'super_admin'])

  const supabase = getSupabaseAdmin()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, salon:salons(name), service:services(name), customer:profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(50)

  const bookingsData = bookings ?? []

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/admin" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Admin</Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 8, marginBottom: 16 }}>
          Buchungen ({bookingsData.length})
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bookingsData.map((b: any) => (
            <div key={b.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: 'var(--font-sm)' }}>{b.service?.name}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>
                    {b.salon?.name} · {new Date(b.booking_date).toLocaleDateString('de-DE')} {b.start_time?.slice(0, 5)}
                  </div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone2)', marginTop: 2 }}>
                    {b.customer?.full_name || 'Gast'} · {b.customer?.email}
                  </div>
                </div>
                <span className="badge badge-gold" style={{ fontSize: 9 }}>{b.status}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
