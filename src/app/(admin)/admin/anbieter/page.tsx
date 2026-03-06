export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'

export default async function AnbieterPage() {
  await requireRole(['admin', 'super_admin'])

  const supabase = getSupabaseAdmin()

  const { data: salons } = await supabase
    .from('salons')
    .select('*')
    .order('created_at', { ascending: false })

  const salonsData = salons ?? []

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/admin" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Admin</Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 8, marginBottom: 16 }}>
          Salons ({salonsData.length})
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {salonsData.map((s: any) => (
            <div key={s.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--cream)' }}>{s.name}</div>
                  <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)' }}>
                    {s.category} · {s.city} · {s.subscription_tier}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 700 }}>★ {Number(s.avg_rating).toFixed(1)}</span>
                  {s.is_active ? (
                    <span className="badge badge-green" style={{ fontSize: 8 }}>AKTIV</span>
                  ) : (
                    <span className="badge" style={{ fontSize: 8, background: 'rgba(232,80,64,0.1)', color: 'var(--red)', border: '1px solid rgba(232,80,64,0.2)' }}>INAKTIV</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
