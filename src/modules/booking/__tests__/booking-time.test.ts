// @vitest-environment node
/**
 * Zeit- und Fristlogik der Buchungen — die reinen Funktionen.
 *
 * Alle vier hier geprueften Bausteine sind in Track 6 entstanden, weil an
 * ihrer Stelle vorher nichts stand:
 *
 *   endTimeFor                 — das Terminende wurde ungeprueft gerechnet und
 *                                konnte '25:00:00' ergeben
 *   startsInPast               — Termine in der Vergangenheit waren buchbar
 *   evaluateCancellationWindow — die Stornofrist wurde beim Stornieren nie
 *                                abgefragt
 *   minutesOfDay               — "kaputt" ergab still 0 Minuten, also Mitternacht
 */
import { describe, it, expect } from 'vitest'
import {
  minutesOfDay,
  timeOfMinutes,
  endTimeFor,
  overlaps,
  startsInPast,
  evaluateCancellationWindow,
  DEFAULT_CANCELLATION_HOURS,
} from '../booking.service'

/** 15.07.2026, 12:00 Berliner Zeit. */
const JETZT = Date.UTC(2026, 6, 15, 10, 0, 0)

describe('minutesOfDay', () => {
  it('liest beide Schreibweisen', () => {
    expect(minutesOfDay('09:30')).toBe(570)
    expect(minutesOfDay('09:30:00')).toBe(570)
  })

  it('liefert NaN statt Mitternacht, wenn die Zeit unbrauchbar ist', () => {
    // Der alte Code rechnete `Number('kaputt') * 60` und landete ueber NaN
    // oder 0 stillschweigend bei Mitternacht — eine Bestandsbuchung mit
    // kaputter Zeit galt damit als "belegt 00:00-00:xx", also als frei.
    expect(Number.isNaN(minutesOfDay('kaputt'))).toBe(true)
    expect(Number.isNaN(minutesOfDay(null))).toBe(true)
    expect(Number.isNaN(minutesOfDay('25:00'))).toBe(true)
    expect(Number.isNaN(minutesOfDay('10:99'))).toBe(true)
  })

  it('ist zu timeOfMinutes umkehrbar', () => {
    expect(timeOfMinutes(minutesOfDay('14:45'))).toBe('14:45')
    expect(timeOfMinutes(0)).toBe('00:00')
  })
})

describe('endTimeFor', () => {
  it('addiert die Dauer', () => {
    expect(endTimeFor('14:00', 60)).toBe('15:00')
    expect(endTimeFor('09:15', 45)).toBe('10:00')
  })

  it('erlaubt einen Termin, der exakt um Mitternacht endet', () => {
    expect(endTimeFor('23:00', 60)).toBe('24:00')
  })

  it('verweigert einen Termin, der ueber Mitternacht hinauslaeuft', () => {
    // Vorher entstand hier '25:00:00' — Postgres weist das zurueck, und der
    // Kunde las eine Fehlermeldung, die den Grund verschwieg.
    expect(endTimeFor('23:30', 90)).toBeNull()
  })

  it('verweigert unbrauchbare Eingaben statt zu raten', () => {
    expect(endTimeFor('kaputt', 60)).toBeNull()
    expect(endTimeFor('14:00', 0)).toBeNull()
    expect(endTimeFor('14:00', Number.NaN)).toBeNull()
  })
})

describe('overlaps', () => {
  it('erkennt echte Ueberschneidung', () => {
    expect(overlaps(600, 660, 630, 690)).toBe(true)
  })

  it('laesst buendig aneinander liegende Termine zu', () => {
    // [10:00,11:00) und [11:00,12:00) sind kein Konflikt — sonst blockiert
    // jeder Termin den unmittelbar folgenden Slot.
    expect(overlaps(600, 660, 660, 720)).toBe(false)
  })
})

