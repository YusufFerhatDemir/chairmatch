/**
 * Stadt-Whitelist für Phase 1 (Modul 2).
 * Jede Stadt hat einen Slug (URL), einen Display-Namen und
 * lokalen Content für SEO-Seiten.
 *
 * Phase 1: 5 Städte (Frankfurt, Berlin, München, Hamburg, Köln)
 * Phase 2: Düsseldorf, Stuttgart, Hannover, Leipzig, Bremen
 * Phase 3: weitere Top-20
 */

export interface CityData {
  slug: string
  name: string                  // Display-Name (mit Umlaut)
  state: string                 // Bundesland
  phase: 1 | 2 | 3
  lat: number                   // Stadtzentrum (WGS84) — für GeoCoordinates & geo-Meta-Tags
  lng: number
  regionCode: string            // ISO 3166-2, z.B. 'DE-NW' — für geo.region
  wikipedia: string             // Entity-URL für sameAs (Disambiguierung für Google & AI-Engines)
  intro: string                 // 150-200 Wörter lokaler Einleitungstext
  neighborhoods: string[]       // Top-Stadtteile für Beauty-Szene
  marketContext: string         // Was macht den Markt hier besonders
  priceRange: { stuhl: string; kabine: string; raum: string }
  faqs: Array<{ question: string; answer: string }>
}

