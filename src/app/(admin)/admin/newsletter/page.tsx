export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import { StatCard, SectionHeader, DataTable, StatusBadge, EmptyState } from '@/components/dashboard'

interface CampaignRow {
  id: string
  subject: string
  status: string
  total_recipients: number
  total_sent: number
  total_opened: number
  total_bounced: number
  sent_at: string | null
  created_at: string
}

function badgeStatus(s: string): string {
  return s
}

export default async function NewsletterOverviewPage() {
  await requireRole(['admin', 'super_admin'])
  const sb = getSupabaseAdmin()

  const [
    { count: totalSubs },
    { count: activeSubs },
    { count: unsubSubs },
    { count: totalCampaigns },
    { data: campaigns },
  ] = await Promise.all([
    sb.from('newsletter_subscribers').select('*', { count: 'exact', head: true }),
    sb.from('newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    sb.from('newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('status', 'unsubscribed'),
    sb.from('newsletter_campaigns').select('*', { count: 'exact', head: true }),
    sb.from('newsletter_campaigns')
      .select('id, subject, status, total_recipients, total_sent, total_opened, total_bounced, sent_at, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Letzte 30 Tage: Subscriber-Zuwachs
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const { count: newLast30 } = await sb
    .from('newsletter_subscribers')
    .select('*', { count: 'exact', head: true })
    .gte('subscribed_at', since)

  const resendActive = !!process.env.RESEND_API_KEY
  const rows = (campaigns || []) as CampaignRow[]

  return (
    <div>
      <SectionHeader
        title="Newsletter"
        subtitle="Empfänger verwalten, Kampagnen erstellen und versenden"
        action={{ label: '+ Neue Kampagne', href: '/admin/newsletter/new' }}
      />

      {!resendActive && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(232,80,64,0.10)',
          border: '1px solid rgba(232,80,64,0.30)',
          borderRadius: 12,
          color: '#FBA39A',
          fontSize: 13,
          marginBottom: 24,
          lineHeight: 1.5,
        }}>
          <strong>Resend nicht aktiv:</strong> Es ist kein <code>RESEND_API_KEY</code> gesetzt.
          Du kannst Kampagnen erstellen und Subscriber verwalten, aber kein echter Versand wird passieren
          (Dry-Run-Modus — alle Sends werden simuliert und geloggt).
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
        <StatCard label="Subscriber gesamt" value={totalSubs ?? 0} icon="📋" color="gold" />
        <StatCard label="Aktiv" value={activeSubs ?? 0} icon="✅" sub={`${newLast30 ?? 0} neu (30 Tage)`} color="green" />
        <StatCard label="Abgemeldet" value={unsubSubs ?? 0} icon="🚪" color="red" />
        <StatCard label="Kampagnen" value={totalCampaigns ?? 0} icon="📧" color="blue" />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <Link
          href="/admin/newsletter/new"
          style={{
            background: 'linear-gradient(135deg, #D4AF37, #FCF6BA)',
            color: '#1A1000',
            padding: '12px 20px',
            borderRadius: 12,
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          + Neue Kampagne
        </Link>
        <Link
          href="/admin/newsletter/subscribers"
          style={{
            background: 'transparent',
            color: 'var(--gold)',
            padding: '11px 20px',
            borderRadius: 12,
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: 14,
            border: '1px solid rgba(176,144,96,0.30)',
          }}
        >
          Subscriber verwalten
        </Link>
      </div>

      <SectionHeader title="Alle Kampagnen" subtitle={`${rows.length} Kampagne${rows.length === 1 ? '' : 'n'}`} />

      {rows.length === 0 ? (
        <EmptyState
          icon="📭"
          title="Noch keine Kampagne"
          description="Erstelle deine erste Newsletter-Kampagne und versende sie an deine Abonnenten."
        />
      ) : (
        <DataTable
          columns={[
            {
              key: 'subject',
              label: 'Betreff',
              render: (r) => (
                <Link
                  href={`/admin/newsletter/new?id=${r.id}`}
                  style={{ color: 'var(--cream)', fontWeight: 600, textDecoration: 'none' }}
                >
                  {String(r.subject || '—')}
                </Link>
              ),
            },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={badgeStatus(String(r.status))} /> },
            { key: 'total_recipients', label: 'Empfänger', align: 'right', render: (r) => String(r.total_recipients ?? 0) },
            { key: 'total_sent', label: 'Gesendet', align: 'right', render: (r) => String(r.total_sent ?? 0) },
            { key: 'total_bounced', label: 'Fehler', align: 'right', render: (r) => String(r.total_bounced ?? 0) },
            {
              key: 'sent_at',
              label: 'Versandt',
              render: (r) => {
                const v = r.sent_at as string | null
                return v ? new Date(v).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '–'
              },
            },
            {
              key: 'created_at',
              label: 'Erstellt',
              render: (r) => new Date(String(r.created_at)).toLocaleDateString('de-DE'),
            },
          ]}
          data={rows as unknown as Record<string, unknown>[]}
          maxRows={50}
          emptyMessage="Keine Kampagnen vorhanden"
        />
      )}
    </div>
  )
}
