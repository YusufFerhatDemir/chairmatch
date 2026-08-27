// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isPublicPath, decideAuthAccess } from '@/middleware'

/**
 * Welche API-Pfade ohne Session erreichbar sind (Track 7b, Punkt 7).
 *
 * Diese Tests schliessen eine Luecke, die kein Route-Test schliessen kann.
 * Ein Handler ohne eigenen Session-Check liest sich wie eine oeffentliche
 * Route, und ein Test, der ihn direkt aufruft, bestaetigt das auch. Vor der
 * Route steht aber eine Middleware mit Default-Deny fuer `/api/*` — steht
 * der Pfad nicht auf ihrer Liste, sieht der Handler den Request nie.
 *
 * Genau das war der Zustand bis 2026-08-23: `/api/rental-equipment/[id]`
 * (die Detailsicht, die das oeffentliche Anfrageformular laedt) und
 * `/api/uploads/[id]` (die App-URL jedes Salonlogos und Inseratsfotos)
 * antworteten anonymen Besuchern mit 401 — verifiziert gegen die deployte
 * Produktion, nicht nur gegen den Code.
 *
 * Die zweite Haelfte ist genauso wichtig: was geschuetzt bleiben MUSS. Ein
 * zu grosszuegiger Prefix hier oeffnet mehr, als er soll — deshalb steht
 * unten zu jedem freigegebenen Pfad die Gegenprobe.
 */

describe('isPublicPath — oeffentliche API-Pfade', () => {
  it.each([
    ['/api/rental-equipment/44444444-4444-4444-8444-444444444444', 'Detailsicht fuer das Anfrageformular'],
    ['/api/uploads/44444444-4444-4444-8444-444444444444', 'Bild-Auslieferung ueber die stabile App-URL'],
    ['/api/salons/koeln-nord', 'Salon-Detaildaten'],
    ['/api/availability', 'Verfuegbarkeiten'],
    ['/api/auth/session', 'NextAuth'],
    ['/api/products', 'Shop-Katalog'],
    ['/api/public-stats', 'Startseiten-Zahlen'],
  ])('%s ist oeffentlich (%s)', (pathname) => {
    expect(isPublicPath(pathname)).toBe(true)
  })

  it.each([
    ['/api/rental-equipment', 'Vermieter-Bestand (GET) und Anlegen (POST)'],
    ['/api/uploads', 'eigene Dateien auflisten (GET) und hochladen (POST)'],
    ['/api/rental-requests', 'Miet- und Besichtigungsanfragen'],
    ['/api/rental-requests/44444444-4444-4444-8444-444444444444', 'Statuswechsel einer Anfrage'],
    ['/api/notifications', 'In-App-Benachrichtigungen'],
    ['/api/rental-bookings', 'Buchungen'],
    ['/api/me/salon', 'eigener Salon'],
    ['/api/me/payout-account', 'Auszahlungskonto'],
    ['/api/admin', 'Admin-Bereich'],
    ['/api/admin/kpi', 'Admin-Kennzahlen'],
    ['/api/messages', 'Direktnachrichten'],
    ['/api/orders', 'Bestellungen'],
    ['/api/account/export', 'Datenexport'],
    ['/api/account/delete', 'Kontoloeschung'],
  ])('%s bleibt geschuetzt (%s)', (pathname) => {
    expect(isPublicPath(pathname)).toBe(false)
  })

  it('oeffnet mit /api/rental-equipment/ nicht die Sammelroute', () => {
    // Der Prefix endet auf einem Slash — genau deshalb faellt die Route ohne
    // Slash nicht mit hinein. Ohne diesen Unterschied waere der
    // Vermieter-Bestand oeffentlich lesbar.
    expect(isPublicPath('/api/rental-equipment/abc')).toBe(true)
    expect(isPublicPath('/api/rental-equipment')).toBe(false)
  })

  it('oeffnet mit /api/uploads/ nicht den Upload-Endpunkt', () => {
    expect(isPublicPath('/api/uploads/abc')).toBe(true)
    expect(isPublicPath('/api/uploads')).toBe(false)
  })

  it('nimmt CSP-Reports ohne Session an', () => {
    // Der Browser schickt Violation-Reports der Report-Only-Policy ohne
    // Credentials. Faellt der Pfad in den Default-Deny, beantwortet die
    // Middleware jeden Report mit 401 und die Meldestelle bleibt blind.
    expect(isPublicPath('/api/csp-report')).toBe(true)
  })

  it('verwechselt aehnlich benannte Routen nicht mit den freigegebenen', () => {
    // `/api/upload` (Singular) ist eine andere Route und war nie freigegeben.
    expect(isPublicPath('/api/upload')).toBe(false)
    expect(isPublicPath('/api/rental-requests')).toBe(false)
    expect(isPublicPath('/api/rental-bookings')).toBe(false)
  })
})

