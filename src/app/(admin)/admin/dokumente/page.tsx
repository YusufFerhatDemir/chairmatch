export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'
import { DocumentRow } from '@/components/admin/DocumentRow'

export default async function AdminDokumentePage() {
  await requireRole(['admin', 'super_admin'])
  const supabase = getSupabaseAdmin()
  const { data: docs } = await supabase.from('documents').select('id, owner_type, owner_id, doc_type, verified_status, created_at').order('created_at', { ascending: false }).limit(200)
  const list = docs ?? []

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/admin" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Admin</Link>
        <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginTop: 8, marginBottom: 24 }}>Dokumente prüfen</h1>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginBottom: 16 }}>Compliance-Dokumente (Standort + Behandler). Freigeben oder ablehnen.</p>
        {list.length === 0 ? (
          <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--stone)' }}>Noch keine Dokumente eingereicht.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map((d: { id: string; owner_type: string; owner_id: string; doc_type: string; verified_status: string; created_at: string }) => (
              <DocumentRow key={d.id} d={d} />
            ))}
          </div>
        )}
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
