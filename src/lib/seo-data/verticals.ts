/**
 * Vertical-Whitelist + Content für SEO-Landingpages.
 */

export interface VerticalData {
  slug: string
  name: string
  assetType: string             // primärer Asset-Slug ("stuhl-mieten", "kabine-mieten")
  assetLabel: string            // Display ("Stuhl", "Kabine")
  pluralName: string            // für Listen ("Barbershops", "Friseure")
  pillarIntro: string           // 200-400 Wörter für Vertical-Deutschland-Hub
  benefits: { tenant: string[]; provider: string[] }
  marketStats: string           // 1-2 Sätze Marktinfo
  legalNote: string             // Recht-Hinweis
  faqs: Array<{ question: string; answer: string }>
}

export const VERTICALS: VerticalData[] = [
  {
    slug: 'barbershop',
    name: 'Barbershop',
    assetType: 'stuhl-mieten',
    assetLabel: 'Barberstuhl',
    pluralName: 'Barbershops',
    pillarIntro: 'Barbershop-Chair-Rental ist in Deutschland in den letzten 5 Jahren explodiert. Mit dem Boom traditioneller Bart- und Haarschnittstudios entstand eine ganze Generation selbstständiger Barber, die flexible Arbeitsplätze suchen — ohne Festanstellungs-Risiko, ohne Anlauf-Investition. Das Stuhl-Miet-Modell trifft genau diesen Bedarf: Du zahlst einen Tages- oder Wochensatz für die Nutzung eines vollständig ausgestatteten Barber-Platzes (Spiegel, Becken, Klingen-Sterilisator, Klimaanlage) und behältst 100 % deines Behandlungs-Umsatzes. Salons profitieren von zusätzlicher Auslastung an freien Tagen, während Barber sich ihre Stundenpläne selbst gestalten. Aktuell vermitteln 80 % aller Stuhl-Mieten in Deutschland über eBay Kleinanzeigen oder lokale Facebook-Gruppen — unverifiziert, ohne Schutz, ohne Bewertungssystem. ChairMatch ist der erste deutsche Marketplace, der diesen Markt strukturiert.',
    benefits: {
      tenant: [
        '0 % Provision für dich als Mieter',
        'Flexible Tages-, Wochen- oder Monatspakete',
        'Verifizierte Salons mit Bewertungen',
        'Klare Mietverträge — kein mündliches Risiko',
        'Stuhl, Becken, Klingen-Sterilisation und Klima inklusive',
      ],
      provider: [
        'Bis zu 60 % Mehr-Auslastung an freien Tagen',
        'Stripe-gesicherte Zahlung (Anti-Bypass)',
        'Bewertungen aufbauen ohne eigenes Marketing',
        'Mietverträge automatisch generiert',
        'Steuerberater-Export per Klick',
      ],
    },
    marketStats: 'Über 5.000 selbstständige Barber arbeiten in Deutschland, davon nutzen schätzungsweise 40 % das Stuhl-Miet-Modell. Wachstumsrate 2024-2026: ca. 15 % pro Jahr.',
    legalNote: 'Stuhl-Miete gilt steuerlich als Untervermietung. Bei klar abgrenzbarem Mietverhältnis (eigene Termine, eigene Kasse, eigener Kunde) keine Scheinselbstständigkeit. Bei Beauty-Berufen ohne Meisterbrief reicht einfache Gewerbeanmeldung. Steuerberater empfohlen.',
    faqs: [
      {
        question: 'Was kostet ein Barber-Stuhl in Deutschland pro Tag?',
        answer: 'Im Bundesdurchschnitt 40–60 €/Tag. In München und Frankfurt zahlst du 60–90 €, in Berlin oder Leipzig oft 30–50 €. Wochenpakete sind 10–20 % günstiger als Einzel-Tage.',
      },
      {
        question: 'Brauche ich als Barber einen Meisterbrief?',
        answer: 'Nein. Barber-Tätigkeit fällt nicht unter die meisterpflichtigen Friseur-Tätigkeiten (laut HwO-Anlage A). Du kannst als selbstständiger Barber ohne Meister anmelden — am Gewerbeamt mit Anmeldung "Bart- und Haarpflege" oder "Barber".',
      },
      {
        question: 'Was ist im Tagespreis typischerweise enthalten?',
        answer: 'Standard: Stuhl, Becken, Spiegel, Wasser, Strom, Klingen-Sterilisator, Klimaanlage, Sitz-Wartebereich für deine Kunden. NICHT enthalten: deine eigenen Produkte (Gel, Wachs, Bartöl), eigene Werkzeuge (Maschinen, Scheren).',
      },
      {
        question: 'Wie regle ich Versicherungen?',
        answer: 'Du brauchst eine eigene Berufshaftpflicht (10-30 €/Monat). Der Salon-Vermieter hat eine separate Inhalts-Versicherung. Bei Personenschäden durch dich greift deine BHV, nicht die des Salons.',
      },
      {
        question: 'Was passiert wenn ich kurzfristig absagen muss?',
        answer: 'Das hängt vom Vertrag ab. Üblich: bis 48 h vorher kostenlos absagbar, danach 50–100 % des Tagespreises. Bei langfristigen Verträgen oft 2-Wochen-Kündigungsfrist.',
      },
      {
        question: 'Kann ich meinen Kundenstamm mitbringen?',
        answer: 'Ja, der Kundenstamm gehört dir. Wichtig: stelle sicher dass dein Vertrag eine Konkurrenzklausel ausschließt, sonst kann der Salon bei Vertragsende Anspruch auf "deine" Kunden erheben.',
      },
    ],
  },
  {
    slug: 'friseur',
    name: 'Friseur',
    assetType: 'stuhl-mieten',
    assetLabel: 'Friseurstuhl',
    pluralName: 'Friseur-Salons',
    pillarIntro: 'Friseurstuhl-Vermietung ist das älteste und am weitesten verbreitete Modell des Beauty-Workspace-Sharings in Deutschland — und auch das am stärksten regulierte. Friseur-Handwerk ist meisterpflichtig (HwO Anlage A), d.h. wer selbstständig als Friseur arbeiten will, muss einen Meisterbrief oder die Voraussetzungen nach §7b/§8 HwO erfüllen. Stuhl-Miete ist die Standard-Form der Selbstständigkeit für Friseur-Profis, die nicht ihren eigenen Salon eröffnen wollen. Der Markt ist riesig: über 50.000 selbstständige Friseure in Deutschland, davon arbeiten geschätzt 60–70 % im Stuhl-Miet-Modell. Trotz dieser Größe gibt es bisher keinen dominanten digitalen Marketplace — die Vermittlung läuft über Mund-zu-Mund, lokale Facebook-Gruppen oder eBay Kleinanzeigen.',
    benefits: {
      tenant: [
        '0 % Provision auf deine Behandlungsumsätze',
        'Du behältst 100 % deines Kundenstamms',
        'Wechselgarantie: wenn der Salon nicht passt, einfach kündigen',
        'Voll ausgestatteter Arbeitsplatz inkl. Becken, Spiegel, Klima',
        'Du gestaltest deine Arbeitszeiten selbst',
      ],
      provider: [
        'Konstante Zusatz-Einnahmen aus freien Stühlen',
        'Mehr Vielfalt durch wechselnde Spezialisten (Color, Cut, Bart)',
        'Strom-/Wasserkosten werden auf alle Mieter verteilt',
        'Bewertungs-Boost durch zusätzliche Profile',
        'Stripe-Zahlung — kein Cash-Risiko',
      ],
    },
    marketStats: 'Geschätzt 30.000+ Stuhl-Miet-Verhältnisse in Deutschland aktiv. Durchschnittliche Vertragslaufzeit: 8 Monate. Tagespreis-Median: 45 €.',
    legalNote: 'Friseur-Tätigkeit ist meisterpflichtig (HwO Anlage A Nr.38). Selbstständigkeit ohne Meisterbrief nur über §7b HwO (6 Jahre Tätigkeits-Nachweis + 4 Jahre Vertretung) oder Ausnahme nach §8 HwO. Stuhl-Miete keine Scheinselbstständigkeit wenn: eigene Kunden, eigene Kasse, eigene Werkzeuge, eigene Arbeitszeiten.',
    faqs: [
      {
        question: 'Was kostet ein Friseurstuhl pro Tag in Deutschland?',
        answer: '40–70 €/Tag im Bundesdurchschnitt. In Premium-Lagen (München, Frankfurt-Westend) bis 90 €, in B-Standorten ab 25 €. Wochenpakete typisch 10–15 % günstiger.',
      },
      {
        question: 'Brauche ich für Stuhl-Miete einen Meisterbrief?',
        answer: 'Ja — Friseur-Selbstständigkeit ist meisterpflichtig. Ohne Meisterbrief geht es nur über §7b HwO (6+4 Jahre Friseur-Berufserfahrung mit Führungsverantwortung) oder bei Ausnahmegenehmigung der Handwerkskammer.',
      },
      {
        question: 'Wie buche ich als Salon-Inhaber Stuhl-Miete steuerlich?',
        answer: 'Die Miet-Einnahmen sind Einkünfte aus Vermietung (oder Gewerbe, je nach Konstellation). Sprich mit deinem Steuerberater. ChairMatch liefert dir pro Quartal einen detaillierten CSV-Export für deine Buchhaltung.',
      },
      {
        question: 'Kann ich als Stuhl-Mieter eine Friseur-Mitarbeiterin beschäftigen?',
        answer: 'Ja, wenn du selbst die Voraussetzungen für selbstständige Friseur-Tätigkeit erfüllst (Meister oder §7b). Deine Mitarbeiterin kann angestellt sein oder als Subunternehmerin agieren.',
      },
      {
        question: 'Was ist der Unterschied zwischen Stuhl-Miete und Anstellung?',
        answer: 'Stuhl-Miete = du bist selbstständig, zahlst Steuern selbst, hast eigenen Kundenstamm, eigenes Marketing. Anstellung = Festgehalt, Sozialversicherung über Arbeitgeber, aber kein eigenes Geschäft.',
      },
    ],
  },
  {
    slug: 'kosmetik',
    name: 'Kosmetik',
    assetType: 'kabine-mieten',
    assetLabel: 'Kosmetik-Kabine',
    pluralName: 'Kosmetikstudios',
    pillarIntro: 'Kosmetik-Kabinen-Vermietung ist der diskreteste, aber profitabelste Bereich des Beauty-Workspace-Sharings. Eine Kosmetik-Kabine ist ein separater, ruhiger Behandlungsraum mit Liege, Lampe, Dampfgerät und Sterilisator — das vollständige Setup für Gesichtsbehandlungen, Microneedling, Lash-Extensions, Permanent Make-up und mehr. Kosmetik-Beruf ist nicht meisterpflichtig (außer Apparativ-Kosmetik), d.h. die Eintrittshürde ist niedriger als bei Friseur-Tätigkeit. Die Kabinen-Tagesmiete liegt typisch zwischen 50 und 90 €, und mit 3–4 Behandlungen pro Tag (Ø Behandlungspreis 60–120 €) rechnet sich das mit hohem Abstand. Die Wachstumsmarkt-Treiber: Microneedling-Boom, Anti-Aging-Trend bei Männern, Lash-Volume-Ausbildungen.',
    benefits: {
      tenant: [
        'Separate, ruhige Kabine — keine Salon-Geräusche',
        'Vollständige Ausstattung: Liege, Lampe, Sterilisator, Dampf',
        '0 % auf deine Behandlungs-Umsätze',
        'Tagespakete oder Stunden-Slots verfügbar',
        'Klima-Kontrolle und Beleuchtung professionell eingerichtet',
      ],
      provider: [
        'Auslastung deiner ungenutzten Kabinen-Stunden',
        'Wechselnde Spezialistinnen ziehen unterschiedliche Kundinnen an',
        'Stripe-Zahlung mit Anbieter-Schutz',
        'Bewertungs-Profil deines Studios wächst durch zusätzliche Reviews',
        'Klare Vertragsstruktur via ChairMatch-Standard-AGB',
      ],
    },
    marketStats: 'Geschätzt 20.000 Kosmetikerinnen arbeiten in Deutschland selbstständig, davon ca. 40 % über Kabinen-Miet-Modelle. Wachstumsrate Lash: 25 % p.a.',
    legalNote: 'Klassische Kosmetik (Reinigung, Pflege, Make-up) ist nicht meisterpflichtig. Apparativ-Kosmetik (Laser, Hochfrequenz) erfordert teils Heilpraktiker- oder Arzt-Lizenz. Microneedling kann je nach Bundesland eine Genehmigung erfordern (Hygiene-Verordnung).',
    faqs: [
      {
        question: 'Was kostet eine Kosmetik-Kabine pro Tag?',
        answer: '50–90 €/Tag im Bundesdurchschnitt. In München und Frankfurt 70–130 €, in B-Städten 45–70 €. Stunden-Slots oft 15–25 €/Stunde.',
      },
      {
        question: 'Brauche ich für selbstständige Kosmetik einen Meisterbrief?',
        answer: 'Nein — Kosmetik-Beruf ist nicht meisterpflichtig (HwO Anlage B-1). Einfache Gewerbeanmeldung reicht. Bei Apparativ-Kosmetik (Laser, hochfrequente Geräte) prüfe die Bundesland-Verordnung — teils Heilpraktiker-Lizenz nötig.',
      },
      {
        question: 'Welche Behandlungen lohnen sich in einer gemieteten Kabine?',
        answer: 'High-Margin: Microneedling (120–200 € pro Sitzung), Lash-Volume (140–180 €), HydraFacial (90–140 €), Permanent Make-up (250–500 €). Diese Behandlungen rechnen die 50-90 € Kabinen-Miete schnell rein.',
      },
      {
        question: 'Sind in Kosmetik-Kabinen auch Lash-Extensions möglich?',
        answer: 'Ja — die meisten Kabinen sind dafür ausgelegt (Liege, gute Beleuchtung, ruhige Umgebung). Achte beim Mieten auf: Lupenlampe vorhanden, kein Durchgangsverkehr, gute Lüftung gegen Klebstoff-Dämpfe.',
      },
      {
        question: 'Welche Versicherungen brauche ich als Kosmetikerin?',
        answer: 'Berufshaftpflicht (15-40 €/Monat), bei invasiven Behandlungen wie Microneedling oder Permanent Make-up zusätzlich erweiterte Vermögensschadenhaftpflicht. Hygiene-Schulungen empfohlen.',
      },
    ],
  },
  {
    slug: 'nagelstudio',
    name: 'Nagelstudio',
    assetType: 'platz-mieten',
    assetLabel: 'Nagelstudio-Platz',
    pluralName: 'Nagelstudios',
    pillarIntro: 'Nagelstudio-Platz-Vermietung ist die schnellst wachsende Beauty-Vertical in Deutschland. Mit dem Trend zu Gel-Nails, Acryl, BIAB und komplexen Nail-Art-Designs hat sich die durchschnittliche Behandlungszeit verlängert und die Preise pro Behandlung sind gestiegen (45-90 € pro Sitzung). Eine Nagel-Workstation braucht weniger Platz als ein Friseurstuhl (1.5×2 Meter reichen oft), was die Tagesmieten niedriger hält (35-60 €). Mit 4-6 Kundinnen pro Tag rechnet sich der Platz schnell. Die Nagel-Szene ist überdurchschnittlich digital affin — viele neue Selbstständige arbeiten per Insta-Akquise und brauchen einen verlässlichen, ruhigen Platz für die Ausführung.',
    benefits: {
      tenant: [
        'Tagespreise ab 35 €',
        'Voll ausgestatteter Platz (Lampe, Absaugung, Bohrer-Sterilisator)',
        '0 % Behandlungs-Provision',
        'Ruhige Atmosphäre — kein lauter Friseur-Hintergrund',
        'Pakete für 2-3-Tage-Arbeit möglich',
      ],
      provider: [
        'Mehr-Auslastung der ungenutzten Plätze',
        'Junge, oft Insta-stark-vernetzte Spezialistinnen ziehen neue Klientel an',
        'Klare Vertragstruktur',
        'Stripe-Sicherheit',
        'CSV-Export für Steuerberater',
      ],
    },
    marketStats: 'Geschätzt 15.000 selbstständige Nageldesignerinnen in Deutschland. Wachstum: 20-25 % p.a. seit 2022.',
    legalNote: 'Nagelstudio-Tätigkeit ist nicht meisterpflichtig (außer in einigen Bundesländern bei spezifischen Produkten). Einfache Gewerbeanmeldung. Hygiene-Schulung (RKI-Standards) dringend empfohlen.',
    faqs: [
      {
        question: 'Was kostet ein Nagelstudio-Platz pro Tag in Deutschland?',
        answer: '35-60 €/Tag im Bundesdurchschnitt. Berlin und Köln ab 30 €, München 50-65 €. Wochen-Pakete oft 15 % günstiger.',
      },
      {
        question: 'Wie viele Kundinnen schaffe ich pro Tag in einer Mietkabine?',
        answer: 'Bei klassischer Maniküre + Gel-Lack ca. 5-6 Kundinnen. Bei Volume-Nail-Art oder Modellage 3-4. Mit Ø 60 €/Behandlung sind 300-400 € Tagesumsatz realistisch.',
      },
      {
        question: 'Welche Ausstattung sollte beim Mieten dabei sein?',
        answer: 'Pflicht: Lampe (UV/LED), Absauggerät, Bohrer, Sterilisator, Tisch + zwei Stühle. Optional aber wertvoll: Stickerwand, Insta-Photo-Spot, ergonomische Stühle.',
      },
      {
        question: 'Sind in Nagelstudios auch Pediküre-Plätze mietbar?',
        answer: 'Ja, viele Studios bieten separate Pediküre-Plätze (Sessel mit Fußbad). Tagespreis dafür typisch 5-10 € höher als Maniküre-Platz wegen größerer Fläche.',
      },
      {
        question: 'Brauche ich für Microblading oder Permanent-Brows einen separaten Raum?',
        answer: 'Ja — für invasive Beauty-Behandlungen (Microblading, PMU) brauchst du einen geschlossenen Raum (Hygiene-Verordnung). Solche Räume sind teurer (60-100 €/Tag) und nicht jedes Nagelstudio bietet sie an.',
      },
    ],
  },
  {
    slug: 'lash-brows',
    name: 'Lash & Brows',
    assetType: 'platz-mieten',
    assetLabel: 'Lash-Platz',
    pluralName: 'Lash- und Brow-Studios',
    pillarIntro: 'Lash & Brows ist der heißeste Beauty-Wachstumsmarkt der letzten 5 Jahre in Deutschland. Lash-Extensions (Classic, Volume, Mega-Volume) und Brows-Tinting, Henna-Brows, Microblading sind hochpreisige Behandlungen (Ø 90-180 € pro Sitzung) mit langer Bindung der Kundinnen. Eine Lash-Workstation braucht: Liege, Lupenlampe mit LED, ergonomischer Sessel für die Spezialistin, geschlossener Raum (gegen Klebstoff-Dämpfe). Die Tagesmieten liegen typisch zwischen 45 und 75 €. Mit 3-4 Sitzungen pro Tag rechnet sich der Platz extrem schnell. Die Lash-Szene ist sehr jung, Insta-getrieben, hat hohe Spezialisierung und ist deshalb für ChairMatch ein idealer Markt: Lash-Spezialistinnen suchen flexible Räume in den richtigen Stadtteilen.',
    benefits: {
      tenant: [
        'Spezialisierter Platz mit Lupenlampe & Ergo-Sessel',
        '0 % auf hochpreisige Lash-/Brow-Behandlungen',
        'Geschlossener, ruhiger Raum',
        'Tagespakete für 3-4 Behandlungen ideal',
        'Direkter Standort in trendigen Vierteln',
      ],
      provider: [
        'High-Value-Spezialistinnen attractive deine Studio-Marke',
        'Lash-Klientel oft bindungsstark = mehr Stammkundinnen langfristig',
        'Höhere Behandlungspreise = höhere Tagesmieten möglich',
        'Stripe-Zahlung sichert dich ab',
      ],
    },
    marketStats: 'Geschätzt 8.000 selbstständige Lash-Spezialistinnen in Deutschland. Markt wächst 20-30 % p.a. — Volume + Mega-Volume sind die Wachstumstreiber.',
    legalNote: 'Lash-Extensions sind nicht meisterpflichtig. Einfache Gewerbeanmeldung. Brows-Microblading kann je nach Bundesland Hygiene-Auflagen haben (RKI-Standards). PMU (Permanent Make-up) erfordert manche Bundesland-spezifische Genehmigung.',
    faqs: [
      {
        question: 'Was kostet ein Lash-Platz pro Tag?',
        answer: '45-75 €/Tag im Bundesdurchschnitt. Premium-Lagen München/Frankfurt bis 90 €. Stunden-Buchung 18-30 €/Stunde möglich.',
      },
      {
        question: 'Welche Ausstattung MUSS in einem Lash-Mietplatz vorhanden sein?',
        answer: 'Pflicht: ergonomische Liege (verstellbar), Lupenlampe mit LED-Ring, drehbarer Hocker für dich, geschlossener Raum, Klebstoff-Lüftung. Optional: Photo-Wall, Schulungs-Equipment für Refresh-Kurse.',
      },
      {
        question: 'Wie viele Lash-Behandlungen pro Tag sind realistisch?',
        answer: 'Bei Classic-Set 4-5 Kundinnen. Bei Volume 3-4. Bei Mega-Volume 2-3. Tagesumsatz bei 3 Sitzungen × Ø 130 € = 390 €, abzüglich 60 € Platzmiete = 330 € netto.',
      },
      {
        question: 'Sind Lash-Lehrgänge / Schulungen auch im Mietplatz möglich?',
        answer: 'Ja, viele Lash-Spezialistinnen bieten 1-zu-1 Schulungen für 350-800 € pro Tag an. Dafür brauchst du Schulungsmaterial + Übungs-Lash-Strips. Prüfe vorher ob der Vermieter das erlaubt.',
      },
      {
        question: 'Lohnt sich Brows-Behandlungen zusätzlich zur Lash-Praxis?',
        answer: 'Ja — die meisten Lash-Kundinnen buchen auch Brows. Brows-Lifting oder Henna-Brows dauern nur 20-40 Min und bringen 40-70 € pro Sitzung. Cross-Sell-Effekt ist hoch.',
      },
    ],
  },
]

export function getVerticalBySlug(slug: string): VerticalData | undefined {
  return VERTICALS.find((v) => v.slug === slug)
}

export function getAllVerticalSlugs(): string[] {
  return VERTICALS.map((v) => v.slug)
}
