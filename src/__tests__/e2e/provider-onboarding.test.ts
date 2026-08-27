// @vitest-environment node
/**
 * E2E: Anbieter-Onboarding — POST /api/register-provider.
 *
 * Der Endpunkt legt in einem Aufruf ein Supabase-Auth-Konto, ein Profil und
 * einen Salon an und verschickt zwei Mails. Bis Track 11 endete das in einem
 * Konto, in das niemand hineinkam:
 *
 *  - Das Passwort war Zufall und wurde nirgendwo hingeschickt. Der Kommentar
 *    im Code behauptete das Gegenteil ("Send welcome email with temp
 *    password"), `sendWelcomeEmail(to, name)` nimmt aber gar keines entgegen.
 *  - Die Angaben aus Schritt 3 des Formulars (vermiete ich? zu welchem
 *    Tagespreis?) wurden entgegengenommen und weggeworfen — die
 *    Zusammenfassung zeigte "Stuhlmiete 45 €/Tag", die Datenbank sah davon
 *    nichts.
 *  - Die IBAN ebenso: validiert, nie verwendet.
 *  - Kein Rate-Limit auf einem oeffentlichen Endpunkt, der Konten anlegt.
 *  - Schlug der Salon-Insert fehl, blieb ein Profil ohne Salon zurueck und
 *    die Adresse war fuer jeden weiteren Versuch verbrannt.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// `hashIp` braucht ein serverseitiges Geheimnis; ohne eines bleibt die Spalte
// bewusst leer (siehe src/lib/ip-hash.ts).
process.env.CONSENT_IP_SALT ??= 'test-salz-nur-fuer-vitest'
import { createDb, postRequest } from './_harness/fixtures'
import type { FakeSupabase } from './_harness/fake-supabase'

type AnyAsyncMock = ReturnType<typeof vi.fn<(...args: never[]) => Promise<unknown>>>

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  signUp: undefined as unknown as AnyAsyncMock,
  resetPassword: undefined as unknown as AnyAsyncMock,
  welcomeMail: undefined as unknown as AnyAsyncMock,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))

// Der Anon-Client wird fuer signUp und die Passwort-Mail benutzt — beides
// sind Supabase-Auth-Aufrufe, kein Datenzugriff.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      signUp: (...a: never[]) => state.signUp(...a),
      resetPasswordForEmail: (...a: never[]) => state.resetPassword(...a),
    },
  }),
}))

vi.mock('@/lib/email', () => ({
  sendProviderWelcomeEmail: (...a: never[]) => state.welcomeMail(...a),
  sendWelcomeEmail: vi.fn(async () => ({ success: true })),
}))

import { POST as registerProvider } from '@/app/api/register-provider/route'

const NEW_USER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

const db = () => state.db as FakeSupabase

/**
 * Gueltige Formulareingabe — jeder Test veraendert nur, was er pruefen will.
 *
 * Adresse und Absender-IP sind pro Aufruf verschieden: das Rate-Limit liegt im
 * Modulspeicher und ueberlebt `beforeEach`, sonst waere ab dem vierten Test
 * jede Antwort ein 429.
 */
let formCounter = 0
function form(over: Record<string, unknown> = {}) {
  formCounter += 1
  return {
    vn: 'Mara',
    nn: 'Neuberg',
    em: `Mara.Neuberg${formCounter}@Example.de`,
    tel: '+49 170 1234567',
    geschaeft: 'Schnittstelle Köln',
    st: 'Domstr. 4',
    plz: '50667',
    city: 'Köln',
    kat: 'Friseur',
    gb: true,
    chair: true,
    cpr: '45',
    agb: true,
    dsgvo: true,
    ...over,
  }
}

/**
 * Jeder Test bekommt eine eigene Absender-IP.
 *
 * Das Rate-Limit liegt im Modulspeicher und ueberlebt `beforeEach` — ohne
 * eigene IP wuerde der sechste Test der Datei am Limit des fuenften scheitern.
 */
let ipCounter = 0
function submit(body: unknown, ip?: string) {
  ipCounter += 1
  return registerProvider(
    postRequest('https://www.chairmatch.de/api/register-provider', body, {
      'x-forwarded-for': ip ?? `203.0.113.${ipCounter}`,
    }),
  )
}

beforeEach(() => {
  state.db = createDb()
  state.signUp = vi.fn(async () => ({ data: { user: { id: NEW_USER } }, error: null }))
  state.resetPassword = vi.fn(async () => ({ data: {}, error: null }))
  state.welcomeMail = vi.fn(async () => ({ success: true, id: 'msg_1' }))
})

