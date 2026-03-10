export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'
import { ComplianceDocumentForm } from '@/components/owner/ComplianceDocumentForm'

export default async function OwnerCompliancePage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const session = await requireRole(['anbieter', 'provider', 'admin', 'super_admin'])
  const { location: locationId } = await searchParams
  let locationName: string | null = null
  if (locationId && session?.user?.id) {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase.from('salons').select('id, name, owner_id').eq('id', locationId).single()
    if (data && data.owner_id === session.user.id) locationName = data.name
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/owner/locations" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Standorte</Link>
        <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginTop: 8, marginBottom: 24 }}>Compliance (Standort)</h1>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginBottom: 16 }}>Hygiene-Plan, Reinigungskonzept, Hausordnung, Geräteliste. Bei OP-Räumen: OP-Checkliste, Abfallkonzept.</p>
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <p style={{ color: 'var(--cream)', fontWeight: 600, marginBottom: 8 }}>Pflicht-Dokumente (Location)</p>
          <ul style={{ paddingLeft: 20, color: 'var(--stone)', fontSize: 13 }}>
            <li>Hygiene-Plan (PDF)</li>
            <li>Reinigung & Desinfektion</li>
            <li>Hausordnung</li>
            <li>Geräteliste</li>
          </ul>
        </div>
        {locationId && locationName ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 8 }}>Standort: <strong style={{ color: 'var(--cream)' }}>{locationName}</strong></p>
            <ComplianceDocumentForm locationId={locationId} />
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>Standort wählen: <Link href="/owner/locations" style={{ color: 'var(--gold)' }}>Meine Standorte</Link> → auf einen Standort tippen.</p>
        )}
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
