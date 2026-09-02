// @vitest-environment node
/**
 * P3 — Salon-Onboarding: aus dem Wizard-Entwurf werden echte Zeilen.
 *
 * Der Befund, gegen den diese Datei laeuft, war kein Fehler in einer
 * Funktion, sondern eine FEHLENDE Funktion: die drei Onboarding-Wizards
 * legten ihren Entwurf im `localStorage` ab und leiteten weiter. Niemand
 * las ihn je wieder. Ein Anbieter, der /anbieter/onboarding vollstaendig
 * durchlief, hatte danach keinen Salon, keine Leistung, kein Inserat und
 * die Rolle `kunde` — und wurde von (provider)/layout.tsx wieder auf /auth
 * geworfen.
 *
 * Genau deshalb konnte KEIN Bestandstest das bemerken: es gab keinen
 * Codepfad, den man haette pruefen koennen.
 *
 * Die Gegenproben hier decken die vier Stellen ab, an denen die neue
 * Uebernahme still das Falsche tun koennte:
 *
 * (1) Rolle: Anhebung nur von `kunde` — niemals ueber `anbieter` hinaus und
 *     niemals nach unten. Ein Admin, der aus Neugier den Wizard durchklickt,
 *     darf nicht als Anbieter herauskommen.
 * (2) Preise: was der Anbieter nicht angegeben hat, wird nicht erfunden.
 *     Eine Leistung ohne Preis ist inaktiv, ein Inserat ohne Tagespreis
 *     bleibt offline (Constraint `rental_equipment_online_needs_price`).
 * (3) Typen: `kabine` und `op` aus dem Wizard gibt es in
 *     `rental_equipment_type_check` NICHT. Ohne Abbildung waere jeder
 *     Vermieter-Abschluss an 23514 gescheitert.
 * (4) Wiederholbarkeit: ein zweiter Durchlauf legt keinen zweiten Salon und
 *     keine doppelten Leistungen an.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDb, postRequest, IDS, type TestSession } from './e2e/_harness/fixtures'
import type { FakeSupabase } from './e2e/_harness/fake-supabase'
import { adresseZerlegen } from '@/modules/onboarding/onboarding.service'
import { __resetRateLimits } from '@/lib/rate-limit'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./e2e/_harness/fake-supabase').FakeSupabase,
  session: null as TestSession | null,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => state.session,
  requireAuth: async () => state.session,
}))

const { POST } = await import('@/app/api/onboarding/salon/route')

/** Ein frischer Nutzer OHNE Salon — der Normalfall nach der Registrierung. */
const NEULING = '12121212-1212-4121-8121-121212121212'

function db(): FakeSupabase {
  return state.db
}

function anbieterEntwurf(overrides: Record<string, unknown> = {}) {
  return {
    quelle: 'anbieter',
    salon: {
      name: 'Salon Neu',
      category: 'friseur',
      address: 'Musterstraße 12, 10115 Berlin',
      phone: '030 1234567',
    },
    leistungen: [
      { name: 'Herrenschnitt', duration_minutes: 30, price_cents: 2500 },
      // Ohne Preis — der Anbieter hat das Feld leer gelassen.
      { name: 'Färben', duration_minutes: 90, price_cents: null },
    ],
    einwilligungen: { agb: true, gewerbeschein_angegeben: true },
    ...overrides,
  }
}

function vermieterEntwurf(overrides: Record<string, unknown> = {}) {
  return {
    quelle: 'vermieter',
    salon: { name: 'Miet-Salon', category: 'raum', address: 'Hauptstraße 3, 20095 Hamburg' },
    vermietung: {
      plaetze: [
        { art: 'stuhl', anzahl: 2 },
        { art: 'kabine', anzahl: 1 },
        { art: 'op', anzahl: 1 },
      ],
      features: ['wifi', 'mirror'],
      beschreibung: 'Heller Raum im Erdgeschoss',
      preise: { day_cents: 4500, hour_cents: 900 },
      available_days: ['Mo', 'Di', 'Mi'],
      available_from: '09:00',
      available_to: '18:00',
    },
    einwilligungen: { agb: true, hygiene: true },
    ...overrides,
  }
}

async function uebernehmen(entwurf: unknown) {
  const res = await POST(postRequest('https://www.chairmatch.de/api/onboarding/salon', entwurf))
  return { res, body: await res.json() }
}

beforeEach(() => {
  // Das Limit der Route (10/Stunde je Nutzer) ist prozessweit — ohne
  // Ruecksetzen faerbt der vorige Testfall auf den naechsten ab.
  __resetRateLimits()
  state.db = createDb()
  state.session = { user: { id: NEULING, email: 'neu@example.de', name: 'Neu', role: 'kunde' } }
  db().rows('profiles').push({ id: NEULING, email: 'neu@example.de', role: 'kunde' })
})

