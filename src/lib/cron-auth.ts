import { timingSafeEqual } from 'crypto'

/**
 * Autorisierung der Vercel-Cron-Endpunkte.
 *
 * Die drei Cron-Routen haben den Vergleich jeweils selbst gebaut
 * (`authHeader !== \`Bearer ${cronSecret}\``). Zwei Probleme steckten darin:
 *
 *  1. `!==` auf Strings bricht beim ersten abweichenden Byte ab. Fuer den
 *     Setup-Endpunkt promote-admin wurde daraus 2026-08-24 ein
 *     `timingSafeEqual` — die Cron-Endpunkte blieben zurueck, obwohl der
 *     eine (rental-payouts) echtes Geld an Connect-Accounts ueberweist und
 *     der andere (hard-delete) Konten endgueltig loescht.
 *  2. Fehlt CRON_SECRET, wird der Erwartungswert zum String
 *     "Bearer undefined" — den kann jeder schicken. `publish-reviews` hat
 *     diesen Riegel als einziges dokumentiert; hier gilt er fuer alle.
 *
 * Der Vergleich ist bewusst laengenunabhaengig aufgebaut: unterschiedliche
 * Laengen fallen sofort durch, das ist ohnehin nicht geheim.
 */
export function isAuthorizedCron(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  if (!authHeader) return false

  const a = Buffer.from(authHeader)
  const b = Buffer.from(`Bearer ${secret}`)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
