export const dynamic = 'force-dynamic'

import { requireRole } from '@/modules/auth/session'

export default async function AdminRiskSettingsPage() {
  await requireRole(['admin', 'super_admin'])

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>Risk-Settings</h2>
      <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 16 }}>
        Kategorie-Standard: LOW (Barber, Friseur, Massage), HIGH (Laser, PMU), VERY_HIGH (Ästhetik, OP-Raum).
      </p>
      <div style={{ background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.08)', borderRadius: 12, padding: 16 }}>
        <p style={{ color: 'var(--cream)', fontWeight: 600, marginBottom: 8 }}>Standard-Risiko pro Kategorie</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, color: 'var(--stone)' }}>
          <li style={{ padding: '6px 0' }}>Barbershop, Friseur, Massage → <span style={{ color: '#6ABF80' }}>LOW</span></li>
          <li style={{ padding: '6px 0' }}>Kosmetik, Nails, Lash &amp; Brows → <span style={{ color: 'var(--gold2)' }}>LOW/MED</span></li>
          <li style={{ padding: '6px 0' }}>Laser, PMU, Tattoo → <span style={{ color: '#E8A840' }}>HIGH</span></li>
          <li style={{ padding: '6px 0' }}>Ästhetik, Injectables, OP-Raum → <span style={{ color: '#E85040' }}>VERY_HIGH</span></li>
        </ul>
      </div>
      <p style={{ fontSize: 12, color: 'var(--stone2)', marginTop: 16 }}>Bearbeitung der Service-Overrides erfolgt über DB oder zukünftiges UI.</p>
    </div>
  )
}
