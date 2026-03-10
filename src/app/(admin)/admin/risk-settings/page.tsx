export const dynamic = 'force-dynamic'

import { requireRole } from '@/modules/auth/session'
import Link from 'next/link'

export default async function AdminRiskSettingsPage() {
  await requireRole(['admin', 'super_admin'])

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/admin" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Admin</Link>
        <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginTop: 8, marginBottom: 24 }}>Risk-Settings</h1>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginBottom: 16 }}>
          Kategorie-Standard: LOW (Barber, Friseur, Massage), HIGH (Laser, PMU), VERY_HIGH (Ästhetik, OP-Raum). Services können überschrieben werden (Spalte risk_level in services).
        </p>
        <div className="card" style={{ padding: 16 }}>
          <p style={{ color: 'var(--cream)', fontWeight: 600, marginBottom: 8 }}>Standard-Risiko pro Kategorie</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, color: 'var(--stone)' }}>
            <li style={{ padding: '6px 0' }}>Barbershop, Friseur, Massage → <span style={{ color: '#6ABF80' }}>LOW</span></li>
            <li style={{ padding: '6px 0' }}>Kosmetik, Nails, Lash & Brows → <span style={{ color: 'var(--gold2)' }}>LOW/MED</span></li>
            <li style={{ padding: '6px 0' }}>Laser, PMU, Tattoo → <span style={{ color: '#E8A840' }}>HIGH</span></li>
            <li style={{ padding: '6px 0' }}>Ästhetik, Injectables, OP-Raum → <span style={{ color: '#E85040' }}>VERY_HIGH</span></li>
          </ul>
        </div>
        <p style={{ fontSize: 12, color: 'var(--stone2)', marginTop: 16 }}>Bearbeitung der Service-Overrides erfolgt über DB oder zukünftiges UI.</p>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