describe('Anbieter-Onboarding: das Konto muss benutzbar sein', () => {
  it('loest die Passwort-Mail aus und meldet das zurueck', async () => {
    const res = await submit(form({ em: 'Mara.Neuberg@Example.de' }))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ success: true, passwordEmailSent: true })

    expect(state.resetPassword).toHaveBeenCalledTimes(1)
    // Kleingeschrieben und getrimmt — dieselbe Normalisierung wie beim Login.
    const [address] = state.resetPassword.mock.calls[0] as unknown as [string, unknown]
    expect(address).toBe('mara.neuberg@example.de')
  })

  it('meldet ehrlich, wenn die Passwort-Mail NICHT rausging', async () => {
    // Vorher gab es hier gar keine Mail und trotzdem "E-Mail-Bestätigung
    // folgt". Ein stiller Fehlschlag waere derselbe Zustand.
    state.resetPassword = vi.fn(async () => ({ data: {}, error: { message: 'SMTP weg' } }))

    const res = await submit(form())
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ passwordEmailSent: false })
  })

  it('schickt die Anbieter-Begruessung, nicht die Kunden-Mail', async () => {
    await submit(form({ em: 'Begruessung@Example.de' }))
    expect(state.welcomeMail).toHaveBeenCalledTimes(1)
    const [to, name, business] = state.welcomeMail.mock.calls[0] as unknown as [string, string, string]
    expect(to).toBe('begruessung@example.de')
    expect(name).toBe('Mara Neuberg')
    expect(business).toBe('Schnittstelle Köln')
  })

  it('legt Profil und Salon mit Anbieter-Rolle an', async () => {
    await submit(form({ em: 'Profil.Test@Example.de' }))

    expect(db().row('profiles', NEW_USER)).toMatchObject({
      email: 'profil.test@example.de',
      full_name: 'Mara Neuberg',
      role: 'anbieter',
      phone: '+49 170 1234567',
    })

    const salon = db().rows('salons').find(s => s.owner_id === NEW_USER)
    expect(salon).toMatchObject({
      name: 'Schnittstelle Köln',
      city: 'Köln',
      category: 'friseur',
      // Bis zur Pruefung nicht oeffentlich.
      is_active: false,
      is_verified: false,
    })
    expect(String(salon?.slug)).toMatch(/^schnittstelle-koeln-/)
  })
})

describe('Anbieter-Onboarding: die Angaben kommen an', () => {
  it('speichert Vermietungs-Wunsch und Tagespreis', async () => {
    await submit(form({ chair: true, cpr: '45' }))
    const salon = db().rows('salons').find(s => s.owner_id === NEW_USER)
    expect(salon?.chair_rental).toBe(true)
    expect(salon?.chair_price_day).toBe(45)
  })

  it('akzeptiert Komma als Dezimaltrennzeichen', async () => {
    await submit(form({ cpr: '47,50' }))
    expect(db().rows('salons').find(s => s.owner_id === NEW_USER)?.chair_price_day).toBe(47.5)
  })

  it('erfindet keinen Preis, wenn keiner angegeben ist', async () => {
    await submit(form({ chair: true, cpr: '' }))
    const salon = db().rows('salons').find(s => s.owner_id === NEW_USER)
    expect(salon?.chair_rental).toBe(true)
    expect(salon?.chair_price_day).toBeNull()
  })

  it('traegt keinen Preis ein, wenn gar nicht vermietet wird', async () => {
    await submit(form({ chair: false, cpr: '45' }))
    const salon = db().rows('salons').find(s => s.owner_id === NEW_USER)
    expect(salon?.chair_rental).toBe(false)
    expect(salon?.chair_price_day).toBeNull()
  })

  it('weist einen unplausiblen Tagespreis ab, statt ihn zu veroeffentlichen', async () => {
    // "35000" statt "350" — der klassische Cent/Euro-Vertipper.
    await submit(form({ cpr: '35000' }))
    expect(db().rows('salons').find(s => s.owner_id === NEW_USER)?.chair_price_day).toBeNull()
  })

  /**
   * Dieser Test verlangte bis Track 12 ausdruecklich die IP IM KLARTEXT:
   *
   *     expect(consent?.details).toMatchObject({ …, ip: '198.51.100.7' })
   *
   * Er hat den Befund damit nicht uebersehen, sondern als Sollverhalten
   * festgeschrieben. Das Einwilligungs-Protokoll muss belegen koennen, DASS
   * die Einwilligung aus einer bestimmten Sitzung kam — nicht, aus welcher
   * Wohnung. Fuer das Rate-Limit braucht die Route die Adresse weiterhin, in
   * das Protokoll geht sie nur noch als HMAC (src/lib/ip-hash.ts).
   */
  it('protokolliert die Einwilligungen mit AGB, DSGVO und gehashter IP', async () => {
    await submit(form(), '198.51.100.7')
    const consent = db()
      .rows('audit_logs')
      .find(a => a.action === 'provider_registration_consent')
    expect(consent).toBeTruthy()
    expect(consent?.user_id).toBe(NEW_USER)
    expect(consent?.details).toMatchObject({ agb: true, dsgvo: true })

    const details = consent?.details as Record<string, unknown>
    expect(details.ip).toBeUndefined()
    expect(String(details.ip_hash)).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(consent)).not.toContain('198.51.100.7')
  })

  it('nimmt keine IBAN mehr entgegen — sie wurde nur weggeworfen', async () => {
    const res = await submit({ ...form(), iban: 'DE89370400440532013000' })
    expect(res.status).toBe(200)

    // Weder am Salon noch am Profil noch in payout_accounts darf sie auftauchen.
    const serialized = JSON.stringify([
      db().rows('salons'),
      db().rows('profiles'),
      db().rows('payout_accounts'),
      db().rows('audit_logs'),
    ])
    expect(serialized).not.toContain('DE89370400440532013000')
  })

  it('besteht weiterhin auf beiden Einwilligungen', async () => {
    for (const missing of [{ agb: false }, { dsgvo: false }]) {
      const res = await submit(form(missing))
      expect(res.status).toBe(400)
    }
    expect(state.signUp).not.toHaveBeenCalled()
  })
})

