/**
 * `formatDistance` — die Beschriftung am Suchergebnis.
 *
 * Der Meter-Zweig lautete `${(km * 10).toFixed(0)}00 m`: Zehntelkilometer,
 * dann zwei Nullen angehaengt. Unter 50 Metern ergibt das "000 m" — eine
 * Entfernungsangabe, die aussieht wie ein Anzeigefehler, weil sie einer ist.
 */
import { describe, it, expect } from 'vitest'
import { formatDistance, haversine } from '@/lib/geo'

describe('formatDistance', () => {
  it('gibt unter 1 km Meter aus, auf 10 m gerundet', () => {
    expect(formatDistance(0.3)).toBe('300 m')
    expect(formatDistance(0.85)).toBe('850 m')
    expect(formatDistance(0.123)).toBe('120 m')
  })

  it('schreibt nie "000 m"', () => {
    for (const km of [0, 0.001, 0.004, 0.009, 0.04, 0.049]) {
      expect(formatDistance(km)).not.toContain('000 m')
    }
    expect(formatDistance(0.004)).toBe('nebenan')
  })

  it('gibt bis 10 km eine Nachkommastelle mit Komma aus', () => {
    expect(formatDistance(2.34)).toBe('2,3 km')
    expect(formatDistance(9.99)).toBe('10,0 km')
  })

  it('rundet ab 10 km auf ganze Kilometer', () => {
    expect(formatDistance(12.4)).toBe('12 km')
    expect(formatDistance(123.6)).toBe('124 km')
  })
})

describe('haversine', () => {
  it('misst Berlin–Hamburg auf ~255 km', () => {
    const km = haversine(52.52, 13.405, 53.5511, 9.9937)
    expect(km).toBeGreaterThan(240)
    expect(km).toBeLessThan(270)
  })

  it('ist auf demselben Punkt 0', () => {
    expect(haversine(50.1109, 8.6821, 50.1109, 8.6821)).toBe(0)
  })
})
