#!/usr/bin/env node
/**
 * ============================================================
 *  ChairMatch — Stripe Products & Webhook Setup
 * ============================================================
 *
 *  Was dieses Script macht:
 *    1. Legt 3 Produkte an: Starter, Premium, Gold
 *    2. Erstellt für jedes Produkt einen monatlichen Preis (EUR)
 *    3. Erstellt für jedes Produkt einen jährlichen Preis (EUR, mit 17% Discount)
 *    4. Legt einen Webhook-Endpunkt an für https://chairmatch.de/api/stripe/webhook
 *    5. Gibt am Ende ALLE IDs aus, die du in Vercel ENV eintragen musst
 *
 *  Voraussetzungen:
 *    - Stripe-Account verifiziert (KYC durch)
 *    - STRIPE_SECRET_KEY (live oder test) in .env.local oder als Environment
 *    - Node 18+ (du hast 22 ✓)
 *
 *  Wie ausführen:
 *    cd ~/Chairmatch\ v1/chairmatch
 *    npm install stripe   # falls noch nicht installiert (ist es)
 *    node scripts/stripe-setup.mjs
 *
 *  WICHTIG:
 *    - Das Script ist IDEMPOTENT: läuft mehrfach ohne Duplikate zu erzeugen
 *      (sucht erst nach existierenden Produkten anhand der lookup_key)
 *    - Test- und Live-Mode getrennt: läuft im Mode des verwendeten Keys
 *    - Webhook-Endpunkt wird mit explicit_events erstellt (nicht "all events")
 * ============================================================
 */

import Stripe from 'stripe'
import { readFileSync, existsSync } from 'node:fs'

