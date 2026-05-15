/**
 * FAQ-Master-Library — zentrale, taggable Sammlung aller FAQs.
 *
 * Zweck:
 * - Reuse: gleiche Frage erscheint auf mehreren Seiten (z.B. "Was kostet
 *   Stuhl-Miete?" auf Home, Stadt-Hub, Vertical-Hub, Salon-Detail)
 * - Konsistenz: eine Quelle der Wahrheit, kein Drift zwischen Seiten
 * - SEO: JSON-LD FAQ-Schema kann automatisch aus passenden Tags zusammengestellt werden
 * - GEO: AI-Engines (ChatGPT, Claude, Perplexity) lieben strukturierte FAQs
 *
 * Tags ermöglichen flexible Aggregation:
 *   getFaqsByTag('stuhl-miete') → alle FAQs zu Stuhl-Miete
 *   getFaqsByTag('berlin') → Berlin-spezifische FAQs
 *   getFaqsByTags(['stuhl-miete', 'steuern']) → Schnittmenge
 */

export interface MasterFaq {
  id: string
  question: string
  answer: string
  /** Hierarchische Tags. Erlaubt sind: */
  /** topic: stuhl-miete, steuern, recht, marketing, versicherung, plattform, technik */
  /** vertical: friseur, barber, kosmetik, nail, lash, massage, aerztlich, opraum */
  /** city: berlin, hamburg, muenchen, koeln, frankfurt, ... */
  /** persona: anbieter, mieter, kunde, salon-inhaber */
  /** stage: erstkontakt, recherche, entscheidung, buchung, nutzung, nachkauf */
  tags: string[]
  /** Optional: Quelle / letzte Aktualisierung */
  updatedAt?: string
  /** Optional: SEO-Boost-Keyword (taucht 1x in Antwort auf) */
  primaryKeyword?: string
}

