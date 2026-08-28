// @vitest-environment node
/**
 * E2E: Shop — Warenkorb, Bestellung, Bestand (Track 14).
 *
 * Der Kern ist der Preis. `order_items.unit_price_cents` wird im Checkout zu
 * `unit_amount` der Stripe-Line-Items; wer diesen Wert steuern kann, steuert,
 * was Stripe einzieht. Bis Track 14 konnte das jeder eingeloggte Kunde: die
 * Variante einer Warenkorbposition wurde nie gegen ihr Produkt gehalten.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDb, sessionFor, postRequest, ctx, IDS } from './_harness/fixtures'
import {
  createStripeHarness,
  stripeEvent,
  orderCheckoutSession,
} from './_harness/stripe-harness'
import type { FakeSupabase, Row } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as import('./_harness/fixtures').TestSession | null,
  stripe: undefined as unknown as ReturnType<
    typeof import('./_harness/stripe-harness').createStripeHarness
  >,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({ getServerSession: async () => state.session }))
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn(async () => null) }))
vi.mock('@/modules/marketplace/commission.service', () => ({
  calculateNewCustomerCommission: vi.fn(async () => null),
  calculateRentalCommission: vi.fn(async () => null),
}))
vi.mock('@/lib/stripe', () => ({
  isStripeConfigured: () => true,
  get stripe() {
    return state.stripe.stripe
  },
  STRIPE_WEBHOOK_SECRET: 'whsec_test_chairmatch',
  STRIPE_PUBLISHABLE_KEY: 'pk_test',
  createBookingCheckout: (...a: unknown[]) => state.stripe.createBookingCheckout(...a),
  createSubscriptionCheckout: (...a: unknown[]) => state.stripe.createSubscriptionCheckout(...a),
  createProductOrderCheckout: (...a: unknown[]) => state.stripe.createProductOrderCheckout(...a),
  createRentalCheckout: (...a: unknown[]) => state.stripe.createRentalCheckout(...a),
  createRefund: (...a: unknown[]) => state.stripe.createRefund(...a),
}))

import { POST as cartAdd, PATCH as cartPatch } from '@/app/api/cart/route'
import { POST as orderCreate } from '@/app/api/orders/route'
import { POST as webhookRoute } from '@/app/api/stripe/webhook/route'
import { POST as providerProductCreate } from '@/app/api/provider/products/route'
import { PATCH as providerSalonPatch } from '@/app/api/provider/salon/route'

function db(): FakeSupabase {
  return state.db
}

const ADRESSE = {
  name: 'Lena Kundin',
  street: 'Hauptstr. 1',
  city: 'Berlin',
  postalCode: '10115',
}

/** Warenkorbzeile direkt setzen — auch in Zustaenden, die die Route jetzt verbietet. */
function seedCartItem(row: Row): Row {
  const item: Row = {
    id: `1a1a1a1a-1a1a-41a1-81a1-1a1a1a1a1a0${db().rows('cart_items').length + 1}`,
    customer_id: IDS.customer,
    variant_id: null,
    quantity: 1,
    created_at: '2026-09-01T10:00:00.000Z',
    ...row,
  }
  db().rows('cart_items').push(item)
  return item
}

function webhookRequest(event: unknown) {
  return new Request('https://www.chairmatch.de/api/stripe/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=sig' },
    body: JSON.stringify(event),
  }) as unknown as import('next/server').NextRequest
}

function prepareEvent(event: unknown) {
  state.stripe.stripe.webhooks.constructEvent = vi.fn(() => event) as never
}

beforeEach(() => {
  state.db = createDb()
  state.stripe = createStripeHarness()
  state.session = sessionFor('customer')
})