// Enthält inzwischen Phase 1 UND Phase 2 (Düsseldorf, Stuttgart, Hannover, Leipzig, Bremen).
// Export-Name bleibt aus Kompatibilitätsgründen PHASE_1_CITIES — alle Consumer
// (sitemap, [stadt]-Routen, preisvergleich, VerticalHubContent) importieren ihn direkt.
export const PHASE_1_CITIES: CityData[] = [
  {
    slug: 'frankfurt',
    name: 'Frankfurt am Main',
    state: 'Hessen',
    phase: 1,
    lat: 50.1109,
    lng: 8.6821,
    regionCode: 'DE-HE',
    wikipedia: 'https://de.wikipedia.org/wiki/Frankfurt_am_Main',
    intro: 'Frankfurt am Main ist Deutschlands Finanzmetropole — und ein dichter Ballungsraum für Beauty- und Barber-Profis. Im Bahnhofsviertel, Westend und Sachsenhausen entstehen seit Jahren hochwertige Studios, die mit modernen Arbeitsplätzen und einer wohlhabenden Klientel locken. Die Mietpreise für Salonplätze liegen über dem Bundesdurchschnitt, dafür sind die Tarife pro Behandlung höher. Wer in Frankfurt einen Stuhl, eine Kabine oder einen Behandlungsraum mietet, profitiert von einer kaufkräftigen, internationalen Kundschaft und einer hohen Frequenz auch unter der Woche. Besonders nachgefragt sind Plätze in Laufnähe zur S-Bahn und in Vierteln mit hoher Tagesfrequenz wie der Zeil-Umgebung oder dem Westend.',
    neighborhoods: ['Bahnhofsviertel', 'Westend', 'Sachsenhausen', 'Bornheim', 'Nordend', 'Bockenheim'],
    marketContext: 'Internationale Klientel, hohe Kaufkraft, Premium-Tarife. Standorte mit Bürotum-Anbindung besonders gefragt.',
    priceRange: { stuhl: '45-75 €/Tag', kabine: '60-100 €/Tag', raum: '120-250 €/Tag' },
    faqs: [
      {
        question: 'Wie viel kostet ein Friseurstuhl in Frankfurt am Tag?',
        answer: 'In Frankfurt liegen die Tagespreise für einen Friseurstuhl zwischen 45 € (Außenbezirke) und 75 € (zentrale Lagen wie Bahnhofsviertel oder Westend). Wochenpakete sind oft 10–15 % günstiger.',
      },
      {
        question: 'Welche Stadtteile in Frankfurt eignen sich am besten für Barber-Stuhl-Miete?',
        answer: 'Bahnhofsviertel und Westend bieten Top-Kundschaft. Bornheim und Sachsenhausen sind günstiger und haben eine treue Stammkundschaft. Nordend ist Familien-orientiert mit moderaten Preisen.',
      },
      {
        question: 'Brauche ich für Stuhl-Miete in Frankfurt einen Gewerbeschein?',
        answer: 'Ja. Als selbstständiger Friseur oder Barber musst du beim Frankfurter Gewerbeamt angemeldet sein. Die Anmeldung kostet 30–60 € und ist bei vorhandener Meisterprüfung unkompliziert.',
      },
      {
        question: 'Gibt es in Frankfurt OP-Räume zur Tagesmiete?',
        answer: 'Ja, vor allem im Westend und Nordend gibt es lizenzierte OP- und Behandlungsräume für Ärzte und Ästhetik-Praxen. Die Tagesmieten beginnen bei ca. 120 € und gehen bis 250 € für premium-zertifizierte Räume.',
      },
      {
        question: 'Wie schnell bekomme ich einen freien Platz in Frankfurt?',
        answer: 'Die Verfügbarkeit ist saisonal: Q1 und Q3 sind die Hauptwechsel-Zeiten, da viele Selbstständige zu diesen Quartalen anpassen. In der Regel findest du innerhalb von 1–3 Wochen einen passenden Platz.',
      },
    ],
  },
  {
    slug: 'berlin',
    name: 'Berlin',
    state: 'Berlin',
    phase: 1,
    lat: 52.52,
    lng: 13.405,
    regionCode: 'DE-BE',
    wikipedia: 'https://de.wikipedia.org/wiki/Berlin',
    intro: 'Berlin ist Deutschlands kreativster Beauty-Markt. In Mitte, Neukölln, Friedrichshain und Prenzlauer Berg entstehen seit Jahren spezialisierte Studios — von Lash-Atelier bis Barbershop mit Bart-Spezialisierung. Die Hauptstadt hat eine extrem fragmentierte, junge Selbstständigen-Szene: Über 60 % der Beauty-Profis arbeiten freiberuflich oder im Stuhl-Miet-Modell. Die Preise pro Stuhl-Tag liegen unter dem Bundesschnitt, dafür ist die Nachfrage konstant hoch — gerade in trendigen Vierteln. Berlin ist der ideale Markt für Stuhl-Sharing, weil hier Flexibilität wichtiger ist als Festanstellung.',
    neighborhoods: ['Mitte', 'Neukölln', 'Friedrichshain', 'Prenzlauer Berg', 'Kreuzberg', 'Charlottenburg', 'Wedding'],
    marketContext: 'Freelancer-Hauptstadt. Stuhl-Sharing ist hier etabliert. Niedrigere Tagespreise, aber hohe Auslastung.',
    priceRange: { stuhl: '25-50 €/Tag', kabine: '40-70 €/Tag', raum: '90-180 €/Tag' },
    faqs: [
      {
        question: 'Wo finde ich den günstigsten Friseurstuhl in Berlin?',
        answer: 'Wedding, Neukölln-Süd und Lichtenberg bieten Plätze ab 25 €/Tag. Im Zentrum (Mitte, Prenzlauer Berg) zahlst du 40–55 €/Tag, dafür mit deutlich höherer Laufkundschaft.',
      },
      {
        question: 'Welcher Berliner Bezirk ist am besten für Lash-Studios?',
        answer: 'Neukölln und Friedrichshain sind die Lash-Hotspots — junge, beauty-affine Zielgruppe und viele bestehende Studios mit Stuhl-Miet-Angeboten. Mitte ist Premium, dafür höhere Preise.',
      },
      {
        question: 'Wie funktioniert Gewerbeanmeldung in Berlin für Stuhl-Mieter?',
        answer: 'Online-Anmeldung beim Berliner Gewerbeamt (service.berlin.de), 26 €. Bei Beauty-Berufen reicht meist die einfache Anmeldung — ohne Meisterprüfung-Nachweis wenn du als Kosmetiker/Visagist arbeitest. Friseure brauchen Meisterbrief.',
      },
      {
        question: 'Sind in Berlin Verträge zwischen Salon und Stuhl-Mieter üblich?',
        answer: 'Ja, in 90 % der Fälle gibt es einen schriftlichen Mietvertrag mit Laufzeit (oft monatsweise kündbar), Nutzungsbedingungen und Versicherungsklauseln. Mündliche Absprachen kommen vor, sind aber rechtlich problematisch.',
      },
      {
        question: 'Wie verdiene ich als Stuhl-Mieter in Berlin?',
        answer: 'Realistisch: 80–150 € Umsatz pro Arbeitstag nach Abzug der Stuhl-Miete. In Premium-Vierteln (Mitte) bis 250 €/Tag. Spezialisierung (Bart, Color, Lash) erhöht die Spanne signifikant.',
      },
    ],
  },
  {
    slug: 'muenchen',
    name: 'München',
    state: 'Bayern',
    phase: 1,
    lat: 48.1372,
    lng: 11.5756,
    regionCode: 'DE-BY',
    wikipedia: 'https://de.wikipedia.org/wiki/München',
    intro: 'München ist der teuerste Beauty-Markt Deutschlands — und gleichzeitig der profitabelste für Stuhl-Mieter. In der Maxvorstadt, Schwabing und am Englischen Garten dominieren Premium-Salons mit Behandlungspreisen, die weit über dem Bundesdurchschnitt liegen. Die Münchner Kundschaft ist anspruchsvoll: Beauty-Behandlungen werden als Standard, nicht als Luxus wahrgenommen. Stuhl-Miet-Plätze sind rar und gefragt — die Tagespreise sind hoch, dafür sind die Erträge konstant. Wer in München in Premium-Vierteln einen Stuhl mietet, kann mit 200–400 € Brutto-Tagesumsatz rechnen.',
    neighborhoods: ['Maxvorstadt', 'Schwabing', 'Haidhausen', 'Altstadt-Lehel', 'Glockenbachviertel', 'Neuhausen'],
    marketContext: 'Höchste Kaufkraft in DE. Premium-Tarife sind Standard. Stuhl-Verfügbarkeit knapp, Eingangshürde hoch.',
    priceRange: { stuhl: '55-90 €/Tag', kabine: '70-130 €/Tag', raum: '150-350 €/Tag' },
    faqs: [
      {
        question: 'Wie viel verdiene ich als Stuhl-Mieter in München pro Tag?',
        answer: 'In München sind 200–400 € Brutto-Tagesumsatz realistisch — abzüglich Stuhl-Miete (55–90 €) und Produkte bleibt netto 100–250 €. Mit Spezialisierung und Stammkunden mehr.',
      },
      {
        question: 'Gibt es in München genug freie Stuhl-Plätze?',
        answer: 'Die Verfügbarkeit ist enger als in anderen Großstädten — Spitzenlagen wie Maxvorstadt haben oft Wartelisten. Plan 4–8 Wochen Vorlauf für einen Platz in Top-Lage ein.',
      },
      {
        question: 'Welche Münchner Viertel sind ideal für Premium-Behandlungen?',
        answer: 'Maxvorstadt, Altstadt und Bogenhausen ziehen die zahlungskräftigste Kundschaft. Schwabing ist hipper, dafür leicht günstiger. Glockenbach ist trendig mit jüngerer Zielgruppe.',
      },
      {
        question: 'Lohnt sich München für selbstständige Lash-Spezialistinnen?',
        answer: 'Ja — Lash-Behandlungen werden in München oft mit 120–180 € berechnet (Volume, Mega-Volume). Mit 3–4 Kundinnen pro Tag und einem 70 €-Stuhl-Tag rechnet sich das schon ab Monat 2.',
      },
      {
        question: 'Was kostet ein OP-Raum in München zur Tagesmiete?',
        answer: 'OP- und Premium-Behandlungsräume liegen bei 200–400 €/Tag, je nach Ausstattung und Lage. In Bogenhausen und Nymphenburg gibt es lizenzierte Räume für Ästhetik-Ärzte.',
      },
    ],
  },
  {
    slug: 'hamburg',
    name: 'Hamburg',
    state: 'Hamburg',
    phase: 1,
    lat: 53.5511,
    lng: 9.9937,
    regionCode: 'DE-HH',
    wikipedia: 'https://de.wikipedia.org/wiki/Hamburg',
    intro: 'Hamburg ist ein Beauty-Markt mit Nordseeküsten-Charakter: pragmatisch, qualitätsbewusst, weniger trend-getrieben als Berlin. Die Beauty-Szene konzentriert sich auf Sternschanze, Eimsbüttel, Eppendorf und HafenCity. Selbstständige Friseure und Kosmetikerinnen haben in Hamburg einen guten Stand — viele Salons bieten gezielt Stuhl-Vermietung an, um ihre Auslastung zu glätten. Die Mietpreise sind moderat (40–65 €/Tag für einen Friseurstuhl), und die Kundschaft ist treu und qualitäts-orientiert. Eine spannende Mischung aus Kaufkraft (Eppendorf) und kreativem Untergrund (Sternschanze).',
    neighborhoods: ['Sternschanze', 'Eimsbüttel', 'Eppendorf', 'St. Pauli', 'Altona', 'HafenCity', 'Winterhude'],
    marketContext: 'Qualitäts-orientierter Markt. Stuhl-Sharing weit verbreitet. Konstante Auslastung, weniger Schwankung als Berlin.',
    priceRange: { stuhl: '40-65 €/Tag', kabine: '55-85 €/Tag', raum: '110-220 €/Tag' },
    faqs: [
      {
        question: 'Welcher Hamburger Stadtteil ist am besten für Friseur-Stuhl-Miete?',
        answer: 'Sternschanze und Eimsbüttel haben die jüngste Kundschaft mit hoher Beauty-Affinität. Eppendorf ist Premium und ruhig. HafenCity ist neu, Bürokundschaft, gute Preise.',
      },
      {
        question: 'Wie unterscheidet sich der Hamburger Beauty-Markt von Berlin?',
        answer: 'Hamburg ist konservativer in Trends, dafür treuer in der Kundenbindung. Niedrigere Fluktuation, klare Preisniveaus, weniger Verhandlungsspielraum, dafür auch weniger Volatilität.',
      },
      {
        question: 'Sind in Hamburg Wochenpakete für Stuhl-Mieter üblich?',
        answer: 'Ja — viele Salons bieten 3-Tage-, 5-Tage- und Monats-Pakete mit 10–25 % Rabatt gegenüber Tages-Buchung. Besonders in Eimsbüttel und Altona ist das Standard.',
      },
      {
        question: 'Wo melde ich mein Gewerbe als Stuhl-Mieter in Hamburg an?',
        answer: 'Hamburg Service Online (hamburg.de/gewerbeamt). 20 € Gebühr, meist innerhalb 1 Woche bestätigt. Bei Friseur-Berufen Meisterbrief vorlegen, sonst nur einfache Anmeldung.',
      },
      {
        question: 'Kann ich in Hamburg auch nur 1–2 Tage pro Woche einen Stuhl mieten?',
        answer: 'Ja, Teil-Wochen-Miete ist üblich. Tagespreis liegt dann oft 10–15 % über dem Wochenpaket-Tagessatz, da die Auslastung-Garantie für den Vermieter geringer ist.',
      },
    ],
  },
  {
    slug: 'koeln',
    name: 'Köln',
    state: 'Nordrhein-Westfalen',
    phase: 1,
    lat: 50.9375,
    lng: 6.9603,
    regionCode: 'DE-NW',
    wikipedia: 'https://de.wikipedia.org/wiki/Köln',
    intro: 'Köln ist Deutschlands ungezwungenste Beauty-Metropole. Ehrenfeld, Belgisches Viertel, Südstadt und Nippes prägen die Beauty-Szene mit einer Mischung aus etablierten Salons und jungen Konzept-Studios. Die Kölner Kundschaft ist offen für neue Anbieter, moderat in Preiserwartung und kommunikativ — ideale Bedingungen für selbstständige Beauty-Profis, die einen festen Kundenstamm aufbauen wollen. Stuhl-Miet-Modelle sind verbreitet und akzeptiert. Die Tagespreise (35–60 €/Tag für einen Friseurstuhl) sind fair, und die Stadt hat eine starke Lash- und Nail-Szene, die überdurchschnittlich wächst.',
    neighborhoods: ['Ehrenfeld', 'Belgisches Viertel', 'Südstadt', 'Nippes', 'Innenstadt', 'Lindenthal', 'Rodenkirchen'],
    marketContext: 'Offene Kundschaft, faire Preise, starke Lash/Nail-Szene. Ideal für Einstieg in Selbstständigkeit.',
    priceRange: { stuhl: '35-60 €/Tag', kabine: '50-80 €/Tag', raum: '100-200 €/Tag' },
    faqs: [
      {
        question: 'Wo finde ich in Köln Lash-Studios zur Platz-Miete?',
        answer: 'Ehrenfeld und Belgisches Viertel haben die meisten Lash-Studios, die Plätze vermieten. Tagespreise zwischen 40 und 65 €. Auch Nippes hat eine wachsende Szene.',
      },
      {
        question: 'Ist Köln ein guter Markt für selbstständige Barber?',
        answer: 'Ja — Köln hat eine sehr lebhafte Barber-Szene, vor allem im Belgischen Viertel und Ehrenfeld. Stuhl-Miete in Top-Barbershops liegt bei 45–60 €/Tag, der Tagesumsatz oft bei 150–250 €.',
      },
      {
        question: 'Wie ist die Verfügbarkeit von Stuhl-Plätzen in Köln aktuell?',
        answer: 'Köln hat eine gute Verfügbarkeit — meist findest du innerhalb von 1–2 Wochen einen passenden Platz. Premium-Salons in der Innenstadt haben höhere Nachfrage, dort plane 3–4 Wochen Vorlauf.',
      },
      {
        question: 'Welche Beauty-Verticals wachsen in Köln am stärksten?',
        answer: 'Lash & Brows, Microneedling/Kosmetik und Barbershops sind die Top-Wachstums-Kategorien. Klassische Friseur-Salons sind etablierter, aber wachsen langsamer.',
      },
      {
        question: 'Gibt es in Köln auch OP-Räume zur Vermietung?',
        answer: 'Ja, in Lindenthal und Innenstadt gibt es lizenzierte Behandlungsräume für Ärzte und Ästhetik-Spezialisten. Tagesmieten 120–200 €. Hygiene-Zertifikate werden vom Vermieter gestellt.',
      },
    ],
  },
  {
    slug: 'duesseldorf',
    name: 'Düsseldorf',
    state: 'Nordrhein-Westfalen',
    phase: 2,
    lat: 51.2277,
    lng: 6.7735,
    regionCode: 'DE-NW',
    wikipedia: 'https://de.wikipedia.org/wiki/Düsseldorf',
    intro: 'Düsseldorf ist Deutschlands Mode- und Beauty-Schaufenster. Rund um die Königsallee hat sich ein hochpreisiges Beauty-Segment etabliert, das von Mode-Klientel, Kanzleien und Konzernzentralen lebt — Behandlungspreise liegen hier deutlich über dem NRW-Schnitt. Gleichzeitig bietet die Stadt spannende Kontraste: Das Japanviertel rund um die Immermannstraße bringt eine internationale, stil-bewusste Kundschaft, Flingern und Bilk ziehen eine jüngere, kreative Szene an, während Oberkassel und Pempelfort für kaufkräftige Stammkundschaft stehen. Als Messe-Stadt profitiert Düsseldorf zusätzlich von der Beauty Düsseldorf, einer der wichtigsten Fachmessen der Branche — viele Profis nutzen die Messe-Wochen gezielt für Zusatzumsatz und Networking. Stuhl-Miet-Modelle sind in Düsseldorf verbreitet und werden zunehmend von Premium-Salons angeboten, die ihre Flächen effizienter auslasten wollen. Wer hier einen Stuhl, eine Kabine oder einen Raum mietet, arbeitet in einem der lukrativsten Beauty-Märkte Deutschlands — die Einstiegshürde ist höher als in Köln, die Erträge dafür auch. Auch abseits der Luxus-Lagen wächst der Markt: In Flingern-Nord entstehen Concept-Stores und Studios in ehemaligen Ladenlokalen, die Lash-, Brow- und Nail-Angebote mit fairen Miet-Konditionen kombinieren. Dazu kommt die gute Erreichbarkeit — Rheinbahn und Flughafen bringen Kundschaft aus dem gesamten Rheinland in die Stadt, was gerade spezialisierten Anbietern einen großen Einzugsradius verschafft.',
    neighborhoods: ['Stadtmitte/Kö', 'Pempelfort', 'Flingern', 'Oberkassel', 'Bilk', 'Derendorf', 'Japanviertel (Immermannstraße)'],
    marketContext: 'Mode- und Messe-Stadt mit Luxus-Klientel rund um die Kö. Hochpreisiges Segment, internationale Kundschaft, Premium-Tarife durchsetzbar.',
    priceRange: { stuhl: '40-70 €/Tag', kabine: '55-90 €/Tag', raum: '110-220 €/Tag' },
    faqs: [
      {
        question: 'Wie viel kostet ein Friseurstuhl in Düsseldorf am Tag?',
        answer: 'In Düsseldorf liegen die Tagespreise für einen Friseurstuhl zwischen 40 € (Bilk, Derendorf) und 70 € (Kö-Umgebung, Oberkassel). Kabinen kosten 55–90 €/Tag, Behandlungsräume 110–220 €/Tag. Wochenpakete sind oft 10–15 % günstiger.',
      },
      {
        question: 'Welche Düsseldorfer Stadtteile eignen sich am besten für Stuhl-Miete?',
        answer: 'Die Kö-Umgebung und Oberkassel bieten die zahlungskräftigste Kundschaft. Pempelfort ist zentral mit treuer Stammkundschaft, Flingern und Bilk sind günstiger und ziehen eine junge, trend-affine Zielgruppe an. Das Japanviertel ist ideal für spezialisierte Konzepte.',
      },
      {
        question: 'Wie melde ich mein Gewerbe als Stuhl-Mieter in Düsseldorf an?',
        answer: 'Die Gewerbeanmeldung läuft über das Amt für Verbraucherschutz und Gewerbe der Stadt Düsseldorf — online oder vor Ort, Gebühr ca. 26 €. Friseure brauchen den Meisterbrief bzw. eine Ausübungsberechtigung, Kosmetik- und Lash-Berufe meist nur die einfache Anmeldung.',
      },
      {
        question: 'Wie schnell finde ich in Düsseldorf einen freien Platz?',
        answer: 'In Flingern, Bilk und Derendorf findest du meist innerhalb von 1–3 Wochen einen Platz. Premium-Lagen rund um die Kö und in Oberkassel sind knapper — dort plane 3–6 Wochen Vorlauf ein.',
      },
      {
        question: 'Lohnt sich die Beauty Düsseldorf für Stuhl-Mieter?',
        answer: 'Ja — die Messe zieht jedes Frühjahr zehntausende Fach-Besucher an. Viele Selbstständige nutzen die Messe-Wochen für Networking, Fortbildungen und Zusatzbuchungen. Wer in Messe-Nähe (Derendorf, Pempelfort) arbeitet, spürt die erhöhte Nachfrage direkt.',
      },
    ],
  },
  {
    slug: 'stuttgart',
    name: 'Stuttgart',
    state: 'Baden-Württemberg',
    phase: 2,
    lat: 48.7758,
    lng: 9.1829,
    regionCode: 'DE-BW',
    wikipedia: 'https://de.wikipedia.org/wiki/Stuttgart',
    intro: 'Stuttgart ist einer der kaufkräftigsten Beauty-Märkte Deutschlands — die Region lebt von Automobilindustrie, Maschinenbau und einem dichten Netz gut verdienender Angestellter. Für Beauty-Profis heißt das: eine Kundschaft, die Qualität erwartet und bereit ist, dafür zu zahlen. Die Szene konzentriert sich auf die Innenstadt (Mitte), den Stuttgarter Westen mit seiner dichten Wohnbebauung und treuen Stammkundschaft, sowie Bad Cannstatt, Degerloch und Vaihingen als etablierte Stadtteilzentren. Gewerbeflächen sind in Stuttgart knapp und teuer — Leerstand gibt es kaum, was Stuhl-Miet-Modelle für beide Seiten attraktiv macht: Salons lasten ihre Flächen besser aus, Selbstständige sparen sich die schwierige Ladensuche. Ein Pluspunkt ist die Pendler-Kundschaft: Viele Kunden kombinieren Beauty-Termine mit dem Arbeitsweg, wodurch Standorte mit S-Bahn- und Stadtbahn-Anbindung konstant hohe Frequenz haben. Wer in Stuttgart einen Stuhl oder eine Kabine mietet, profitiert von stabilen Preisen und wenig Volatilität. Die Kessellage sorgt zudem für kurze Wege: Wer zentral arbeitet, erreicht Kundschaft aus dem gesamten Talkessel binnen Minuten. Auch die umliegenden Zentren wie Ludwigsburg oder Esslingen speisen Nachfrage in die Landeshauptstadt ein — viele Kundinnen fahren für spezialisierte Behandlungen gezielt nach Stuttgart-Mitte. Für Lash-, Nail- und Kosmetik-Profis ist das eine verlässliche Basis mit planbarem Umsatz.',
    neighborhoods: ['Mitte', 'West', 'Bad Cannstatt', 'Degerloch', 'Vaihingen', 'Süd'],
    marketContext: 'Hohe Kaufkraft, knappe Gewerbeflächen, kaum Leerstand. Pendler-Kundschaft sorgt für konstante Frequenz an ÖPNV-nahen Standorten.',
    priceRange: { stuhl: '45-70 €/Tag', kabine: '55-90 €/Tag', raum: '100-200 €/Tag' },
    faqs: [
      {
        question: 'Was kostet ein Friseurstuhl in Stuttgart pro Tag?',
        answer: 'In Stuttgart liegen die Tagespreise für einen Friseurstuhl zwischen 45 € (Bad Cannstatt, Vaihingen) und 70 € (Mitte, Degerloch). Kabinen kosten 55–90 €/Tag, Behandlungsräume 100–200 €/Tag.',
      },
      {
        question: 'Welche Stuttgarter Stadtteile sind am besten für Stuhl-Miete?',
        answer: 'Mitte bietet die höchste Laufkundschaft, der Westen eine dichte, treue Wohn-Kundschaft. Degerloch ist gehoben und ruhig, Bad Cannstatt und Vaihingen sind günstiger mit solider Stammkundschaft und guter Stadtbahn-Anbindung.',
      },
      {
        question: 'Wo melde ich mein Gewerbe als Stuhl-Mieter in Stuttgart an?',
        answer: 'Beim Amt für öffentliche Ordnung der Stadt Stuttgart — die Anmeldung geht online über service-bw und kostet je nach Umfang rund 40–60 €. Friseure legen den Meisterbrief vor, Kosmetik- und Nail-Berufe brauchen meist nur die einfache Anmeldung.',
      },
      {
        question: 'Wie schnell bekomme ich in Stuttgart einen freien Platz?',
        answer: 'Da Gewerbeflächen in Stuttgart knapp sind, ist auch die Stuhl-Verfügbarkeit begrenzt — in zentralen Lagen plane 3–5 Wochen Vorlauf ein. In den Stadtteilzentren wie Bad Cannstatt oder Vaihingen geht es meist schneller.',
      },
      {
        question: 'Wie wichtig ist die Pendler-Kundschaft für Beauty-Profis in Stuttgart?',
        answer: 'Sehr wichtig — viele Kunden legen Termine auf den Feierabend oder die Mittagspause und wählen Salons entlang ihres Arbeitswegs. Standorte nahe S-Bahn- und Stadtbahn-Haltestellen haben dadurch konstant hohe Auslastung, auch unter der Woche.',
      },
    ],
  },
  {
    slug: 'hannover',
    name: 'Hannover',
    state: 'Niedersachsen',
    phase: 2,
    lat: 52.3759,
    lng: 9.732,
    regionCode: 'DE-NI',
    wikipedia: 'https://de.wikipedia.org/wiki/Hannover',
    intro: 'Hannover ist ein solider, verlässlicher Beauty-Markt — weniger trend-getrieben als Berlin oder Leipzig, dafür mit einer außergewöhnlich treuen Stammkundschaft. Die Szene verteilt sich auf die Innenstadt (Mitte), die bürgerliche List mit ihrer hohen Wohndichte, das kreative Linden mit junger Zielgruppe sowie die Südstadt und Bothfeld als etablierte Wohnviertel. Als Messestadt hat Hannover einen besonderen Rhythmus: Große Messen wie die Hannover Messe bringen regelmäßig internationale Gäste und Zusatzfrequenz in die Stadt, wovon auch Beauty-Betriebe in zentralen Lagen profitieren. Die Preise für Stuhl- und Kabinen-Miete liegen unter denen der Top-5-Metropolen, was den Einstieg in die Selbstständigkeit erleichtert — gleichzeitig sind die Behandlungspreise stabil und die Kundenbindung hoch. Viele Salons in Hannover öffnen sich zunehmend für Stuhl-Miet-Modelle, um ihre Auslastung zu glätten. Wer hier startet, baut sich mit Geduld einen festen Kundenstamm auf, der über Jahre bleibt. Auch abseits der Messen ist die Stadt gut aufgestellt: Universität, Verwaltung und Versicherungen sorgen für breite, konstante Nachfrage über das ganze Jahr. Dazu kommt die überschaubare Konkurrenzdichte — wer sich in Linden oder der List spezialisiert, etwa auf Lashes, Brows oder Barbering, wird schneller sichtbar als in übersättigten Metropol-Märkten.',
    neighborhoods: ['Mitte', 'List', 'Linden', 'Südstadt', 'Bothfeld', 'Oststadt'],
    marketContext: 'Moderater, stabiler Markt mit treuer Stammkundschaft. Messe-Wochen bringen Zusatzfrequenz in zentralen Lagen.',
    priceRange: { stuhl: '30-55 €/Tag', kabine: '40-70 €/Tag', raum: '80-150 €/Tag' },
    faqs: [
      {
        question: 'Wie viel kostet ein Friseurstuhl in Hannover am Tag?',
        answer: 'In Hannover liegen die Tagespreise für einen Friseurstuhl zwischen 30 € (Bothfeld, Randlagen) und 55 € (Mitte, List). Kabinen kosten 40–70 €/Tag, Behandlungsräume 80–150 €/Tag — deutlich günstiger als in den Top-5-Metropolen.',
      },
      {
        question: 'Welche Stadtteile in Hannover eignen sich am besten für Stuhl-Miete?',
        answer: 'Die List ist erste Wahl für treue Wohn-Kundschaft, Linden für eine junge, kreative Zielgruppe. Mitte bietet Laufkundschaft und Messe-Gäste, die Südstadt ist bürgerlich-solide mit moderaten Preisen.',
      },
      {
        question: 'Wie funktioniert die Gewerbeanmeldung in Hannover für Stuhl-Mieter?',
        answer: 'Die Anmeldung läuft über den Fachbereich Öffentliche Ordnung der Landeshauptstadt Hannover, online oder vor Ort — die Gebühr liegt bei rund 30–40 €. Friseure brauchen den Meisterbrief, Kosmetik- und Lash-Berufe meist nur die einfache Anmeldung.',
      },
      {
        question: 'Wie schnell finde ich in Hannover einen freien Platz?',
        answer: 'Die Verfügbarkeit ist gut — meist findest du innerhalb von 1–2 Wochen einen passenden Platz. Nur in der List und in Mitte kann es bei gefragten Salons etwas länger dauern.',
      },
      {
        question: 'Profitieren Beauty-Profis in Hannover von den Messen?',
        answer: 'Ja — während großer Messen wie der Hannover Messe steigt die Nachfrage nach kurzfristigen Terminen in zentralen Lagen spürbar. Wer in Mitte oder der Oststadt arbeitet, kann Messe-Wochen gezielt für Zusatzumsatz nutzen.',
      },
    ],
  },
  {
    slug: 'leipzig',
    name: 'Leipzig',
    state: 'Sachsen',
    phase: 2,
    lat: 51.3397,
    lng: 12.3731,
    regionCode: 'DE-SN',
    wikipedia: 'https://de.wikipedia.org/wiki/Leipzig',
    intro: 'Leipzig ist Deutschlands boomender Kreativ-Standort — nicht umsonst hat die Stadt den Spitznamen "Hypezig". Junge Kreative, Studierende und Gründer ziehen seit Jahren in die Stadt und bringen eine wachsende, beauty-affine Zielgruppe mit. Die Szene konzentriert sich auf Plagwitz mit seinen umgenutzten Industriebauten und Ateliers, die lebendige Südvorstadt entlang der Karli, das alternative Connewitz, das Zentrum und das bürgerliche Gohlis. Für Beauty-Profis ist Leipzig einer der attraktivsten Einstiegs-Märkte Deutschlands: Die Stuhl-Miet-Preise sind niedrig, die Konkurrenz weniger verdichtet als in westdeutschen Metropolen, und die Kundschaft ist offen für neue Konzepte — von Lash-Ateliers über Barbershops bis zu Nail-Studios. Viele junge Selbstständige starten hier ihre erste eigene Existenz im Stuhl-Miet-Modell, weil das Risiko überschaubar bleibt. Der Markt wächst spürbar, und wer früh einen guten Standort in Plagwitz oder der Südvorstadt sichert, baut sich seinen Kundenstamm in einem Markt auf, der noch lange nicht gesättigt ist. Auch die Kostenseite spricht für die Stadt: Lebenshaltung und Gewerbemieten liegen deutlich unter westdeutschem Niveau, sodass sich selbst vorsichtige Kalkulationen schnell tragen. Gleichzeitig ziehen die wachsende Bevölkerung und die steigende Kaufkraft die Behandlungspreise langsam nach oben — gute Voraussetzungen für alle, die jetzt einsteigen und mitwachsen wollen.',
    neighborhoods: ['Plagwitz', 'Südvorstadt', 'Connewitz', 'Zentrum', 'Gohlis', 'Reudnitz'],
    marketContext: 'Boomender Kreativ-Markt mit junger Szene und niedrigen Einstiegspreisen. Wachsende Nachfrage, noch nicht gesättigt — ideal für den Start in die Selbstständigkeit.',
    priceRange: { stuhl: '25-45 €/Tag', kabine: '35-60 €/Tag', raum: '70-140 €/Tag' },
    faqs: [
      {
        question: 'Was kostet ein Friseurstuhl in Leipzig pro Tag?',
        answer: 'Leipzig gehört zu den günstigsten Großstadt-Märkten: Friseurstühle kosten 25–45 €/Tag, Kabinen 35–60 €/Tag und Behandlungsräume 70–140 €/Tag. Im Zentrum zahlst du das obere Ende, in Reudnitz oder Gohlis das untere.',
      },
      {
        question: 'Welche Leipziger Stadtteile sind am besten für Beauty-Selbstständige?',
        answer: 'Plagwitz und die Südvorstadt haben die jüngste, beauty-affinste Kundschaft und die lebendigste Studio-Szene. Connewitz ist alternativ mit treuer Szene-Kundschaft, das Zentrum bietet Laufkundschaft, Gohlis ist bürgerlich mit stabiler Stammkundschaft.',
      },
      {
        question: 'Wie melde ich mein Gewerbe als Stuhl-Mieter in Leipzig an?',
        answer: 'Beim Ordnungsamt der Stadt Leipzig — online oder vor Ort, die Gebühr liegt bei rund 25–30 €. Friseure legen den Meisterbrief vor, Kosmetik-, Nail- und Lash-Berufe brauchen in der Regel nur die einfache Anmeldung.',
      },
      {
        question: 'Wie schnell finde ich in Leipzig einen freien Platz?',
        answer: 'Die Verfügbarkeit ist aktuell gut — meist findest du innerhalb von 1–2 Wochen einen Platz. In Plagwitz und der Südvorstadt steigt die Nachfrage allerdings spürbar, dort lohnt es sich, schnell zu sein.',
      },
      {
        question: 'Lohnt sich der Einstieg in die Selbstständigkeit in Leipzig?',
        answer: 'Ja — die Kombination aus niedrigen Stuhl-Mieten, wachsender Zielgruppe und wenig gesättigtem Markt macht Leipzig zu einem der besten Einstiegs-Märkte. Viele Profis starten hier mit 2–3 Miettagen pro Woche und skalieren mit wachsendem Kundenstamm hoch.',
      },
    ],
  },
  {
    slug: 'bremen',
    name: 'Bremen',
    state: 'Bremen',
    phase: 2,
    lat: 53.0793,
    lng: 8.8017,
    regionCode: 'DE-HB',
    wikipedia: 'https://de.wikipedia.org/wiki/Bremen',
    intro: 'Bremen ist ein bodenständiger, verlässlicher Beauty-Markt mit hanseatischem Charakter: Die Kundschaft ist treu, preisbewusst und legt Wert auf Qualität statt Trends. Die Beauty-Szene konzentriert sich auf die Innenstadt (Mitte), das lebendige Viertel rund um Ostertor und Steintor mit seiner kreativen, jungen Zielgruppe, das gehobene Schwachhausen, das familiäre Findorff und die aufstrebende Neustadt links der Weser. Für selbstständige Beauty-Profis bietet Bremen ein entspanntes Umfeld: Die Stuhl-Miet-Preise liegen deutlich unter denen der Metropolen, der Konkurrenzdruck ist moderat, und viele Salons öffnen sich zunehmend für flexible Miet-Modelle. Auffällig ist die ausgeprägte Work-Life-Balance-Szene — viele Profis arbeiten hier bewusst 3–4 Tage pro Woche und kombinieren Selbstständigkeit mit Familie oder Nebenprojekten, was das Stuhl-Miet-Modell besonders attraktiv macht. Wer in Bremen startet, baut sich mit fairen Preisen und persönlichem Service einen Kundenstamm auf, der über Jahre bleibt. Auch strukturell hat der kompakte Markt Vorteile: Die Wege sind kurz, und Kundschaft aus dem Umland — von Delmenhorst bis Achim — kommt für gute Behandlungen regelmäßig in die Stadt. Die Überseestadt wächst als neues Quartier heran und bringt Büro-Kundschaft mit, die Termine gern in die Mittagspause legt.',
    neighborhoods: ['Mitte', 'Viertel (Ostertor/Steintor)', 'Schwachhausen', 'Findorff', 'Neustadt', 'Überseestadt'],
    marketContext: 'Bodenständiger Markt mit treuer Kundschaft und moderatem Konkurrenzdruck. Ausgeprägte Work-Life-Balance-Szene — Teilzeit-Selbstständigkeit im Stuhl-Miet-Modell ist verbreitet.',
    priceRange: { stuhl: '30-50 €/Tag', kabine: '40-62 €/Tag', raum: '75-140 €/Tag' },
    faqs: [
      {
        question: 'Wie viel kostet ein Friseurstuhl in Bremen am Tag?',
        answer: 'In Bremen liegen die Tagespreise für einen Friseurstuhl zwischen 30 € (Findorff, Neustadt) und 50 € (Mitte, Schwachhausen). Kabinen kosten 40–62 €/Tag, Behandlungsräume 75–140 €/Tag.',
      },
      {
        question: 'Welche Bremer Stadtteile eignen sich am besten für Stuhl-Miete?',
        answer: 'Das Viertel (Ostertor/Steintor) hat die jüngste, beauty-affinste Kundschaft und die dichteste Studio-Szene. Schwachhausen ist gehoben mit zahlungskräftiger Stammkundschaft, Findorff und die Neustadt sind günstiger und familiär geprägt.',
      },
      {
        question: 'Wo melde ich mein Gewerbe als Stuhl-Mieter in Bremen an?',
        answer: 'Die Gewerbeanmeldung läuft über den Gewerbemeldedienst der Stadt Bremen — online über das Serviceportal oder vor Ort, die Gebühr liegt bei rund 30 €. Friseure brauchen den Meisterbrief, Kosmetik- und Lash-Berufe meist nur die einfache Anmeldung.',
      },
      {
        question: 'Wie schnell bekomme ich in Bremen einen freien Platz?',
        answer: 'Die Verfügbarkeit ist entspannt — in der Regel findest du innerhalb von 1–2 Wochen einen passenden Platz. Nur im Viertel und in Schwachhausen kann es bei beliebten Salons etwas länger dauern.',
      },
      {
        question: 'Kann ich in Bremen auch nur an 2–3 Tagen pro Woche einen Stuhl mieten?',
        answer: 'Ja — Teil-Wochen-Miete ist in Bremen besonders verbreitet, weil viele Profis bewusst reduziert arbeiten. Die meisten Salons bieten flexible 2-, 3- oder 4-Tage-Modelle an, oft mit Rabatt gegenüber der reinen Tages-Buchung.',
      },
    ],
  },
  // ------------------------- Phase 3 (Top-20 komplett) -------------------------
  {
    slug: 'dortmund',
    name: 'Dortmund',
    state: 'Nordrhein-Westfalen',
    phase: 3,
    lat: 51.5136,
    lng: 7.4653,
    regionCode: 'DE-NW',
    wikipedia: 'https://de.wikipedia.org/wiki/Dortmund',
    intro: 'Dortmund ist das wirtschaftliche Zentrum des östlichen Ruhrgebiets — und einer der günstigsten Großstadt-Märkte für Beauty-Selbstständige in Deutschland. Rund um das Kreuzviertel und den Westpark hat sich eine junge Studio-Szene etabliert, die von moderaten Gewerbemieten profitiert: Ein Friseurstuhl kostet hier oft nur halb so viel wie in München. Gleichzeitig ist die Kundschaft bodenständig und treu — wer sich in Dortmund einen Namen macht, arbeitet mit hoher Stammkunden-Quote. Die Nähe zu Bochum, Unna und Hagen erweitert das Einzugsgebiet spürbar; viele Kund:innen pendeln für gute Barber und Nageldesigner:innen quer durchs Revier. Für den Einstieg in die Selbstständigkeit mit kleinem Budget ist Dortmund damit einer der attraktivsten Standorte in NRW: geringe Fixkosten, ehrliche Preise, wenig Konkurrenzdruck durch Premium-Ketten. Besonders gefragt sind Plätze im Kreuzviertel, in der City rund um den Westenhellweg und im aufstrebenden Unionviertel.',
    neighborhoods: ['Kreuzviertel', 'Innenstadt-West', 'Unionviertel', 'Kaiserviertel', 'Hörde', 'Körne'],
    marketContext: 'Günstigster Einstieg unter den Top-10-Städten NRWs, treue Stammkundschaft, großes Pendler-Einzugsgebiet im Ruhrgebiet.',
    priceRange: { stuhl: '20-40 €/Tag', kabine: '30-55 €/Tag', raum: '70-140 €/Tag' },
    faqs: [
      { question: 'Was kostet ein Friseurstuhl in Dortmund pro Tag?', answer: 'Zwischen 20 € in den Außenbezirken und 40 € im Kreuzviertel oder der City. Damit gehört Dortmund zu den günstigsten Großstädten für Stuhl-Miete — bei Behandlungspreisen, die nur leicht unter dem Bundesschnitt liegen.' },
      { question: 'Welches Viertel in Dortmund passt zu einem Barber-Start?', answer: 'Das Kreuzviertel bringt junges, zahlungsbereites Publikum, das Unionviertel wächst durch die Kreativwirtschaft. Wer Laufkundschaft will, orientiert sich Richtung Westenhellweg/City.' },
      { question: 'Lohnt sich Stuhl-Miete in Dortmund trotz niedrigerer Preise pro Behandlung?', answer: 'Ja — die Rechnung funktioniert über die niedrigen Fixkosten. Bei 20–40 € Tagesmiete bleibt ab dem dritten bis vierten Kunden alles Weitere als Gewinn. Der Break-even liegt deutlich früher als in München oder Frankfurt.' },
      { question: 'Wie groß ist das Einzugsgebiet für ein Studio in Dortmund?', answer: 'Sehr groß: Mit Bochum, Unna, Lünen und Hagen in unter 30 Minuten Fahrzeit erreichen gute Spezialist:innen ein Einzugsgebiet von über einer Million Menschen — im Ruhrgebiet pendeln Kund:innen für gute Arbeit selbstverständlich.' },
      { question: 'Gibt es in Dortmund Kosmetik-Kabinen zur Tagesmiete?', answer: 'Ja, vor allem im Kaiserviertel und in Hörde bieten etablierte Studios Kabinen ab ca. 30 €/Tag an — oft inklusive Liege, Licht und Anmeldung über die Salon-Rezeption.' },
    ],
  },
  {
    slug: 'essen',
    name: 'Essen',
    state: 'Nordrhein-Westfalen',
    phase: 3,
    lat: 51.4556,
    lng: 7.0116,
    regionCode: 'DE-NW',
    wikipedia: 'https://de.wikipedia.org/wiki/Essen',
    intro: 'Essen hat den Strukturwandel vom Kohle-Standort zur Dienstleistungsstadt geschafft — und Rüttenscheid ist heute eine der bekanntesten Beauty-Meilen des Ruhrgebiets. Auf der "Rü" reihen sich Friseure, Barbershops, Nagel- und Kosmetikstudios auf wenigen hundert Metern; die Dichte an Laufkundschaft ist für die Region einzigartig. Wer hier einen Stuhl mietet, kauft sich in eine etablierte Einkaufs- und Ausgeh-Straße ein, ohne die Investition eines eigenen Ladenlokals zu stemmen. Außerhalb von Rüttenscheid sind die Preise deutlich moderater: In Frohnhausen, Holsterhausen oder Steele beginnt die Stuhl-Miete bei rund 20 € pro Tag. Die Kundschaft in Essen ist gemischt — vom Messe-Publikum über Klinik-Personal (Uniklinikum) bis zur klassischen Stammkundschaft der Stadtteile. Für Kosmetik und medizinische Fußpflege ist die Nähe zum Uniklinikum ein echter Standortvorteil, den viele unterschätzen.',
    neighborhoods: ['Rüttenscheid', 'Südviertel', 'Holsterhausen', 'Frohnhausen', 'Steele', 'Borbeck', 'Kettwig'],
    marketContext: 'Rüttenscheid als etablierte Beauty-Meile mit hoher Laufkundschaft; außerhalb sehr günstige Einstiegspreise.',
    priceRange: { stuhl: '20-45 €/Tag', kabine: '30-60 €/Tag', raum: '80-150 €/Tag' },
    faqs: [
      { question: 'Warum ist Rüttenscheid für Beauty-Selbstständige so beliebt?', answer: 'Die Rüttenscheider Straße ist eine der frequenzstärksten Einkaufsstraßen des Ruhrgebiets mit ausgeprägter Gastronomie- und Beauty-Szene. Ein Stuhl auf der "Rü" bringt Laufkundschaft, für die man anderswo Jahre Marketing braucht — entsprechend liegen die Tagespreise am oberen Ende (bis 45 €).' },
      { question: 'Was kostet eine Kosmetik-Kabine in Essen?', answer: 'In Rüttenscheid und im Südviertel 40–60 €/Tag, in Stadtteilen wie Frohnhausen oder Steele ab 30 €/Tag. Wochen- und Monatsmodelle mit 10–20 % Rabatt sind üblich.' },
      { question: 'Welche Zielgruppen erreiche ich in Essen?', answer: 'Sehr gemischte: junges Ausgeh-Publikum in Rüttenscheid, Familien in Borbeck und Steele, kaufkräftige Klientel in Kettwig und Bredeney. Die Nähe zum Uniklinikum macht Holsterhausen für medizinische Fußpflege und Kosmetik interessant.' },
      { question: 'Wie schnell finde ich in Essen einen freien Stuhl?', answer: 'Außerhalb von Rüttenscheid meist innerhalb von 1–2 Wochen. Auf der Rü selbst sind Plätze begehrt — hier lohnt es sich, Verfügbarkeits-Alerts zu setzen und auch 2-3-Tage-Modelle in Betracht zu ziehen.' },
      { question: 'Brauche ich für Nageldesign in Essen eine besondere Zulassung?', answer: 'Nein, Nageldesign ist zulassungsfrei — Gewerbeanmeldung beim Essener Gewerbeamt genügt (ca. 26 €). Wichtig sind die Hygieneanforderungen des Gesundheitsamts, besonders bei Staub-Absaugung und Instrumenten-Desinfektion.' },
    ],
  },
  {
    slug: 'dresden',
    name: 'Dresden',
    state: 'Sachsen',
    phase: 3,
    lat: 51.0504,
    lng: 13.7373,
    regionCode: 'DE-SN',
    wikipedia: 'https://de.wikipedia.org/wiki/Dresden',
    intro: 'Dresden verbindet barocke Kulisse mit einer wachsenden, jungen Beauty-Szene — vor allem in der Äußeren Neustadt, dem kreativen Herz der Stadt. Zwischen Alaunstraße und Louisenstraße haben sich Barbershops, Tattoo- und Lash-Studios angesiedelt, die ein szeniges, treues Publikum bedienen. Gleichzeitig wächst der Markt: Sachsens Landeshauptstadt zieht durch Tech-Arbeitgeber ("Silicon Saxony") und die TU Dresden stetig junge, zahlungskräftige Kundschaft an. Die Stuhl-Mieten liegen mit 25–45 € pro Tag deutlich unter westdeutschen Großstädten, während die Behandlungspreise in den letzten Jahren spürbar angezogen haben — eine attraktive Marge für Selbstständige. Neben der Neustadt lohnen sich Striesen und Blasewitz für gehobene Kosmetik sowie die Innere Altstadt für Touristen-Laufkundschaft. Dresden ist damit der spannendste ostdeutsche Markt nach Leipzig: geringe Fixkosten, wachsende Nachfrage, wenig etablierte Ketten-Konkurrenz.',
    neighborhoods: ['Äußere Neustadt', 'Innere Altstadt', 'Striesen', 'Blasewitz', 'Pieschen', 'Löbtau'],
    marketContext: 'Wachsender Ost-Markt mit Tech-Kaufkraft, szenige Neustadt-Kundschaft, niedrige Fixkosten bei steigenden Behandlungspreisen.',
    priceRange: { stuhl: '25-45 €/Tag', kabine: '35-55 €/Tag', raum: '75-140 €/Tag' },
    faqs: [
      { question: 'Welches Viertel in Dresden eignet sich für ein Barber- oder Lash-Business?', answer: 'Die Äußere Neustadt ist erste Wahl: junges Szene-Publikum, hohe Dichte an Studios, gute Sichtbarkeit. Wer gehobene Kosmetik anbietet, fährt in Striesen/Blasewitz mit ruhigerer, kaufkräftiger Klientel oft besser.' },
      { question: 'Was kostet ein Stuhl in der Dresdner Neustadt?', answer: 'Rund 30–45 €/Tag, je nach Ausstattung und Lage zur Alaunstraße. In Pieschen oder Löbtau beginnt die Miete bei ca. 25 €/Tag.' },
      { question: 'Wie entwickelt sich der Beauty-Markt in Dresden?', answer: 'Positiv: Durch Halbleiter-Industrie und Universität wächst die junge, zahlungskräftige Bevölkerung. Behandlungspreise haben sich westdeutschen Niveaus angenähert, während Mieten günstig geblieben sind — die Marge für Selbstständige ist entsprechend attraktiv.' },
      { question: 'Profitiere ich in der Altstadt vom Tourismus?', answer: 'Für Barber und Blowout/Styling ja — spontane Walk-ins von Städtereisenden sind real. Für terminbasierte Behandlungen (Lash, Kosmetik) zählt eher die lokale Stammkundschaft, die in Neustadt, Striesen und Pieschen sitzt.' },
      { question: 'Gilt in Sachsen etwas Besonderes für die Gewerbeanmeldung?', answer: 'Nein, es gelten die bundesweiten Regeln: Gewerbeanmeldung bei der Stadt Dresden (ca. 20–40 €), Friseurhandwerk erfordert Handwerksrollen-Eintrag, Kosmetik und Nageldesign sind zulassungsfrei. Das Gesundheitsamt prüft Hygiene nach sächsischer Verordnung.' },
    ],
  },
  {
    slug: 'nuernberg',
    name: 'Nürnberg',
    state: 'Bayern',
    phase: 3,
    lat: 49.4521,
    lng: 11.0767,
    regionCode: 'DE-BY',
    wikipedia: 'https://de.wikipedia.org/wiki/Nürnberg',
    intro: 'Nürnberg ist das wirtschaftliche Zentrum Frankens — solide Kaufkraft, treue Kundschaft und ein Beauty-Markt, der zwischen bayerischem Preisniveau und fränkischer Bodenständigkeit liegt. Im Szeneviertel Gostenhof ("GoHo") hat sich eine junge Studio-Kultur entwickelt: Barbershops, Brow-Bars und Nagelstudios in ehemaligen Handwerker-Höfen prägen das Bild. Die Altstadt und die Lorenzkirche-Umgebung bringen Laufkundschaft und Touristen, während St. Johannis mit Altbau-Charme die gehobene Kosmetik-Klientel anzieht. Mit Tagesmieten von 35–55 € liegt Nürnberg klar unter München — bei Behandlungspreisen, die nur wenig darunter rangieren. Dazu kommt das Einzugsgebiet der Metropolregion mit Fürth und Erlangen: Die Siemens- und Uni-Standorte liefern kontinuierlich neue, gut verdienende Kundschaft. Für Selbstständige, die bayerische Kaufkraft ohne Münchner Fixkosten suchen, ist Nürnberg die logische Wahl.',
    neighborhoods: ['Gostenhof', 'Altstadt / St. Lorenz', 'St. Johannis', 'Südstadt', 'Maxfeld', 'Wöhrd'],
    marketContext: 'Bayerische Kaufkraft ohne München-Preise; Metropolregion mit Fürth/Erlangen als Einzugsgebiet; GoHo als Szene-Standort.',
    priceRange: { stuhl: '35-55 €/Tag', kabine: '45-70 €/Tag', raum: '90-170 €/Tag' },
    faqs: [
      { question: 'Wie teuer ist Stuhl-Miete in Nürnberg im Vergleich zu München?', answer: 'Deutlich günstiger: 35–55 €/Tag statt 55–90 €/Tag in München — bei Behandlungspreisen, die nur 10–20 % unter Münchner Niveau liegen. Die Marge pro Arbeitstag ist dadurch oft besser als in der Landeshauptstadt.' },
      { question: 'Was macht Gostenhof für Beauty-Selbstständige interessant?', answer: '"GoHo" ist Nürnbergs Kreativviertel mit junger, styling-affiner Kundschaft und bezahlbaren Gewerbeflächen. Barbershops und Brow-/Lash-Studios funktionieren hier besonders gut; die Szene empfiehlt sich gegenseitig weiter.' },
      { question: 'Lohnt sich die Metropolregion als Einzugsgebiet?', answer: 'Ja: Fürth und Erlangen sind per U-Bahn bzw. S-Bahn in 10–20 Minuten erreichbar. Gerade Erlangen bringt durch Siemens Healthineers und die Universität überdurchschnittlich verdienende Kund:innen, die für Spezialist:innen gern nach Nürnberg fahren.' },
      { question: 'Wo finde ich in Nürnberg Kosmetik-Kabinen?', answer: 'St. Johannis und Maxfeld haben die höchste Dichte an etablierten Kosmetikinstituten mit Vermietungs-Bereitschaft (45–70 €/Tag). In der Südstadt gibt es günstigere Einstiege ab ca. 40 €/Tag.' },
      { question: 'Wie streng ist das Nürnberger Gesundheitsamt bei Studio-Hygiene?', answer: 'Bayern prüft konsequent, aber berechenbar: Wer einen schriftlichen Hygieneplan führt, Instrumente VAH-konform desinfiziert und bei apparativer Kosmetik die NiSV-Fachkunde nachweist, hat bei Kontrollen keine Probleme.' },
    ],
  },
  {
    slug: 'duisburg',
    name: 'Duisburg',
    state: 'Nordrhein-Westfalen',
    phase: 3,
    lat: 51.4344,
    lng: 6.7623,
    regionCode: 'DE-NW',
    wikipedia: 'https://de.wikipedia.org/wiki/Duisburg',
    intro: 'Duisburg ist der günstigste Einstiegs-Markt unter Deutschlands Großstädten — und genau das macht die Stadt für Beauty-Gründer:innen interessant. Tagesmieten ab 20 € bedeuten: Schon ab dem zweiten oder dritten Kunden pro Tag arbeitet man profitabel. Rund um den sanierten Innenhafen und in Neudorf (Uni-Nähe) entsteht eine kleine, aber wachsende Studio-Szene; die Innenstadt rund um die Königstraße liefert klassische Laufkundschaft. Duisburgs Stärke ist die Vielfalt: Eine internationale Bevölkerung sorgt für konstante Nachfrage nach Barbering, Braut-Styling und Spezial-Behandlungen, die anderswo Nischen sind. Wer mehrsprachig arbeitet, hat hier einen echten Wettbewerbsvorteil. Die Nähe zu Düsseldorf (15 Minuten mit dem RE) erlaubt zudem ein Hybrid-Modell: günstig in Duisburg produzieren, Premium-Kundschaft gezielt in Düsseldorf bedienen. Für den Selbstständigkeits-Start mit minimalem Risiko ist Duisburg schwer zu schlagen.',
    neighborhoods: ['Innenstadt / Königstraße', 'Innenhafen', 'Neudorf', 'Duissern', 'Hochfeld', 'Rheinhausen'],
    marketContext: 'Niedrigste Fixkosten aller Großstädte, internationale Kundschaft, Düsseldorf in 15 Minuten — ideal für risikoarme Gründung.',
    priceRange: { stuhl: '20-35 €/Tag', kabine: '25-45 €/Tag', raum: '60-120 €/Tag' },
    faqs: [
      { question: 'Ist Duisburg wirklich die günstigste Großstadt für Stuhl-Miete?', answer: 'Im Vergleich der Top-20-Städte ja: Tagesmieten beginnen bei 20 €, selbst zentrale Lagen bleiben meist unter 35 €. Der Break-even liegt damit bei nur 2–3 Kunden pro Tag.' },
      { question: 'Welche Behandlungen sind in Duisburg besonders gefragt?', answer: 'Barbering ist durch die junge, internationale Bevölkerung überdurchschnittlich stark. Braut-Styling und Make-up für Hochzeiten sind ein unterschätzter Markt mit sehr guten Margen — mehrsprachige Profis sind hier klar im Vorteil.' },
      { question: 'Kann ich von Duisburg aus Düsseldorfer Kundschaft bedienen?', answer: 'Ja, das Hybrid-Modell ist verbreitet: Basis-Geschäft in Duisburg mit niedrigen Kosten, dazu 1–2 Tage pro Woche ein Stuhl in Düsseldorf für Premium-Preise. Der RE braucht 12–15 Minuten zwischen den Hauptbahnhöfen.' },
      { question: 'Wie sieht die Studio-Szene am Innenhafen aus?', answer: 'Der Innenhafen zieht mit sanierten Loft-Flächen Büro-Publikum und Gastronomie an — für moderne Barber- und Kosmetik-Konzepte einer der wenigen "Szene-Standorte" Duisburgs, mit Mieten am oberen Ende der Stadt (30–35 €/Tag).' },
      { question: 'Was muss ich bei der Gewerbeanmeldung in Duisburg beachten?', answer: 'Standard-Prozess beim Amt für Verbraucherschutz: ca. 26 €, online möglich. Friseurhandwerk braucht den Handwerksrollen-Eintrag bei der HWK Düsseldorf; Kosmetik, Nails und Lashes sind zulassungsfrei.' },
    ],
  },
  {
    slug: 'bochum',
    name: 'Bochum',
    state: 'Nordrhein-Westfalen',
    phase: 3,
    lat: 51.4818,
    lng: 7.2162,
    regionCode: 'DE-NW',
    wikipedia: 'https://de.wikipedia.org/wiki/Bochum',
    intro: 'Bochum ist die Universitätsstadt des Ruhrgebiets — und ihr Beauty-Markt lebt vom jungen Publikum der Ruhr-Uni und der Hochschulen. Das Ehrenfeld-Viertel zwischen Schauspielhaus und Bermuda3eck hat sich zum kreativen Kern entwickelt: kleine Studios, Barbershops und Brow-Bars in Gründerzeit-Häusern, getragen von Studierenden und jungen Berufstätigen. Die Stuhl-Mieten gehören mit 20–40 € pro Tag zu den günstigsten in NRW, gleichzeitig sorgt das Bermuda3eck als größte Kneipenmeile des Reviers für Abend- und Wochenend-Frequenz, von der Styling-orientierte Angebote direkt profitieren. Wer auf Studierenden-Budgets zugeschnittene Preise mit schnellen, guten Cuts kombiniert, baut in Bochum außergewöhnlich schnell einen Kundenstamm auf — und wächst mit seiner Kundschaft, die nach dem Abschluss in besser bezahlte Jobs wechselt. Langfristig ist genau das Bochums stille Stärke: loyale Kundschaft mit steigender Kaufkraft.',
    neighborhoods: ['Ehrenfeld', 'Innenstadt / Bermuda3eck', 'Wiemelhausen', 'Langendreer', 'Weitmar', 'Riemke'],
    marketContext: 'Uni-Stadt mit junger Kundschaft und Abend-Frequenz durchs Bermuda3eck; sehr niedrige Einstiegskosten, loyale wachsende Klientel.',
    priceRange: { stuhl: '20-40 €/Tag', kabine: '28-50 €/Tag', raum: '65-130 €/Tag' },
    faqs: [
      { question: 'Wie viel kostet ein Barber-Stuhl in Bochum?', answer: '20–40 €/Tag: Ehrenfeld und Innenstadt liegen bei 30–40 €, Stadtteile wie Langendreer oder Riemke ab 20 €. Wochenpakete mit 10–15 % Rabatt sind Standard.' },
      { question: 'Funktioniert ein Studenten-orientiertes Preismodell wirtschaftlich?', answer: 'Ja, über Volumen und Loyalität: Schnelle, standardisierte Cuts zu 20–28 € mit hoher Taktung füllen den Tag zuverlässig. Und die Kundschaft bleibt — nach dem Abschluss steigen Einkommen und Preisbereitschaft, ohne dass du neu akquirieren musst.' },
      { question: 'Welches Viertel passt für Lash & Brows in Bochum?', answer: 'Ehrenfeld: jung, weiblich geprägte Zielgruppe, Instagram-affin, kurze Wege. Wiemelhausen funktioniert für ruhigere Kosmetik-Konzepte mit Terminen statt Laufkundschaft.' },
      { question: 'Bringt das Bermuda3eck wirklich Kundschaft?', answer: 'Für Styling, Barber und Blowout-Angebote ja — Donnerstag bis Samstag ist die Nachfrage vor dem Ausgehen messbar höher. Studios in Laufnähe zum Bermuda3eck vergeben Abendtermine oft bis 20 Uhr.' },
      { question: 'Wie schnell baue ich in Bochum einen Kundenstamm auf?', answer: 'Erfahrungsgemäß schneller als in Premium-Städten: Die Community ist vernetzt (Uni, Vereine, Ausgeh-Szene), Empfehlungen verbreiten sich schnell. Mit konstanter Qualität und Instagram-Präsenz ist ein tragfähiger Stamm in 4–8 Monaten realistisch.' },
    ],
  },
  {
    slug: 'wuppertal',
    name: 'Wuppertal',
    state: 'Nordrhein-Westfalen',
    phase: 3,
    lat: 51.2562,
    lng: 7.1508,
    regionCode: 'DE-NW',
    wikipedia: 'https://de.wikipedia.org/wiki/Wuppertal',
    intro: 'Wuppertal ist der unterschätzte Markt im Bergischen Land: Zwischen Elberfeld und Barmen leben 360.000 Menschen, doch die Studio-Dichte ist deutlich geringer als in den Rhein-Metropolen — weniger Konkurrenz bei solider Nachfrage. Das Luisenviertel in Elberfeld ist das kulturelle Herz der Stadt: Altbau-Charme, inhabergeführte Läden und ein Publikum, das bewusst lokal kauft. Hier funktionieren persönliche, spezialisierte Beauty-Konzepte besser als jede Kette. Die Stuhl-Mieten gehören mit 20–38 € pro Tag zu den niedrigsten der Top-20-Städte, und über die Schwebebahn ist jeder Stadtteil ohne Auto erreichbar — ein echter Vorteil für Kund:innen-Mobilität entlang der Talachse. Dazu kommt die Nähe zu Düsseldorf und Essen (je ~30 Minuten): Wer will, kombiniert günstige Wuppertaler Fixkosten mit gelegentlichen Premium-Tagen am Rhein. Für Gründer:innen, die einen loyalen Lokalmarkt ohne Großstadt-Kostenrisiko suchen, ist Wuppertal eine kluge Wahl.',
    neighborhoods: ['Luisenviertel', 'Elberfeld-Mitte', 'Barmen', 'Ölberg', 'Ronsdorf', 'Vohwinkel'],
    marketContext: 'Geringe Studio-Dichte bei 360k Einwohnern, Luisenviertel als loyaler Lokalmarkt, niedrigste Fixkosten im bergischen Raum.',
    priceRange: { stuhl: '20-38 €/Tag', kabine: '28-48 €/Tag', raum: '60-120 €/Tag' },
    faqs: [
      { question: 'Warum gilt Wuppertal als unterschätzter Beauty-Markt?', answer: 'Weil die Studio-Dichte pro Einwohner deutlich unter Düsseldorf oder Köln liegt: Es gibt schlicht weniger Konkurrenz für 360.000 potenzielle Kund:innen. Spezialisierte Angebote (Brows, Balayage, Barbering) finden hier schnell ihre Nische.' },
      { question: 'Was kostet ein Stuhl im Luisenviertel?', answer: 'Rund 30–38 €/Tag — das obere Ende der Stadt, dafür mit dem loyalsten Publikum. In Barmen oder Vohwinkel beginnt die Miete bei etwa 20 €/Tag.' },
      { question: 'Elberfeld oder Barmen — wo starte ich besser?', answer: 'Elberfeld (v. a. Luisenviertel) für junges, bewusst lokal kaufendes Publikum und höhere Preise; Barmen für familienorientierte Stammkundschaft mit etwas niedrigeren Tarifen, aber auch geringerer Konkurrenz.' },
      { question: 'Hilft die Schwebebahn tatsächlich fürs Geschäft?', answer: 'Ja — sie verbindet die komplette Talachse im 5-Minuten-Takt. Kund:innen aus Vohwinkel erreichen ein Studio in Elberfeld ohne Auto und Parkplatzsuche; bei Terminvergabe ist das ein spürbarer Convenience-Vorteil.' },
      { question: 'Kann ich Wuppertal mit Düsseldorf-Tagen kombinieren?', answer: 'Viele machen genau das: 3–4 Basis-Tage in Wuppertal (niedrige Miete, Stammkundschaft) plus 1–2 Premium-Tage in Düsseldorf (40–70 €/Tag Miete, aber deutlich höhere Behandlungspreise). Mit ~30 Minuten Pendelzeit gut machbar.' },
    ],
  },
  {
    slug: 'bielefeld',
    name: 'Bielefeld',
    state: 'Nordrhein-Westfalen',
    phase: 3,
    lat: 52.0302,
    lng: 8.5325,
    regionCode: 'DE-NW',
    wikipedia: 'https://de.wikipedia.org/wiki/Bielefeld',
    intro: 'Bielefeld ist das Zentrum Ostwestfalens — eine Region mit starkem Mittelstand, stabiler Beschäftigung und einer Kundschaft, die Wert auf Verlässlichkeit legt. Der Beauty-Markt spiegelt das wider: weniger Hype, dafür überdurchschnittlich treue Stammkund:innen und planbare Auslastung. Rund um den Siegfriedplatz ("Siggi") im Bielefelder Westen hat sich ein lebendiges Quartier mit inhabergeführten Studios entwickelt; die Altstadt und der Boulevard Bahnhofstraße liefern klassische Laufkundschaft. Mit Tagesmieten von 25–45 € liegt Bielefeld im günstigen Mittelfeld, während die Behandlungspreise dank der soliden ostwestfälischen Kaufkraft stabil sind. Das Einzugsgebiet reicht weit: Gütersloh, Herford und Paderborn haben kaum spezialisierte Studios, sodass Kund:innen für Lash-Extensions, Balayage oder gutes Barbering regelmäßig nach Bielefeld fahren. Wer hier Qualität liefert, baut ein Geschäft mit ungewöhnlich niedriger Kundenfluktuation auf.',
    neighborhoods: ['Bielefelder Westen / Siegfriedplatz', 'Altstadt', 'Mitte / Bahnhofstraße', 'Schildesche', 'Brackwede', 'Sennestadt'],
    marketContext: 'Ostwestfälischer Mittelstand: treue Stammkundschaft, stabile Preise, großes Einzugsgebiet bis Gütersloh/Herford/Paderborn.',
    priceRange: { stuhl: '25-45 €/Tag', kabine: '32-55 €/Tag', raum: '70-140 €/Tag' },
    faqs: [
      { question: 'Wie ticken Beauty-Kund:innen in Bielefeld?', answer: 'Verlässlichkeit schlägt Trend: Ostwestfälische Kundschaft wechselt selten, wenn Qualität und Preis stimmen. Der Aufbau dauert etwas länger als in Szene-Städten, dafür ist die Fluktuation danach minimal — ideal für planbare Auslastung.' },
      { question: 'Was kostet Stuhl-Miete am Siegfriedplatz?', answer: 'Im Bielefelder Westen zahlst du 32–45 €/Tag — das beliebteste Viertel der Stadt. Brackwede und Sennestadt beginnen bei 25 €/Tag.' },
      { question: 'Wie groß ist das Einzugsgebiet wirklich?', answer: 'Beachtlich: Gütersloh, Herford, Bad Salzuflen und selbst Paderborn (40 Min) haben wenig spezialisierte Studios. Für Lash, PMU oder anspruchsvolle Farbtechniken pendeln Kund:innen regelmäßig — OWL umfasst über zwei Millionen Menschen.' },
      { question: 'Eignet sich Bielefeld für Kosmetik-Kabinen-Miete?', answer: 'Ja: Etablierte Institute in Schildesche und im Westen vermieten Kabinen ab ca. 32 €/Tag. Apparative Kosmetik profitiert von der kaufkräftigen 40+-Klientel, die regelmäßige Treatments bucht.' },
      { question: 'Wie starte ich in Bielefeld am schnellsten?', answer: 'Über den Westen: Am "Siggi" ist die Community eng vernetzt — Wochenmarkt, Cafés, lokale Empfehlungen. Ein Probetag in einem etablierten Studio plus konsistente Instagram-Präsenz mit Vorher/Nachher-Arbeiten bringt hier am schnellsten Termine.' },
    ],
  },
  {
    slug: 'bonn',
    name: 'Bonn',
    state: 'Nordrhein-Westfalen',
    phase: 3,
    lat: 50.7374,
    lng: 7.0982,
    regionCode: 'DE-NW',
    wikipedia: 'https://de.wikipedia.org/wiki/Bonn',
    intro: 'Bonn kombiniert Bundesstadt-Kaufkraft mit internationalem Flair: UN-Standort, DAX-Konzerne wie Telekom und Post sowie zahlreiche Ministerien sorgen für eine überdurchschnittlich verdienende, stilbewusste Kundschaft. Die Südstadt mit ihrer prächtigen Gründerzeit-Architektur ist das Premium-Quartier für Kosmetik und gehobene Friseur-Konzepte; Poppelsdorf punktet mit Uni-Nähe und jungem Publikum, die Altstadt mit dichter Laufkundschaft. Für Beauty-Selbstständige interessant: Durch die internationalen Organisationen gibt es konstante Nachfrage nach englischsprachigem Service — ein Alleinstellungsmerkmal, das kaum ein Studio systematisch bedient. Die Stuhl-Mieten von 35–60 € pro Tag liegen unter Kölner Zentrumsniveau, die Behandlungspreise dafür kaum. Mit Bad Godesberg (Diplomaten-Viertel) und dem Rhein-Sieg-Kreis als Einzugsgebiet arbeitet man in Bonn in einem der stabilsten Beauty-Märkte NRWs — konjunkturunabhängig durch den öffentlichen Sektor.',
    neighborhoods: ['Südstadt', 'Altstadt / Zentrum', 'Poppelsdorf', 'Bad Godesberg', 'Beuel', 'Endenich'],
    marketContext: 'Bundesstadt-Kaufkraft (UN, Telekom, Ministerien), Nachfrage nach englischsprachigem Service, konjunkturstabile Klientel.',
    priceRange: { stuhl: '35-60 €/Tag', kabine: '45-75 €/Tag', raum: '100-190 €/Tag' },
    faqs: [
      { question: 'Was unterscheidet den Bonner Beauty-Markt von Köln?', answer: 'Bonn ist ruhiger, aber stabiler: Der öffentliche Sektor und die DAX-Arbeitgeber machen die Nachfrage konjunkturunabhängig. Die Behandlungspreise erreichen fast Kölner Niveau, die Stuhl-Mieten liegen darunter — die Marge ist oft besser.' },
      { question: 'Lohnt sich englischsprachiger Service in Bonn?', answer: 'Sehr: Tausende internationale Angestellte von UN-Organisationen suchen aktiv nach Studios, in denen sie ihr Anliegen auf Englisch erklären können. Wer sein Profil zweisprachig führt, erschließt eine loyale Nische mit geringer Preissensibilität.' },
      { question: 'Welches Viertel passt für gehobene Kosmetik?', answer: 'Die Südstadt: Gründerzeit-Ambiente, kaufkräftige Anwohner:innen, etablierte Praxen-Nachbarschaft. Kabinen kosten hier 55–75 €/Tag. Bad Godesberg ist mit dem Diplomaten-Umfeld die zweite Premium-Adresse.' },
      { question: 'Wie ist die Verfügbarkeit von Stühlen in Bonn?', answer: 'Zentrale Lagen (Altstadt, Südstadt) sind gefragt — 2–4 Wochen Vorlauf sind normal. In Beuel und Endenich findest du meist innerhalb einer Woche einen Platz, bei nur geringfügig kleinerem Einzugsgebiet.' },
      { question: 'Was verdient ein selbstständiger Friseur in Bonn realistisch?', answer: 'Bei 45–75 € pro Termin und 6–8 Kund:innen am Tag liegen 180–350 € Tagesgewinn nach Stuhl-Miete drin. In der Südstadt und Bad Godesberg sind mit Spezialisierung (Color, Extensions) auch höhere Sätze durchsetzbar.' },
    ],
  },
  {
    slug: 'muenster',
    name: 'Münster',
    state: 'Nordrhein-Westfalen',
    phase: 3,
    lat: 51.9607,
    lng: 7.6261,
    regionCode: 'DE-NW',
    wikipedia: 'https://de.wikipedia.org/wiki/Münster',
    intro: 'Münster ist Deutschlands Fahrradstadt und eine der jüngsten Großstädte des Landes: Über 65.000 Studierende prägen Rhythmus und Stil — entsprechend hoch ist die Dichte an Lash-, Brow- und Nagelstudios rund um das Kreuzviertel und den Hansaring. Gleichzeitig hat Münster durch Verwaltung, Universitätsklinik und einen wohlhabenden Speckgürtel (Münsterland) eine zweite, kaufkräftige Klientel, die gehobene Kosmetik und Premium-Friseurleistungen nachfragt. Diese Doppelstruktur macht den Markt robust: Studierenden-Volumen unter der Woche, Premium-Termine am Freitag und Samstag. Die Stuhl-Mieten liegen bei moderaten 35–55 € pro Tag, deutlich unter dem Niveau vergleichbar attraktiver Städte. Das Kreuzviertel ist der Szene-Standort schlechthin; die Altstadt rund um den Prinzipalmarkt bringt kaufkräftige Laufkundschaft, und das Hafenviertel entwickelt sich zum Kreativ-Quartier. Wer beide Zielgruppen bedient, arbeitet in Münster mit außergewöhnlich stabiler Auslastung.',
    neighborhoods: ['Kreuzviertel', 'Altstadt / Prinzipalmarkt', 'Hansaviertel / Hafen', 'Aaseestadt', 'Mauritz', 'Gievenbeck'],
    marketContext: 'Doppelmarkt: 65k+ Studierende plus wohlhabendes Münsterland; hohe Lash/Brow/Nails-Nachfrage, stabile Auslastung.',
    priceRange: { stuhl: '35-55 €/Tag', kabine: '40-65 €/Tag', raum: '85-160 €/Tag' },
    faqs: [
      { question: 'Warum ist Münster für Lash- und Nagelstudios so stark?', answer: 'Die Kombination aus 65.000+ Studierenden und einer beauty-affinen jungen Berufstätigen-Szene erzeugt konstante Nachfrage nach Lashes, Brows und Nails. Refill-Zyklen von 3–4 Wochen sorgen für planbare Wiederkehr — ideal fürs Platz-Miet-Modell.' },
      { question: 'Was kostet ein Platz im Kreuzviertel?', answer: 'Das Kreuzviertel ist Münsters beliebtestes Quartier: 45–55 €/Tag für einen Stuhl, 50–65 €/Tag für eine Kabine. In Gievenbeck oder Mauritz startest du ab 35 €/Tag.' },
      { question: 'Wie bediene ich Studierende UND Premium-Kundschaft?', answer: 'Über Zeitfenster und Staffelpreise: Unter der Woche Studierenden-Tarife mit hoher Taktung, Freitag/Samstag Premium-Slots für das kaufkräftige Münsterland-Publikum. Viele Selbstständige fahren zweigleisig und glätten so ihre Auslastung.' },
      { question: 'Spielt das Fahrrad wirklich eine Rolle für den Standort?', answer: 'Ja — in Münster kommen viele Kund:innen mit der Leeze. Studios mit Abstellmöglichkeiten vor der Tür und Lage an den Haupt-Radrouten (Promenade!) haben messbar weniger No-Shows und mehr Spontan-Termine.' },
      { question: 'Wie weit reicht das Einzugsgebiet ins Münsterland?', answer: 'Weit: Aus Greven, Telgte, Senden oder Warendorf fahren Kund:innen selbstverständlich 20–40 Minuten für gute Spezialist:innen. Das Münsterland ist wohlhabend und hat außerhalb der Stadt kaum spezialisierte Studios — ein stiller Standortvorteil.' },
    ],
  },
]

export function getCityBySlug(slug: string): CityData | undefined {
  return PHASE_1_CITIES.find((c) => c.slug === slug)
}

export function getAllPhase1CitySlugs(): string[] {
  return PHASE_1_CITIES.map((c) => c.slug)
}

/** Luftlinie zwischen zwei Koordinaten in km (Haversine) */
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

/**
 * Nächstgelegene Städte zur gegebenen Stadt, sortiert nach Luftlinie.
 * Für "Städte in der Nähe"-Interlinking auf Stadt-Hubs: entfernungs-
 * relevante Anchors sind ein stärkeres Lokal-Signal als eine
 * unsortierte Liste aller Städte.
 */
export function getNearbyCities(slug: string, limit = 8): CityData[] {
  const origin = getCityBySlug(slug)
  if (!origin) return []
  return PHASE_1_CITIES
    .filter((c) => c.slug !== slug)
    .map((c) => ({ c, d: distanceKm(origin.lat, origin.lng, c.lat, c.lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.c)
}