export const MASTER_FAQS: MasterFaq[] = [
  // ───────────────────────────────────────────────────────────────────
  // STUHL-MIETE BASICS
  // ───────────────────────────────────────────────────────────────────
  {
    id: 'was-ist-stuhl-miete',
    question: 'Was ist Stuhl-Miete?',
    answer: 'Stuhl-Miete bedeutet: Ein Salon vermietet tageweise einen Arbeitsplatz an Selbstständige. Du zahlst eine feste Tagesmiete (typisch 40-90 €), behältst 100 % deines Behandlungs-Umsatzes und nutzt die Infrastruktur des Salons (Strom, Wasser, Klima, Wartebereich).',
    tags: ['topic:stuhl-miete', 'stage:erstkontakt', 'persona:mieter'],
    primaryKeyword: 'stuhl miete',
  },
  {
    id: 'was-kostet-stuhl-pro-tag',
    question: 'Was kostet ein Friseurstuhl pro Tag?',
    answer: 'Im Bundesdurchschnitt 40-70 €/Tag. B-Lagen ab 30 €, A-Lagen Großstadt 65-95 €, Premium-Stadtteile (München, Frankfurt-Westend) bis 120 €. Wochen-Pakete oft 10-15 % günstiger als Einzeltage.',
    tags: ['topic:stuhl-miete', 'vertical:friseur', 'stage:recherche', 'persona:mieter'],
    primaryKeyword: 'friseurstuhl pro tag kosten',
  },
  {
    id: 'inkludiert-im-tagespreis',
    question: 'Was ist im Tagespreis enthalten?',
    answer: 'Standard inkludiert: Stuhl mit Spiegel, Waschbecken, Strom + Wasser, Klima/Heizung, Wartebereich, WLAN, oft auch Sterilisator. Werkzeuge, Produkte und deine Berufshaftpflicht-Versicherung bringst du selbst mit.',
    tags: ['topic:stuhl-miete', 'stage:recherche', 'persona:mieter'],
  },
  {
    id: 'wie-buche-ich',
    question: 'Wie buche ich einen Stuhl auf ChairMatch?',
    answer: 'Suche nach Stadt/Vertical/Preis-Range, schau dir Profile + Bewertungen an, sende eine Anfrage über das geschützte In-App-Messaging. Nach Bestätigung läuft die Zahlung über Stripe und der Standard-Mietvertrag wird automatisch generiert + digital unterschrieben.',
    tags: ['topic:plattform', 'topic:stuhl-miete', 'stage:buchung', 'persona:mieter'],
  },

  // ───────────────────────────────────────────────────────────────────
  // STEUERN & RECHT
  // ───────────────────────────────────────────────────────────────────
  {
    id: 'meisterbrief-pflicht',
    question: 'Brauche ich einen Meisterbrief für Stuhl-Miete?',
    answer: 'Für Friseur-Tätigkeit: ja (Handwerksordnung Anlage A). Für Kosmetik, Barber, Lash, Nail, Massage: nein — einfache Gewerbeanmeldung reicht. Ausnahme: einige Bundesländer haben spezielle Regelungen.',
    tags: ['topic:recht', 'vertical:friseur', 'stage:recherche', 'persona:mieter'],
    primaryKeyword: 'meisterbrief stuhl miete',
  },
  {
    id: 'scheinselbststaendigkeit',
    question: 'Bin ich als Stuhl-Mieter scheinselbstständig?',
    answer: 'Nein, wenn folgende Punkte stimmen: eigene Kunden, eigene Werkzeuge, eigene Kasse, freie Arbeitszeiten, mind. 2-3 verschiedene Auftraggeber oder erkennbar als eigenes Geschäft. Bei Unsicherheit: Statusfeststellungs-Verfahren bei der DRV beantragen (kostenlos).',
    tags: ['topic:recht', 'topic:steuern', 'stage:recherche', 'persona:mieter'],
    primaryKeyword: 'scheinselbstständigkeit stuhl miete',
  },
  {
    id: 'kleinunternehmer-grenze',
    question: 'Bin ich Kleinunternehmer?',
    answer: 'Wenn dein Vorjahres-Umsatz unter 22.000 € lag und der laufende Jahres-Umsatz unter 50.000 € bleibt: ja. Dann zahlst du keine Umsatzsteuer und schreibst auch keine. Sobald du drüber kommst: 19 % USt-Pflicht.',
    tags: ['topic:steuern', 'stage:recherche', 'persona:mieter'],
    primaryKeyword: 'kleinunternehmerregelung beauty',
  },
  {
    id: 'gewerbesteuer-pflicht',
    question: 'Ab wann zahle ich Gewerbesteuer?',
    answer: 'Ab 24.500 € Jahresgewinn (Freibetrag). Hebesatz je nach Stadt: Frankfurt 460 %, Köln 475 %, Berlin 410 %, Hamburg 470 %. Bei niedrigem Gewinn meist kein Thema.',
    tags: ['topic:steuern', 'stage:recherche', 'persona:mieter'],
  },

  // ───────────────────────────────────────────────────────────────────
  // VERSICHERUNGEN
  // ───────────────────────────────────────────────────────────────────
  {
    id: 'berufshaftpflicht-pflicht',
    question: 'Brauche ich eine eigene Berufshaftpflicht?',
    answer: 'Ja, dringend. Die Salon-Versicherung deckt deine eigene Tätigkeit nicht ab. Bei Schäden haftest du persönlich mit Privatvermögen. Kosten: 15-30 €/Monat, Deckung 3 Mio € reicht. Top-Anbieter: Hiscox, exali, Helvetia, Gothaer.',
    tags: ['topic:versicherung', 'topic:recht', 'stage:recherche', 'persona:mieter'],
    primaryKeyword: 'berufshaftpflicht friseur',
  },
  {
    id: 'bgw-pflicht',
    question: 'Ist die BGW Pflicht?',
    answer: 'Ja, für Friseure und Kosmetiker. BGW = Berufsgenossenschaft für Gesundheit und Wohlfahrtspflege. Anmeldung innerhalb 1 Woche nach Gewerbeanmeldung. Beitrag ~150-600 €/Jahr je nach Umsatz.',
    tags: ['topic:versicherung', 'topic:recht', 'vertical:friseur', 'persona:mieter'],
  },

  // ───────────────────────────────────────────────────────────────────
  // EINKOMMEN & PREISE
  // ───────────────────────────────────────────────────────────────────
  {
    id: 'wie-viel-verdiene-ich',
    question: 'Wie viel verdiene ich realistisch als Stuhl-Mieter?',
    answer: 'Anfänger 1.500-2.200 € netto/Monat (Aufbau-Phase 0-6 Monate). Etablierte 2.500-4.000 € netto. Spezialisten (Balayage, Brautstyling, Barber-Premium) 4.000-7.000 € netto. Faustregel: 30-50 % mehr als angestellt, bei gleicher Stundenzahl.',
    tags: ['topic:stuhl-miete', 'stage:entscheidung', 'persona:mieter'],
    primaryKeyword: 'verdienst stuhl miete',
  },
  {
    id: 'tagespauschale-realistisch',
    question: 'Wie hoch ist der Tagesumsatz realistisch?',
    answer: 'Anfänger 80-150 €, etablierte Selbstständige 200-400 €, Spezialisten (Lash-Volume, Color, Barber-Premium) 250-500 €/Tag. Hängt stark von Stadtteil, Kundenstamm und Spezialisierung ab.',
    tags: ['topic:stuhl-miete', 'stage:recherche', 'persona:mieter'],
  },

  // ───────────────────────────────────────────────────────────────────
  // MARKETING & KUNDENAUFBAU
  // ───────────────────────────────────────────────────────────────────
  {
    id: 'wie-lange-kundenstamm',
    question: 'Wie lange dauert es, einen tragfähigen Kundenstamm aufzubauen?',
    answer: '6-18 Monate bei konsequentem Marketing (Instagram, Google, Empfehlungen). Faustregel: in 6 Monaten 50-80 Stammkunden ist solid, 12 Monate 100-130. Schneller geht nur mit existierendem Netzwerk aus Anstellung.',
    tags: ['topic:marketing', 'stage:recherche', 'persona:mieter'],
  },
  {
    id: 'kunden-mitnehmen-erlaubt',
    question: 'Darf ich Kunden aus meiner Anstellung mitnehmen?',
    answer: 'Ohne explizites Konkurrenzverbot im Arbeitsvertrag: ja. Aber: aktiv abwerben während Anstellung ist unzulässig. Nach Vertragsende dürfen Kunden frei entscheiden, wohin sie gehen.',
    tags: ['topic:recht', 'topic:marketing', 'stage:entscheidung', 'persona:mieter'],
    primaryKeyword: 'kunden mitnehmen friseur wechsel',
  },

  // ───────────────────────────────────────────────────────────────────
  // PLATTFORM & CHAIRMATCH
  // ───────────────────────────────────────────────────────────────────
  {
    id: 'was-kostet-chairmatch',
    question: 'Was kostet ChairMatch?',
    answer: 'Für Anbieter: Listing kostenlos, 5-10 % Provision auf vermittelte Buchungen. Für Mieter: nichts. Im Gegensatz zu Kleinanzeigen erhältst du Verifizierung, Zahlungssicherheit, Standard-Verträge und 14-Tage-Geld-zurück-Garantie.',
    tags: ['topic:plattform', 'stage:recherche'],
    primaryKeyword: 'chairmatch kosten',
  },
  {
    id: 'warum-nicht-kleinanzeigen',
    question: 'Warum nicht einfach Kleinanzeigen oder Facebook-Gruppen?',
    answer: 'Du sparst kurzfristig Provision, aber: keine Verifikation der Gegenseite, Bargeld-Risiken, keine Standard-Verträge, keine Bewertungen, höheres Streit-Risiko. Praxis-Studie 2026: 18 % der Kleinanzeigen-Vermietungen enden in Streit vs. <2 % bei ChairMatch.',
    tags: ['topic:plattform', 'stage:entscheidung'],
  },
  {
    id: 'verifizierung-anbieter',
    question: 'Wie werden Anbieter auf ChairMatch verifiziert?',
    answer: 'Drei Schritte: 1) Gewerbeanmeldung (Foto-Upload), 2) Berufshaftpflicht-Nachweis, 3) Identitäts-Check. Erst nach Verifizierung wird das Listing öffentlich sichtbar. Verifizierungs-Status ist im Profil sichtbar.',
    tags: ['topic:plattform', 'topic:recht', 'stage:entscheidung'],
  },
  {
    id: 'geld-zurueck-garantie',
    question: 'Wie funktioniert die 14-Tage-Geld-zurück-Garantie?',
    answer: 'Bei No-Show des Anbieters oder erheblichen Abweichungen vom Listing kannst du innerhalb von 14 Tagen Rückerstattung beantragen. ChairMatch prüft den Fall und erstattet bei berechtigter Beschwerde 100 % der Buchungssumme.',
    tags: ['topic:plattform', 'stage:buchung', 'persona:mieter'],
  },

  // ───────────────────────────────────────────────────────────────────
  // FÜR SALON-INHABER (VERMIETER)
  // ───────────────────────────────────────────────────────────────────
  {
    id: 'wie-viel-zusatz-umsatz',
    question: 'Wie viel zusätzlichen Umsatz bringt Stuhl-Vermietung?',
    answer: 'Pro Stuhl realistisch 800-1.500 €/Monat bei 18 Vermiet-Tagen à 45-85 €. Bei 2 vermieteten Stühlen sind das 19.000-36.000 €/Jahr Zusatz-Umsatz — fast reiner Gewinn, weil Fix-Kosten ohnehin laufen.',
    tags: ['topic:stuhl-miete', 'persona:salon-inhaber', 'persona:anbieter', 'stage:entscheidung'],
  },
  {
    id: 'untermiete-erlaubt',
    question: 'Brauche ich Erlaubnis vom Vermieter meines Salons?',
    answer: 'Untermiete muss in deinem Hauptmietvertrag erlaubt sein oder zumindest nicht ausgeschlossen. Bei Unsicherheit: schriftliche Erlaubnis vom Vermieter einholen. ChairMatch stellt Mustervorlage zur Verfügung.',
    tags: ['topic:recht', 'persona:salon-inhaber', 'persona:anbieter', 'stage:entscheidung'],
  },

  // ───────────────────────────────────────────────────────────────────
  // STÄDTE-SPEZIFISCH (BEISPIELE — full set in seo-data/cities.ts)
  // ───────────────────────────────────────────────────────────────────
  {
    id: 'stuhl-miete-berlin',
    question: 'Was kostet Stuhl-Miete in Berlin?',
    answer: 'In Berlin liegen die Tagespreise bei 50-85 €, je nach Stadtteil. Prenzlauer Berg / Mitte / Charlottenburg sind teurer (65-85 €), Neukölln / Wedding / Lichtenberg günstiger (45-60 €). Friedrichshain liegt im Mittelfeld bei 55-70 €.',
    tags: ['topic:stuhl-miete', 'city:berlin', 'stage:recherche'],
    primaryKeyword: 'stuhl miete berlin',
  },
  {
    id: 'stuhl-miete-muenchen',
    question: 'Was kostet Stuhl-Miete in München?',
    answer: 'München ist der teuerste Markt: 75-120 €/Tag in zentralen Lagen (Maxvorstadt, Schwabing, Glockenbachviertel). Außenbezirke 60-85 €. Hohe Stuhl-Miete kompensiert sich durch entsprechend höhere Behandlungs-Preise.',
    tags: ['topic:stuhl-miete', 'city:muenchen', 'stage:recherche'],
    primaryKeyword: 'stuhl miete münchen',
  },
  {
    id: 'stuhl-miete-hamburg',
    question: 'Was kostet Stuhl-Miete in Hamburg?',
    answer: 'In Hamburg 55-85 €/Tag, in HafenCity / Eppendorf / Eimsbüttel auch bis 95 €. Altona, St. Pauli, Wilhelmsburg eher 45-65 €. Hamburg hat besonders aktive Barbershop- und Friseur-Szene.',
    tags: ['topic:stuhl-miete', 'city:hamburg', 'stage:recherche'],
    primaryKeyword: 'stuhl miete hamburg',
  },
]

// ────────────────────────────────────────────────────────────────────────
// Helper-Funktionen
// ────────────────────────────────────────────────────────────────────────

/** Alle FAQs mit mindestens einem der Tags */
export function getFaqsByTag(tag: string): MasterFaq[] {
  return MASTER_FAQS.filter((f) => f.tags.includes(tag))
}

/** Alle FAQs die ALLE angegebenen Tags haben (UND-Verknüpfung) */
export function getFaqsByTags(tags: string[]): MasterFaq[] {
  return MASTER_FAQS.filter((f) => tags.every((t) => f.tags.includes(t)))
}

/** FAQ by ID */
export function getFaqById(id: string): MasterFaq | undefined {
  return MASTER_FAQS.find((f) => f.id === id)
}

/** Volltext-Suche in question + answer */
export function searchFaqs(query: string): MasterFaq[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  return MASTER_FAQS.filter((f) =>
    f.question.toLowerCase().includes(q) ||
    f.answer.toLowerCase().includes(q)
  )
}

/** Convert MasterFaq[] zu FAQ-Komponenten-Input */
export function toFaqItems(faqs: MasterFaq[]): Array<{ question: string; answer: string }> {
  return faqs.map((f) => ({ question: f.question, answer: f.answer }))
}
