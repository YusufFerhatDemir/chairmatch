export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import { TicketCard } from '@/components/admin/TicketCard'

export default async function AdminTicketsPage() {
  await requireRole(['admin', 'super_admin'])
  const supabase = getSupabaseAdmin()
  const { data: tickets } = await supabase
    .from('submission_tickets')
    .select('id, location_id, plan_type, status, admin_notes, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  const list = tickets ?? []
  const salonIds = [...new Set(list.map((t: { location_id: string }) => t.location_id))]
  const { data: salons } = salonIds.length > 0 ? await supabase.from('salons').select('id, name').in('id', salonIds) : { data: [] }
  const nameMap = new Map((salons ?? []).map((s: { id: string; name: string }) => [s.id, s.name]))

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>Einreich-Tickets</h2>
      <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 16 }}>Status setzen, Notizen speichern.</p>
      {list.length === 0 ? (
        <div style={{ background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.08)', borderRadius: 12, padding: 24, textAlign: 'center', color: 'var(--stone)' }}>Noch keine Tickets.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((t: { id: string; location_id: string; plan_type: string; status: string; admin_notes: string | null; created_at: string }) => (
            <TicketCard key={t.id} t={t} salonName={nameMap.get(t.location_id) || t.location_id.slice(0, 8)} />
          ))}
        </div>
      )}
    </div>
  )
}
