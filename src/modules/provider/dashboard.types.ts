/**
 * Provider Dashboard Types — geteilt zwischen API-Route, Server-Page und Client-Komponente.
 */

export interface DashboardTransaction {
  id: string
  type: 'booking' | 'chair_rental' | 'opraum_rental' | 'subscription' | 'affiliate' | 'refund'
  amountCents: number
  platformFeeCents: number
  providerShareCents: number
  currency: string
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
  createdAt: string
}

export interface DashboardResponse {
  earnings: {
    today: number   // in EUR (Cents / 100)
    month: number
    total: number
    currency: 'EUR'
  }
  pending: number   // in EUR
  transactions: DashboardTransaction[]
  payoutSchedule: string
  stripeConnected: boolean
  /**
   * Konnten die Transaktionen gelesen werden?
   *
   * `false` heisst: die Betraege oben sind UNBEKANNT, nicht null. Bis Track E
   * gab es diese Unterscheidung nicht — `/api/provider/dashboard` hatte den
   * Lesefehler ausdruecklich mit einem leeren Konto gleichgesetzt
   * (`if (txError || !txs || txs.length === 0) return emptyDashboard(...)`),
   * und die Serverseite von `/provider/dashboard` sah `error` gar nicht an.
   * Der Anbieter las dann „Gesamt 0,00 €" — auf der Seite, auf der er
   * nachsieht, was die Plattform ihm schuldet.
   *
   * Optional, damit Bestandsaufrufer unveraendert gueltig bleiben; fehlt der
   * Wert, gilt „lesbar".
   */
  earningsLesbar?: boolean
}
