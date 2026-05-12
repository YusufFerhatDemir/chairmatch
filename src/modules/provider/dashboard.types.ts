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
}