describe('Zugang', () => {
  it('ohne Sitzung: 401, und es entsteht nichts', async () => {
    state.session = null
    const vorher = db().rows('salons').length

    const { res } = await uebernehmen(anbieterEntwurf())

    expect(res.status).toBe(401)
    expect(db().rows('salons').length).toBe(vorher)
  })

  it('schreibt fuer die Sitzung, nicht fuer eine ID aus dem Body', async () => {
    // `strict()` im Schema: ein untergeschobenes Feld ist ein 400, kein
    // stillschweigend ignoriertes Extra.
    const { res } = await uebernehmen({ ...anbieterEntwurf(), userId: IDS.admin })
    expect(res.status).toBe(400)
  })
})

describe('Rolle', () => {
  it('hebt `kunde` auf `anbieter`', async () => {
    const { res, body } = await uebernehmen(anbieterEntwurf())

    expect(res.status).toBe(200)
    expect(body.rolleAngehoben).toBe(true)
    expect(db().rows('profiles').find(p => p.id === NEULING)?.role).toBe('anbieter')
  })

  it('laesst einen Admin Admin', async () => {
    db().rows('profiles').length = 0
    db().rows('profiles').push({ id: NEULING, email: 'chef@example.de', role: 'admin' })

    const { res, body } = await uebernehmen(anbieterEntwurf())

    expect(res.status).toBe(200)
    expect(body.rolleAngehoben).toBe(false)
    expect(db().rows('profiles').find(p => p.id === NEULING)?.role).toBe('admin')
  })

  it('laesst einen bestehenden Anbieter unveraendert', async () => {
    db().rows('profiles').length = 0
    db().rows('profiles').push({ id: NEULING, email: 'a@example.de', role: 'anbieter' })

    const { body } = await uebernehmen(anbieterEntwurf())

    expect(body.rolleAngehoben).toBe(false)
    expect(db().rows('profiles').find(p => p.id === NEULING)?.role).toBe('anbieter')
  })
})

describe('Salon', () => {
  it('entsteht gesperrt — nicht sofort im Markt', async () => {
    const { body } = await uebernehmen(anbieterEntwurf())

    const salon = db().rows('salons').find(s => s.id === body.salonId)!
    expect(salon.is_active).toBe(false)
    expect(salon.is_verified).toBe(false)
    expect(salon.owner_id).toBe(NEULING)
  })

  it('zerlegt die Adresse nur, wenn sie eindeutig ist', async () => {
    const { body } = await uebernehmen(anbieterEntwurf())

    const salon = db().rows('salons').find(s => s.id === body.salonId)!
    expect(salon.street).toBe('Musterstraße')
    expect(salon.house_number).toBe('12')
    expect(salon.postal_code).toBe('10115')
    expect(salon.city).toBe('Berlin')
    expect(body.adresseUnvollstaendig).toBe(false)
  })

  it('raet keine Stadt, wenn die Adresse nicht passt', async () => {
    const entwurf = anbieterEntwurf()
    entwurf.salon.address = 'Beim Bäcker um die Ecke'

    const { body } = await uebernehmen(entwurf)

    const salon = db().rows('salons').find(s => s.id === body.salonId)!
    expect(salon.city).toBeNull()
    expect(salon.street).toBe('Beim Bäcker um die Ecke')
    expect(body.adresseUnvollstaendig).toBe(true)
  })

  it('legt beim zweiten Durchlauf keinen zweiten Salon an', async () => {
    const erst = await uebernehmen(anbieterEntwurf())
    const zweit = await uebernehmen(anbieterEntwurf())

    expect(erst.body.salonAngelegt).toBe(true)
    expect(zweit.body.salonAngelegt).toBe(false)
    expect(zweit.body.salonId).toBe(erst.body.salonId)
    expect(db().rows('salons').filter(s => s.owner_id === NEULING).length).toBe(1)
  })
})

describe('Leistungen — kein erfundener Preis', () => {
  it('uebernimmt den angegebenen Preis und aktiviert nur diese Leistung', async () => {
    const { body } = await uebernehmen(anbieterEntwurf())

    const leistungen = db().rows('services').filter(s => s.salon_id === body.salonId)
    expect(leistungen.length).toBe(2)

    const schnitt = leistungen.find(s => s.name === 'Herrenschnitt')!
    expect(schnitt.price_cents).toBe(2500)
    expect(schnitt.is_active).toBe(true)

    const faerben = leistungen.find(s => s.name === 'Färben')!
    expect(faerben.price_cents).toBe(0)
    // Ohne Preis nicht buchbar — statt „kostenlos" im Katalog zu stehen.
    expect(faerben.is_active).toBe(false)
    expect(body.leistungenOhnePreis).toBe(1)
  })

  it('legt dieselbe Leistung nicht zweimal an', async () => {
    await uebernehmen(anbieterEntwurf())
    const { body } = await uebernehmen(anbieterEntwurf())

    expect(body.leistungenAngelegt).toBe(0)
    expect(db().rows('services').filter(s => s.salon_id === body.salonId).length).toBe(2)
  })

  it('weist einen negativen Preis ab', async () => {
    const entwurf = anbieterEntwurf({
      leistungen: [{ name: 'Trick', duration_minutes: 30, price_cents: -100 }],
    })
    const { res } = await uebernehmen(entwurf)
    expect(res.status).toBe(400)
  })
})

