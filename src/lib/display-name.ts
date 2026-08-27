/**
 * Anzeigename einer bewertenden Person.
 *
 * Der volle Name steht in `profiles.full_name` und gehoert dem Kunden, nicht
 * dem Salon. Angezeigt wird deshalb "Anna K." — genug, um zwei Bewertungen
 * auseinanderzuhalten, zu wenig, um eine Person zu adressieren.
 *
 * Liegt in `lib`, nicht in der Route: Next.js laesst aus einer `route.ts`
 * ausschliesslich HTTP-Methoden und Route-Konfiguration exportieren, jeder
 * weitere Export bricht den Build.
 */
export function kuerzeName(name: string | null | undefined): string {
  const teile = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (teile.length === 0) return 'Gast'
  if (teile.length === 1) return teile[0]
  const nachname = teile[teile.length - 1]
  return `${teile[0]} ${nachname[0].toUpperCase()}.`
}