describe('startsInPast', () => {
  it('laesst einen kuenftigen Termin durch', () => {
    expect(startsInPast('2026-07-15', '14:00', JETZT)).toBe(false)
  })

  it('faengt einen Termin von gestern', () => {
    expect(startsInPast('2026-07-14', '14:00', JETZT)).toBe(true)
  })

  it('faengt einen Termin von heute Vormittag', () => {
    expect(startsInPast('2026-07-15', '09:00', JETZT)).toBe(true)
  })

  it('behandelt unlesbare Angaben als Vergangenheit', () => {
    expect(startsInPast('kaputt', '14:00', JETZT)).toBe(true)
  })
})

describe('evaluateCancellationWindow', () => {
  it('nimmt 24 Stunden, wenn der Salon nichts hinterlegt hat', () => {
    expect(DEFAULT_CANCELLATION_HOURS).toBe(24)
    const w = evaluateCancellationWindow('2026-07-20', '14:00', undefined, JETZT)
    expect(w.cancellationHours).toBe(24)
  })

  it('meldet eine fristgerechte Absage als kostenfrei', () => {
    const w = evaluateCancellationWindow('2026-07-20', '14:00', 24, JETZT)
    expect(w.freeOfCharge).toBe(true)
    expect(w.deadlinePassed).toBe(false)
  })

  it('meldet eine verspaetete Absage als Fristueberschreitung', () => {
    // Termin heute 14:00, jetzt 12:00 -> 2 Stunden vorher.
    const w = evaluateCancellationWindow('2026-07-15', '14:00', 24, JETZT)
    expect(w.freeOfCharge).toBe(false)
    expect(w.deadlinePassed).toBe(true)
    expect(w.hoursBeforeStart).toBe(2)
  })

  it('behandelt exakt die Frist noch als fristgerecht', () => {
    // Termin morgen 12:00 = genau 24 Stunden. Wer die Frist auf die Minute
    // einhaelt, soll nicht zahlen.
    const w = evaluateCancellationWindow('2026-07-16', '12:00', 24, JETZT)
    expect(w.hoursBeforeStart).toBe(24)
    expect(w.freeOfCharge).toBe(true)
  })

  it('nutzt die abweichende Frist des Salons', () => {
    // Derselbe Termin, aber 48 Stunden Frist: jetzt zu spaet.
    const w = evaluateCancellationWindow('2026-07-16', '12:00', 48, JETZT)
    expect(w.cancellationHours).toBe(48)
    expect(w.freeOfCharge).toBe(false)
  })

  it('erlaubt eine Frist von 0 Stunden (jederzeit kostenfrei)', () => {
    const w = evaluateCancellationWindow('2026-07-15', '14:00', 0, JETZT)
    expect(w.cancellationHours).toBe(0)
    expect(w.freeOfCharge).toBe(true)
  })

  it('meldet einen bereits vergangenen Termin als Fristueberschreitung', () => {
    const w = evaluateCancellationWindow('2026-07-14', '14:00', 24, JETZT)
    expect(w.deadlinePassed).toBe(true)
    expect(w.hoursBeforeStart).toBeLessThan(0)
  })

  it('laesst einen Datenfehler nicht zulasten des Kunden gehen', () => {
    // Ohne lesbare Zeit ist NICHT belegbar, dass die Frist gerissen wurde.
    const w = evaluateCancellationWindow(null, null, 24, JETZT)
    expect(w.hoursBeforeStart).toBeNull()
    expect(w.freeOfCharge).toBe(true)
    expect(w.deadlinePassed).toBe(false)
  })

  it('faellt bei unsinniger Frist auf den Standard zurueck', () => {
    const w = evaluateCancellationWindow('2026-07-20', '14:00', Number.NaN, JETZT)
    expect(w.cancellationHours).toBe(24)
  })

  it('nennt keinen Betrag — es gibt keine Spalte dafuer', () => {
    // Absichtliche Festschreibung: `bookings` und `booking_policies` haben
    // live keine Spalte fuer eine Stornogebuehr (Spaltensonde 2026-08-27).
    // Wer hier ein Feld ergaenzt, muss zuerst die Migration liefern.
    const w = evaluateCancellationWindow('2026-07-15', '14:00', 24, JETZT)
    expect(Object.keys(w).sort()).toEqual(
      ['cancellationHours', 'deadlinePassed', 'freeOfCharge', 'hoursBeforeStart'].sort(),
    )
  })
})