describe('Vermietung', () => {
  it('bildet `kabine` und `op` auf erlaubte Typen ab', async () => {
    const { res, body } = await uebernehmen(vermieterEntwurf())
    expect(res.status).toBe(200)

    const inserate = db().rows('rental_equipment').filter(e => e.salon_id === body.salonId)
    // 2 Stuehle + 1 Kabine + 1 OP-Raum
    expect(inserate.length).toBe(4)

    const erlaubt = new Set(['stuhl', 'liege', 'raum', 'opraum'])
    for (const i of inserate) {
      expect(erlaubt.has(String(i.type))).toBe(true)
    }

    // Der Anzeigename der Kabine geht dabei nicht verloren.
    const kabine = inserate.find(i => i.name === 'Kabine')!
    expect(kabine.type).toBe('raum')
    expect(inserate.find(i => i.name === 'OP-Raum')!.type).toBe('opraum')
  })

  it('nummeriert mehrere gleiche Plaetze durch', async () => {
    const { body } = await uebernehmen(vermieterEntwurf())
    const namen = db()
      .rows('rental_equipment')
      .filter(e => e.salon_id === body.salonId)
      .map(e => e.name)

    expect(namen).toContain('Stuhl 1')
    expect(namen).toContain('Stuhl 2')
  })

  it('uebernimmt Preise, Ausstattung und Zeitfenster unveraendert', async () => {
    const { body } = await uebernehmen(vermieterEntwurf())
    const stuhl = db().rows('rental_equipment').find(e => e.name === 'Stuhl 1')!

    expect(stuhl.price_per_day_cents).toBe(4500)
    expect(stuhl.price_per_hour_cents).toBe(900)
    expect(stuhl.price_per_week_cents).toBeNull()
    expect(stuhl.features).toEqual(['wifi', 'mirror'])
    expect(stuhl.available_days).toEqual(['Mo', 'Di', 'Mi'])
    expect(stuhl.available_from).toBe('09:00')
    expect(stuhl.is_available).toBe(true)
  })

  it('haelt ein Inserat ohne Tagespreis offline', async () => {
    const entwurf = vermieterEntwurf()
    ;(entwurf.vermietung as { preise: Record<string, unknown> }).preise = { hour_cents: 900 }

    const { body } = await uebernehmen(entwurf)
    const inserate = db().rows('rental_equipment').filter(e => e.salon_id === body.salonId)

    expect(inserate.length).toBeGreaterThan(0)
    // `rental_equipment_online_needs_price` verbietet genau diese
    // Kombination — lieber offline anlegen als am Constraint scheitern.
    for (const i of inserate) expect(i.is_available).toBe(false)
    expect(body.inserateOffline).toBe(inserate.length)
  })

  it('weist einen Vermieter-Entwurf ohne Vermietungsangaben ab', async () => {
    const { res } = await uebernehmen({ ...anbieterEntwurf(), quelle: 'vermieter' })
    expect(res.status).toBe(400)
  })

  it('weist eine unbekannte Platzart ab', async () => {
    const entwurf = vermieterEntwurf()
    ;(entwurf.vermietung as { plaetze: unknown }).plaetze = [{ art: 'yacht', anzahl: 1 }]
    const { res } = await uebernehmen(entwurf)
    expect(res.status).toBe(400)
  })
})

describe('Protokoll', () => {
  it('schreibt die Uebernahme mit den Einwilligungen in audit_logs', async () => {
    const { body } = await uebernehmen(anbieterEntwurf())

    const eintrag = db()
      .rows('audit_logs')
      .find(l => l.action === 'onboarding_draft_applied' && l.entity_id === body.salonId)

    expect(eintrag).toBeDefined()
    expect((eintrag!.details as Record<string, unknown>).einwilligungen).toEqual({
      agb: true,
      gewerbeschein_angegeben: true,
    })
  })
})

describe('adresseZerlegen', () => {
  it('erkennt die uebliche deutsche Schreibweise', () => {
    expect(adresseZerlegen('Musterstraße 12a, 10115 Berlin')).toEqual({
      street: 'Musterstraße',
      house_number: '12a',
      postal_code: '10115',
      city: 'Berlin',
      vollstaendig: true,
    })
  })

  it('erkennt auch den Mittelpunkt als Trenner', () => {
    expect(adresseZerlegen('Hauptstr. 3 · 20095 Hamburg').city).toBe('Hamburg')
  })

  it('raet bei allem anderen nichts', () => {
    const zerlegt = adresseZerlegen('Hamburg')
    expect(zerlegt.city).toBeNull()
    expect(zerlegt.postal_code).toBeNull()
    expect(zerlegt.street).toBe('Hamburg')
    expect(zerlegt.vollstaendig).toBe(false)
  })

  it('kommt mit leerer Eingabe klar', () => {
    expect(adresseZerlegen(undefined).vollstaendig).toBe(false)
    expect(adresseZerlegen('   ').street).toBeNull()
  })
})
