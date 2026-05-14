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
  intro: string                 // 150-200 Wörter lokaler Einleitungstext
  neighborhoods: string[]       // Top-Stadtteile für Beauty-Szene
  marketContext: string         // Was macht den Markt hier besonders
  priceRange: { stuhl: string; kabine: string; raum: string }
  faqs: Array<{ question: string; answer: string }>
}

export const PHASE_1_CITIES: CityData[] = [
  {
    slug: 'frankfurt',
    name: 'Frankfurt am Main',
    state: 'Hessen',
    phase: 1,
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
]

export function getCityBySlug(slug: string): CityData | undefined {
  return PHASE_1_CITIES.find((c) => c.slug === slug)
}

export function getAllPhase1CitySlugs(): string[] {
  return PHASE_1_CITIES.map((c) => c.slug)
}