describe('Preisquelle: Variante gehoert zu genau einem Produkt', () => {
  it('lehnt eine Variante ab, die zu einem anderen Produkt gehoert', async () => {
    // Die teure Schere mit der Variante des Haargummis in den Korb: vorher
    // wurde daraus ein Stueckpreis von 199 statt 24900 Cent.
    const res = await cartAdd(
      postRequest('https://www.chairmatch.de/api/cart', {
        productId: IDS.productTeuer,
        variantId: IDS.variantBillig,
        quantity: 1,
      }),
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('Variante') })
    expect(db().rows('cart_items')).toHaveLength(0)
  })

  it('nimmt die Variante an, die zum Produkt gehoert', async () => {
    const res = await cartAdd(
      postRequest('https://www.chairmatch.de/api/cart', {
        productId: IDS.productBillig,
        variantId: IDS.variantBillig,
        quantity: 2,
      }),
    )

    expect(res.status).toBe(201)
    expect(db().rows('cart_items')).toHaveLength(1)
    expect(db().rows('cart_items')[0]).toMatchObject({ quantity: 2, variant_id: IDS.variantBillig })
  })

  it('faengt eine bereits gespeicherte Fremdvariante beim Bestellen ab', async () => {
    // Zweiter Riegel: eine Zeile, die vor dem Fix in die Tabelle kam.
    seedCartItem({ product_id: IDS.productTeuer, variant_id: IDS.variantBillig, quantity: 1 })

    const res = await orderCreate(
      postRequest('https://www.chairmatch.de/api/orders', ADRESSE),
    )

    expect(res.status).toBe(400)
    expect(db().rows('orders').filter(o => o.id !== IDS.orderOpen)).toHaveLength(0)
    // Der Warenkorb bleibt stehen — der Kunde soll die Position sehen koennen.
    expect(db().rows('cart_items')).toHaveLength(1)
  })

  it('berechnet den Preis einer Gratis-Variante mit 0, nicht mit dem Produktpreis', async () => {
    // `variant?.price_cents || product.price_cents` machte aus 0 Cent den
    // vollen Produktpreis — der Kunde zahlte fuer das Gratis-Muster.
    seedCartItem({ product_id: IDS.productBillig, variant_id: IDS.variantGratis, quantity: 3 })
    seedCartItem({ product_id: IDS.productBillig, variant_id: null, quantity: 1 })

    const res = await orderCreate(postRequest('https://www.chairmatch.de/api/orders', ADRESSE))
    expect(res.status).toBe(201)

    const positionen = db().insertsInto('order_items')
    const gratis = positionen.find(p => p.variant_id === IDS.variantGratis)
    expect(gratis).toMatchObject({ unit_price_cents: 0, total_cents: 0 })
    const order = (await res.json()) as Row
    expect(order.subtotal_cents).toBe(199)
  })
})

describe('Mengen', () => {
  it.each([
    ['negativ', -5],
    ['null', 0],
    ['gebrochen', 0.5],
    ['zu gross', 100000],
  ])('lehnt eine %s Menge ab', async (_name, quantity) => {
    const res = await cartAdd(
      postRequest('https://www.chairmatch.de/api/cart', {
        productId: IDS.productBillig,
        quantity,
      }),
    )
    expect(res.status).toBe(400)
    expect(db().rows('cart_items')).toHaveLength(0)
  })

  it('addiert eine String-Menge als Zahl, nicht als Zeichenkette', async () => {
    // Vorher: `existing.quantity + "1"` — aus 1 + "1" wurde die Menge 11.
    await cartAdd(
      postRequest('https://www.chairmatch.de/api/cart', {
        productId: IDS.productBillig,
        quantity: 1,
      }),
    )
    await cartAdd(
      postRequest('https://www.chairmatch.de/api/cart', {
        productId: IDS.productBillig,
        quantity: '1',
      }),
    )

    expect(db().rows('cart_items')).toHaveLength(1)
    expect(db().rows('cart_items')[0].quantity).toBe(2)
  })

  it('legt dieselbe Variante nicht zweimal in den Warenkorb', async () => {
    // `.is('variant_id', <uuid>)` war fuer PostgREST ein Fehler; jeder Klick
    // erzeugte deshalb eine neue Zeile.
    await cartAdd(
      postRequest('https://www.chairmatch.de/api/cart', {
        productId: IDS.productBillig,
        variantId: IDS.variantBillig,
        quantity: 1,
      }),
    )
    await cartAdd(
      postRequest('https://www.chairmatch.de/api/cart', {
        productId: IDS.productBillig,
        variantId: IDS.variantBillig,
        quantity: 1,
      }),
    )

    expect(db().rows('cart_items')).toHaveLength(1)
    expect(db().rows('cart_items')[0].quantity).toBe(2)
  })
})

describe('Bestand', () => {
  it('laesst nicht mehr in den Korb legen, als vorraetig ist', async () => {
    const res = await cartAdd(
      postRequest('https://www.chairmatch.de/api/cart', {
        productId: IDS.productTeuer,
        quantity: 3,
      }),
    )
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('2') })
  })

  it('laesst unbegrenzte Artikel in jeder Menge zu', async () => {
    const res = await cartAdd(
      postRequest('https://www.chairmatch.de/api/cart', {
        productId: IDS.productUnbegrenzt,
        quantity: 40,
      }),
    )
    expect(res.status).toBe(201)
  })

  it('blockt ein ausgelistetes Produkt', async () => {
    const res = await cartAdd(
      postRequest('https://www.chairmatch.de/api/cart', {
        productId: IDS.productInaktiv,
        quantity: 1,
      }),
    )
    expect(res.status).toBe(409)
  })

  it('haelt die Bestandsgrenze auch beim Aendern der Menge', async () => {
    const item = seedCartItem({ product_id: IDS.productTeuer, quantity: 1 })
    const res = await cartPatch(
      new Request('https://www.chairmatch.de/api/cart', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, quantity: 5 }),
      }) as unknown as import('next/server').NextRequest,
    )
    expect(res.status).toBe(409)
  })
})

