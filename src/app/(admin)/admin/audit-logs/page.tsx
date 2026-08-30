export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'

/**
 * Die Liste deckte bis Track E genau sieben von rund dreissig Aktionen ab,
 * die wirklich in `audit_logs` landen. Alles andere fiel auf den Rohwert
 * zurueck, und in der Spalte „Aktion" stand dann `rental_conflict_refunded`
 * oder `charge_partially_refunded` — lesbar fuer den, der den Quelltext
 * kennt, und fuer sonst niemanden. Erhoben ueber alle
 * `from('audit_logs').insert`-Stellen im Repository.
 */
const ACTION_LABELS: Record<string, string> = {
  BOOKING_CREATED: 'Buchung erstellt',
  BOOKING_CANCELLED: 'Buchung storniert',
  BOOKING_CONFIRMED: 'Buchung bestätigt',
  BOOKING_COMPLETED: 'Buchung abgeschlossen',
  BOOKING_NO_SHOW: 'No-Show',
  REVIEW_CREATED: 'Bewertung erstellt',
  REVIEW_FLAGGED: 'Bewertung gemeldet',
  ACCOUNT_DELETE_REQUESTED: 'Kontolöschung beantragt',
  SESSION_REVOKED: 'Sitzungen beendet',
  // Rollen und Rechte
  'role.promoted_super_admin': '⚠ Zu Super-Admin befördert',
  provider_registration_consent: 'Anbieter-Registrierung (Einwilligung)',
  // Zahlungen
  payment_completed: 'Zahlung eingegangen',
  payment_failed: 'Zahlung fehlgeschlagen',
  product_order_paid: 'Shop-Bestellung bezahlt',
  rental_payment_completed: 'Miete bezahlt',
  'refund.created': 'Erstattung ausgelöst',
  charge_partially_refunded: 'Teilerstattung (Stripe)',
  charge_dispute_created: 'Zahlungsreklamation eröffnet',
  charge_dispute_closed: 'Zahlungsreklamation abgeschlossen',
  booking_cancelled_payment_refunded: 'Storno erstattet (Buchung)',
  booking_duplicate_payment_refunded: 'Doppelzahlung erstattet (Buchung)',
  order_cancelled_payment_refunded: 'Storno erstattet (Bestellung)',
  order_duplicate_payment_refunded: 'Doppelzahlung erstattet (Bestellung)',
  order_out_of_stock_refunded: 'Nicht lieferbar — erstattet',
  rental_booking_cancelled: 'Miete storniert',
  rental_conflict_refunded: 'Mietkonflikt erstattet',
  rental_duplicate_payment_refunded: 'Doppelzahlung erstattet (Miete)',
  // Abos
  subscription_awaiting_payment: 'Abo wartet auf Zahlung',
  subscription_grace: 'Abo in Kulanzfrist',
  subscription_price_unknown: 'Abo-Preis unbekannt',
}

export default async function AdminAuditLogsPage() {
  await requireRole(['admin', 'super_admin'])

  const supabase = getSupabaseAdmin()
  const { data: logs, error: leseFehler } = await supabase
    .from('audit_logs')
    .select('id, user_id, action, entity, entity_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  /*
   * Der Lesefehler war bis Track E nicht zu sehen: die Abfrage
   * destrukturierte nur `data`, ein Ausfall ergab `null`, und die Seite
   * meldete „Noch keine Einträge."
   *
   * Auf JEDER anderen Seite waere das eine Ungenauigkeit. Hier ist es die
   * Aussage „es ist nichts passiert" — auf dem einen Bildschirm, den man
   * ansieht, wenn man wissen will, ob etwas passiert ist. Ein Prüfprotokoll,
   * das seinen eigenen Ausfall als Leermeldung ausgibt, ist schlimmer als
   * keines.
   */
  if (leseFehler) console.error('audit-logs read failed:', leseFehler.message)
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
        Wer hat wann was gemacht — Buchungen, Bewertungen, Zahlungen, Erstattungen,
        Abo-Wechsel und Rollenvergaben. Letzte 300 Einträge.
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
            {leseFehler ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, color: '#FF8888', textAlign: 'center', lineHeight: 1.6 }}>
                  Das Prüfprotokoll konnte nicht gelesen werden.<br />
                  Das heißt <strong>nicht</strong>, dass keine Einträge vorliegen. Bitte neu laden.
                </td>
              </tr>
            ) : list.length === 0 ? (
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
