export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'

export default async function BenutzerPage() {
  await requireRole(['admin', 'super_admin'])

  const supabase = getSupabaseAdmin()

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const usersData = users ?? []

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/admin" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Admin</Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 8, marginBottom: 16 }}>
          Benutzer ({usersData.length})
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {usersData.map((u: any) => (
            <div key={u.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--cream)' }}>
                  {u.full_name || 'Kein Name'}
                </div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>
                  {u.email || 'Keine E-Mail'} · {u.preferred_language}
                </div>
              </div>
              <span className="badge badge-gold">{u.role}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
