/**
 * ChairMatch Mietvertrag-Generator — Vertragstemplate
 *
 * Pure Funktion: baut aus strukturierten Eingabedaten einen vollständigen
 * deutschen Stuhl-/Kabinen-/Raummietvertrag als Array von Abschnitten.
 * Keine Abhängigkeiten, kein React — auf Server und Client nutzbar.
 *
 * WICHTIG: Dieses Muster ersetzt keine Rechtsberatung.
 */

// ── Typen ────────────────────────────────────────────────────────────────

export type ObjektTyp = 'stuhl' | 'kabine' | 'raum' | 'opraum'
export type Abrechnungsart = 'tag' | 'woche' | 'monat'
export type Laufzeit = 'unbefristet' | 'befristet'

export interface VertragPartei {
  name: string
  strasse: string
  plz: string
  ort: string
}

export interface Vermieter extends VertragPartei {
  firma?: string
}

export interface Mieter extends VertragPartei {
  gewerbe?: string
}

export interface VertragObjekt {
  salonName: string
  adresse: string
  typ: ObjektTyp
  bezeichnung: string
}

export interface VertragKonditionen {
  abrechnungsart: Abrechnungsart
  preisEuro: number
  nebenkostenInklusive: boolean
  kaution?: number
  /** ISO-Datum (YYYY-MM-DD) */
  mietbeginn: string
  laufzeit: Laufzeit
  /** ISO-Datum (YYYY-MM-DD), nur bei befristeter Laufzeit */
  mietende?: string
  kuendigungsfristWochen: number
  /** z. B. ['Montag', 'Dienstag'] — optional bei tage-/wochenweiser Nutzung */
  arbeitstage?: string[]
}

export interface VertragExtras {
  eigeneProdukte: boolean
  kundenstammKlausel: boolean
  konkurrenzschutz: boolean
  haftpflichtNachweis: boolean
  schluessel: boolean
  reinigungInklusive: boolean
}

export interface VertragDaten {
  vermieter: Vermieter
  mieter: Mieter
  objekt: VertragObjekt
  konditionen: VertragKonditionen
  extras: VertragExtras
}

export interface VertragAbschnitt {
  titel: string
  absaetze: string[]
}

// ── Format-Helfer (exportiert, damit der Client sie wiederverwenden kann) ─

const PLATZHALTER = '____________________'

/** Leere Eingaben werden im Vertragstext als Ausfüll-Linie dargestellt. */
function oder(wert: string | undefined, fallback: string = PLATZHALTER): string {
  const v = (wert ?? '').trim()
  return v.length > 0 ? v : fallback
}

/** ISO-Datum (YYYY-MM-DD) → deutsches Datumsformat, timezonesicher. */
export function formatDatumDe(iso: string | undefined): string {
  if (!iso) return '__.__.____'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (!m) return '__.__.____'
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(d.getTime())) return '__.__.____'
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Betrag → "1.234,50 €" */
export function formatEuro(betrag: number): string {
  if (!Number.isFinite(betrag)) return '______ €'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: betrag % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(betrag)
}

/** Objekttyp → Vertragsbezeichnung */
export function typLabel(typ: ObjektTyp): string {
  switch (typ) {
    case 'stuhl': return 'Bedienungsplatz (Stuhl)'
    case 'kabine': return 'Behandlungskabine'
    case 'raum': return 'Behandlungsraum'
    case 'opraum': return 'Eingriffs-/OP-Raum'
  }
}

/** Objekttyp → Vertragstitel, z. B. "Stuhlmietvertrag" */
export function vertragsTitel(typ: ObjektTyp): string {
  switch (typ) {
    case 'stuhl': return 'Stuhlmietvertrag'
    case 'kabine': return 'Mietvertrag über eine Behandlungskabine'
    case 'raum': return 'Mietvertrag über einen Behandlungsraum'
    case 'opraum': return 'Mietvertrag über einen Eingriffs-/OP-Raum'
  }
}

function abrechnungsEinheit(art: Abrechnungsart): string {
  switch (art) {
    case 'tag': return 'je Arbeitstag'
    case 'woche': return 'je Kalenderwoche'
    case 'monat': return 'je Kalendermonat'
  }
}

function wochenText(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return 'zwei Wochen'
  const worte: Record<number, string> = {
    1: 'einer Woche', 2: 'zwei Wochen', 3: 'drei Wochen', 4: 'vier Wochen',
    6: 'sechs Wochen', 8: 'acht Wochen', 12: 'zwölf Wochen',
  }
  return worte[n] ?? `${n} Wochen`
}

