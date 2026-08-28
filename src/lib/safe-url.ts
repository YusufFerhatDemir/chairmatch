/**
 * URLs, die von aussen kommen und spaeter irgendwo landen, wo sie jemand
 * anklickt.
 *
 * ChairMatch speichert an mehreren Stellen eine vom Nutzer gelieferte Adresse:
 * `compliance_documents.file_url` und `documents.url` (beide "Link zur Datei"
 * aus dem Anbieter-Formular). Beide wurden bis Track 19 als beliebige
 * Zeichenkette angenommen. Heute rendert kein Bildschirm daraus einen Link —
 * die Admin-Ansicht /admin/dokumente zeigt nur Typ und Status —, aber der
 * Wert liegt bereits in der Datenbank und wartet auf den ersten Bildschirm,
 * der ihn zu einem `<a href>` macht. `javascript:` und `data:` sind dann in
 * genau der Sitzung wirksam, die Dokumente freigibt: der des Admins.
 *
 * Die Pruefung gehoert an die Schreibstelle, nicht an die Lesestelle — eine
 * Lesestelle, die man vergisst, gibt es sonst immer.
 */
export function isSafeHttpUrl(value: unknown, maxLength = 2000): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > maxLength) return false

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return false
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:'
}
