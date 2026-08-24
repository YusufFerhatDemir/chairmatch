export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'

/**
 * ‼️ BUSINESS_INPUT_REQUIRED ‼️
 *
 * Diese Seite zeigt Preise an, sie erfindet keine. `protect_pricing` und
 * `compliance_plans` fuehrten live bis 2026-08-24 nur `id` und `created_at`
 * (Spaltenprobe) — die Sortierung lief deshalb in 42703 und die Seite meldete
 * "Keine Eintraege" statt "Tabelle unvollstaendig".
 *
 * Struktur kommt aus supabase/migrations/20260824_pricing_schema.sql,
 * Betraege aus supabase/seed/pricing.seed.template.sql. Solange yusuf die
 * Betraege nicht festgelegt hat, bleiben beide Tabellen leer — und diese
 * Seite sagt das offen, statt Platzhalterpreise zu zeigen.
 */

const cents = (v: number | null | undefined, currency = 'EUR') =>
  typeof v === 'number'
    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(v / 100)
    : '—'

type ProtectRow = {
  risk_level: string
  day_price_cents: number | null
  month_price_cents: number | null
  year_price_cents: number | null
  currency?: string | null
  active?: boolean | null
}

type PlanRow = {
  plan_type: string
  price_cents: number | null
  included_submissions: number | null
  min_term_months: number | null
  extra_submission_price_cents: number | null
  currency?: string | null
  active?: boolean | null
}

const card = {
  background: 'var(--c1)',
  border: '1px solid rgba(176,144,96,0.08)',
  borderRadius: 12,
  padding: 14,
}

/**
 * Drei unterscheidbare Zustaende — der Unterschied ist die eigentliche
 * Information: Schema kaputt, Migration fehlt, oder Preise noch nicht
 * entschieden. Vorher war alles "Keine Eintraege".
 */
function EmptyState({ error }: { error: { code?: string; message?: string } | null }) {
  if (error?.code === '42703' || error?.code === 'PGRST205' || error?.code === '42P01') {
    return (
      <p style={{ color: '#E85040', fontSize: 13, marginBottom: 24 }}>
        Tabelle unvollständig — Schema passt nicht zum Code (<code>{error.code}</code>).
        <br />
        Migration <code>20260824_pricing_schema.sql</code> im Supabase-SQL-Editor anwenden,
        danach <code>./scripts/schema-probe.sh</code>.
      </p>
    )
  }
  if (error) {
    return (
      <p style={{ color: '#E85040', fontSize: 13, marginBottom: 24 }}>
        Lesefehler <code>{error.code ?? '?'}</code> — {error.message ?? 'unbekannt'}
      </p>
    )
  }
  return (
    <p style={{ color: 'var(--stone)', fontSize: 13, marginBottom: 24 }}>
      Struktur steht, aber noch keine Preise hinterlegt.
      <br />
      <strong style={{ color: 'var(--gold2)' }}>Geschäftsentscheidung offen:</strong> Beträge
      festlegen und über <code>supabase/seed/pricing.seed.template.sql</code> einspielen.
      Es werden bewusst keine Beispielpreise angezeigt.
    </p>
  )
}

export default async function AdminPricingPage() {
  await requireRole(['admin', 'super_admin'])
  const supabase = getSupabaseAdmin()

  const { data: protect, error: protectErr } = await supabase.from('protect_pricing').select('*')
  const { data: plans, error: plansErr } = await supabase.from('compliance_plans').select('*')

  // Sortierung in JS statt per .order(): eine fehlende Spalte wuerde die
  // Query serverseitig in 42703 kippen — genau der Fall, den diese Seite
  // unterscheiden koennen soll.
  const protectList = ((protect ?? []) as ProtectRow[]).slice().sort((a, b) =>
    String(a.risk_level).localeCompare(String(b.risk_level))
  )
  const plansList = ((plans ?? []) as PlanRow[]).slice().sort((a, b) =>
    String(a.plan_type).localeCompare(String(b.plan_type))
  )

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 24 }}>Pricing</h2>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>ChairMatch Protect</h3>
      {protectList.length === 0 ? (
        <EmptyState error={protectErr} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {protectList.map((p) => (
            <div key={p.risk_level} style={card}>
              <span style={{ color: 'var(--gold2)', fontWeight: 700 }}>{p.risk_level}</span>
              {p.active === false && (
                <span style={{ color: 'var(--stone)', fontSize: 12, marginLeft: 8 }}>· inaktiv</span>
              )}
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: 'var(--stone)' }}>
                <span>Tag: {cents(p.day_price_cents, p.currency ?? 'EUR')}</span>
                <span>Monat: {cents(p.month_price_cents, p.currency ?? 'EUR')}</span>
                <span>Jahr: {cents(p.year_price_cents, p.currency ?? 'EUR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cream)', marginBottom: 12 }}>Einreich-Service (Compliance-Pläne)</h3>
      {plansList.length === 0 ? (
        <EmptyState error={plansErr} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {plansList.map((c) => (
            <div key={c.plan_type} style={card}>
              <span style={{ color: 'var(--cream)', fontWeight: 600 }}>{c.plan_type}</span>
              {c.active === false && (
                <span style={{ color: 'var(--stone)', fontSize: 12, marginLeft: 8 }}>· inaktiv</span>
              )}
              <div style={{ fontSize: 13, color: 'var(--stone)', marginTop: 4 }}>
                {cents(c.price_cents, c.currency ?? 'EUR')} · {c.included_submissions ?? 0} Einreichungen inkl.
                {(c.min_term_months ?? 0) > 0 && ` · ${c.min_term_months} Monate Laufzeit`}
                {' · Extra: '}
                {cents(c.extra_submission_price_cents, c.currency ?? 'EUR')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
