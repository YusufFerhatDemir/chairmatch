/**
 * Asset-Whitelist für Stadt × Vertical × Asset-Landingpages
 * (Modul 2 §4.6, Welle-1-Top-Kombinationen aus Recon-22.05).
 *
 * Pattern: /[stadt]/[vertical]/[asset]
 * Beispiel: /frankfurt/friseur/stuhl-mieten
 *
 * Nur die Top-Kombinationen sind statisch indexierbar; alle anderen
 * Kombinationen liefert die Route 404 zurück (kein Soft-404, kein Spam).
 */

export interface AssetData {
  /** URL-Slug, immer auf "-mieten" endend */
  slug: string
  /** Display ohne "mieten" */
  label: string
  /** Plural-Display */
  pluralLabel: string
  /** Welche Vertical-Slugs zu diesem Asset passen */
  applicableVerticals: string[]
}

export const ASSETS: AssetData[] = [
  {
    slug: 'stuhl-mieten',
    label: 'Stuhl',
    pluralLabel: 'Stühle',
    applicableVerticals: ['friseur', 'barbershop'],
  },
  {
    slug: 'kabine-mieten',
    label: 'Kabine',
    pluralLabel: 'Kabinen',
    applicableVerticals: ['kosmetik'],
  },
  {
    slug: 'raum-mieten',
    label: 'Raum',
    pluralLabel: 'Räume',
    applicableVerticals: ['kosmetik', 'lash-brows'],
  },
  {
    slug: 'platz-mieten',
    label: 'Platz',
    pluralLabel: 'Plätze',
    applicableVerticals: ['nagelstudio', 'lash-brows'],
  },
]

export function getAssetBySlug(slug: string): AssetData | undefined {
  return ASSETS.find((a) => a.slug === slug)
}

/**
 * Top-10 priorisierte Welle-1-Kombinationen aus Modul 2 §4.6.
 * Diese Pages werden statisch über generateStaticParams ausgespielt
 * und in die Sitemap aufgenommen (sobald shouldIndex erfüllt ist).
 */
export const PHASE_1B_ASSET_COMBOS: Array<{ stadt: string; vertical: string; asset: string }> = [
  // Aus Modul 2 §4.6 Top 10
  { stadt: 'berlin', vertical: 'friseur', asset: 'stuhl-mieten' },        // #1
  { stadt: 'koeln', vertical: 'friseur', asset: 'stuhl-mieten' },         // #2 (Yusufs lokales Netz)
  { stadt: 'frankfurt', vertical: 'friseur', asset: 'stuhl-mieten' },     // #3 (Yusufs lokales Netz)
  { stadt: 'berlin', vertical: 'kosmetik', asset: 'raum-mieten' },        // #4
  { stadt: 'muenchen', vertical: 'kosmetik', asset: 'raum-mieten' },      // #5
  { stadt: 'berlin', vertical: 'barbershop', asset: 'stuhl-mieten' },     // #6
  { stadt: 'hamburg', vertical: 'friseur', asset: 'stuhl-mieten' },       // #7
  { stadt: 'muenchen', vertical: 'friseur', asset: 'stuhl-mieten' },      // #8
  { stadt: 'koeln', vertical: 'kosmetik', asset: 'raum-mieten' },         // #9
  // #10 (Frankfurt × OP-Raum) braucht eigene Asset-Type "op-raum-mieten"
  // ohne vertical-Kontext → später als /[stadt]/op-raum-mieten implementieren.
  // Frankfurt × Barbershop als zusätzliches Welle-1-Muster (vom Prompt explizit gefordert):
  { stadt: 'frankfurt', vertical: 'barbershop', asset: 'stuhl-mieten' },
]
