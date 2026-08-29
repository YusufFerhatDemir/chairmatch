/**
 * `normalizeOpeningHours` — die drei Formate von `salons.opening_hours`.
 *
 * Der Kopfkommentar des Moduls fuehrt `"09:00 - 18:00"` als „das EINE
 * Format" und nennt daneben die ausgeschriebenen Tagesnamen des alten
 * Dashboards. Die Produktionssonde vom 29.08.2026 hat ein DRITTES gefunden,
 * und zwar das verbreitete: kleingeschriebene Kuerzel mit einem Objekt je Tag.
 *
 * Fuer diese Funktion hiess das, dass sie fuer genau die Salons, die es
 * betrifft, `null` zurueckgab — das Zeiten-Formular des Anbieters zeigte
 * LEERE Felder, obwohl Zeiten gespeichert waren. Wer dort speicherte,
 * ueberschrieb seine echten Zeiten mit dem Inhalt eines leeren Formulars.
 */
import { describe, it, expect } from 'vitest'
import { normalizeOpeningHours } from '@/lib/opening-hours'

describe('Textformat (die dokumentierte Fassung)', () => {
  it('nimmt Kuerzel unveraendert', () => {
    expect(normalizeOpeningHours({ Mo: '09:00 - 18:00', Di: 'Geschlossen' }))
      .toEqual({ Mo: '09:00 - 18:00', Di: 'Geschlossen' })
  })

  it('zieht die ausgeschriebenen Tagesnamen auf Kuerzel', () => {
    expect(normalizeOpeningHours({ Montag: '09:00 - 18:00' })).toEqual({ Mo: '09:00 - 18:00' })
  })

  it('verwirft Unlesbares, statt es zu erfinden', () => {
    expect(normalizeOpeningHours({ Mo: 'nach Vereinbarung' })).toBeNull()
    expect(normalizeOpeningHours({ Irgendwas: '09:00 - 18:00' })).toBeNull()
    expect(normalizeOpeningHours(null)).toBeNull()
    expect(normalizeOpeningHours([])).toBeNull()
  })
})

describe('Live-Format: kleine Kuerzel mit { open, close }', () => {
  const LIVE = {
    mo: { open: '09:00', close: '18:00' },
    do: { open: '09:00', close: '20:00' },
    sa: { open: '09:00', close: '14:00' },
    so: null,
  }

  it('macht daraus die Textform — vorher kam hier null heraus', () => {
    expect(normalizeOpeningHours(LIVE)).toEqual({
      Mo: '09:00 - 18:00',
      Do: '09:00 - 20:00',
      Sa: '09:00 - 14:00',
      So: 'Geschlossen',
    })
  })

  it('deutet `null` als „Geschlossen", nicht als fehlend', () => {
    expect(normalizeOpeningHours({ so: null })).toEqual({ So: 'Geschlossen' })
  })

  it('laesst ein unvollstaendiges Objekt weg', () => {
    expect(normalizeOpeningHours({ mo: { open: '09:00' } })).toBeNull()
    expect(normalizeOpeningHours({ mo: {} })).toBeNull()
  })
})

describe('Gemischte Bestaende', () => {
  it('ein ausdrueckliches Kuerzel gewinnt gegen die anderen Schreibweisen', () => {
    expect(normalizeOpeningHours({
      Mo: '10:00 - 16:00',
      mo: { open: '09:00', close: '18:00' },
      Montag: '08:00 - 12:00',
    })).toEqual({ Mo: '10:00 - 16:00' })
  })

  it('nimmt beide Formate nebeneinander', () => {
    expect(normalizeOpeningHours({
      Mo: '09:00 - 18:00',
      di: { open: '10:00', close: '19:00' },
    })).toEqual({ Mo: '09:00 - 18:00', Di: '10:00 - 19:00' })
  })
})
