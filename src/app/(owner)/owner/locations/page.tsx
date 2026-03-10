export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'

export default async function OwnerLocationsPage() {
  const session = await requireRole(['anbieter', 'provider', 'admin', 'super_admin'])
  const userId = session?.user?.id
  if (!userId) return null
  const supabase = getSupabaseAdmin()
  const { data: salons } = await supabase.from('salons').select('id, name, city, category, is_active').eq('owner_id', userId).order('name')
  const list = salons ?? []

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/provider" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Provider</Link>
        <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginTop: 8, marginBottom: 24 }}>Meine Standorte</h1>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginBottom: 16 }}>Deine Salons / Locations. Tippe auf einen Standort für Compliance-Dokumente. <Link href="/owner/authorities" style={{ color: 'var(--gold)', fontSize: 12 }}>Behördenpaket & Einreich →</Link></p>
        {list.length === 0 ? (
          <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--stone)' }}>Noch keine Standorte. Über Anbieter-Registrierung anlegen.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map((s: { id: string; name: string; city: string | null; category: string; is_active: boolean }) => (
              <Link key={s.id} href={`/owner/compliance?location=${s.id}`} className="card" style={{ textDecoration: 'none', padding: 14 }}>
                <div style={{ color: 'var(--cream)', fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--stone)' }}>{s.city} · {s.category}</div>
                <span className={`badge ${s.is_active ? 'badge-green' : ''}`} style={{ marginTop: 6, fontSize: 10 }}>{s.is_active ? 'Aktiv' : 'Inaktiv'}</span>
              </Link>
            ))}
          </div>
        )}
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