function parteiAnschrift(p: VertragPartei): string {
  return `${oder(p.strasse)}, ${oder(p.plz, '_____')} ${oder(p.ort)}`
}

// ── Hauptfunktion ────────────────────────────────────────────────────────

export function buildVertrag(data: VertragDaten): VertragAbschnitt[] {
  const { vermieter, mieter, objekt, konditionen: k, extras } = data

  const objektLabel = typLabel(objekt.typ)
  const salon = oder(objekt.salonName, 'dem Salon')
  const adresse = oder(objekt.adresse)
  const bezeichnung = oder(objekt.bezeichnung)
  const miete = formatEuro(k.preisEuro)
  const einheit = abrechnungsEinheit(k.abrechnungsart)
  const frist = wochenText(k.kuendigungsfristWochen)
  const beginn = formatDatumDe(k.mietbeginn)
  const kautionGesetzt = typeof k.kaution === 'number' && k.kaution > 0

  const abschnitte: Array<{ name: string; absaetze: string[] }> = []

  // ── Mietgegenstand ──
  {
    const absaetze: string[] = [
      `Der Vermieter vermietet dem Mieter in den Betriebsräumen des Salons „${salon}“, ${adresse}, einen ${objektLabel} — im Folgenden „Mietgegenstand“ —, im Salon geführt unter der Bezeichnung „${bezeichnung}“.`,
      'Mitvermietet ist das Recht zur Mitbenutzung der allgemeinen Bereiche des Salons (insbesondere Empfang, Wartebereich, Sozial- und Sanitärräume) sowie der vorhandenen Grundausstattung im betriebsüblichen Umfang. Ein Anspruch auf ausschließliche Nutzung dieser Gemeinschaftsflächen besteht nicht.',
      'Der Mietgegenstand wird in dem Zustand überlassen, in dem er sich bei Übergabe befindet. Der Mieter hat erkennbare Mängel bei Übergabe, später auftretende Mängel unverzüglich in Textform anzuzeigen.',
    ]
    if (k.arbeitstage && k.arbeitstage.length > 0 && k.abrechnungsart !== 'monat') {
      absaetze.push(
        `Die Nutzung des Mietgegenstands ist für folgende Arbeitstage vereinbart: ${k.arbeitstage.join(', ')}. An den übrigen Tagen steht der Mietgegenstand dem Vermieter zur anderweitigen Verwendung frei.`
      )
    }
    abschnitte.push({ name: 'Mietgegenstand', absaetze })
  }

  // ── Mietzeit und Kündigung ──
  {
    const absaetze: string[] = []
    if (k.laufzeit === 'befristet') {
      const ende = formatDatumDe(k.mietende)
      absaetze.push(
        `Das Mietverhältnis beginnt am ${beginn} und ist befristet bis zum ${ende}. Es endet mit Ablauf dieses Tages, ohne dass es einer Kündigung bedarf.`,
        `Beide Parteien sind berechtigt, das Mietverhältnis bereits vor Ablauf der Befristung ordentlich mit einer Frist von ${frist} in Textform zu kündigen.`,
        'Eine stillschweigende Verlängerung des Mietverhältnisses durch Fortsetzung des Gebrauchs findet nicht statt; § 545 BGB wird ausdrücklich abbedungen. Eine Verlängerung bedarf einer neuen Vereinbarung in Textform.'
      )
    } else {
      absaetze.push(
        `Das Mietverhältnis beginnt am ${beginn} und läuft auf unbestimmte Zeit.`,
        `Beide Parteien können das Mietverhältnis ordentlich mit einer Frist von ${frist} in Textform kündigen.`
      )
    }
    absaetze.push(
      'Das Recht beider Parteien zur außerordentlichen fristlosen Kündigung aus wichtigem Grund bleibt unberührt. Ein wichtiger Grund liegt für den Vermieter insbesondere vor, wenn der Mieter mit einem Betrag in Höhe von mehr als zwei fälligen Mieten in Verzug ist, den Salonbetrieb trotz Abmahnung nachhaltig stört oder wiederholt gegen zwingende Hygienevorschriften verstößt.'
    )
    abschnitte.push({ name: 'Mietzeit und Kündigung', absaetze })
  }

  // ── Miete und Nebenkosten ──
  {
    const absaetze: string[] = [
      `Die Miete beträgt ${miete} ${einheit}.`,
    ]
    switch (k.abrechnungsart) {
      case 'tag':
        absaetze.push(
          'Die Miete ist für jeden gebuchten bzw. vereinbarten Arbeitstag im Voraus fällig, spätestens am jeweiligen Nutzungstag vor Aufnahme der Tätigkeit. Die Parteien können eine gesammelte Abrechnung zum Ende einer Kalenderwoche vereinbaren; die Fälligkeit tritt dann mit Zugang der Abrechnung ein.'
        )
        break
      case 'woche':
        absaetze.push(
          'Die Miete ist wöchentlich im Voraus fällig, jeweils spätestens am ersten Nutzungstag der betreffenden Kalenderwoche.'
        )
        break
      case 'monat':
        absaetze.push(
          'Die Miete ist monatlich im Voraus fällig, spätestens am dritten Werktag eines jeden Kalendermonats, und auf ein vom Vermieter benanntes Konto zu zahlen. Für die Rechtzeitigkeit kommt es auf die Erteilung des Zahlungsauftrags an.'
        )
        break
    }
    absaetze.push(
      k.nebenkostenInklusive
        ? 'Mit der Miete sind sämtliche Nebenkosten abgegolten, insbesondere Strom, Wasser, Heizung, Beleuchtung, WLAN sowie die Entsorgung des betriebsüblichen Abfalls. Eine gesonderte Nebenkostenabrechnung erfolgt nicht.'
        : 'Nebenkosten (insbesondere anteilige Kosten für Strom, Wasser, Heizung und Abfallentsorgung) sind in der Miete nicht enthalten. Sie werden nach gesonderter Vereinbarung der Parteien in angemessenem, nachvollziehbarem Umfang zusätzlich berechnet.',
      'Die Miete versteht sich zuzüglich Umsatzsteuer in jeweils gesetzlicher Höhe, soweit der Vermieter zur Umsatzsteuer optiert hat oder die Leistung kraft Gesetzes umsatzsteuerpflichtig ist. Eine Aufrechnung gegen Mietforderungen ist nur mit unbestrittenen oder rechtskräftig festgestellten Forderungen zulässig.'
    )
    abschnitte.push({ name: 'Miete und Nebenkosten', absaetze })
  }

  // ── Kaution (nur wenn vereinbart) ──
  if (kautionGesetzt) {
    abschnitte.push({
      name: 'Kaution',
      absaetze: [
        `Der Mieter leistet zur Sicherung aller Ansprüche des Vermieters aus diesem Mietverhältnis bei Vertragsbeginn eine Kaution in Höhe von ${formatEuro(k.kaution as number)}.`,
        'Der Vermieter hat die Kaution getrennt von seinem übrigen Vermögen zu verwahren. Eine Verzinsung wird nicht geschuldet.',
        'Nach Beendigung des Mietverhältnisses und ordnungsgemäßer Rückgabe des Mietgegenstands rechnet der Vermieter die Kaution innerhalb von sechs Wochen ab und zahlt einen nicht verbrauchten Betrag an den Mieter zurück. Die Aufrechnung mit fälligen Forderungen aus diesem Vertrag bleibt vorbehalten.',
      ],
    })
  }

  // ── Nutzung und Betriebspflichten (Scheinselbstständigkeits-Klausel) ──
  {
    const gewerbe = (mieter.gewerbe ?? '').trim()
    const taetigkeit = gewerbe.length > 0 ? `seine Tätigkeit als ${gewerbe}` : 'seine berufliche Tätigkeit'
    abschnitte.push({
      name: 'Nutzung und Betriebspflichten',
      absaetze: [
        `Der Mieter übt ${taetigkeit} als selbstständiger Unternehmer im eigenen Namen und auf eigene Rechnung aus. Durch diesen Vertrag wird weder ein Arbeitsverhältnis noch ein arbeitnehmerähnliches Rechtsverhältnis oder eine Gesellschaft zwischen den Parteien begründet.`,
        'Der Mieter bestimmt seine Arbeitszeiten innerhalb der vereinbarten Nutzungszeiten, seine Preise, sein Leistungsangebot, seine Behandlungsmethoden sowie die Annahme und Ablehnung von Kunden frei und eigenverantwortlich. Er unterliegt keinen fachlichen oder organisatorischen Weisungen des Vermieters und ist nicht in dessen Arbeitsorganisation eingegliedert.',
        'Der Mieter rechnet seine Leistungen gegenüber seinen Kunden ausschließlich im eigenen Namen ab, vereinnahmt seine Umsätze selbst und tritt am Markt — auch im Erscheinungsbild innerhalb des Salons — erkennbar als eigenständiges Unternehmen auf.',
        'Der Mieter ist für sämtliche ihn betreffenden öffentlich-rechtlichen Pflichten selbst verantwortlich, insbesondere für die Gewerbeanmeldung, eine gegebenenfalls erforderliche Eintragung in die Handwerksrolle, seine steuerlichen Pflichten sowie seine soziale Absicherung einschließlich Kranken- und Rentenversicherung.',
        'Die Parteien nehmen bei der Nutzung der Räume aufeinander Rücksicht. Der Mieter hat den Betriebsablauf des Salons nicht zu stören und den Mietgegenstand pfleglich zu behandeln; eine Überlassung an Dritte — auch teilweise — ist nur mit vorheriger Zustimmung des Vermieters in Textform zulässig.',
      ],
    })
  }

  // ── Kundenstamm (optional) ──
  if (extras.kundenstammKlausel) {
    abschnitte.push({
      name: 'Kundenstamm',
      absaetze: [
        'Kunden, die der Mieter behandelt oder akquiriert, sind ausschließlich Kunden des Mieters. Der Kundenstamm des Mieters einschließlich aller Kundendaten steht allein dem Mieter zu und verbleibt auch nach Beendigung des Mietverhältnisses bei ihm.',
        'Der Mieter verarbeitet die Daten seiner Kunden als eigener datenschutzrechtlich Verantwortlicher im Sinne der DSGVO. Der Vermieter erhält keinen Zugriff auf die Kundendaten des Mieters und erwirbt keinerlei Rechte an dessen Kundenbeziehungen.',
        'Der Vermieter verpflichtet sich, Kunden des Mieters während und nach der Vertragslaufzeit nicht gezielt abzuwerben. Die allgemeine, nicht auf einzelne Kunden des Mieters gerichtete Werbung des Salons bleibt zulässig.',
      ],
    })
  }

  // ── Versicherung (optional) ──
  if (extras.haftpflichtNachweis) {
    abschnitte.push({
      name: 'Versicherung und Haftung',
      absaetze: [
        'Der Mieter verpflichtet sich, für die Dauer des Mietverhältnisses eine Berufs- bzw. Betriebshaftpflichtversicherung mit branchenüblicher Deckungssumme zu unterhalten und dem Vermieter den Bestand vor Mietbeginn sowie auf Verlangen einmal jährlich durch geeignete Unterlagen nachzuweisen.',
        'Für Schäden, die der Mieter im Rahmen seiner Tätigkeit Dritten — insbesondere seinen Kunden — zufügt, haftet ausschließlich der Mieter. Er stellt den Vermieter insoweit von Ansprüchen Dritter frei.',
        'Der Vermieter haftet nicht für vom Mieter eingebrachte Sachen (Werkzeuge, Produkte, Wertgegenstände), es sei denn, der Schaden beruht auf Vorsatz oder grober Fahrlässigkeit des Vermieters oder seiner Erfüllungsgehilfen.',
      ],
    })
  }

  // ── Produkte und Material ──
  {
    const absaetze: string[] = extras.eigeneProdukte
      ? [
          'Der Mieter verwendet für seine Tätigkeit ausschließlich eigene Produkte, Werkzeuge und Verbrauchsmaterialien. Er ist für deren Beschaffung, ordnungsgemäße Lagerung und die Einhaltung produkt- und kosmetikrechtlicher Vorgaben selbst verantwortlich.',
          'Die Lagerung eigener Produkte und Geräte ist nur in den dem Mieter zugewiesenen Flächen und in verkehrssicherem Zustand zulässig. Gefahrstoffe sind nach den einschlägigen Vorschriften aufzubewahren.',
        ]
      : [
          'Der Vermieter stellt dem Mieter die im Salon vorhandenen Verbrauchsmaterialien und Produkte im betriebsüblichen Umfang zur Mitbenutzung zur Verfügung; die Kosten hierfür sind mit der Miete abgegolten, soweit die Parteien nichts Abweichendes vereinbaren.',
          'Ein Anspruch auf bestimmte Marken oder Produktlinien besteht nicht. Der Mieter hat mit den überlassenen Materialien sparsam und sorgfältig umzugehen; ein erkennbarer Mehrverbrauch ist dem Vermieter anzuzeigen.',
        ]
    absaetze.push(
      'Der Verkauf von Produkten an Kunden durch den Mieter erfolgt im eigenen Namen und auf eigene Rechnung des Mieters, sofern die Parteien nichts anderes in Textform vereinbaren.'
    )
    abschnitte.push({ name: 'Produkte und Material', absaetze })
  }

  // ── Zugang und Schlüssel ──
  {
    const absaetze: string[] = extras.schluessel
      ? [
          'Der Mieter erhält für die Dauer des Mietverhältnisses einen Schlüssel bzw. ein elektronisches Zugangsmedium zum Salon. Der Zugang ist ihm während der Öffnungszeiten des Salons sowie — nach Abstimmung mit dem Vermieter — auch außerhalb der Öffnungszeiten gestattet.',
          'Der Mieter hat den Schlüssel sorgfältig zu verwahren und darf ihn nicht an Dritte weitergeben. Der Verlust ist dem Vermieter unverzüglich anzuzeigen; die Kosten eines erforderlichen Austauschs der Schließanlage trägt der Mieter, soweit er den Verlust zu vertreten hat.',
          'Bei Beendigung des Mietverhältnisses sind sämtliche Schlüssel und Zugangsmedien unaufgefordert an den Vermieter zurückzugeben.',
        ]
      : [
          'Der Zugang zum Mietgegenstand ist dem Mieter während der üblichen Öffnungszeiten des Salons gestattet. Eine Schlüsselüberlassung erfolgt nicht.',
          'Nutzungszeiten außerhalb der Öffnungszeiten bedürfen der vorherigen Abstimmung mit dem Vermieter im Einzelfall.',
        ]
    abschnitte.push({ name: 'Zugang und Schlüssel', absaetze })
  }

  // ── Reinigung und Hygiene ──
  {
    const absaetze: string[] = [
      extras.reinigungInklusive
        ? 'Die Grundreinigung der Gemeinschaftsflächen sowie des Mietgegenstands übernimmt der Vermieter. Der Mieter hält seinen Arbeitsbereich während der Nutzung sauber und hinterlässt ihn nach jedem Arbeitstag in aufgeräumtem Zustand.'
        : 'Der Mieter reinigt seinen Arbeitsbereich einschließlich des Mietgegenstands eigenverantwortlich nach jedem Arbeitstag. Die Grundreinigung der Gemeinschaftsflächen obliegt dem Vermieter.',
      'Die Reinigung, Desinfektion und gegebenenfalls Sterilisation der eigenen Arbeitsgeräte und Instrumente obliegt in jedem Fall dem Mieter.',
      'Der Mieter verpflichtet sich, die für seine Tätigkeit einschlägigen Hygienevorschriften eigenverantwortlich einzuhalten, insbesondere die Hygieneverordnung des jeweiligen Bundeslandes sowie die Vorgaben des Infektionsschutzgesetzes. Behördliche Auflagen, die seine Tätigkeit betreffen, erfüllt der Mieter auf eigene Kosten.',
    ]
    if (objekt.typ === 'opraum') {
      absaetze.push(
        'Für invasive bzw. medizinische oder medizinnahe Behandlungen gelten ergänzend die erhöhten Anforderungen an Raumhygiene und Aufbereitung, insbesondere nach der Medizinprodukte-Betreiberverordnung (MPBetreibV) und den einschlägigen berufsrechtlichen Vorgaben. Der Mieter sichert zu, ausschließlich Behandlungen durchzuführen, zu denen er nach seiner Qualifikation und Zulassung berechtigt ist.'
      )
    }
    abschnitte.push({ name: 'Reinigung und Hygiene', absaetze })
  }

  // ── Konkurrenzschutz ──
  {
    const absaetze: string[] = extras.konkurrenzschutz
      ? [
          'Der Vermieter verpflichtet sich, während der Dauer des Mietverhältnisses innerhalb des Salons keinen weiteren Arbeitsplatz an einen Anbieter zu vermieten, dessen Leistungsangebot im Wesentlichen mit dem des Mieters identisch ist (vertragsimmanenter Konkurrenzschutz).',
          'Eigene Leistungen des Vermieters bzw. des Salonbetriebs sowie bereits bei Vertragsschluss bestehende Miet- und Beschäftigungsverhältnisse bleiben von diesem Konkurrenzschutz unberührt.',
        ]
      : [
          'Ein Konkurrenzschutz wird ausdrücklich nicht vereinbart. Der Vermieter ist berechtigt, weitere Arbeitsplätze im Salon auch an Anbieter mit gleichem oder ähnlichem Leistungsangebot zu vermieten und derartige Leistungen selbst anzubieten.',
        ]
    abschnitte.push({ name: 'Konkurrenzschutz', absaetze })
  }

  // ── Beendigung und Rückgabe ──
  {
    const absaetze: string[] = [
      'Bei Beendigung des Mietverhältnisses hat der Mieter den Mietgegenstand geräumt, gereinigt und — unter Berücksichtigung der durch den vertragsgemäßen Gebrauch entstandenen üblichen Abnutzung — in dem bei Übergabe vorhandenen Zustand zurückzugeben.',
      'Eigene Produkte, Geräte und sonstige eingebrachte Gegenstände hat der Mieter spätestens am letzten Tag des Mietverhältnisses zu entfernen. Nach Fristablauf zurückgelassene Gegenstände darf der Vermieter nach vorheriger Ankündigung in Textform auf Kosten des Mieters entfernen und einlagern.',
    ]
    if (extras.schluessel) {
      absaetze.push('Sämtliche überlassenen Schlüssel und Zugangsmedien sind spätestens bei Rückgabe des Mietgegenstands an den Vermieter herauszugeben.')
    }
    absaetze.push(
      'Die Parteien halten den Zustand des Mietgegenstands bei Rückgabe auf Wunsch einer Partei in einem gemeinsamen Übergabeprotokoll fest.'
    )
    abschnitte.push({ name: 'Beendigung und Rückgabe', absaetze })
  }

  // ── Schlussbestimmungen ──
  {
    abschnitte.push({
      name: 'Schlussbestimmungen',
      absaetze: [
        'Änderungen und Ergänzungen dieses Vertrags bedürfen der Schriftform; dies gilt auch für die Aufhebung dieses Schriftformerfordernisses. Mündliche Nebenabreden bestehen nicht.',
        'Sollten einzelne Bestimmungen dieses Vertrags ganz oder teilweise unwirksam oder undurchführbar sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. An die Stelle der unwirksamen oder undurchführbaren Bestimmung tritt diejenige wirksame Regelung, die dem wirtschaftlich Gewollten am nächsten kommt; Gleiches gilt für etwaige Vertragslücken.',
        `Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist — soweit gesetzlich zulässig — das für den Standort des Salons (${adresse}) örtlich zuständige Gericht. Es gilt das Recht der Bundesrepublik Deutschland.`,
        'Dieser Vertrag wird in zwei gleichlautenden Ausfertigungen errichtet; jede Partei erhält eine Ausfertigung.',
      ],
    })
  }

  // Fortlaufende Paragraphen-Nummerierung (übersprungene optionale §§ erzeugen keine Lücken)
  return abschnitte.map((a, i) => ({
    titel: `§ ${i + 1} ${a.name}`,
    absaetze: a.absaetze,
  }))
}

// ── Rubrum-Helfer für die Darstellung ────────────────────────────────────

export interface RubrumPartei {
  zeilen: string[]
  rolle: string
}

/** Baut die Parteienbezeichnung für den Vertragskopf. */
export function buildRubrum(data: VertragDaten): { vermieter: RubrumPartei; mieter: RubrumPartei } {
  const v = data.vermieter
  const m = data.mieter
  const firma = (v.firma ?? '').trim()
  const gewerbe = (m.gewerbe ?? '').trim()

  const vermieterZeilen: string[] = []
  if (firma.length > 0) {
    vermieterZeilen.push(firma, `vertreten durch ${oder(v.name)}`)
  } else {
    vermieterZeilen.push(oder(v.name))
  }
  vermieterZeilen.push(parteiAnschrift(v))

  const mieterZeilen: string[] = [oder(m.name)]
  if (gewerbe.length > 0) mieterZeilen.push(`selbstständig tätig als ${gewerbe}`)
  mieterZeilen.push(parteiAnschrift(m))

  return {
    vermieter: { zeilen: vermieterZeilen, rolle: 'im Folgenden „Vermieter“' },
    mieter: { zeilen: mieterZeilen, rolle: 'im Folgenden „Mieter“' },
  }
}
