// @vitest-environment node
/**
 * Track 20: was ChairMatch von sich aus zeigt, verschickt und nachts tut.
 *
 * Die vorigen Tracks haben die Strecken geprueft, auf denen jemand etwas
 * ANFRAGT — Anmeldung, Mandantentrennung, Eingaben, Exporte. Dieser Track
 * nimmt die andere Richtung: die Seiten, die ohne Anmeldung offen stehen,
 * die Vorgaenge, die viele Empfaenger auf einmal treffen, und die Laeufe,
 * denen niemand zusieht.
 *
 * (1) Nicht freigegebener Salon ist oeffentlich sichtbar,
 * (2) Newsletter-Kampagne kann doppelt an die ganze Liste gehen,
 * (3) /api/analytics/meta-capi ist ein offener Briefkasten ins Werbekonto,
 * (4) SMS-Pumping ueber /api/auth/phone/send,
 * (5) publish-reviews meldet Erfolg fuer fehlgeschlagene Aufrufe,
 * (6) Bewertungs-Schnitt: Ausfall wird zu „0 Bewertungen" und ueberschreibt
 *     den Ruf des Salons,
 * (7) /api/public-stats zaehlt Geloeschtes und Gesperrtes mit,
 * (8) rohe DB-Meldung in DELETE /api/upload/[id].
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createDb, sessionFor, ctx, IDS, type TestSession } from './e2e/_harness/fixtures'

const state = vi.hoisted(() => {
  process.env.AUTH_SECRET ??= 'test-secret-nur-fuer-vitest'
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://pwdbjqfpgumyfktbfswg.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-test-key'
  process.env.CRON_SECRET ??= 'cron-secret-nur-fuer-vitest-1234'
  return {
    db: undefined as unknown as import('./e2e/_harness/fake-supabase').FakeSupabase,
    session: null as TestSession | null,
    smsSent: [] as { to: string; body: string }[],
  }
})

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: () => state.db,
}))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => state.session,
  requireRole: async () => state.session,
  invalidateAccountState: () => undefined,
}))
vi.mock('@/lib/error-tracking', () => ({
  logApiError: vi.fn(async () => undefined),
  logError: vi.fn(async () => undefined),
  isSentryConfigured: () => false,
}))
vi.mock('@/lib/sms', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/sms')>()
  return {
    ...original,
    sendSms: vi.fn(async (to: string, body: string) => {
      state.smsSent.push({ to, body })
      return { ok: true }
    }),
  }
})

// ── Imports nach den Mocks ──────────────────────────────────────
import { __resetRateLimits } from '@/lib/rate-limit'
import { salonIsPubliclyVisible } from '@/lib/salon-status'
import { sendCampaign } from '@/lib/newsletter-sender'
import { updateSalonRating, getAggregateRatings } from '@/modules/reviews/review.service'

import { GET as salonGet } from '@/app/api/salons/[id]/route'
import { POST as campaignSend } from '@/app/api/admin/newsletter/campaigns/[id]/send/route'
import { POST as metaCapi } from '@/app/api/analytics/meta-capi/route'
import { POST as phoneSend } from '@/app/api/auth/phone/send/route'
import { GET as publishReviews } from '@/app/api/cron/publish-reviews/route'
import { GET as reviewsAggregate } from '@/app/api/reviews/aggregate/route'
import { GET as publicStats } from '@/app/api/public-stats/route'
import { DELETE as uploadDelete } from '@/app/api/upload/[id]/route'

/** Request im Format, das die Handler erwarten. */
function request(url: string, init?: RequestInit) {
  return new Request(url, init) as unknown as import('next/server').NextRequest
}

function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  return request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

const CRON_HEADERS = { authorization: `Bearer ${process.env.CRON_SECRET}` }

/** Zweiter Salon: gesperrt bzw. nie freigeschaltet. */
const GESPERRTER_SALON = IDS.salonZwei

