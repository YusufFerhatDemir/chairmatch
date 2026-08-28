// @vitest-environment node
/**
 * E2E: Lebenszyklus eines Stuhl-Inserats (`/api/me/listing`).
 *
 * Diese Route ist der gesamte Inserats-Editor: die Vermieter-Seiten fuer
 * Preise, Verfuegbarkeit, Ausstattung und Fotos bearbeiten alle dieselbe
 * `rental_equipment`-Zeile ueber genau diesen Handler. Sie hatte bis hierhin
 * KEINEN einzigen Test — weder Unit noch E2E.
 *
 * Der Weg, den ein Inserat nimmt, ist dabei nicht trivial:
 *
 *   1. Erstes Speichern: es gibt noch gar keine Zeile. `ensurePrimaryListing`
 *      legt sie an — mit `price_per_day_cents: 0` und `is_available: false`.
 *   2. Solange kein Tagespreis gesetzt ist, darf das Inserat NICHT online
 *      gehen: sonst waere es fuer 0 € buchbar.
 *   3. Wird der Tagespreis wieder auf 0 gesetzt, muss ein bereits online
 *      stehendes Inserat von selbst offline gehen.
 *
 * Punkt 3 ist der, der ohne Test am ehesten still verloren geht: er steht
 * nicht im Schema, sondern als `forceOffline` im Handler.
 *
 * Geprueft wird jeweils am Zustand der Zeile, nicht nur am Statuscode.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDb, sessionFor, rawRequest, IDS } from './_harness/fixtures'
import type { FakeSupabase, Row } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as { user: { id: string; email: string; name: string; role: string } } | null,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({ getServerSession: async () => state.session }))
vi.mock('@/modules/auth/auth.config', () => ({ auth: async () => state.session }))

import { GET as listingGet, PATCH as listingPatch } from '@/app/api/me/listing/route'

function db(): FakeSupabase {
  return state.db
}

const INSERAT = '77777777-7777-4777-8777-7777777777aa'
const OWNER_ZWEI = '22222222-2222-4222-8222-222222222223'
const SALON_ZWEI = '44444444-4444-4444-8444-444444444446'
const INSERAT_ZWEI = '77777777-7777-4777-8777-7777777777bb'

/** PATCH-Request an den Inserats-Handler. */
function patchRequest(body: unknown) {
  return rawRequest('https://www.chairmatch.de/api/me/listing', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', origin: 'https://www.chairmatch.de' },
    body: JSON.stringify(body),
  })
}

/** Das Inserat des ersten Vermieters, frisch aus der Fake-DB. */
function inserat(): Row | undefined {
  return db().row('rental_equipment', INSERAT)
}

beforeEach(() => {
  state.db = createDb()
  state.session = sessionFor('owner')

  // Die Fixtures bringen mehrere Mietobjekte desselben Salons mit; welches
  // davon „das aelteste" ist, haengt dort an keiner gesetzten `created_at`.
  // Fuer diese Datei wird der Bestand deshalb ersetzt: ein eindeutiges
  // Haupt-Inserat je Vermieter.
  db().replace('rental_equipment', [
    {
      id: INSERAT,
      salon_id: IDS.salon,
      type: 'stuhl',
      name: 'Friseurstuhl am Fenster',
      description: 'Heller Platz mit eigenem Waschbecken',
      price_per_day_cents: 5000,
      price_per_hour_cents: null,
      price_per_week_cents: null,
      price_per_month_cents: 90000,
      available_days: ['mon', 'tue'],
      available_from: '09:00',
      available_to: '18:00',
      features: ['Waschbecken'],
      images: [],
      is_available: true,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ])
})

/** Zweiter Vermieter mit eigenem Salon und eigenem Inserat. */
function seedZweitenVermieter(): void {
  db().rows('profiles').push({
    id: OWNER_ZWEI,
    email: 'zweiter@example.de',
    full_name: 'Zweiter Inhaber',
    role: 'anbieter',
    is_active: true,
  })
  db().rows('salons').push({
    id: SALON_ZWEI,
    name: 'Salon Zwei',
    slug: 'salon-zwei',
    category: 'friseur',
    city: 'Hamburg',
    owner_id: OWNER_ZWEI,
    is_active: true,
    is_verified: true,
    created_at: '2026-01-01T00:00:00.000Z',
  })
  db().rows('rental_equipment').push({
    id: INSERAT_ZWEI,
    salon_id: SALON_ZWEI,
    type: 'stuhl',
    name: 'Stuhl im Salon Zwei',
    description: null,
    price_per_day_cents: 7000,
    price_per_hour_cents: null,
    price_per_week_cents: null,
    price_per_month_cents: null,
    available_days: null,
    available_from: null,
    available_to: null,
    features: null,
    images: [],
    is_available: true,
    created_at: '2026-01-01T00:00:00.000Z',
  })
}

function sessionZweiterVermieter() {
  return {
    user: {
      id: OWNER_ZWEI,
      email: 'zweiter@example.de',
      name: 'Zweiter Inhaber',
      role: 'anbieter',
    },
  }
}

describe('Inserat lesen (GET /api/me/listing)', () => {
  it('lehnt ohne Session mit 401 ab', async () => {
    state.session = null
    const res = await listingGet()
    expect(res.status).toBe(401)
  })

  it('liefert das Haupt-Inserat des eingeloggten Vermieters', async () => {
    const res = await listingGet()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.listing.id).toBe(INSERAT)
    expect(body.listing.price_per_day_cents).toBe(5000)
  })

  it('liefert `null` statt 404, wenn der Vermieter noch kein Inserat hat', async () => {
    // Kein Inserat, aber ein Salon: der uebliche Zustand direkt nach dem
    // Onboarding. Die Seite soll ein leeres Formular zeigen, keinen Fehler.
    db().replace('rental_equipment', [])

    const res = await listingGet()
    expect(res.status).toBe(200)
    expect((await res.json()).listing).toBeNull()
  })

  it('zeigt niemals das Inserat eines fremden Salons', async () => {
    seedZweitenVermieter()
    state.session = sessionZweiterVermieter()

    const body = await (await listingGet()).json()
    expect(body.listing.id).toBe(INSERAT_ZWEI)
    expect(body.listing.salon_id).toBe(SALON_ZWEI)
  })
})