describe('Bestellung', () => {
  it('leert den Warenkorb nicht, wenn die Positionen nicht geschrieben werden konnten', async () => {
    seedCartItem({ product_id: IDS.productBillig, quantity: 1 })
    db().onInsert((table) =>
      table === 'order_items'
        ? { code: '23503', message: 'insert or update violates foreign key', details: null, hint: null }
        : null,
    )

    const res = await orderCreate(postRequest('https://www.chairmatch.de/api/orders', ADRESSE))

    expect(res.status).toBe(500)
    // Keine Bestellung ohne Positionen — sonst baut der Checkout eine
    // Stripe-Session, die nur den Versand enthaelt.
    expect(db().rows('orders').filter(o => o.id !== IDS.orderOpen)).toHaveLength(0)
    expect(db().rows('cart_items')).toHaveLength(1)
  })

  it('weist eine unvollstaendige Lieferadresse ab', async () => {
    seedCartItem({ product_id: IDS.productBillig, quantity: 1 })
    const res = await orderCreate(
      postRequest('https://www.chairmatch.de/api/orders', { ...ADRESSE, postalCode: '' }),
    )
    expect(res.status).toBe(400)
  })

  it('nennt den ausgelisteten Artikel, statt ihn still zu verschlucken', async () => {
    seedCartItem({ product_id: IDS.productInaktiv, quantity: 1 })
    const res = await orderCreate(postRequest('https://www.chairmatch.de/api/orders', ADRESSE))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({
      error: expect.stringContaining('Ausgelistetes Shampoo'),
    })
  })
})

describe('Bestand wird bei der Zahlung gebucht', () => {
  /** Bestellung + Position, wie sie nach createOrder aussieht. */
  function seedOrder(productId: string, quantity: number, variantId: string | null = null): string {
    const orderId = '19191919-1919-4191-8191-191919191919'
    db().rows('orders').push({
      id: orderId,
      order_number: 'CM-20260901-777',
      customer_id: IDS.customer,
      subtotal_cents: 24900 * quantity,
      shipping_cents: 0,
      total_cents: 24900 * quantity,
      status: 'pending',
      payment_status: 'pending',
      stripe_session_id: 'cs_test_order',
      stripe_payment_intent: null,
      created_at: '2026-09-01T10:00:00.000Z',
    })
    db().rows('order_items').push({
      id: 'oi-1',
      order_id: orderId,
      product_id: productId,
      variant_id: variantId,
      seller_id: IDS.seller,
      quantity,
      unit_price_cents: 24900,
      total_cents: 24900 * quantity,
    })
    return orderId
  }

  it('zieht den Bestand ab, wenn die Zahlung ankommt', async () => {
    const orderId = seedOrder(IDS.productTeuer, 2)
    const event = stripeEvent(
      'checkout.session.completed',
      orderCheckoutSession({ orderId, userId: IDS.customer, amountCents: 49800 }),
    )
    prepareEvent(event)

    const res = await webhookRoute(webhookRequest(event))
    expect(res.status).toBe(200)

    expect(db().row('products', IDS.productTeuer)?.stock_quantity).toBe(0)
    expect(db().row('orders', orderId)).toMatchObject({
      status: 'confirmed',
      payment_status: 'paid',
    })
  })

  it('erstattet und storniert, wenn der Artikel inzwischen ausverkauft ist', async () => {
    const orderId = seedOrder(IDS.productTeuer, 2)
    // Zwischen Bestellung und Zahlung hat jemand anders zugegriffen.
    db().row('products', IDS.productTeuer)!.stock_quantity = 1

    const event = stripeEvent(
      'checkout.session.completed',
      orderCheckoutSession({
        orderId,
        userId: IDS.customer,
        amountCents: 49800,
        paymentIntent: 'pi_test_ausverkauft',
      }),
    )
    prepareEvent(event)

    await webhookRoute(webhookRequest(event))

    expect(state.stripe.refunds).toContainEqual(
      expect.objectContaining({ paymentIntent: 'pi_test_ausverkauft' }),
    )
    expect(db().row('orders', orderId)).toMatchObject({
      status: 'cancelled',
      payment_status: 'refunded',
    })
    // Der Bestand bleibt unangetastet — nichts halb gebucht.
    expect(db().row('products', IDS.productTeuer)?.stock_quantity).toBe(1)
    expect(
      db().insertsInto('audit_logs').some(a => a.action === 'order_out_of_stock_refunded'),
    ).toBe(true)
  })

  it('bucht den Bestand bei doppelt zugestelltem Event nur einmal', async () => {
    const orderId = seedOrder(IDS.productTeuer, 1)
    const event = stripeEvent(
      'checkout.session.completed',
      orderCheckoutSession({ orderId, userId: IDS.customer, amountCents: 24900 }),
    )
    prepareEvent(event)

    await webhookRoute(webhookRequest(event))
    await webhookRoute(webhookRequest(event))

    expect(db().row('products', IDS.productTeuer)?.stock_quantity).toBe(1)
  })

  it('gibt den Bestand nach einer Erstattung zurueck — und zwar genau einmal', async () => {
    const orderId = seedOrder(IDS.productTeuer, 2)
    const completed = stripeEvent(
      'checkout.session.completed',
      orderCheckoutSession({
        orderId,
        userId: IDS.customer,
        amountCents: 49800,
        paymentIntent: 'pi_test_refund',
      }),
    )
    prepareEvent(completed)
    await webhookRoute(webhookRequest(completed))
    expect(db().row('products', IDS.productTeuer)?.stock_quantity).toBe(0)

    const refunded = stripeEvent('charge.refunded', {
      id: 'ch_test_1',
      payment_intent: 'pi_test_refund',
      amount_refunded: 49800,
      refunded: true,
    })
    prepareEvent(refunded)
    await webhookRoute(webhookRequest(refunded))
    await webhookRoute(webhookRequest(refunded))

    expect(db().row('products', IDS.productTeuer)?.stock_quantity).toBe(2)
    expect(db().row('orders', orderId)).toMatchObject({ payment_status: 'refunded' })
  })
})

