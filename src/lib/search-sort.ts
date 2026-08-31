/**
 * Sortierung der Suchergebnisse — als eigene Funktion, damit sie pruefbar ist.
 *
 * Der Vergleich stand bis Track C inline in `SearchClient` und lautete:
 *
 *     if (sortMode === 'nearest' && a.dist !== null && b.dist !== null)
 *       return a.dist - b.dist
 *     return b.avg_rating - a.avg_rating
 *
 * Sobald EIN Eintrag keine Entfernung hat, mischt das zwei Ordnungen: A vor B
 * nach Entfernung, B vor C nach Bewertung, C vor A nach Entfernung. Ein
 * solcher Vergleich ist nicht transitiv — `Array.prototype.sort` darf damit
 * je nach Ausgangsreihenfolge etwas anderes liefern, und ein Salon ohne
 * bekannte Position landete zwischen zwei nahen.
 */

export type SortMode = 'rating' | 'nearest'

export interface SortableSalon {
  avg_rating: number
  dist: number | null
}

/** Vergleich fuer `Array.prototype.sort` — Eintraege ohne Entfernung ans Ende. */
export function compareSalons<T extends SortableSalon>(a: T, b: T, mode: SortMode): number {
  if (mode === 'nearest') {
    if (a.dist !== null && b.dist !== null) {
      if (a.dist !== b.dist) return a.dist - b.dist
      return Number(b.avg_rating) - Number(a.avg_rating)
    }
    if (a.dist !== null) return -1
    if (b.dist !== null) return 1
  }
  return Number(b.avg_rating) - Number(a.avg_rating)
}

/** Kopiert und sortiert — die Eingabeliste bleibt unveraendert. */
export function sortSalons<T extends SortableSalon>(list: T[], mode: SortMode): T[] {
  return [...list].sort((a, b) => compareSalons(a, b, mode))
}
