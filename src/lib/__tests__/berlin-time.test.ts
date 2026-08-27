// @vitest-environment node
/**
 * Berliner Wanduhrzeit -> echter Zeitpunkt.
 *
 * Warum das eigene Tests bekommt: an dieser Umrechnung haengt die
 * Stornofrist. `booking_date`/`start_time` sind DATE und TIME ohne Zeitzone,
 * der Server laeuft in UTC. Wer die beiden naiv zusammensteckt, verschiebt
 * jeden Termin um ein bis zwei Stunden — und ob eine Absage 24 Stunden vorher
 * kam, entscheidet sich genau in diesem Fenster.
 */
import { describe, it, expect } from 'vitest'
import {
  berlinOffsetMinutes,
  berlinWallClockToUtc,
  hoursUntilBooking,
  berlinToday,
} from '@/lib/berlin-time'

describe('berlinOffsetMinutes', () => {
  it('meldet im Winter +60 Minuten (MEZ)', () => {
    expect(berlinOffsetMinutes(Date.UTC(2026, 0, 15, 12, 0, 0))).toBe(60)
  })

  it('meldet im Sommer +120 Minuten (MESZ)', () => {
    expect(berlinOffsetMinutes(Date.UTC(2026, 6, 15, 12, 0, 0))).toBe(120)
  })
})

describe('berlinWallClockToUtc', () => {
  it('rechnet eine Winterzeit korrekt um (14:00 Berlin = 13:00 UTC)', () => {
    const ms = berlinWallClockToUtc('2026-01-15', '14:00')
    expect(new Date(ms).toISOString()).toBe('2026-01-15T13:00:00.000Z')
  })

  it('rechnet eine Sommerzeit korrekt um (14:00 Berlin = 12:00 UTC)', () => {
    const ms = berlinWallClockToUtc('2026-07-15', '14:00')
    expect(new Date(ms).toISOString()).toBe('2026-07-15T12:00:00.000Z')
  })

  it('trifft auch den Tag der Sommerzeit-Umstellung', () => {
    // Umstellung 2026: Sonntag, 29. März, 02:00 -> 03:00 Berliner Zeit.
    // 01:00 gilt noch MEZ (+60), 04:00 schon MESZ (+120). Genau hier scheitert
    // eine Umrechnung, die die Verschiebung nur einmal bestimmt.
    expect(new Date(berlinWallClockToUtc('2026-03-29', '01:00')).toISOString())
      .toBe('2026-03-29T00:00:00.000Z')
    expect(new Date(berlinWallClockToUtc('2026-03-29', '04:00')).toISOString())
      .toBe('2026-03-29T02:00:00.000Z')
  })

  it('nimmt die Sekunden-Schreibweise der Datenbank an ("14:00:00")', () => {
    expect(berlinWallClockToUtc('2026-07-15', '14:00:00'))
      .toBe(berlinWallClockToUtc('2026-07-15', '14:00'))
  })

  it('liefert NaN statt eines geratenen Zeitpunkts bei Unsinn', () => {
    expect(Number.isNaN(berlinWallClockToUtc('', ''))).toBe(true)
    expect(Number.isNaN(berlinWallClockToUtc('15.07.2026', '14:00'))).toBe(true)
    expect(Number.isNaN(berlinWallClockToUtc('2026-07-15', '25:00'))).toBe(true)
  })
})

describe('hoursUntilBooking', () => {
  it('zaehlt die Stunden bis zum Terminbeginn', () => {
    const jetzt = Date.UTC(2026, 6, 15, 10, 0, 0) // 12:00 Berlin
    expect(hoursUntilBooking('2026-07-15', '14:00', jetzt)).toBe(2)
  })

  it('wird negativ, wenn der Termin vorbei ist', () => {
    const jetzt = Date.UTC(2026, 6, 15, 16, 0, 0) // 18:00 Berlin
    expect(hoursUntilBooking('2026-07-15', '14:00', jetzt)).toBe(-4)
  })

  it('rechnet ueber Mitternacht hinweg mit dem richtigen Tag', () => {
    // 23:30 UTC am 14.07. ist in Berlin bereits der 15.07., 01:30.
    const jetzt = Date.UTC(2026, 6, 14, 23, 30, 0)
    expect(hoursUntilBooking('2026-07-15', '09:00', jetzt)).toBe(7.5)
  })
})

describe('berlinToday', () => {
  it('nimmt den Kalendertag des Salons, nicht den von UTC', () => {
    // 22:30 UTC ist in Berlin schon der Folgetag (00:30 MESZ).
    expect(berlinToday(Date.UTC(2026, 6, 14, 22, 30, 0))).toBe('2026-07-15')
    expect(berlinToday(Date.UTC(2026, 6, 14, 12, 0, 0))).toBe('2026-07-14')
  })
})