describe('Inserat bearbeiten (PATCH /api/me/listing)', () => {
  it('lehnt ohne Session mit 401 ab und aendert nichts', async () => {
    state.session = null
    const res = await listingPatch(patchRequest({ name: 'Gekapert' }))

    expect(res.status).toBe(401)
    expect(inserat()?.name).toBe('Friseurstuhl am Fenster')
  })

  it('speichert Name, Beschreibung und Ausstattung', async () => {
    const res = await listingPatch(
      patchRequest({
        name: 'Stuhl mit Blick',
        description: 'Direkt am Fenster',
        features: ['Waschbecken', 'Fön'],
      }),
    )

    expect(res.status).toBe(200)
    const zeile = inserat()
    expect(zeile?.name).toBe('Stuhl mit Blick')
    expect(zeile?.features).toEqual(['Waschbecken', 'Fön'])
  })

  it('weist unbekannte Felder ab, statt sie stillschweigend zu schlucken', async () => {
    // `.strict()` im Schema. Ohne diesen Riegel liesse sich ueber den
    // Editor jede Spalte der Zeile setzen — `salon_id` zum Beispiel.
    const res = await listingPatch(
      patchRequest({ name: 'Neu', salon_id: SALON_ZWEI }),
    )

    expect(res.status).toBe(400)
    expect(inserat()?.salon_id).toBe(IDS.salon)
  })

  it('weist einen leeren Patch mit 400 ab', async () => {
    const res = await listingPatch(patchRequest({}))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Keine Änderungen/)
  })

  it('weist einen kaputten JSON-Body mit 400 ab', async () => {
    const res = await listingPatch(
      rawRequest('https://www.chairmatch.de/api/me/listing', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: '{ kein json',
      }),
    )
    expect(res.status).toBe(400)
  })

  it('weist negative Preise ab', async () => {
    const res = await listingPatch(patchRequest({ price_per_day_cents: -1 }))
    expect(res.status).toBe(400)
    expect(inserat()?.price_per_day_cents).toBe(5000)
  })

  it('weist eine Endzeit vor der Startzeit ab', async () => {
    const res = await listingPatch(
      patchRequest({ available_from: '18:00', available_to: '09:00' }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Endzeit/)
    expect(inserat()?.available_from).toBe('09:00')
  })

  it('weist eine Uhrzeit im falschen Format ab', async () => {
    const res = await listingPatch(patchRequest({ available_from: '9 Uhr' }))
    expect(res.status).toBe(400)
  })

  it('weist einen unbekannten Objekttyp ab (er bestimmt den Provisionssatz)', async () => {
    const res = await listingPatch(patchRequest({ type: 'yacht' }))
    expect(res.status).toBe(400)
    expect(inserat()?.type).toBe('stuhl')
  })
})

