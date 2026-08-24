// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { fakeDb } from '@/test/fake-supabase'
import { applyLiveSchema, NEWSLETTER_SUBSCRIBERS_AFTER_REPAIR } from '@/test/live-schema'
import { vi } from 'vitest'

/**
 * Oeffentliche Newsletter-Anmeldung — Kette Route → Datenbank.
 *
 * Anlass (Delta-Check 2026-08-24): `newsletter_subscribers` existiert live,
 * aber in der ALTEN Fassung — `is_active` (boolean) statt `status` (text),
 * ohne `name`, `tags`, `unsubscribe_token`. Der Code ist gegen die neue
 * Fassung geschrieben. In Produktion lief deshalb jede Anmeldung in 42703,
 * und die Route reichte den Postgres-Klartext als 500 an den Besucher
 * weiter ("column newsletter_subscribers.status does not exist").
 *
 * Der Test belegt BEIDE Zustaende, weil nur einer davon zu wenig ist:
 *
 *   A) Schema wie heute live → 503, KEINE Zeile, kein DB-Text nach aussen.
 *      Ein Test, der nur den Zielzustand kennt, haette den Ausfall gedeckt.
 *   B) Schema nach 20260824_newsletter_schema_repair.sql → Anmeldung laeuft.
 *      Ohne diesen Teil wuesste niemand, ob die Migration den Fehler behebt.
 *
 * Der Rate-Limit-Zaehler der Route ist modul-global und ueberlebt
 * `beforeEach`. Jeder Fall bekommt deshalb eine eigene IP.
 */

vi.mock('@/lib/supabase-server', async () => {
  const { fakeDb: db } = await import('@/test/fake-supabase')
  return { getSupabaseAdmin: () => db }
})

type Post = (req: NextRequest) => Promise<Response>
let POST: Post

beforeAll(async () => {
  POST = (await import('@/app/api/newsletter/route')).POST as unknown as Post
})

const TABLE = 'newsletter_subscribers'

/** Schema wie heute in Produktion (LIVE_SCHEMA fuehrt die alte Fassung). */
function seedLiveSchema() {
  fakeDb.reset()
  applyLiveSchema(fakeDb)
}

/** Schema nach der Reparatur-Migration. */
function seedRepairedSchema() {
  fakeDb.reset()
  applyLiveSchema(fakeDb)
  fakeDb.defineSchema(TABLE, NEWSLETTER_SUBSCRIBERS_AFTER_REPAIR)
  fakeDb.addUniqueIndex(TABLE, ['email'], 'uq_newsletter_subscribers_email')
}

let ipCounter = 0
function signup(body: unknown): NextRequest {
  ipCounter += 1
  return new Request('http://localhost:3000/api/newsletter', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      // Eigene IP pro Aufruf — sonst greift das In-Memory-Rate-Limit der
      // Route (3/Minute) quer ueber die Testfaelle.
      'x-forwarded-for': `203.0.113.${ipCounter % 250}`,
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

beforeEach(() => {
  seedLiveSchema()
})

describe('POST /api/newsletter — Schema wie heute in Produktion', () => {
  it('antwortet 503 statt 500 und schreibt keine Zeile', async () => {
    const res = await POST(signup({ email: 'neu@example.com', name: 'Neu' }))

    expect(res.status).toBe(503)
    expect(fakeDb.rows(TABLE)).toHaveLength(0)
  })

  it('gibt den Postgres-Fehlertext NICHT an den Besucher weiter', async () => {
    const res = await POST(signup({ email: 'neu2@example.com' }))
    const body = (await res.json()) as { error?: string }

    // Weder Spalten- noch Tabellennamen, weder Fehlercode noch DB-Klartext.
    expect(body.error ?? '').not.toMatch(/does not exist|column|42703|PGRST|newsletter_subscribers/i)
    expect(body.error).toBeTruthy()
  })

  it('meldet keinen Erfolg — die Anmeldung ist wirklich nicht gespeichert', async () => {
    const res = await POST(signup({ email: 'neu3@example.com' }))
    const body = (await res.json()) as { success?: boolean }

    expect(body.success).toBeUndefined()
  })
})

describe('POST /api/newsletter — Schema nach 20260824_newsletter_schema_repair', () => {
  beforeEach(() => {
    seedRepairedSchema()
  })

  it('legt den Abonnenten mit status=active an', async () => {
    const res = await POST(signup({ email: 'Anna@Example.COM ', name: 'Anna', source: 'footer' }))
    const body = (await res.json()) as { success?: boolean }

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)

    const rows = fakeDb.rows(TABLE)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      email: 'anna@example.com', // normalisiert
      name: 'Anna',
      source: 'footer',
      status: 'active',
    })
  })

  it('meldet eine bestehende aktive Adresse als bereits abonniert — ohne zweite Zeile', async () => {
    fakeDb.seed(TABLE, [
      { id: 'sub-1', email: 'anna@example.com', status: 'active', source: 'web' },
    ])

    const res = await POST(signup({ email: 'anna@example.com' }))
    const body = (await res.json()) as { alreadySubscribed?: boolean }

    expect(body.alreadySubscribed).toBe(true)
    expect(fakeDb.rows(TABLE)).toHaveLength(1)
  })

  it('reaktiviert eine abgemeldete Adresse, statt sie doppelt anzulegen', async () => {
    fakeDb.seed(TABLE, [
      { id: 'sub-2', email: 'weg@example.com', status: 'unsubscribed', source: 'web' },
    ])

    const res = await POST(signup({ email: 'weg@example.com', name: 'Zurueck' }))
    const body = (await res.json()) as { reactivated?: boolean }

    expect(body.reactivated).toBe(true)
    const rows = fakeDb.rows(TABLE)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ status: 'active', unsubscribed_at: null })
  })

  it('behandelt den Unique-Konflikt zweier gleichzeitiger Anmeldungen als Erfolg', async () => {
    // Race: der Lookup findet nichts, zwischen Lookup und Insert legt ein
    // paralleler Request dieselbe Adresse an. Der UNIQUE-Index faengt das ab.
    fakeDb.failOn(`${TABLE}.insert`, {
      code: '23505',
      message: 'duplicate key value violates unique constraint "uq_newsletter_subscribers_email"',
    })

    const res = await POST(signup({ email: 'race@example.com' }))
    const body = (await res.json()) as { success?: boolean; alreadySubscribed?: boolean }

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.alreadySubscribed).toBe(true)
  })
})

describe('POST /api/newsletter — Tabelle fehlt komplett', () => {
  it('antwortet 503, nicht 500', async () => {
    seedRepairedSchema()
    fakeDb.dropTable(TABLE)

    const res = await POST(signup({ email: 'keine-tabelle@example.com' }))

    expect(res.status).toBe(503)
  })
})
