export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'

const ACTION_LABELS: Record<string, string> = {
  BOOKING_CREATED: 'Buchung erstellt',
  BOOKING_CANCELLED: 'Buchung storniert',
  BOOKING_CONFIRMED: 'Buchung bestätigt',
  BOOKING_COMPLETED: 'Buchung abgeschlossen',
  BOOKING_NO_SHOW: 'No-Show',
  REVIEW_CREATED: 'Bewertung erstellt',
  REVIEW_FLAGGED: 'Bewertung gemeldet',
}

export default async function AdminAuditLogsPage() {
  await requireRole(['admin', 'super_admin'])

  const supabase = getSupabaseAdmin()
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('id, user_id, action, entity, entity_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  const list = logs ?? []

  // Resolve user names for display
  const userIds = [...new Set(list.map((l: { user_id: string | null }) => l.user_id).filter(Boolean))] as string[]
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
    : { data: [] }
  const userMap = new Map((profiles ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => [p.id, p.full_name || p.email || p.id]))

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>Audit-Logs</h2>
      <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 16 }}>
        Wer hat wann was gemacht (Buchungen, Bewertungen). Letzte 300 Einträge.
      </p>

      <div style={{ overflowX: 'auto', background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.08)', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(176,144,96,0.08)', textAlign: 'left' }}>
              <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>Zeit</th>
              <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>Aktion</th>
              <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>Entity</th>
              <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>User</th>
              <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, color: 'var(--stone)', textAlign: 'center' }}>Noch keine Einträge.</td>
              </tr>
            ) : (
              list.map((l: { id: string; user_id: string | null; action: string; entity: string; entity_id: string; details: Record<string, unknown> | null; created_at: string }) => (
                <tr key={l.id} style={{ borderBottom: '1px solid rgba(176,144,96,0.08)' }}>
                  <td style={{ padding: '10px 8px', color: 'var(--cream)', whiteSpace: 'nowrap' }}>
                    {new Date(l.created_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '10px 8px', color: 'var(--gold2)', fontWeight: 600 }}>
                    {ACTION_LABELS[l.action] || l.action}
                  </td>
                  <td style={{ padding: '10px 8px', color: 'var(--stone)' }}>{l.entity} · {l.entity_id.slice(0, 8)}…</td>
                  <td style={{ padding: '10px 8px', color: 'var(--stone)', fontSize: 11 }}>{l.user_id ? userMap.get(l.user_id) || l.user_id.slice(0, 8) : '–'}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--stone2)', fontSize: 10, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }} title={JSON.stringify(l.details)}>
                    {l.details ? (typeof l.details === 'object' ? JSON.stringify(l.details).slice(0, 60) + (JSON.stringify(l.details).length > 60 ? '…' : '') : String(l.details)) : '–'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
