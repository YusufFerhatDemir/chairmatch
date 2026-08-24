export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'

export default async function AdminPricingPage() {
  await requireRole(['admin', 'super_admin'])
  const supabase = getSupabaseAdmin()

  // Beide Tabellen existieren live, fuehren aber nur `id` und `created_at` —
  // weder `risk_level`/`day_price_cents` noch `plan_type`/`price_cents`
  // (Spaltenprobe 2026-08-24). Die Sortierung lief deshalb in 42703, und die
  // Seite meldete "Keine Eintraege" statt "Tabelle unvollstaendig". Die
  // Sortierung ist raus; der Fehler wird jetzt unterschieden.
  //
  // Bewusst KEINE Migration dafuer: das sind Preise. Welche Stufen und
  // Betraege gelten, ist eine Geschaeftsentscheidung und darf nicht aus dem
  // Anzeigecode erraten werden.
  const { data: protect, error: protectErr } = await supabase.from('protect_pricing').select('*')
  const { data: plans, error: plansErr } = await supabase.from('compliance_plans').select('*')
  const protectList = protect ?? []
  const plansList = plans ?? []

  const emptyLabel = (err: { message?: string } | null) =>
    err
      ? 'Tabelle unvollständig — Schema passt nicht zum Code. ./scripts/schema-probe.sh'
      : 'Keine Einträge. Migration ausführen.'

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 24 }}>Pricing</h2>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>ChairMatch Protect</h3>
      {protectList.length === 0 ? (
        <p style={{ color: 'var(--stone)', fontSize: 13, marginBottom: 24 }}>{emptyLabel(protectErr)}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {protectList.map((p: { risk_level: string; day_price_cents: number; month_price_cents: number; year_price_cents: number }) => (
            <div key={p.risk_level} style={{ background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.08)', borderRadius: 12, padding: 14 }}>
              <span style={{ color: 'var(--gold2)', fontWeight: 700 }}>{p.risk_level}</span>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: 'var(--stone)' }}>
                <span>Tag: {(p.day_price_cents / 100).toFixed(0)} €</span>
                <span>Monat: {(p.month_price_cents / 100).toFixed(0)} €</span>
                <span>Jahr: {(p.year_price_cents / 100).toFixed(0)} €</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>Einreich-Service (Compliance-Pläne)</h3>
      {plansList.length === 0 ? (
        <p style={{ color: 'var(--stone)', fontSize: 13 }}>{emptyLabel(plansErr)}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plansList.map((c: { plan_type: string; price_cents: number; included_submissions: number; extra_submission_price_cents: number }) => (
            <div key={c.plan_type} style={{ background: 'var(--c1)', border: '1px solid rgba(176,144,96,0.08)', borderRadius: 12, padding: 14 }}>
              <span style={{ color: 'var(--cream)', fontWeight: 600 }}>{c.plan_type}</span>
              <div style={{ fontSize: 13, color: 'var(--stone)', marginTop: 4 }}>{(c.price_cents / 100).toFixed(0)} € · {c.included_submissions} Einreichungen inkl. · Extra: {(c.extra_submission_price_cents / 100).toFixed(0)} €</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