beforeEach(() => {
  state.db = createDb()
  state.session = null
  state.smsSent = []
  __resetRateLimits()
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

// ═══════════════════════════════════════════════════════════════
// (1) Ein nicht freigegebener Salon hat keine oeffentliche Seite
// ═══════════════════════════════════════════════════════════════

describe('Track 20 — oeffentliche Salon-Sicht kennt is_active', () => {
  function seedZweitenSalon(patch: Record<string, unknown>) {
    state.db.rows('salons').push({
      id: GESPERRTER_SALON,
      name: 'Salon Ohne Freigabe',
      slug: 'salon-ohne-freigabe',
      category: 'friseur',
      city: 'Hamburg',
      street: 'Hafenstrasse',
      phone: '+4940123456',
      owner_id: IDS.owner,
      is_verified: false,
      subscription_tier: 'free',
      ...patch,
    })
  }

  it('gibt einen gesperrten Salon nicht heraus — 404, kein Name, kein Telefon', async () => {
    seedZweitenSalon({ is_active: false })

    const res = await salonGet(
      request(`https://www.chairmatch.de/api/salons/salon-ohne-freigabe`),
      ctx({ id: 'salon-ohne-freigabe' }),
    )
    expect(res.status).toBe(404)

    const text = await res.text()
    expect(text).not.toContain('Salon Ohne Freigabe')
    expect(text).not.toContain('+4940123456')
    expect(text).not.toContain('Hafenstrasse')
  })

  it('gibt den frisch selbst registrierten Salon nicht heraus (Startzustand beider Flags false)', async () => {
    // Genau das schreibt POST /api/register-provider — ein oeffentliches
    // Formular ohne Konto. Bis Track 20 stand damit sofort eine Seite auf
    // chairmatch.de, die nie ein Admin gesehen hat.
    seedZweitenSalon({ is_active: false, is_verified: false })

    const res = await salonGet(
      request(`https://www.chairmatch.de/api/salons/${GESPERRTER_SALON}`),
      ctx({ id: GESPERRTER_SALON }),
    )
    expect(res.status).toBe(404)
  })

  it('laesst den freigeschalteten Salon unveraendert durch', async () => {
    const res = await salonGet(
      request(`https://www.chairmatch.de/api/salons/salon-sonnenschein`),
      ctx({ id: 'salon-sonnenschein' }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('Salon Sonnenschein')
  })

  it('behandelt is_active = null weiter als sichtbar — nur ein ausdrueckliches false sperrt', () => {
    expect(salonIsPubliclyVisible({ is_active: null })).toBe(true)
    expect(salonIsPubliclyVisible({ is_active: undefined })).toBe(true)
    expect(salonIsPubliclyVisible({ is_active: false })).toBe(false)
    expect(salonIsPubliclyVisible(null)).toBe(false)
  })

  it('liefert Leistungen und Mietobjekte nur mit den Spalten der Positivliste', async () => {
    // Eine Spalte, die es heute live nicht gibt — sie steht hier fuer die
    // naechste, die jemand anlegt. Mit select('*') waere sie automatisch
    // oeffentlich gewesen.
    state.db.rows('services')[0].interne_marge_cents = 4200
    state.db.rows('rental_equipment').push({
      id: IDS.equipmentOwnSalon,
      salon_id: IDS.salon,
      type: 'stuhl',
      name: 'Stuhl am Fenster',
      is_available: true,
      price_per_day_cents: 4500,
      interne_notiz: 'Mieter zahlt schlecht',
    })

    const res = await salonGet(
      request(`https://www.chairmatch.de/api/salons/salon-sonnenschein`),
      ctx({ id: 'salon-sonnenschein' }),
    )
    const body = await res.json()

    expect(body.services.length).toBeGreaterThan(0)
    for (const service of body.services) {
      expect(service).not.toHaveProperty('interne_marge_cents')
    }
    for (const equipment of body.rentalEquipment) {
      expect(equipment).not.toHaveProperty('interne_notiz')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// (2) Newsletter: eine Kampagne geht genau einmal raus
// ═══════════════════════════════════════════════════════════════

describe('Track 20 — Newsletter-Kampagne laesst sich nicht doppelt starten', () => {
  const KAMPAGNE = '20202020-2020-4202-8202-202020202020'

  function seedKampagne(status = 'draft') {
    state.db.rows('newsletter_campaigns').push({
      id: KAMPAGNE,
      subject: 'Neue Stuehle in Berlin',
      preview_text: null,
      html_content: '<p>Hallo</p>',
      audience_filter: null,
      status,
    })
    state.db.rows('newsletter_subscribers').push(
      {
        id: '21212121-2121-4212-8212-212121212121',
        email: 'a@example.de',
        name: 'A',
        unsubscribe_token: 'tok-a',
        tags: [],
        status: 'active',
      },
      {
        id: '21212121-2121-4212-8212-212121212122',
        email: 'b@example.de',
        name: 'B',
        unsubscribe_token: 'tok-b',
        tags: [],
        status: 'active',
      },
    )
  }

  it('sendet bei zwei gleichzeitigen Laeufen nur einmal', async () => {
    seedKampagne()

    const [erster, zweiter] = await Promise.all([sendCampaign(KAMPAGNE), sendCampaign(KAMPAGNE)])

    const erfolgreich = [erster, zweiter].filter(r => r.success)
    const abgelehnt = [erster, zweiter].filter(r => !r.success)

    expect(erfolgreich).toHaveLength(1)
    expect(abgelehnt).toHaveLength(1)
    expect(abgelehnt[0].code).toBe('already_running')

    // Und vor allem: jeder Abonnent steht genau einmal in newsletter_sends.
    const sends = state.db.rows('newsletter_sends')
    expect(sends).toHaveLength(2)
    const empfaenger = sends.map(s => s.subscriber_id)
    expect(new Set(empfaenger).size).toBe(2)
  })

  it('lehnt eine bereits versendete Kampagne ab, statt sie erneut zu verschicken', async () => {
    seedKampagne('sent')

    const result = await sendCampaign(KAMPAGNE)

    expect(result.success).toBe(false)
    expect(result.code).toBe('already_running')
    expect(state.db.rows('newsletter_sends')).toHaveLength(0)
  })

  it('antwortet der Route mit 409 statt 200, wenn die Kampagne schon laeuft', async () => {
    seedKampagne('sending')
    state.session = sessionFor('admin')

    const res = await campaignSend(
      postJson(`https://www.chairmatch.de/api/admin/newsletter/campaigns/${KAMPAGNE}/send`, {}),
      ctx({ id: KAMPAGNE }),
    )

    expect(res.status).toBe(409)
  })

  it('nennt bei einem Ausfall der Empfaengerabfrage keine rohe Datenbankmeldung', async () => {
    seedKampagne()
    state.db.failOn('newsletter_subscribers', 'select', {
      code: '42501',
      message: 'permission denied for table newsletter_subscribers',
      details: null,
      hint: null,
    })

    const result = await sendCampaign(KAMPAGNE)

    expect(result.success).toBe(false)
    expect(result.error).not.toContain('permission denied')
    expect(result.error).not.toContain('newsletter_subscribers')
  })
})

// ═══════════════════════════════════════════════════════════════
// (3) meta-capi: kein offener Briefkasten ins Werbekonto
// ═══════════════════════════════════════════════════════════════

describe('Track 20 — /api/analytics/meta-capi nimmt nicht mehr alles an', () => {
  function metaAktiv() {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '1234567890')
    vi.stubEnv('META_CAPI_ACCESS_TOKEN', 'geheimes-meta-token')
  }

  function fetchMock(response: unknown = { events_received: 1 }, ok = true, status = 200) {
    const spy = vi.fn(async () => ({
      ok,
      status,
      json: async () => response,
    }))
    vi.stubGlobal('fetch', spy)
    return spy
  }

  it('lehnt ein unbekanntes Ereignis ab und schickt nichts an Meta', async () => {
    metaAktiv()
    const spy = fetchMock()

    const res = await metaCapi(
      postJson('https://www.chairmatch.de/api/analytics/meta-capi', {
        event_name: 'ErfundenesEreignis',
        custom_data: { value: 99999, currency: 'EUR' },
      }, { 'x-forwarded-for': '203.0.113.10' }),
    )

    expect(res.status).toBe(400)
    expect(spy).not.toHaveBeenCalled()
  })

  it('reicht von custom_data nur die bekannten Felder weiter', async () => {
    metaAktiv()
    const spy = fetchMock()

    await metaCapi(
      postJson('https://www.chairmatch.de/api/analytics/meta-capi', {
        event_name: 'Purchase',
        custom_data: {
          value: 49.9,
          currency: 'EUR',
          // frei erfundene Felder, die nichts im Werbekonto zu suchen haben
          notiz: 'x'.repeat(5000),
          admin_note: 'beliebiger Inhalt',
        },
      }, { 'x-forwarded-for': '203.0.113.11' }),
    )

    expect(spy).toHaveBeenCalledTimes(1)
    const gesendet = JSON.parse((spy.mock.calls[0] as unknown as [string, { body: string }])[1].body)
    const customData = gesendet.data[0].custom_data
    expect(customData).toEqual({ value: 49.9, currency: 'EUR' })
    expect(customData).not.toHaveProperty('notiz')
    expect(customData).not.toHaveProperty('admin_note')
  })

  it('begrenzt die Ereignisse pro IP', async () => {
    metaAktiv()
    fetchMock()

    const ip = '203.0.113.12'
    let letzterStatus = 0
    for (let i = 0; i < 70; i++) {
      const res = await metaCapi(
        postJson(
          'https://www.chairmatch.de/api/analytics/meta-capi',
          { event_name: 'PageView' },
          { 'x-forwarded-for': ip },
        ),
      )
      letzterStatus = res.status
    }
    expect(letzterStatus).toBe(429)
  })

  it('gibt Metas Fehlerobjekt nicht an den anonymen Aufrufer weiter', async () => {
    metaAktiv()
    fetchMock(
      { error: { message: 'Invalid OAuth access token', fbtrace_id: 'AbCdEf', type: 'OAuthException' } },
      false,
      400,
    )

    const res = await metaCapi(
      postJson(
        'https://www.chairmatch.de/api/analytics/meta-capi',
        { event_name: 'Lead' },
        { 'x-forwarded-for': '203.0.113.13' },
      ),
    )

    const text = await res.text()
    expect(text).not.toContain('OAuth')
    expect(text).not.toContain('fbtrace_id')
    expect(text).not.toContain('AbCdEf')
  })
})

// ═══════════════════════════════════════════════════════════════
// (4) SMS-Pumping
// ═══════════════════════════════════════════════════════════════

describe('Track 20 — /api/auth/phone/send bezahlt nicht mehr jede SMS der Welt', () => {
  it('verschickt keine SMS an Nummern ausserhalb DE/AT/CH', async () => {
    const res = await phoneSend(
      postJson(
        'https://www.chairmatch.de/api/auth/phone/send',
        { phone: '+8815551234567' },
        { 'x-forwarded-for': '198.51.100.5' },
      ),
      undefined,
    )

    expect(res.status).toBe(400)
    expect(state.smsSent).toHaveLength(0)
    expect(state.db.rows('phone_verifications')).toHaveLength(0)
  })

  it('deckelt die Anforderungen pro IP, auch wenn jedes Mal eine andere Nummer kommt', async () => {
    const ip = '198.51.100.6'
    const status: number[] = []

    // Das bisherige Limit lag ausschliesslich auf der ZIELNUMMER — mit einer
    // frischen Nummer je Aufruf hat es nie gegriffen.
    for (let i = 0; i < 15; i++) {
      const res = await phoneSend(
        postJson(
          'https://www.chairmatch.de/api/auth/phone/send',
          { phone: `+4917012${String(i).padStart(5, '0')}` },
          { 'x-forwarded-for': ip },
        ),
        undefined,
      )
      status.push(res.status)
    }

    expect(status.filter(s => s === 429).length).toBeGreaterThan(0)
    expect(state.smsSent.length).toBeLessThanOrEqual(10)
  })

  it('laesst eine regulaere deutsche Anforderung weiterhin durch', async () => {
    const res = await phoneSend(
      postJson(
        'https://www.chairmatch.de/api/auth/phone/send',
        { phone: '0170 1234567' },
        { 'x-forwarded-for': '198.51.100.7' },
      ),
      undefined,
    )

    expect(res.status).toBe(200)
    expect(state.smsSent).toHaveLength(1)
    expect(state.smsSent[0].to).toBe('+491701234567')
  })
})

// ═══════════════════════════════════════════════════════════════
// (5) publish-reviews meldet, was wirklich passiert ist
// ═══════════════════════════════════════════════════════════════

describe('Track 20 — /api/cron/publish-reviews zaehlt nur echte Freischaltungen', () => {
  function seedFaelligeBewertung() {
    state.db.rows('reviews').push({
      id: '31313131-3131-4313-8313-313131313131',
      booking_id: IDS.bookingCompleted,
      salon_id: IDS.salon,
      rating: 5,
      review_type: 'tenant_to_provider',
      published: false,
      created_at: '2026-01-01T00:00:00.000Z',
    })
  }

  // Track 22: der Cron ruft `publish_review_pair()` nicht mehr — die Funktion
  // sucht Miet-Buchungen in `bookings` und hat deshalb NIE etwas
  // freigeschaltet, ohne dabei einen Fehler zu melden. Der Cron schaltet
  // jetzt selbst frei. Die Zusage dieses Abschnitts bleibt unveraendert:
  // gezaehlt wird, was wirklich passiert ist. Nur ist „was passiert ist"
  // jetzt ein UPDATE statt eines RPC-Aufrufs — und damit ueberhaupt
  // nachpruefbar.
  it('zaehlt eine fehlgeschlagene Freischaltung nicht als veroeffentlicht', async () => {
    seedFaelligeBewertung()
    state.db.failOn('reviews', 'update', {
      code: '42501',
      message: 'permission denied for table reviews',
      details: null,
      hint: null,
    })

    const res = await publishReviews(
      request('https://www.chairmatch.de/api/cron/publish-reviews', { headers: CRON_HEADERS }),
    )
    const body = await res.json()

    expect(res.status).toBe(503)
    expect(body.published).toBe(0)
    expect(body.ok).toBe(false)
    expect(JSON.stringify(body)).not.toContain('permission denied')
  })

  it('zaehlt eine echte Freischaltung als veroeffentlicht', async () => {
    seedFaelligeBewertung()

    const res = await publishReviews(
      request('https://www.chairmatch.de/api/cron/publish-reviews', { headers: CRON_HEADERS }),
    )
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.published).toBe(1)
    expect(body.failed).toBe(0)
    // Die Zeile ist wirklich sichtbar — das konnte der Test vorher nicht
    // pruefen, weil der RPC-Nachbau nichts geschrieben hat.
    expect(state.db.rows('reviews')[0].published).toBe(true)
  })

  it('unterscheidet einen Ausfall der Abfrage von „nichts zu tun"', async () => {
    state.db.failOn('reviews', 'select', {
      code: '42501',
      message: 'permission denied for table reviews',
      details: null,
      hint: null,
    })

    const res = await publishReviews(
      request('https://www.chairmatch.de/api/cron/publish-reviews', { headers: CRON_HEADERS }),
    )

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(JSON.stringify(body)).not.toContain('permission denied')
  })

  it('bleibt ohne gueltiges Cron-Secret verschlossen', async () => {
    const res = await publishReviews(
      request('https://www.chairmatch.de/api/cron/publish-reviews', {
        headers: { authorization: 'Bearer falsch' },
      }),
    )
    expect(res.status).toBe(401)
  })
})

// ═══════════════════════════════════════════════════════════════
// (6) Der Ruf eines Salons wird nicht von einem Ausfall geloescht
// ═══════════════════════════════════════════════════════════════

describe('Track 20 — Bewertungs-Schnitt erfindet keine Null', () => {
  it('weist eine Nicht-UUID als Eingabefehler zurueck, statt „0 Bewertungen" zu melden', async () => {
    const res = await reviewsAggregate(
      request('https://www.chairmatch.de/api/reviews/aggregate?salonId=nicht-mal-eine-uuid'),
    )
    expect(res.status).toBe(400)
  })

  it('antwortet bei einem Lesefehler mit 503 statt mit einem Schnitt von 0', async () => {
    state.db.failOn('reviews', 'select', {
      code: '42501',
      message: 'permission denied for table reviews',
      details: null,
      hint: null,
    })

    const res = await reviewsAggregate(
      request(`https://www.chairmatch.de/api/reviews/aggregate?salonId=${IDS.salon}`),
    )

    expect(res.status).toBe(503)
    const text = await res.text()
    expect(text).not.toContain('avgRating')
    expect(text).not.toContain('permission denied')
  })

  it('ueberschreibt avg_rating und review_count bei einem Lesefehler NICHT mit 0', async () => {
    const salon = state.db.row('salons', IDS.salon)!
    expect(salon.avg_rating).toBe(4.6)

    state.db.failOn('reviews', 'select', {
      code: '42501',
      message: 'permission denied for table reviews',
      details: null,
      hint: null,
    })

    const ok = await updateSalonRating(IDS.salon)

    expect(ok).toBe(false)
    expect(state.db.row('salons', IDS.salon)!.avg_rating).toBe(4.6)
    expect(state.db.row('salons', IDS.salon)!.review_count).toBe(31)
  })

  it('rechnet den Schnitt im Normalfall weiterhin aus und schreibt ihn', async () => {
    state.db.rows('reviews').push(
      {
        id: '32323232-3232-4323-8323-323232323231',
        salon_id: IDS.salon,
        customer_id: IDS.customer,
        rating: 4,
        review_type: 'customer_to_salon',
        published: true,
      },
      {
        id: '32323232-3232-4323-8323-323232323232',
        salon_id: IDS.salon,
        customer_id: IDS.otherCustomer,
        rating: 2,
        review_type: 'customer_to_salon',
        published: true,
      },
    )

    const aggregat = await getAggregateRatings(IDS.salon)
    expect(aggregat).not.toBeNull()
    expect(aggregat!.reviewCount).toBe(2)
    expect(aggregat!.avgRating).toBe(3)

    const ok = await updateSalonRating(IDS.salon)
    expect(ok).toBe(true)
    expect(state.db.row('salons', IDS.salon)!.review_count).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════
// (7) /api/public-stats zaehlt, was es behauptet
// ═══════════════════════════════════════════════════════════════

describe('Track 20 — oeffentliche Kennzahlen zaehlen nur Sichtbares', () => {
  it('laesst geloeschte Konten und gesperrte Salons aus den Zahlen heraus', async () => {
    state.db.rows('profiles').push({
      id: '41414141-4141-4141-8141-414141414141',
      email: null,
      full_name: 'Gelöscht',
      role: 'kunde',
      is_active: false,
      deleted_at: '2026-08-01T00:00:00.000Z',
    })
    state.db.rows('salons').push({
      id: GESPERRTER_SALON,
      name: 'Salon Ohne Freigabe',
      slug: 'salon-ohne-freigabe',
      city: 'Flensburg',
      category: 'barber',
      owner_id: IDS.owner,
      is_active: false,
    })

    const vorher = state.db.rows('profiles').filter(p => !p.deleted_at).length

    const res = await publicStats()
    const body = await res.json()

    expect(body.users).toBe(vorher)
    expect(body.salons).toBe(1)
  })

  it('nennt keine Stadt und keine Kategorie eines nicht freigegebenen Salons', async () => {
    state.db.rows('salons').push({
      id: GESPERRTER_SALON,
      name: 'Salon Ohne Freigabe',
      slug: 'salon-ohne-freigabe',
      city: 'Flensburg',
      category: 'barber',
      owner_id: IDS.owner,
      is_active: false,
    })

    const res = await publicStats()
    const body = await res.json()

    expect(body.cityList).not.toContain('Flensburg')
    expect(body.categories).not.toHaveProperty('barber')
    expect(body.cityList).toContain('Berlin')
  })
})

// ═══════════════════════════════════════════════════════════════
// (8) Rohe Datenbankmeldung im Bild-Loeschen
// ═══════════════════════════════════════════════════════════════

describe('Track 20 — DELETE /api/upload/[id] nennt keine Tabellennamen', () => {
  const BILD = '51515151-5151-4151-8151-515151515151'

  it('gibt bei einem Loeschfehler keine PostgREST-Meldung heraus', async () => {
    state.session = sessionFor('owner')
    state.db.rows('salon_images').push({
      id: BILD,
      salon_id: IDS.salon,
      storage_path: `${IDS.salon}/logo/bild.jpg`,
      bucket: 'salon-images',
    })
    state.db.failOn('salon_images', 'delete', {
      code: '42501',
      message: 'new row violates row-level security policy for table "salon_images"',
      details: null,
      hint: null,
    })

    const res = await uploadDelete(
      request(`https://www.chairmatch.de/api/upload/${BILD}`, { method: 'DELETE' }),
      ctx({ id: BILD }),
    )

    expect(res.status).toBe(500)
    const text = await res.text()
    expect(text).not.toContain('row-level security')
    expect(text).not.toContain('salon_images')
  })
})
