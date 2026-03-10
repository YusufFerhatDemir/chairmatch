export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'
import { BehoerdenpaketActions } from '@/components/owner/BehoerdenpaketActions'

export default async function OwnerAuthoritiesPage() {
  const session = await requireRole(['anbieter', 'provider', 'admin', 'super_admin'])
  const userId = session?.user?.id
  let locations: { id: string; name: string }[] = []
  if (userId) {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase.from('salons').select('id, name').eq('owner_id', userId).order('name')
    locations = (data ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/owner/locations" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Standorte</Link>
        <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginTop: 8, marginBottom: 24 }}>Behördenpaket & Einreich-Service</h1>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginBottom: 16 }}>Kostenlos: Paket erstellen und selbst senden. Paid: ChairMatch Einreich-Service mit Status-Tracking.</p>
        <BehoerdenpaketActions locations={locations} />
        <div className="card" style={{ padding: 16 }}>
          <p style={{ color: 'var(--cream)', fontWeight: 600, marginBottom: 6 }}>Paid: Einreich-Service</p>
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>99 € einmal · 299 €/Jahr (2 Einreichungen) · 39 €/Monat. Ticket-Workflow, Proof durch Admin.</p>
          <button className="bgold" style={{ marginTop: 10, padding: '10px 16px', fontSize: 12 }} disabled>Jetzt buchen (demnächst)</button>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
