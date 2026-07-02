/**
 * Statische Geokoordinaten der ~80 größten deutschen Städte.
 *
 * Salons haben keine lat/lng in der DB — die Stuhl-Karte geokodiert
 * daher rein über den Städtenamen (kein externer Geocoding-Dienst,
 * keine API-Keys, keine Latenz, DSGVO-unkritisch).
 */

export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Berlin': { lat: 52.5200, lng: 13.4050 },
  'Hamburg': { lat: 53.5511, lng: 9.9937 },
  'München': { lat: 48.1351, lng: 11.5820 },
  'Köln': { lat: 50.9375, lng: 6.9603 },
  'Frankfurt am Main': { lat: 50.1109, lng: 8.6821 },
  'Stuttgart': { lat: 48.7758, lng: 9.1829 },
  'Düsseldorf': { lat: 51.2277, lng: 6.7735 },
  'Leipzig': { lat: 51.3397, lng: 12.3731 },
  'Dortmund': { lat: 51.5136, lng: 7.4653 },
  'Essen': { lat: 51.4556, lng: 7.0116 },
  'Bremen': { lat: 53.0793, lng: 8.8017 },
  'Dresden': { lat: 51.0504, lng: 13.7373 },
  'Hannover': { lat: 52.3759, lng: 9.7320 },
  'Nürnberg': { lat: 49.4521, lng: 11.0767 },
  'Duisburg': { lat: 51.4344, lng: 6.7623 },
  'Bochum': { lat: 51.4818, lng: 7.2162 },
  'Wuppertal': { lat: 51.2562, lng: 7.1508 },
  'Bielefeld': { lat: 52.0302, lng: 8.5325 },
  'Bonn': { lat: 50.7374, lng: 7.0982 },
  'Münster': { lat: 51.9607, lng: 7.6261 },
  'Mannheim': { lat: 49.4875, lng: 8.4660 },
  'Karlsruhe': { lat: 49.0069, lng: 8.4037 },
  'Augsburg': { lat: 48.3705, lng: 10.8978 },
  'Wiesbaden': { lat: 50.0782, lng: 8.2398 },
  'Mönchengladbach': { lat: 51.1805, lng: 6.4428 },
  'Gelsenkirchen': { lat: 51.5177, lng: 7.0857 },
  'Aachen': { lat: 50.7753, lng: 6.0839 },
  'Braunschweig': { lat: 52.2689, lng: 10.5268 },
  'Kiel': { lat: 54.3233, lng: 10.1228 },
  'Chemnitz': { lat: 50.8278, lng: 12.9214 },
  'Halle': { lat: 51.4970, lng: 11.9688 },
  'Magdeburg': { lat: 52.1205, lng: 11.6276 },
  'Freiburg': { lat: 47.9990, lng: 7.8421 },
  'Krefeld': { lat: 51.3388, lng: 6.5853 },
  'Mainz': { lat: 49.9929, lng: 8.2473 },
  'Lübeck': { lat: 53.8655, lng: 10.6866 },
  'Erfurt': { lat: 50.9848, lng: 11.0299 },
  'Oberhausen': { lat: 51.4963, lng: 6.8638 },
  'Rostock': { lat: 54.0924, lng: 12.0991 },
  'Kassel': { lat: 51.3127, lng: 9.4797 },
  'Hagen': { lat: 51.3671, lng: 7.4633 },
  'Potsdam': { lat: 52.3906, lng: 13.0645 },
  'Saarbrücken': { lat: 49.2402, lng: 6.9969 },
  'Hamm': { lat: 51.6739, lng: 7.8160 },
  'Ludwigshafen': { lat: 49.4741, lng: 8.4360 },
  'Mülheim an der Ruhr': { lat: 51.4266, lng: 6.8825 },
  'Oldenburg': { lat: 53.1435, lng: 8.2146 },
  'Osnabrück': { lat: 52.2799, lng: 8.0472 },
  'Leverkusen': { lat: 51.0333, lng: 6.9833 },
  'Heidelberg': { lat: 49.3988, lng: 8.6724 },
  'Darmstadt': { lat: 49.8728, lng: 8.6512 },
  'Solingen': { lat: 51.1652, lng: 7.0671 },
  'Regensburg': { lat: 49.0134, lng: 12.1016 },
  'Herne': { lat: 51.5386, lng: 7.2257 },
  'Paderborn': { lat: 51.7189, lng: 8.7575 },
  'Neuss': { lat: 51.2042, lng: 6.6879 },
  'Ingolstadt': { lat: 48.7665, lng: 11.4258 },
  'Offenbach': { lat: 50.0956, lng: 8.7761 },
  'Fürth': { lat: 49.4771, lng: 10.9887 },
  'Würzburg': { lat: 49.7913, lng: 9.9534 },
  'Ulm': { lat: 48.4011, lng: 9.9876 },
  'Heilbronn': { lat: 49.1427, lng: 9.2109 },
  'Pforzheim': { lat: 48.8922, lng: 8.6946 },
  'Wolfsburg': { lat: 52.4227, lng: 10.7865 },
  'Göttingen': { lat: 51.5413, lng: 9.9158 },
  'Bottrop': { lat: 51.5216, lng: 6.9289 },
  'Reutlingen': { lat: 48.4914, lng: 9.2043 },
  'Koblenz': { lat: 50.3569, lng: 7.5890 },
  'Bremerhaven': { lat: 53.5396, lng: 8.5809 },
  'Recklinghausen': { lat: 51.6140, lng: 7.1979 },
  'Bergisch Gladbach': { lat: 50.9856, lng: 7.1360 },
  'Erlangen': { lat: 49.5980, lng: 11.0038 },
  'Jena': { lat: 50.9272, lng: 11.5862 },
  'Remscheid': { lat: 51.1787, lng: 7.1897 },
  'Trier': { lat: 49.7499, lng: 6.6371 },
  'Salzgitter': { lat: 52.1508, lng: 10.3336 },
  'Moers': { lat: 51.4508, lng: 6.6408 },
  'Siegen': { lat: 50.8748, lng: 8.0243 },
  'Hildesheim': { lat: 52.1548, lng: 9.9580 },
  'Cottbus': { lat: 51.7563, lng: 14.3329 },
}

