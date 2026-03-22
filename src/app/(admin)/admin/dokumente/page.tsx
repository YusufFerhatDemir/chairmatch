export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import { DocumentRow } from '@/components/admin/DocumentRow'

export default async function AdminDokumentePage() {
  await requireRole(['admin', 'super_admin'])
  const supabase = getSupabaseAdmin()
  const { data: docs } = await supabase.from('documents').select('id, owner_type, owner_id, doc_type, verified_status, created_at').order('created_at', { ascending: false }).limit(200)
  const list = docs ?? []

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>Dokumente prüfen</h2>
      <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 16 }}>Compliance-Dokumente (Standort + Behandler). Freigeben oder ablehnen.</p>
      {list.length === 0 ? (
        <div style={{ background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.08)', borderRadius: 12, padding: 24, textAlign: 'center', color: 'var(--stone)' }}>Noch keine Dokumente eingereicht.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((d: { id: string; owner_type: string; owner_id: string; doc_type: string; verified_status: string; created_at: string }) => (
            <DocumentRow key={d.id} d={d} />
          ))}
        </div>
      )}
    </div>
  )
}