describe('Erstes Speichern legt das Inserat an', () => {
  beforeEach(() => {
    db().replace('rental_equipment', [])
  })

  it('erzeugt die Zeile beim ersten PATCH — offline und ohne Preis', async () => {
    const res = await listingPatch(patchRequest({ name: 'Mein erster Stuhl' }))

    expect(res.status).toBe(200)
    const zeilen = db().rows('rental_equipment')
    expect(zeilen).toHaveLength(1)
    expect(zeilen[0].salon_id).toBe(IDS.salon)
    expect(zeilen[0].name).toBe('Mein erster Stuhl')
    // Ein frisches Inserat ist nicht sichtbar: es hat noch keinen Preis.
    expect(zeilen[0].is_available).toBe(false)
    expect(zeilen[0].price_per_day_cents).toBe(0)
  })

  it('verweist ohne Salon auf das Anbieter-Onboarding (404)', async () => {
    db().replace('salons', [])

    const res = await listingPatch(patchRequest({ name: 'Ohne Salon' }))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toMatch(/Onboarding/)
    expect(db().rows('rental_equipment')).toHaveLength(0)
  })
})

describe('Ein Inserat ohne Tagespreis geht nicht online', () => {
  beforeEach(() => {
    // Frisch angelegtes Inserat: kein Preis, offline.
    db().replace('rental_equipment', [
      {
        id: INSERAT,
        salon_id: IDS.salon,
        type: 'stuhl',
        name: 'Neuer Stuhl',
        description: null,
        price_per_day_cents: 0,
        price_per_hour_cents: null,
        price_per_week_cents: null,
        price_per_month_cents: null,
        available_days: null,
        available_from: null,
        available_to: null,
        features: null,
        images: [],
        is_available: false,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ])
  })

  it('lehnt „online schalten" ohne Tagespreis mit 400 ab', async () => {
    const res = await listingPatch(patchRequest({ is_available: true }))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Tagespreis/)
    // Der entscheidende Teil: die Zeile ist NICHT online.
    expect(inserat()?.is_available).toBe(false)
  })

  it('erlaubt „online schalten", wenn der Preis im selben Patch mitkommt', async () => {
    const res = await listingPatch(
      patchRequest({ is_available: true, price_per_day_cents: 4500 }),
    )

    expect(res.status).toBe(200)
    const zeile = inserat()
    expect(zeile?.is_available).toBe(true)
    expect(zeile?.price_per_day_cents).toBe(4500)
  })
})

describe('Tagespreis auf 0 nimmt das Inserat automatisch offline', () => {
  it('setzt is_available zurueck, wenn der Preis auf 0 faellt', async () => {
    // Ausgangslage aus dem beforeEach: online, 5000 Cent.
    expect(inserat()?.is_available).toBe(true)

    const res = await listingPatch(patchRequest({ price_per_day_cents: 0 }))

    expect(res.status).toBe(200)
    // `forceOffline` im Handler — steht in keinem Schema und in keiner
    // Datenbank-Regel. Ohne diesen Test faellt sein Wegfall nicht auf, und
    // das Inserat waere fuer 0 € buchbar.
    expect(inserat()?.is_available).toBe(false)
    expect(inserat()?.price_per_day_cents).toBe(0)
  })

  it('ignoriert ein gleichzeitiges is_available:true, wenn der Preis 0 wird', async () => {
    const res = await listingPatch(
      patchRequest({ price_per_day_cents: 0, is_available: true }),
    )

    // Der Preis-Riegel schlaegt zu, bevor `forceOffline` ueberhaupt greift.
    expect(res.status).toBe(400)
    expect(inserat()?.price_per_day_cents).toBe(5000)
  })
})

describe('Mandantentrennung', () => {
  it('der Patch des zweiten Vermieters laesst das fremde Inserat unberuehrt', async () => {
    seedZweitenVermieter()
    state.session = sessionZweiterVermieter()

    const res = await listingPatch(patchRequest({ name: 'Nur meiner', price_per_day_cents: 111 }))
    expect(res.status).toBe(200)

    // Eigenes Inserat geaendert …
    expect(db().row('rental_equipment', INSERAT_ZWEI)?.name).toBe('Nur meiner')
    // … fremdes unangetastet.
    expect(inserat()?.name).toBe('Friseurstuhl am Fenster')
    expect(inserat()?.price_per_day_cents).toBe(5000)
  })
})

describe('Datenbankausfall', () => {
  it('meldet 500 statt eine Aenderung vorzutaeuschen', async () => {
    db().failOn('rental_equipment', 'update', {
      code: '08006',
      message: 'connection failure',
      details: null,
      hint: null,
    })

    const res = await listingPatch(patchRequest({ name: 'Geht nicht durch' }))
    expect(res.status).toBe(500)
    expect(inserat()?.name).toBe('Friseurstuhl am Fenster')
  })
})
