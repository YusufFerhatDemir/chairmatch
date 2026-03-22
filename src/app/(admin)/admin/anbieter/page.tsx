export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import AdminSalonActions from './actions'

export default async function AnbieterPage() {
  await requireRole(['admin', 'super_admin'])

  const supabase = getSupabaseAdmin()
  const { data: salons } = await supabase
    .from('salons')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 16 }}>
        Salons ({(salons ?? []).length})
      </h2>
      <AdminSalonActions salons={salons ?? []} />
    </div>
  )
}