// ── ENV laden ───────────────────────────────────────────────
function loadEnvLocal() {
  const path = new URL('../.env.local', import.meta.url)
  if (!existsSync(path)) return
  const content = readFileSync(path, 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnvLocal()

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY
if (!STRIPE_SECRET || STRIPE_SECRET === 'sk_test_placeholder') {
  console.error('❌ STRIPE_SECRET_KEY fehlt oder ist Placeholder.')
  console.error('   Setze einen echten Key in .env.local (sk_test_… oder sk_live_…)')
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2025-09-30.acacia' })
const MODE = STRIPE_SECRET.startsWith('sk_live_') ? 'LIVE' : 'TEST'

console.log(`\n🚀 Stripe-Setup gestartet (${MODE}-Mode)\n${'═'.repeat(60)}`)

// ── Produkte definieren ─────────────────────────────────────
const PLANS = [
  {
    lookupKey: 'chairmatch_starter',
    name: 'ChairMatch Starter',
    description: 'Für kleine Salons mit bis zu 5 Mitarbeitern. Buchungssystem, Kalender, Kundenverwaltung.',
    monthlyPrice: 2900, // 29,00 € in Cent
    yearlyPrice: 28800, // 288,00 € (24 €/Mo) — ~17% Discount
    metadata: {
      seats: '5',
      tier: 'starter',
    },
  },
  {
    lookupKey: 'chairmatch_premium',
    name: 'ChairMatch Premium',
    description: 'Für mittlere Studios mit bis zu 15 Mitarbeitern. Inkl. Marketing-Tools, Reviews, Featured Listing.',
    monthlyPrice: 5900,
    yearlyPrice: 58800,
    metadata: {
      seats: '15',
      tier: 'premium',
    },
  },
  {
    lookupKey: 'chairmatch_gold',
    name: 'ChairMatch Gold',
    description: 'Für größere Ketten mit unbegrenzten Mitarbeitern. Inkl. Multi-Location, API-Zugriff, Priority Support.',
    monthlyPrice: 9900,
    yearlyPrice: 99000,
    metadata: {
      seats: 'unlimited',
      tier: 'gold',
    },
  },
]

// ── Helper: Produkt-Lookup oder Erstellung ──────────────────
async function ensureProduct(plan) {
  const existing = await stripe.products.search({
    query: `metadata['lookup_key']:'${plan.lookupKey}'`,
    limit: 1,
  })
  if (existing.data.length > 0) {
    console.log(`  ↪ Produkt existiert bereits: ${plan.name} (${existing.data[0].id})`)
    return existing.data[0]
  }
  const product = await stripe.products.create({
    name: plan.name,
    description: plan.description,
    metadata: { ...plan.metadata, lookup_key: plan.lookupKey },
  })
  console.log(`  ✅ Produkt erstellt: ${plan.name} (${product.id})`)
  return product
}

async function ensurePrice(product, plan, interval, amount) {
  const lookupKey = `${plan.lookupKey}_${interval}`
  const existing = await stripe.prices.search({
    query: `lookup_key:'${lookupKey}'`,
    limit: 1,
  })
  if (existing.data.length > 0) {
    console.log(`    ↪ Price existiert: ${interval} (${existing.data[0].id})`)
    return existing.data[0]
  }
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: 'eur',
    recurring: { interval },
    lookup_key: lookupKey,
    tax_behavior: 'inclusive',
  })
  console.log(`    ✅ Price ${interval} erstellt: ${(amount / 100).toFixed(2)} € (${price.id})`)
  return price
}

// ── Webhook-Setup ───────────────────────────────────────────
const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/webhook`
  : 'https://chairmatch.de/api/stripe/webhook'

const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.refunded',
  'charge.dispute.created',
]

async function ensureWebhook() {
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
  const existing = endpoints.data.find(e => e.url === WEBHOOK_URL)
  if (existing) {
    console.log(`  ↪ Webhook existiert bereits: ${WEBHOOK_URL} (${existing.id})`)
    return { endpoint: existing, secret: null /* Vorhandene Secrets sind nicht abrufbar */ }
  }
  const endpoint = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: WEBHOOK_EVENTS,
    description: 'ChairMatch Production Webhook',
    metadata: { created_by: 'stripe-setup.mjs' },
  })
  console.log(`  ✅ Webhook erstellt: ${WEBHOOK_URL} (${endpoint.id})`)
  return { endpoint, secret: endpoint.secret }
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log('\n📦 Schritt 1/3: Produkte + Preise anlegen…\n')

  const results = []
  for (const plan of PLANS) {
    console.log(`\n→ ${plan.name}`)
    const product = await ensureProduct(plan)
    const priceMonth = await ensurePrice(product, plan, 'month', plan.monthlyPrice)
    const priceYear = await ensurePrice(product, plan, 'year', plan.yearlyPrice)
    results.push({
      tier: plan.metadata.tier,
      productId: product.id,
      priceMonthId: priceMonth.id,
      priceYearId: priceYear.id,
    })
  }

  console.log('\n📡 Schritt 2/3: Webhook-Endpunkt anlegen…\n')
  const { endpoint, secret } = await ensureWebhook()

  console.log('\n📋 Schritt 3/3: Vercel-ENV-Werte\n' + '═'.repeat(60))
  console.log(`\nFolgende Werte in Vercel → Settings → Environment Variables eintragen`)
  console.log(`(Production + Preview, Sensitive ON):\n`)

  for (const r of results) {
    const KEY = `STRIPE_PRICE_${r.tier.toUpperCase()}`
    console.log(`  ${KEY}              = ${r.priceMonthId}`)
    console.log(`  ${KEY}_YEAR         = ${r.priceYearId}`)
  }
  console.log(`\n  STRIPE_WEBHOOK_ENDPOINT_ID = ${endpoint.id}`)
  if (secret) {
    console.log(`  STRIPE_WEBHOOK_SECRET     = ${secret}`)
    console.log(`\n  ⚠️  Dieses Secret nur EINMAL angezeigt — sofort in Vercel speichern!`)
  } else {
    console.log(`\n  ⚠️  Webhook existierte bereits. Webhook-Secret manuell aus`)
    console.log(`     Dashboard kopieren: https://dashboard.stripe.com/webhooks/${endpoint.id}`)
  }

  console.log(`\n${'═'.repeat(60)}\n✅ FERTIG. Stripe ist konfiguriert.\n`)
  console.log(`Dashboard: https://dashboard.stripe.com/${MODE === 'TEST' ? 'test/' : ''}products`)
  console.log(``)
}

main().catch(err => {
  console.error('\n❌ Fehler:', err.message)
  if (err.raw) console.error('  Details:', err.raw)
  process.exit(1)
})
