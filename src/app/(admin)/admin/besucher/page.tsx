export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'

export default async function AdminBesucherPage() {
  await requireRole(['admin', 'super_admin'])

  const supabase = getSupabaseAdmin()
  const { data: visits } = await supabase
    .from('visit_logs')
    .select('id, path, ip, country, region, city, user_agent, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  const list = visits ?? []

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>Besucher &amp; Analytics</h2>
      <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 16 }}>
        Wer kommt auf die App/Seite. Letzte 500 Einträge.
      </p>

      <div style={{ overflowX: 'auto', background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.08)', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(176,144,96,0.08)', textAlign: 'left' }}>
              <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>Zeit</th>
              <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>Seite</th>
              <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>IP</th>
              <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>Land</th>
              <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>Region / Stadt</th>
              <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>Browser</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 24, color: 'var(--stone)', textAlign: 'center' }}>Noch keine Besucherdaten.</td>
              </tr>
            ) : (
              list.map((v: { id: string; path: string; ip: string | null; country: string | null; region: string | null; city: string | null; user_agent: string | null; created_at: string }) => (
                <tr key={v.id} style={{ borderBottom: '1px solid rgba(176,144,96,0.08)' }}>
                  <td style={{ padding: '10px 8px', color: 'var(--cream)', whiteSpace: 'nowrap' }}>
                    {new Date(v.created_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '10px 8px', color: 'var(--cream)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }} title={v.path}>
                    {v.path || '/'}
                  </td>
                  <td style={{ padding: '10px 8px', color: 'var(--stone)', fontFamily: 'monospace', fontSize: 11 }}>{v.ip || '–'}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--stone)' }}>{v.country || '–'}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--stone)', fontSize: 11 }}>{[v.region, v.city].filter(Boolean).join(' · ') || '–'}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--stone2)', fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }} title={v.user_agent || ''}>
                    {v.user_agent ? (v.user_agent.includes('Chrome') ? 'Chrome' : v.user_agent.includes('Firefox') ? 'Firefox' : v.user_agent.includes('Safari') ? 'Safari' : v.user_agent.slice(0, 20)) : '–'}
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
