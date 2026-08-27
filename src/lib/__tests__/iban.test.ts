/**
 * IBAN-Pruefung fuer die Auszahlungsdaten.
 *
 * Faengt Tippfehler ab, bevor eine Auszahlung an ein falsches Konto geht.
 * Die verwendeten IBANs sind die offiziellen Beispiel-IBANs der jeweiligen
 * Zentralbanken bzw. der ISO-13616-Testdaten — keine echten Konten.
 */
import { describe, it, expect } from 'vitest'
import { normalizeIban, isValidIban, ibanLast4, maskIban } from '../iban'

describe('normalizeIban', () => {
  it('entfernt Leerzeichen und Bindestriche und schreibt gross', () => {
    expect(normalizeIban('de89 3704 0044 0532 0130 00')).toBe('DE89370400440532013000')
    expect(normalizeIban('DE89-3704-0044-0532-0130-00')).toBe('DE89370400440532013000')
  })
})

describe('isValidIban', () => {
  it.each([
    ['DE89370400440532013000', 'Deutschland'],
    ['AT611904300234573201', 'Oesterreich'],
    ['CH9300762011623852957', 'Schweiz'],
    ['NL91ABNA0417164300', 'Niederlande'],
    ['FR1420041010050500013M02606', 'Frankreich'],
    ['GB29NWBK60161331926819', 'Grossbritannien'],
  ])('akzeptiert die Beispiel-IBAN %s (%s)', iban => {
    expect(isValidIban(iban)).toBe(true)
  })

  it('akzeptiert auch die uebliche Schreibweise mit Leerzeichen', () => {
    expect(isValidIban('DE89 3704 0044 0532 0130 00')).toBe(true)
  })

  it('lehnt eine falsche Pruefsumme ab', () => {
    // Eine einzelne vertauschte Ziffer — der haeufigste Tippfehler.
    expect(isValidIban('DE89370400440532013001')).toBe(false)
    expect(isValidIban('DE88370400440532013000')).toBe(false)
  })

  it('lehnt eine falsche Laenge fuer das Land ab', () => {
    expect(isValidIban('DE8937040044053201300')).toBe(false)
    expect(isValidIban('DE893704004405320130000')).toBe(false)
  })

  it('lehnt Muell und Leerwerte ab', () => {
    for (const bad of ['', '   ', 'DE', 'XX00', 'keine-iban', '1234567890', 'DE89-ABC']) {
      expect(isValidIban(bad), bad).toBe(false)
    }
  })
})

describe('Anzeige', () => {
  it('gibt nur die letzten vier Stellen heraus', () => {
    expect(ibanLast4('DE89 3704 0044 0532 0130 00')).toBe('3000')
  })

  it('maskiert fuer die UI', () => {
    expect(maskIban(ibanLast4('DE89370400440532013000'))).toBe('•••• •••• 3000')
  })
})