describe('isPublicPath — Seiten', () => {
  it.each([
    '/',
    '/rentals',
    '/explore',
    '/salon/beispiel-salon',
    '/inserat/44444444-4444-4444-8444-444444444444/anfragen',
    '/magazin/artikel',
    '/berlin',
    '/koeln/friseur',
    '/barbershop-deutschland',
    '/datenschutz',
    '/impressum',
  ])('%s ist ohne Login erreichbar', (pathname) => {
    expect(isPublicPath(pathname)).toBe(true)
  })

  it.each(['/account', '/booking', '/favorites', '/admin', '/owner', '/investor', '/provider'])(
    '%s ist kein oeffentlicher Pfad',
    (pathname) => {
      expect(isPublicPath(pathname)).toBe(false)
    },
  )

  it('haelt das Postfach hinter dem Login', () => {
    // `/nachrichten` stand bis 2026-08-27 in `publicPrefixes` — richtig,
    // solange die Seite fest verdrahtete Beispiel-Chats zeigte. Seit sie am
    // echten Postfach haengt, ist sie ein privater Bereich.
    expect(isPublicPath('/nachrichten')).toBe(false)
    expect(isPublicPath('/nachrichten/44444444-4444-4444-8444-444444444444')).toBe(false)
  })
})

describe('decideAuthAccess — Postfach', () => {
  it('schickt anonyme Besucher zum Login statt sie durchzulassen', () => {
    // Fuer Seiten-Pfade gibt es keinen Default-Deny: was nicht in
    // `authRequiredPaths` steht, kommt ohne Session durch. Nicht oeffentlich
    // zu sein reicht hier also nicht — beides muss zusammenpassen.
    expect(decideAuthAccess({ pathname: '/nachrichten', session: null })).toEqual({
      kind: 'login_redirect',
    })
    expect(
      decideAuthAccess({ pathname: '/nachrichten/abc', session: null }),
    ).toEqual({ kind: 'login_redirect' })
  })

  it('laesst jede Rolle mit Session durch — das Postfach ist rollenfrei', () => {
    expect(decideAuthAccess({ pathname: '/nachrichten', session: { role: 'customer' } })).toEqual({
      kind: 'pass',
    })
  })
})

describe('isPublicPath — die Ketten dieses Auftrags', () => {
  /**
   * Der Weg, den ein nicht eingeloggter Interessent tatsaechlich geht:
   * Marktplatz → Inserat → Anfrageformular. Bricht ein Glied, ist die ganze
   * Kette tot — und zwar unsichtbar, weil die Seite laedt und nur der Fetch
   * dahinter 401 bekommt.
   */
  it('traegt den kompletten oeffentlichen Weg bis zum Anfrageformular', () => {
    const equipmentId = '44444444-4444-4444-8444-444444444444'
    const chain = [
      '/rentals',
      `/inserat/${equipmentId}`,
      `/inserat/${equipmentId}/anfragen`,
      `/api/rental-equipment/${equipmentId}`,
      `/api/uploads/55555555-5555-4555-8555-555555555555`,
    ]

    for (const step of chain) {
      expect(isPublicPath(step), `${step} muss ohne Login erreichbar sein`).toBe(true)
    }
  })

  it('laesst das Absenden der Anfrage weiterhin nur mit Login zu', () => {
    // Lesen ist oeffentlich, Schreiben nicht — sonst koennte jeder anonym
    // Anfragen im Namen niemandes erzeugen.
    expect(isPublicPath('/api/rental-requests')).toBe(false)
  })
})
