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

// Enthält inzwischen Phase 1 UND Phase 2 (Düsseldorf, Stuttgart, Hannover, Leipzig, Bremen).
// Export-Name bleibt aus Kompatibilitätsgründen PHASE_1_CITIES — alle Consumer
// (sitemap, [stadt]-Routen, preisvergleich, VerticalHubContent) importieren ihn direkt.
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
  {
    slug: 'duesseldorf',
    name: 'Düsseldorf',
    state: 'Nordrhein-Westfalen',
    phase: 2,
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
]

export function getCityBySlug(slug: string): CityData | undefined {
  return PHASE_1_CITIES.find((c) => c.slug === slug)
}

export function getAllPhase1CitySlugs(): string[] {
  return PHASE_1_CITIES.map((c) => c.slug)
}
