// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { fakeDb, type Row } from '@/test/fake-supabase'
import { applyLiveSchema } from '@/test/live-schema'

/**
 * CRUD-Kette fuer Mietobjekte (Track 7b, Punkt 3).
 *
 * Die Routen unter /api/rental-equipment waren bis hierher ungetestet,
 * obwohl an ihnen der gesamte Vermieter-Bestand haengt: was hier falsch
 * gespeichert wird, bestimmt anschliessend Preisberechnung, Sichtbarkeit im
 * Marktplatz und die Kostenschaetzung jeder Mietanfrage.
 *
 * Gemockt ist nur die Session. Datenbank, Besitzpruefung und Validierung
 * laufen echt — die Fake-DB kennt seit 2026-08-23 das Produktionsschema
 * (`applyLiveSchema`), also faellt eine Spalte auf, die es live nicht gibt.
 *
 * Geprueft wird:
 *   1. Anlegen — Pflichtfelder, Kategorien, Grenzwerte
 *   2. Lesen — eigener Bestand und oeffentliche Detailsicht
 *   3. Aendern — Besitz, Teilaenderung, Preis/Sichtbarkeit-Kopplung
 *   4. Loeschen — Besitz und der Vorbehalt bei laufenden Buchungen
 */

const auth = vi.hoisted(() => ({
  session: null as { user?: { id?: string } } | null,
}))

vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => auth.session,
}))

vi.mock('@/lib/supabase-server', async () => {
  const { fakeDb: db } = await import('@/test/fake-supabase')
  return { getSupabaseAdmin: () => db }
})

// ── Fixtures ────────────────────────────────────────────────────────────────

const OWNER_ID = '11111111-1111-4111-8111-111111111111'
const STRANGER_ID = '99999999-9999-4999-8999-999999999999'
const SALON_ID = '22222222-2222-4222-8222-222222222222'
const EQUIPMENT_ID = '33333333-3333-4333-8333-333333333333'
const UNKNOWN_ID = '44444444-4444-4444-8444-444444444444'

type Handler = (req: NextRequest, ctx?: unknown) => Promise<Response>
let listEquipment: () => Promise<Response>
let createEquipment: Handler
let readEquipment: Handler
let patchEquipment: Handler
let deleteEquipment: Handler

beforeAll(async () => {
  const collection = await import('@/app/api/rental-equipment/route')
  const single = await import('@/app/api/rental-equipment/[id]/route')
  listEquipment = collection.GET as unknown as () => Promise<Response>
  createEquipment = collection.POST as unknown as Handler
  readEquipment = single.GET as unknown as Handler
  patchEquipment = single.PATCH as unknown as Handler
  deleteEquipment = single.DELETE as unknown as Handler
})

/**
 * `salons` steht als eingebettetes Objekt in der Equipment-Zeile, weil der
 * Fake keine Joins kann — der Produktivcode liest genau diese Form
 * (`select('…, salons(owner_id)')`).
 */
function seedEquipment(overrides: Row = {}): Row {
  const row: Row = {
    id: EQUIPMENT_ID,
    salon_id: SALON_ID,
    type: 'stuhl',
    name: 'Friseur-Stuhl am Fenster',
    description: 'Heller Platz mit eigenem Spiegel.',
    price_per_day_cents: 4000,
    price_per_hour_cents: 900,
    price_per_week_cents: null,
    price_per_month_cents: null,
    available_days: ['mon', 'tue'],
    available_from: '09:00',
    available_to: '18:00',
    features: ['WLAN'],
    is_available: true,
    images: [],
    created_at: '2026-08-01T10:00:00.000Z',
    salons: { id: SALON_ID, owner_id: OWNER_ID, name: 'Salon Nord', city: 'Köln', slug: 'salon-nord' },
    ...overrides,
  }
  fakeDb.rows('rental_equipment').push(row)
  return row
}

function seedDatabase() {
  fakeDb.reset()
  applyLiveSchema(fakeDb)
  fakeDb.seed('salons', [
    { id: SALON_ID, owner_id: OWNER_ID, name: 'Salon Nord', city: 'Köln', created_at: '2026-01-01T00:00:00.000Z' },
  ])
}

