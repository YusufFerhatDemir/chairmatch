export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'

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
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)' }}>Besucher &amp; Analytics</h1>
          <Link href="/admin" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Admin</Link>
        </div>

        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginBottom: 16 }}>
          Wer kommt auf die App/Seite: IP, Herkunft, besuchte Seiten. Letzte 500 Einträge. (DSGVO: minimal, Zweck Statistik/Betrieb.)
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>Zeit</th>
                <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>Seite</th>
                <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>IP</th>
                <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>Land</th>
                <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>Region / Stadt</th>
                <th style={{ padding: '10px 8px', color: 'var(--stone)', fontWeight: 600 }}>Browser (Kurz)</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, color: 'var(--stone)', textAlign: 'center' }}>Noch keine Besucherdaten.</td>
                </tr>
              ) : (
                list.map((v: { id: string; path: string; ip: string | null; country: string | null; region: string | null; city: string | null; user_agent: string | null; created_at: string }) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
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

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
