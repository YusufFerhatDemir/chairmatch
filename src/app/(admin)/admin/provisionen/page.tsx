'use client'

import { useEffect, useState } from 'react'

/**
 * Admin: Provisionen — /admin/provisionen
 *
 * `GET /api/admin/commissions` gab es seit dem Marketplace-Commit, eine
 * Oberflaeche dazu nie: die Route hatte im gesamten Repository keinen
 * Aufrufer. Die Zahlen, die der Stripe-Webhook bei jeder Buchung, Miete und
 * Bestellung nach `commissions` schreibt (recordCommission in
 * modules/marketplace/commission.service.ts), waren damit fuer niemanden
 * sichtbar — das Geld der Plattform stand in einer Tabelle, die kein
 * Bildschirm liest.
 *
 * Diese Seite erfindet nichts dazu: sie zeigt, was die Route liefert, und
 * sagt, wenn sie nichts liefern konnte. Insbesondere wird „0 €" nur dann
 * angezeigt, wenn wirklich null Provisionen erfasst sind — ein Lesefehler
 * kommt als Fehler an, nicht als Null (siehe Kopfkommentar der Route).
 */

interface CommissionRow {
  id: string
  type: string
  source_type: string
  source_id: string
  beneficiary_type: string
  beneficiary_id: string | null
  rate_percent: number
  base_amount_cents: number
  commission_cents: number
  currency: string
  status: string
  paid_out_at: string | null
  created_at: string
}

interface CommissionsResponse {
  commissions: CommissionRow[]
  summary: {
    total: number
    count: number
    byType: Record<string, { count: number; totalCents: number }>
  }
  truncated: boolean
}

const TYP_LABEL: Record<string, string> = {
  booking: 'Buchung',
  chair_rental: 'Stuhl-Vermietung',
  opraum_rental: 'OP-Raum-Vermietung',
  subscription: 'Abo',
  affiliate: 'Affiliate',
  product_order: 'Bestellung',
  refund: 'Erstattung',
}

function typLabel(t: string): string {
  return TYP_LABEL[t] ?? t
}

function eur(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: (currency || 'EUR').toUpperCase(),
  }).format((Number(cents) || 0) / 100)
}

function datum(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const karte = {
  background: 'var(--c1)',
  border: '1px solid rgba(176,144,96,0.10)',
  borderRadius: 12,
  padding: 14,
}

const zelle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 11,
  borderTop: '1px solid var(--border)',
  whiteSpace: 'nowrap',
}

export default function AdminProvisionenPage() {
  const [daten, setDaten] = useState<CommissionsResponse | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(true)

  useEffect(() => {
    let abgebrochen = false
    fetch('/api/admin/commissions', { cache: 'no-store' })
      .then(async res => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body?.error || 'Provisionen konnten nicht geladen werden.')
        return body as CommissionsResponse
      })
      .then(d => { if (!abgebrochen) { setDaten(d); setFehler(null) } })
      .catch((err: unknown) => {
        if (abgebrochen) return
        setDaten(null)
        setFehler(err instanceof Error ? err.message : 'Provisionen konnten nicht geladen werden.')
      })
      .finally(() => { if (!abgebrochen) setLaedt(false) })
    return () => { abgebrochen = true }
  }, [])

  const typen = Object.entries(daten?.summary.byType ?? {}).sort(
    (a, b) => b[1].totalCents - a[1].totalCents,
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 className="cinzel" style={{ fontSize: 24, fontWeight: 700, color: 'var(--gold2)', margin: 0 }}>
          Provisionen
        </h1>
        <p style={{ fontSize: 12, color: 'var(--stone)', marginTop: 4 }}>
          Was die Plattform an Buchungen, Vermietungen, Abos und Bestellungen verdient hat.
        </p>
      </div>

      {laedt && <p style={{ fontSize: 13, color: 'var(--stone)' }}>Wird geladen …</p>}

      {fehler && (
        <div style={{ ...karte, borderColor: 'rgba(232,80,64,0.4)' }}>
          <p style={{ fontSize: 13, color: '#E85040', margin: 0, lineHeight: 1.5 }}>{fehler}</p>
          <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 6, lineHeight: 1.5 }}>
            Das ist ausdrücklich <strong>nicht</strong> „keine Provisionen" — die Zahlen konnten
            nicht gelesen werden.
          </p>
        </div>
      )}

      {daten && (
        <>
          {daten.truncated && (
            <div style={{ ...karte, borderColor: 'rgba(176,144,96,0.4)' }}>
              <p style={{ fontSize: 12, color: 'var(--gold2)', margin: 0, lineHeight: 1.5 }}>
                Die Summe ist gedeckelt: es wurden {daten.summary.count.toLocaleString('de-DE')} Zeilen
                gelesen, es gibt mehr. Die angezeigten Beträge sind deshalb eine Untergrenze.
              </p>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}>
            <div style={karte}>
              <p style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Gesamt
              </p>
              <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--gold2)', marginTop: 4 }}>
                {eur(daten.summary.total)}
              </p>
              <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>
                {daten.summary.count === 1
                  ? 'aus 1 Provision'
                  : `aus ${daten.summary.count.toLocaleString('de-DE')} Provisionen`}
              </p>
            </div>

            {typen.map(([typ, w]) => (
              <div key={typ} style={karte}>
                <p style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {typLabel(typ)}
                </p>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--cream)', marginTop: 4 }}>
                  {eur(w.totalCents)}
                </p>
                <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>
                  {w.count === 1 ? '1 Eintrag' : `${w.count.toLocaleString('de-DE')} Einträge`}
                </p>
              </div>
            ))}
          </div>

          <div style={{ ...karte, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', margin: 0 }}>
                Letzte Provisionen
              </p>
              <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>
                Die 100 jüngsten Einträge.
              </p>
            </div>

            {daten.commissions.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--stone)', padding: 14, margin: 0, lineHeight: 1.5 }}>
                Noch keine Provision erfasst. Einträge entstehen, sobald eine Zahlung über den
                Stripe-Webhook bestätigt wird.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                  <thead>
                    <tr style={{ background: 'rgba(176,144,96,0.04)' }}>
                      {['Datum', 'Typ', 'Quelle', 'Basis', 'Satz', 'Provision', 'Status'].map(h => (
                        <th
                          key={h}
                          style={{
                            padding: '8px 10px', fontSize: 10, textAlign: 'left',
                            color: 'var(--stone)', letterSpacing: 0.5, textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {daten.commissions.map(c => (
                      <tr key={c.id}>
                        <td style={{ ...zelle, color: 'var(--cream)' }}>{datum(c.created_at)}</td>
                        <td style={{ ...zelle, color: 'var(--cream)' }}>{typLabel(c.type)}</td>
                        <td style={{ ...zelle, color: 'var(--stone)' }}>{c.source_type}</td>
                        <td style={{ ...zelle, color: 'var(--stone)' }}>
                          {eur(c.base_amount_cents, c.currency)}
                        </td>
                        <td style={{ ...zelle, color: 'var(--stone)' }}>{c.rate_percent} %</td>
                        <td style={{ ...zelle, color: 'var(--gold2)', fontWeight: 700 }}>
                          {eur(c.commission_cents, c.currency)}
                        </td>
                        <td style={{ ...zelle, color: 'var(--stone)' }}>
                          {c.paid_out_at ? `ausgezahlt ${datum(c.paid_out_at)}` : c.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