function jsonRequest(method: string, body?: unknown): NextRequest {
  return {
    url: 'https://www.chairmatch.de/api/rental-equipment',
    method,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => {
      if (body === undefined) throw new Error('no body')
      return body
    },
  } as unknown as NextRequest
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

async function readJson(res: Response) {
  return { status: res.status, json: (await res.json()) as Record<string, unknown> }
}

const equipmentRows = () => fakeDb.rows('rental_equipment')

/** Vollstaendiger, gueltiger Anlage-Body — Tests variieren nur einzelne Felder. */
function validBody(overrides: Row = {}): Row {
  return {
    type: 'liege',
    name: 'Kosmetik-Liege Raum 2',
    description: 'Ruhiger Behandlungsraum.',
    price_per_day_cents: 5500,
    price_per_hour_cents: 1200,
    available_days: ['wed', 'thu', 'fri'],
    available_from: '10:00',
    available_to: '19:00',
    features: ['Handtücher', 'Musikanlage'],
    ...overrides,
  }
}

beforeEach(() => {
  seedDatabase()
  auth.session = { user: { id: OWNER_ID } }
})

// ── 1. Anlegen ──────────────────────────────────────────────────────────────

describe('POST /api/rental-equipment — anlegen', () => {
  it('legt ein Mietobjekt im eigenen Salon an und gibt es zurueck', async () => {
    const { status, json } = await readJson(await createEquipment(jsonRequest('POST', validBody())))

    expect(status).toBe(201)
    expect(equipmentRows()).toHaveLength(1)

    const stored = equipmentRows()[0]
    expect(stored.salon_id).toBe(SALON_ID)
    expect(stored.type).toBe('liege')
    expect(stored.name).toBe('Kosmetik-Liege Raum 2')
    expect(stored.price_per_day_cents).toBe(5500)
    expect(stored.features).toEqual(['Handtücher', 'Musikanlage'])
    expect((json.equipment as Row).id).toBe(stored.id)
  })

  it('schaltet ein Mietobjekt mit Tagespreis automatisch sichtbar', async () => {
    await createEquipment(jsonRequest('POST', validBody()))
    expect(equipmentRows()[0].is_available).toBe(true)
  })

  it('haelt ein Mietobjekt ohne Tagespreis offline', async () => {
    await createEquipment(jsonRequest('POST', validBody({ price_per_day_cents: 0 })))
    expect(equipmentRows()[0].is_available).toBe(false)
  })

  it('weist ein Mietobjekt ohne Tagespreis ab, das sofort online gehen soll', async () => {
    const { status, json } = await readJson(
      await createEquipment(jsonRequest('POST', validBody({ price_per_day_cents: 0, is_available: true }))),
    )

    expect(status).toBe(400)
    expect(String(json.error)).toContain('Tagespreis')
    expect(equipmentRows()).toHaveLength(0)
  })

  it('verlangt eine bekannte Kategorie', async () => {
    const { status, json } = await readJson(
      await createEquipment(jsonRequest('POST', validBody({ type: 'sonnenliege' }))),
    )

    expect(status).toBe(400)
    const details = json.details as Record<string, string[]>
    expect(details.type).toBeDefined()
    expect(equipmentRows()).toHaveLength(0)
  })

  it.each([
    ['stuhl', 'Barber-Stuhl'],
    ['liege', 'Kosmetik-Liege'],
    ['raum', 'Behandlungsraum'],
    ['opraum', 'OP-Raum'],
  ])('akzeptiert die Kategorie %s', async (type, name) => {
    const { status } = await readJson(
      await createEquipment(jsonRequest('POST', validBody({ type, name }))),
    )
    expect(status).toBe(201)
    expect(equipmentRows()[0].type).toBe(type)
  })

  it('verlangt einen Namen von mindestens zwei Zeichen', async () => {
    const { status, json } = await readJson(
      await createEquipment(jsonRequest('POST', validBody({ name: 'X' }))),
    )

    expect(status).toBe(400)
    expect((json.details as Record<string, string[]>).name).toBeDefined()
    expect(equipmentRows()).toHaveLength(0)
  })

  it('weist eine Endzeit vor der Startzeit ab', async () => {
    const { status, json } = await readJson(
      await createEquipment(
        jsonRequest('POST', validBody({ available_from: '18:00', available_to: '09:00' })),
      ),
    )

    expect(status).toBe(400)
    expect(String(json.error)).toContain('Endzeit')
    expect(equipmentRows()).toHaveLength(0)
  })

  it('weist negative Preise ab', async () => {
    const { status } = await readJson(
      await createEquipment(jsonRequest('POST', validBody({ price_per_day_cents: -1 }))),
    )
    expect(status).toBe(400)
    expect(equipmentRows()).toHaveLength(0)
  })

  it('lehnt einen kaputten JSON-Body ab, ohne zu schreiben', async () => {
    const { status, json } = await readJson(await createEquipment(jsonRequest('POST')))

    expect(status).toBe(400)
    expect(String(json.error)).toContain('JSON')
    expect(equipmentRows()).toHaveLength(0)
  })

  it('verlangt eine Anmeldung', async () => {
    auth.session = null
    const { status } = await readJson(await createEquipment(jsonRequest('POST', validBody())))

    expect(status).toBe(401)
    expect(equipmentRows()).toHaveLength(0)
  })

  it('verweist einen Nutzer ohne Salon auf das Onboarding', async () => {
    auth.session = { user: { id: STRANGER_ID } }
    const { status, json } = await readJson(await createEquipment(jsonRequest('POST', validBody())))

    expect(status).toBe(404)
    expect(String(json.error)).toContain('Onboarding')
    expect(equipmentRows()).toHaveLength(0)
  })

  it('deckelt den Bestand pro Salon bei 30', async () => {
    for (let i = 0; i < 30; i++) {
      seedEquipment({ id: `aaaaaaaa-0000-4000-8000-${String(i).padStart(12, '0')}` })
    }

    const { status, json } = await readJson(await createEquipment(jsonRequest('POST', validBody())))

    expect(status).toBe(409)
    expect(String(json.error)).toContain('30')
    expect(equipmentRows()).toHaveLength(30)
  })

  it('meldet einen DB-Ausfall ehrlich als Fehler — kein Ersatzspeicher', async () => {
    fakeDb.failOn('rental_equipment.insert', { code: '57014', message: 'statement timeout' })

    const { status, json } = await readJson(await createEquipment(jsonRequest('POST', validBody())))

    expect(status).toBe(500)
    expect(String(json.error)).toContain('nicht angelegt')
    expect(equipmentRows()).toHaveLength(0)
  })
})

// ── 2. Lesen ────────────────────────────────────────────────────────────────

describe('GET /api/rental-equipment — eigener Bestand', () => {
  it('liefert die Mietobjekte des eigenen Salons samt Salonbezug', async () => {
    seedEquipment()

    const { status, json } = await readJson(await listEquipment())

    expect(status).toBe(200)
    expect(json.equipment).toHaveLength(1)
    expect((json.salon as Row).id).toBe(SALON_ID)
  })

  it('liefert fremde Mietobjekte nicht mit aus', async () => {
    seedEquipment()
    seedEquipment({
      id: UNKNOWN_ID,
      salon_id: '88888888-8888-4888-8888-888888888888',
      name: 'Fremder Stuhl',
    })

    const { json } = await readJson(await listEquipment())

    expect(json.equipment).toHaveLength(1)
    expect((json.equipment as Row[])[0].name).toBe('Friseur-Stuhl am Fenster')
  })

  it('verlangt eine Anmeldung', async () => {
    auth.session = null
    const { status } = await readJson(await listEquipment())
    expect(status).toBe(401)
  })
})

describe('GET /api/rental-equipment/[id] — oeffentliche Detailsicht', () => {
  it('liefert die Detaildaten ohne Anmeldung — das Anfrageformular braucht sie', async () => {
    seedEquipment()
    auth.session = null

    const { status, json } = await readJson(
      await readEquipment(jsonRequest('GET'), ctx(EQUIPMENT_ID)),
    )

    expect(status).toBe(200)
    expect((json.equipment as Row).name).toBe('Friseur-Stuhl am Fenster')
  })

  it('antwortet auf eine unbekannte ID mit 404', async () => {
    const { status } = await readJson(await readEquipment(jsonRequest('GET'), ctx(UNKNOWN_ID)))
    expect(status).toBe(404)
  })

  it('behandelt eine ID, die keine UUID ist, als 404 statt als DB-Fehler', async () => {
    const { status } = await readJson(
      await readEquipment(jsonRequest('GET'), ctx('../../etc/passwd')),
    )

    expect(status).toBe(404)
    // Die Route darf bei so einer ID gar nicht erst die Datenbank fragen.
    expect(fakeDb.access.filter((a) => a.table === 'rental_equipment')).toHaveLength(0)
  })
})

// ── 3. Aendern ──────────────────────────────────────────────────────────────

describe('PATCH /api/rental-equipment/[id] — aendern', () => {
  it('aendert einzelne Felder und laesst den Rest stehen', async () => {
    seedEquipment()

    const { status, json } = await readJson(
      await patchEquipment(jsonRequest('PATCH', { name: 'Stuhl am Fenster (renoviert)' }), ctx(EQUIPMENT_ID)),
    )

    expect(status).toBe(200)
    expect((json.equipment as Row).name).toBe('Stuhl am Fenster (renoviert)')

    const stored = equipmentRows()[0]
    expect(stored.name).toBe('Stuhl am Fenster (renoviert)')
    expect(stored.price_per_day_cents).toBe(4000)
    expect(stored.features).toEqual(['WLAN'])
  })

  it('setzt updated_at bei jeder Aenderung', async () => {
    seedEquipment()
    await patchEquipment(jsonRequest('PATCH', { price_per_day_cents: 4500 }), ctx(EQUIPMENT_ID))

    expect(equipmentRows()[0].updated_at).toBeTruthy()
  })

  it('laesst niemanden fremde Mietobjekte aendern', async () => {
    seedEquipment()
    auth.session = { user: { id: STRANGER_ID } }

    const { status, json } = await readJson(
      await patchEquipment(jsonRequest('PATCH', { name: 'Uebernommen' }), ctx(EQUIPMENT_ID)),
    )

    expect(status).toBe(403)
    expect(String(json.error)).toContain('Kein Zugriff')
    expect(equipmentRows()[0].name).toBe('Friseur-Stuhl am Fenster')
  })

  it('weist unbekannte Felder ab, statt sie stillschweigend zu schlucken', async () => {
    seedEquipment()

    const { status } = await readJson(
      await patchEquipment(jsonRequest('PATCH', { salon_id: 'fremder-salon' }), ctx(EQUIPMENT_ID)),
    )

    expect(status).toBe(400)
    expect(equipmentRows()[0].salon_id).toBe(SALON_ID)
  })

  it('verlangt mindestens eine Aenderung', async () => {
    seedEquipment()

    const { status, json } = await readJson(
      await patchEquipment(jsonRequest('PATCH', {}), ctx(EQUIPMENT_ID)),
    )

    expect(status).toBe(400)
    expect(String(json.error)).toContain('Keine Änderungen')
  })

  it('nimmt ein Mietobjekt offline, sobald der Tagespreis auf 0 faellt', async () => {
    seedEquipment()

    await patchEquipment(jsonRequest('PATCH', { price_per_day_cents: 0 }), ctx(EQUIPMENT_ID))

    // Sonst stuende ein buchbares Inserat fuer 0 € im Marktplatz.
    expect(equipmentRows()[0].is_available).toBe(false)
  })

  it('laesst ein Mietobjekt ohne Tagespreis nicht online gehen', async () => {
    seedEquipment({ price_per_day_cents: 0, is_available: false })

    const { status, json } = await readJson(
      await patchEquipment(jsonRequest('PATCH', { is_available: true }), ctx(EQUIPMENT_ID)),
    )

    expect(status).toBe(400)
    expect(String(json.error)).toContain('Tagespreis')
    expect(equipmentRows()[0].is_available).toBe(false)
  })

  it('erlaubt das Online-Schalten zusammen mit dem passenden Preis', async () => {
    seedEquipment({ price_per_day_cents: 0, is_available: false })

    const { status } = await readJson(
      await patchEquipment(
        jsonRequest('PATCH', { is_available: true, price_per_day_cents: 3900 }),
        ctx(EQUIPMENT_ID),
      ),
    )

    expect(status).toBe(200)
    expect(equipmentRows()[0].is_available).toBe(true)
  })

  it('verlangt eine Anmeldung', async () => {
    seedEquipment()
    auth.session = null

    const { status } = await readJson(
      await patchEquipment(jsonRequest('PATCH', { name: 'Neu' }), ctx(EQUIPMENT_ID)),
    )

    expect(status).toBe(401)
  })
})

// ── 4. Loeschen ─────────────────────────────────────────────────────────────

describe('DELETE /api/rental-equipment/[id] — loeschen', () => {
  it('loescht ein eigenes Mietobjekt ohne Buchungen', async () => {
    seedEquipment()

    const { status, json } = await readJson(
      await deleteEquipment(jsonRequest('DELETE'), ctx(EQUIPMENT_ID)),
    )

    expect(status).toBe(200)
    expect(json.deleted).toBe(EQUIPMENT_ID)
    expect(equipmentRows()).toHaveLength(0)
  })

  it.each(['pending', 'confirmed', 'active'])(
    'verweigert das Loeschen bei einer Buchung im Status %s',
    async (status) => {
      seedEquipment()
      fakeDb.seed('rental_bookings', [
        { id: '77777777-7777-4777-8777-777777777777', equipment_id: EQUIPMENT_ID, status },
      ])

      const res = await readJson(await deleteEquipment(jsonRequest('DELETE'), ctx(EQUIPMENT_ID)))

      expect(res.status).toBe(409)
      expect(String(res.json.error)).toContain('offline')
      // Entscheidend: die Buchung haengt per ON DELETE CASCADE am Mietobjekt.
      expect(equipmentRows()).toHaveLength(1)
    },
  )

  it('loescht trotz abgeschlossener oder stornierter Buchungen', async () => {
    seedEquipment()
    fakeDb.seed('rental_bookings', [
      { id: '66666666-6666-4666-8666-666666666666', equipment_id: EQUIPMENT_ID, status: 'completed' },
      { id: '55555555-5555-4555-8555-555555555555', equipment_id: EQUIPMENT_ID, status: 'cancelled' },
    ])

    const { status } = await readJson(
      await deleteEquipment(jsonRequest('DELETE'), ctx(EQUIPMENT_ID)),
    )

    expect(status).toBe(200)
    expect(equipmentRows()).toHaveLength(0)
  })

  it('laesst niemanden fremde Mietobjekte loeschen', async () => {
    seedEquipment()
    auth.session = { user: { id: STRANGER_ID } }

    const { status } = await readJson(
      await deleteEquipment(jsonRequest('DELETE'), ctx(EQUIPMENT_ID)),
    )

    expect(status).toBe(403)
    expect(equipmentRows()).toHaveLength(1)
  })

  it('behaelt das Mietobjekt, wenn der Buchungs-Vorbehalt nicht pruefbar ist', async () => {
    seedEquipment()
    fakeDb.failOn('rental_bookings.select', { code: '57014', message: 'statement timeout' })

    const { status, json } = await readJson(
      await deleteEquipment(jsonRequest('DELETE'), ctx(EQUIPMENT_ID)),
    )

    // Im Zweifel nicht loeschen: ein Cascade-Delete ist nicht umkehrbar.
    expect(status).toBe(500)
    expect(String(json.error)).toContain('Buchungen')
    expect(equipmentRows()).toHaveLength(1)
  })

  it('verlangt eine Anmeldung', async () => {
    seedEquipment()
    auth.session = null

    const { status } = await readJson(
      await deleteEquipment(jsonRequest('DELETE'), ctx(EQUIPMENT_ID)),
    )

    expect(status).toBe(401)
    expect(equipmentRows()).toHaveLength(1)
  })
})
