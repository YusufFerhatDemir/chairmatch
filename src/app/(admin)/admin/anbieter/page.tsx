export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'
import AdminSalonActions from './actions'

export default async function AnbieterPage() {
  await requireRole(['admin', 'super_admin'])

  const supabase = getSupabaseAdmin()
  const { data: salons } = await supabase
    .from('salons')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/admin" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Admin</Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 8, marginBottom: 16 }}>
          Salons ({(salons ?? []).length})
        </h1>
        <AdminSalonActions salons={salons ?? []} />
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
