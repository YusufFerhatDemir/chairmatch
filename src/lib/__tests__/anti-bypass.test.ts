/**
 * Anti-Bypass-Erkennung im In-App-Chat.
 *
 * Zweck des Moduls ist Marketplace-Schutz: Kontaktdaten sollen den Chat
 * nicht verlassen, bevor gebucht wurde. Der Filter ist bewusst grob — er
 * blockt weich und meldet einen Verdacht, er ist keine Zensur. Die Tests
 * halten deshalb beides fest: was erkannt werden MUSS, und was ausdruecklich
 * durchgehen darf.
 */
import { describe, it, expect } from 'vitest'
import { detectBypass, bypassWarningMessage } from '../anti-bypass'

describe('detectBypass — Kontaktdaten', () => {
  it('erkennt deutsche Telefonnummern', () => {
    for (const text of [
      'Ruf mich an: 030 12345678',
      'Meine Nummer ist +49 170 1234567',
      'einfach 0171-9876543 waehlen',
    ]) {
      expect(detectBypass(text).triggered, text).toBe(true)
    }
  })

  it('erkennt E-Mail-Adressen', () => {
    const r = detectBypass('Schreib mir an sam@example.de')
    expect(r.triggered).toBe(true)
    expect(r.reasons).toContain('Email-Adresse erkannt')
  })

  it('erkennt Social-Media-Umwege', () => {
    for (const text of ['schreib mir auf WhatsApp', 'Insta: sam_styles', 'DM mir gern']) {
      expect(detectBypass(text).triggered, text).toBe(true)
    }
  })

  it('erkennt ausgeschriebene Ziffern als Tarnversuch', () => {
    const r = detectBypass('null eins sieben eins ...')
    expect(r.reasons).toContain('Ausgeschriebene Zahlen erkannt (Tarn-Verdacht)')
  })

  it('erkennt lange Ziffernfolgen auch mit Leerzeichen dazwischen', () => {
    expect(detectBypass('0 1 7 1 9 8 7 6 5 4 3').triggered).toBe(true)
  })
})

describe('detectBypass — externe Links', () => {
  it('erkennt fremde Domains', () => {
    for (const text of ['schau auf https://example.com/x', 'http://konkurrenz.de']) {
      expect(detectBypass(text).reasons, text).toContain('Externer Link erkannt')
    }
  })

  it('laesst eigene Links durch — auch mit Subdomain, Port und Query', () => {
    for (const text of [
      'hier entlang: https://chairmatch.de/inserat/42',
      'https://www.chairmatch.de/rentals',
      'https://app.chairmatch.de:3000/x',
      'https://chairmatch.de?utm=mail',
    ]) {
      expect(detectBypass(text).reasons, text).not.toContain('Externer Link erkannt')
    }
  })

  it('faellt nicht mehr auf eine Lookalike-Domain herein', () => {
    // Regression: `(?!chairmatch\.de|...)` hat nur den Anfang geprueft —
    // chairmatch.de.evil.com galt damit als eigene Domain und lief
    // ungefiltert durch den Chat.
    expect(detectBypass('https://chairmatch.de.evil.com/login').reasons).toContain(
      'Externer Link erkannt',
    )
    expect(detectBypass('https://chairmatch.de-login.example/x').reasons).toContain(
      'Externer Link erkannt',
    )
  })

  it('faellt nicht mehr auf den eigenen Namen im Pfad herein', () => {
    // Regression: `.*\.chairmatch\.de` durfte irgendwo hinten stehen.
    for (const text of [
      'https://example.com/pfad/a.chairmatch.de',
      'https://example.com/?ref=x.chairmatch.de',
    ]) {
      expect(detectBypass(text).reasons, text).toContain('Externer Link erkannt')
    }
  })
})

describe('detectBypass — harmlose Nachrichten', () => {
  it('schlaegt bei normaler Terminabsprache nicht an', () => {
    for (const text of [
      'Hallo, ist der Stuhl im September noch frei?',
      'Passt Dienstag um 10 Uhr bei dir?',
      'Ich bringe eigenes Werkzeug mit, danke!',
      '',
    ]) {
      const r = detectBypass(text)
      expect(r.triggered, `${text} → ${r.reasons.join(', ')}`).toBe(false)
      expect(r.confidence).toBe(0)
    }
  })
})

describe('Ergebnisform', () => {
  it('steigert die Confidence mit der Zahl der Treffer und deckelt bei 1', () => {
    expect(detectBypass('sam@example.de').confidence).toBeCloseTo(0.4)
    const viele = detectBypass('sam@example.de, WhatsApp 0171 9876543, https://example.com')
    expect(viele.reasons.length).toBeGreaterThanOrEqual(3)
    expect(viele.confidence).toBeLessThanOrEqual(1)
    expect(viele.confidence).toBeGreaterThan(0.9)
  })

  it('nennt in der Warnung die konkreten Gruende', () => {
    const r = detectBypass('sam@example.de')
    const msg = bypassWarningMessage(r)
    expect(msg).toContain('Email-Adresse erkannt')
    expect(msg).toContain('ChairMatch')
  })
})