describe('Anbieter-Onboarding: Fehlerfaelle', () => {
  it('laesst kein Profil ohne Salon zurueck', async () => {
    db().failOn('salons', 'insert', {
      code: '23502',
      message: 'null value in column "name"',
      details: null,
      hint: null,
    })

    const res = await submit(form())
    expect(res.status).toBe(500)
    // Ohne dieses Aufraeumen bliebe ein Anbieter-Profil ohne Salon stehen und
    // die Adresse waere fuer jeden weiteren Versuch belegt.
    expect(db().row('profiles', NEW_USER)).toBeUndefined()
  })

  /**
   * Track 13. Bis dahin loeschte der Fehlerzweig NUR das Profil und liess den
   * Auth-Nutzer stehen. Das hinterliess ein anmeldbares Konto OHNE Zeile in
   * `profiles` — genau die Vorbedingung, unter der `authorizeCredentials()`
   * die Rolle aus `user_metadata` genommen hat, und dort steht durch den
   * signUp oben `role: 'anbieter'`, vom Kontoinhaber mit dem oeffentlichen
   * Anon-Key auf alles andere umschreibbar
   * (src/__tests__/e2e/rollen-eskalation.test.ts).
   *
   * Nebeneffekt derselben Luecke: die Registrierung war NICHT wiederholbar —
   * das Auth-Konto blockierte die Adresse weiter.
   */
  it('loescht auch das Auth-Konto — kein anmeldbarer Nutzer ohne Profil', async () => {
    db().failOn('salons', 'insert', {
      code: '23502',
      message: 'null value in column "name"',
      details: null,
      hint: null,
    })

    await submit(form())

    expect(
      db().log.some(c => c.table === 'auth.users' && c.op === 'delete'),
    ).toBe(true)
  })

  it('behaelt das Profil, wenn sich das Auth-Konto nicht loeschen laesst', async () => {
    // Sonst entstuende der verwaiste Nutzer gerade durch das Aufraeumen.
    db().failOn('salons', 'insert', {
      code: '23502',
      message: 'null value in column "name"',
      details: null,
      hint: null,
    })
    db().authDeleteFails = true

    const res = await submit(form())

    expect(res.status).toBe(500)
    expect(db().row('profiles', NEW_USER)).toMatchObject({ id: NEW_USER })
  })

  it('gibt den Supabase-Fehlertext bei belegter Adresse weiter', async () => {
    state.signUp = vi.fn(async () => ({
      data: { user: null },
      error: { message: 'User already registered' },
    }))

    const res = await submit(form())
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: 'User already registered' })
    expect(db().rows('salons').some(s => s.owner_id === NEW_USER)).toBe(false)
  })

  it('begrenzt die Anzahl Registrierungen pro IP', async () => {
    const ip = '198.51.100.99'
    const codes: number[] = []
    for (let i = 0; i < 7; i += 1) {
      codes.push((await submit(form({ em: `limit-neu${i}@example.de` }), ip)).status)
    }
    // Fuenf pro Stunde sind erlaubt, danach 429.
    expect(codes.filter(c => c === 429).length).toBeGreaterThan(0)
    expect(codes.slice(-1)[0]).toBe(429)
  })
})
