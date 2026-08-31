/**
 * Zustandsautomat und Preisrechnung des Buchungs-Flows.
 *
 * `validateTransition()` ist der einzige Riegel dagegen, dass eine Buchung
 * einen unsinnigen Status bekommt — und die Funktion hatte hier schon einmal
 * einen Fehler (Gross-/Kleinschreibung, siehe Kommentar im Modul), der jede
 * Transition scheitern liess. `calculatePrice()` bestimmt, was tatsaechlich
 * abgebucht wird.
 */
import { describe, it, expect } from 'vitest'
import { validateTransition, calculatePrice } from '../booking.service'

describe('validateTransition', () => {
  it('erlaubt die vorgesehenen Wege', () => {
    expect(validateTransition('pending', 'confirmed', 'provider')).toBe(true)
    expect(validateTransition('pending', 'cancelled', 'customer')).toBe(true)
    expect(validateTransition('confirmed', 'completed', 'provider')).toBe(true)
    expect(validateTransition('confirmed', 'cancelled', 'customer')).toBe(true)
    expect(validateTransition('confirmed', 'cancelled', 'provider')).toBe(true)
    // Track C: der Salon darf eine offene Anfrage auch ABLEHNEN. Diese Zeile
    // fehlte — und damit jeder Weg, einen Slot wieder freizugeben, den der
    // Betrieb nicht annehmen kann.
    expect(validateTransition('pending', 'cancelled', 'provider')).toBe(true)
    expect(validateTransition('confirmed', 'no_show', 'provider')).toBe(true)
  })

  it('normalisiert die Schreibweise beider Seiten', () => {
    // Regression: die Actions liefern GROSSSCHREIBUNG, die DB kleinschreibung.
    expect(validateTransition('PENDING', 'CONFIRMED', 'provider')).toBe(true)
    expect(validateTransition('Confirmed', 'No_Show', 'provider')).toBe(true)
  })

  it('haelt den Kunden von Anbieter-Wegen fern', () => {
    expect(validateTransition('pending', 'confirmed', 'customer')).toBe(false)
    expect(validateTransition('confirmed', 'completed', 'customer')).toBe(false)
    expect(validateTransition('confirmed', 'no_show', 'customer')).toBe(false)
  })

  it('kennt keinen Weg fuer den Akteur "system"', () => {
    expect(validateTransition('pending', 'confirmed', 'system')).toBe(false)
  })

  it('laesst Endzustaende Endzustaende sein', () => {
    for (const actor of ['customer', 'provider'] as const) {
      expect(validateTransition('cancelled', 'confirmed', actor)).toBe(false)
      expect(validateTransition('completed', 'cancelled', actor)).toBe(false)
      expect(validateTransition('no_show', 'completed', actor)).toBe(false)
    }
  })

  it('erlaubt keinen Sprung von pending direkt auf completed', () => {
    expect(validateTransition('pending', 'completed', 'provider')).toBe(false)
  })

  it('weist unbekannte Status ab, statt sie durchzulassen', () => {
    expect(validateTransition('pending', 'geloescht', 'provider')).toBe(false)
    expect(validateTransition('erfunden', 'confirmed', 'provider')).toBe(false)
    expect(validateTransition('', '', 'provider')).toBe(false)
  })
})

describe('calculatePrice', () => {
  const BASE = 5000 // Beispielbetrag der Testrechnung, kein ChairMatch-Preis

  it('laesst den Betrag ohne Rabatt unveraendert', () => {
    expect(calculatePrice(BASE, 0, null)).toBe(BASE)
    expect(calculatePrice(BASE, 10, null)).toBe(BASE)
    expect(calculatePrice(BASE, 0, 'percent')).toBe(BASE)
    expect(calculatePrice(BASE, -5, 'percent')).toBe(BASE)
  })

  it('zieht Prozentrabatt ab und rundet auf ganze Cent', () => {
    expect(calculatePrice(BASE, 10, 'percent')).toBe(4500)
    expect(calculatePrice(999, 33, 'percent')).toBe(669) // 669,33 → 669
  })

  it('rechnet Fixrabatt in Euro', () => {
    expect(calculatePrice(BASE, 10, 'fixed')).toBe(4000)
  })

  it('faellt nie unter null — auch nicht bei ueber 100 % Rabatt', () => {
    // Regression: ohne Deckel wurde daraus eine Gutschrift statt einer Zahlung.
    expect(calculatePrice(BASE, 150, 'percent')).toBe(0)
    expect(calculatePrice(BASE, 100, 'percent')).toBe(0)
    expect(calculatePrice(BASE, 999, 'fixed')).toBe(0)
  })
})