describe('Anbieter-Pflege', () => {
  beforeEach(() => {
    state.session = sessionFor('owner')
  })

  it('lehnt einen negativen Produktpreis ab', async () => {
    const res = await providerProductCreate(
      postRequest('https://www.chairmatch.de/api/provider/products', {
        name: 'Kaputte Schere',
        priceCents: -1000,
      }),
    )
    expect(res.status).toBe(400)
  })

  it('macht aus Bestand 0 keinen unbegrenzten Bestand', async () => {
    // Vorher: `is_unlimited_stock: !stockQuantity` — 0 Stueck hiess unbegrenzt.
    const res = await providerProductCreate(
      postRequest('https://www.chairmatch.de/api/provider/products', {
        name: 'Neue Schere',
        priceCents: 1999,
        stockQuantity: 0,
      }),
    )
    expect(res.status).toBe(201)
    const angelegt = db().insertsInto('products').at(-1)
    expect(angelegt).toMatchObject({ stock_quantity: 0, is_unlimited_stock: false })
  })

  it('fuehrt ohne Bestandsangabe keinen Bestand, statt sofort ausverkauft zu sein', async () => {
    // Das Dashboard-Formular hat kein Bestandsfeld — ein dort angelegtes
    // Produkt muss verkaeuflich bleiben.
    const res = await providerProductCreate(
      postRequest('https://www.chairmatch.de/api/provider/products', {
        name: 'Schere ohne Lagerpflege',
        priceCents: 4999,
      }),
    )
    expect(res.status).toBe(201)
    expect(db().insertsInto('products').at(-1)).toMatchObject({ is_unlimited_stock: true })
  })

  it('weist Oeffnungszeiten im alten Langformat ab', async () => {
    // "Montag" liest weder /api/availability noch der Schema.org-Export.
    const res = await providerSalonPatch(
      postRequest('https://www.chairmatch.de/api/provider/salon', {
        opening_hours: { Montag: '09:00 - 18:00' },
      }),
    )
    expect(res.status).toBe(400)
  })

  it('nimmt Oeffnungszeiten im Kuerzelformat an', async () => {
    const res = await providerSalonPatch(
      postRequest('https://www.chairmatch.de/api/provider/salon', {
        opening_hours: { Mo: '09:00 - 18:00', So: 'Geschlossen' },
      }),
    )
    expect(res.status).toBe(200)
    expect(db().row('salons', IDS.salon)?.opening_hours).toMatchObject({ Mo: '09:00 - 18:00' })
  })

  it('weist einen Salonnamen ab, der kein String ist', async () => {
    const res = await providerSalonPatch(
      postRequest('https://www.chairmatch.de/api/provider/salon', { name: { boese: true } }),
    )
    expect(res.status).toBe(400)
  })

  it('ergaenzt eine Webadresse ohne Schema statt sie abzulehnen', async () => {
    const res = await providerSalonPatch(
      postRequest('https://www.chairmatch.de/api/provider/salon', { website: 'example.de' }),
    )
    expect(res.status).toBe(200)
    expect(db().row('salons', IDS.salon)?.website).toBe('https://example.de')
  })
})

void ctx
