import { describe, it, expect } from 'vitest'
import { sortSalons } from '@/lib/search-sort'

const A = { name: 'nah, mittelmaessig', avg_rating: 3.0, dist: 1.2 }
const B = { name: 'weit, top', avg_rating: 5.0, dist: 40 }
const C = { name: 'ohne Position, gut', avg_rating: 4.5, dist: null }

describe('sortSalons', () => {
  it('sortiert nach Bewertung, wenn "Beste Bewertung" gewaehlt ist', () => {
    expect(sortSalons([A, B, C], 'rating').map(s => s.name)).toEqual([
      'weit, top',
      'ohne Position, gut',
      'nah, mittelmaessig',
    ])
  })

  it('sortiert nach Entfernung und stellt Eintraege ohne Position ans Ende', () => {
    expect(sortSalons([B, C, A], 'nearest').map(s => s.name)).toEqual([
      'nah, mittelmaessig',
      'weit, top',
      'ohne Position, gut',
    ])
  })

  it('liefert dasselbe Ergebnis, egal in welcher Reihenfolge die Eingabe kommt', () => {
    const eingaben = [
      [A, B, C],
      [C, B, A],
      [B, A, C],
      [C, A, B],
    ]
    const ergebnisse = eingaben.map(l => sortSalons(l, 'nearest').map(s => s.name).join('|'))
    expect(new Set(ergebnisse).size).toBe(1)
  })

  it('laesst die Eingabeliste unveraendert', () => {
    const liste = [B, C, A]
    sortSalons(liste, 'nearest')
    expect(liste.map(s => s.name)).toEqual(['weit, top', 'ohne Position, gut', 'nah, mittelmaessig'])
  })
})