/** "München" → "muenchen", "Frankfurt  am Main" → "frankfurt am main" */
function normalizeUmlauts(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
}

/** Diakritik komplett entfernen: "münchen" → "munchen" (falls jemand ohne Umlaut-Ersetzung tippt) */
function stripDiacritics(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
}

function isLetter(ch: string | undefined): boolean {
  if (!ch) return false
  return /[a-z]/.test(ch)
}

// Lookup-Indizes einmalig aufbauen (Modul-Scope, billig: ~80 Einträge)
const umlautIndex = new Map<string, { lat: number; lng: number }>()
const strippedIndex = new Map<string, { lat: number; lng: number }>()
for (const [city, coords] of Object.entries(CITY_COORDS)) {
  umlautIndex.set(normalizeUmlauts(city), coords)
  strippedIndex.set(stripDiacritics(city), coords)
}

/**
 * Geokodiert einen Städtenamen (case-, whitespace- und umlaut-insensitiv).
 *
 * - "berlin", " Berlin ", "BERLIN" → Berlin
 * - "Muenchen", "münchen", "munchen" → München
 * - "Frankfurt" → Frankfurt am Main (Präfix-Match)
 * - "Halle (Saale)", "Mülheim" → Halle / Mülheim an der Ruhr (beidseitiges Präfix)
 * - "Berlin, Deutschland" → Berlin (Teil vor dem Komma)
 *
 * @returns Koordinaten oder null, wenn die Stadt nicht in der Tabelle ist.
 */
export function cityToCoords(city: string | null): { lat: number; lng: number } | null {
  if (!city) return null

  // "Berlin, Deutschland" / "Köln, NRW" → nur den Teil vor dem Komma betrachten
  const raw = (city.split(',')[0] ?? city)
  const qUmlaut = normalizeUmlauts(raw)
  const qStripped = stripDiacritics(raw)
  if (!qUmlaut) return null

  // 1) Exakte Treffer
  const exact = umlautIndex.get(qUmlaut) ?? strippedIndex.get(qStripped)
  if (exact) return exact

  // 2) Präfix-Match mit Wortgrenze — in beide Richtungen:
  //    Eingabe "Frankfurt"        → Key "frankfurt am main"
  //    Eingabe "Halle (Saale)"    → Key "halle"
  const tryPrefix = (
    index: Map<string, { lat: number; lng: number }>,
    q: string,
  ): { lat: number; lng: number } | null => {
    if (q.length < 4) return null
    for (const [key, coords] of index) {
      if (key.startsWith(q) && !isLetter(key[q.length])) return coords
      if (q.startsWith(key) && !isLetter(q[key.length])) return coords
    }
    return null
  }

  return tryPrefix(umlautIndex, qUmlaut) ?? tryPrefix(strippedIndex, qStripped)
}
