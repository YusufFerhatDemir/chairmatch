/**
 * Fehlende Stripe-Konfiguration ist ein Betriebszustand, kein Programmfehler.
 *
 * `getStripe()` in `@/lib/stripe` wirft, wenn `STRIPE_SECRET_KEY` fehlt — und
 * der `stripe`-Export ist ein Proxy, der diese Fabrik schon beim ERSTEN
 * Property-Zugriff ruft (`stripe.checkout`, `stripe.webhooks`, …). Der Wurf
 * landet damit im `catch` des jeweiligen Route-Handlers, und der macht daraus
 * seine allgemeine Fehlerantwort:
 *
 *   - `/api/stripe/checkout`  → 500 „Interner Fehler"
 *   - `/api/stripe/connect`   → 500 „Interner Fehler"
 *   - `/api/stripe/webhook`   → 400 „Invalid signature"
 *
 * Alle drei sind irrefuehrend. 500 sagt der Kundin „bei uns ist etwas kaputt",
 * wo „Online-Zahlung ist gerade nicht eingerichtet" zutrifft; und die 400 im
 * Webhook ist die teuerste von allen: Stripe wertet 4xx als ENDGUELTIGE
 * Ablehnung und wiederholt die Zustellung nicht. Eine Umgebung, in der
 * `STRIPE_WEBHOOK_SECRET` gesetzt ist und `STRIPE_SECRET_KEY` fehlt, verwirft
 * damit jedes Zahlungsereignis unwiederbringlich — obwohl die
 * Signaturpruefung selbst (`stripe.webhooks.constructEvent`) rein
 * kryptographisch ist und den API-Schluessel gar nicht braucht.
 *
 * Deshalb wird der Zustand vorne abgefragt, statt hinten als Ausnahme
 * aufzuschlagen. 503 ist die richtige Klasse: der Dienst ist voruebergehend
 * nicht verfuegbar, und Stripe wiederholt bei 5xx.
 */

import { NextResponse } from 'next/server'
import { isStripeConfigured } from '@/lib/stripe'

/** Was die Nutzerin liest — kein Hinweis auf fehlende Schluessel. */
export const STRIPE_UNCONFIGURED_MESSAGE =
  'Online-Zahlung ist derzeit nicht verfügbar. Bitte versuche es später erneut.'

/**
 * `null`, wenn Stripe benutzbar ist — sonst die fertige 503-Antwort.
 *
 * Aufrufform bewusst so, dass der Guard VOR jedem Schreibvorgang stehen kann:
 *
 *     const nichtVerfuegbar = stripeUnavailable()
 *     if (nichtVerfuegbar) return nichtVerfuegbar
 */
export function stripeUnavailable(): NextResponse | null {
  if (isStripeConfigured()) return null
  console.error('STRIPE_SECRET_KEY ist nicht konfiguriert — Zahlweg deaktiviert')
  return NextResponse.json(
    { error: STRIPE_UNCONFIGURED_MESSAGE, code: 'stripe_not_configured' },
    { status: 503 },
  )
}
