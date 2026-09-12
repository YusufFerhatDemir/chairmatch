/**
 * Rechnung — Beleg und Zahlungsstand. KEIN Geldtransfer.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WAS DIESES MODUL IST
 * ══════════════════════════════════════════════════════════════════════
 *
 * Eine Rechnung ist zweierlei: ein DOKUMENT mit Pflichtangaben und ein
 * ZUSTAND („bezahlt, offen, storniert"). Dieses Modul bildet beides ab und
 * rechnet Positionen zusammen. Es bewegt kein Geld, spricht nicht mit
 * Stripe und stellt nichts zu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WAS ES AUSDRUECKLICH NICHT ENTSCHEIDET — und warum das hier stehen muss
 * ══════════════════════════════════════════════════════════════════════
 *
 * Eine Rechnung ist eine steuerliche Aussage. Die folgenden Fragen sind
 * NICHT technisch und in diesem Modul bewusst offen:
 *
 *   1. WER stellt sie? Der Salon dem Mieter (dann ist ChairMatch nur
 *      Vermittler und stellt hoechstens ueber die Provision eine eigene
 *      Rechnung), oder ChairMatch im eigenen Namen (dann ist es ein
 *      Eigengeschaeft mit ganz anderer Umsatzsteuerfolge)?
 *   2. WELCHER STEUERSATZ? Vermietung von Geschaeftsraeumen ist in
 *      Deutschland grundsaetzlich umsatzsteuerfrei (§ 4 Nr. 12 UStG), mit
 *      Option zur Steuerpflicht. Ob eine Stuhlmiete darunter faellt oder
 *      als sonstige Leistung mit 19 % zu behandeln ist, haengt am
 *      Vertragsinhalt.
 *   3. KLEINUNTERNEHMER? Viele Anbieter duerften unter § 19 UStG fallen und
 *      dann gar keine Umsatzsteuer ausweisen — eine Rechnung mit 19 % waere
 *      fuer sie falsch.
 *
 * Deshalb hat `taxRatePercent` KEINEN Standardwert. Fehlt er, ist die
 * Rechnung `draft` und nicht ausstellbar. Ein Default waere hier dieselbe
 * Klasse Fehler wie ein erfundener Preis, nur mit Finanzamt.
 */

export type InvoiceStatus =
  /** Angelegt, Pflichtangaben unvollstaendig. Nicht ausstellbar. */
  | 'draft'
  /** Ausgestellt, Zahlung offen. */
  | 'issued'
  /** Vollstaendig bezahlt. */
  | 'paid'
  /** Teilweise bezahlt. */
  | 'partially_paid'
  /** Storniert; braucht in Deutschland eine Gutschrift, keine Loeschung. */
  | 'cancelled'

export interface InvoiceLine {
  description: string
  quantity: number
  /** Einzelpreis NETTO in Cent. Kommt aus der Buchung, nie aus diesem Modul. */
  unitPriceCents: number
}

export interface Invoice {
  id: string
  /** Fortlaufende Nummer. Wird vergeben, nicht gerechnet — siehe unten. */
  number: string | null
  bookingId: string
  issuerId: string
  recipientId: string
  status: InvoiceStatus
  issuedAt: string | null
  dueAt: string | null
  lines: readonly InvoiceLine[]
  /** Ohne diesen Wert bleibt die Rechnung `draft`. Kein Default. */
  taxRatePercent: number | null
  /** Bereits verbuchte Zahlungen in Cent. Nur Buchhaltung, kein Transfer. */
  paidCents: number
}

export interface InvoiceSumme {
  netCents: number
  taxCents: number
  grossCents: number
}

/**
 * Summiert die Positionen.
 *
 * Rundung: je Position auf ganze Cent, danach die Steuer auf die
 * Nettosumme — nicht je Position. Beide Wege sind zulaessig, aber sie
 * ergeben unterschiedliche Betraege, und die Wahl gehoert festgehalten
 * statt zufaellig zu entstehen.
 */
export function summe(invoice: Pick<Invoice, 'lines' | 'taxRatePercent'>): InvoiceSumme {
  const netCents = invoice.lines.reduce(
    (s, l) => s + Math.round(l.unitPriceCents * l.quantity),
    0,
  )
  const satz = invoice.taxRatePercent
  // Kein Steuersatz → keine erfundene Steuer. Die Rechnung ist dann ohnehin
  // `draft` und darf nicht hinaus.
  const taxCents =
    typeof satz === 'number' && Number.isFinite(satz) && satz >= 0
      ? Math.round((netCents * satz) / 100)
      : 0
  return { netCents, taxCents, grossCents: netCents + taxCents }
}

export function offenerBetragCents(invoice: Invoice): number {
  return Math.max(0, summe(invoice).grossCents - Math.max(0, invoice.paidCents))
}

/**
 * Fehlt etwas, das eine Rechnung in Deutschland braucht?
 *
 * Bewusst unvollstaendig und als solche gekennzeichnet: § 14 Abs. 4 UStG
 * verlangt unter anderem Name und Anschrift beider Seiten, Steuernummer
 * oder USt-IdNr. des Ausstellers, Ausstellungsdatum, fortlaufende Nummer,
 * Menge und Art der Leistung, Zeitpunkt der Leistung, Entgelt nach
 * Steuersaetzen, den Steuerbetrag und bei Steuerbefreiung einen Hinweis
 * darauf. Dieses Modul kennt davon nur, was im Datenmodell steht — Adressen
 * und Steuernummern gibt es im Schema heute nicht.
 *
 * Es prueft deshalb, was es pruefen KANN, und behauptet nicht, damit sei
 * die Rechnung rechtssicher.
 */
export function fehlendePflichtangaben(invoice: Invoice): string[] {
  const fehlt: string[] = []
  if (!invoice.number) fehlt.push('Rechnungsnummer')
  if (!invoice.issuedAt) fehlt.push('Ausstellungsdatum')
  if (invoice.lines.length === 0) fehlt.push('mindestens eine Position')
  if (invoice.taxRatePercent === null || invoice.taxRatePercent === undefined) {
    fehlt.push('Steuersatz (oder ausdrueckliche Steuerbefreiung)')
  }
  if (!invoice.issuerId) fehlt.push('Aussteller')
  if (!invoice.recipientId) fehlt.push('Empfaenger')
  return fehlt
}

export function istAusstellbar(invoice: Invoice): boolean {
  return fehlendePflichtangaben(invoice).length === 0
}

/**
 * Zahlungsstand aus den verbuchten Betraegen.
 *
 * Nur Buchhaltung: `paidCents` wird von aussen gesetzt (heute von Hand, mit
 * Stripe spaeter aus einem Webhook). Dieses Modul zieht kein Geld ein.
 */
export function zahlungsstand(invoice: Invoice): InvoiceStatus {
  if (invoice.status === 'cancelled' || invoice.status === 'draft') return invoice.status
  const { grossCents } = summe(invoice)
  const bezahlt = Math.max(0, invoice.paidCents)
  if (grossCents > 0 && bezahlt >= grossCents) return 'paid'
  if (bezahlt > 0) return 'partially_paid'
  return 'issued'
}

/**
 * Eine Rechnung wird NICHT geloescht und nicht rueckwirkend geaendert.
 *
 * In Deutschland ist der Weg eine Storno-/Gutschriftsrechnung, die die
 * urspruengliche aufhebt. Diese Funktion setzt deshalb nur den Status und
 * laesst Nummer, Positionen und Datum stehen. Wer hier ein `DELETE`
 * einbaut, bricht die Aufbewahrungspflicht.
 */
export function storniere(invoice: Invoice): Invoice {
  return { ...invoice, status: 'cancelled' }
}

/**
 * BUSINESS_DECISION_REQUIRED — der Nummernkreis.
 *
 * Rechnungsnummern muessen fortlaufend und luechenlos sein. Das ist keine
 * Formatierungsfrage, sondern eine Vergabestrategie mit Nebenwirkungen:
 *
 *   - Pro Aussteller oder plattformweit? Wenn der Salon Aussteller ist,
 *     braucht JEDER Salon seinen eigenen Kreis.
 *   - Eine Luecke entsteht schon durch eine abgebrochene Transaktion. Eine
 *     Postgres-Sequence luft bei ROLLBACK weiter und erzeugt genau das.
 *   - Jahresweiser Neustart?
 *
 * Diese Funktion vergibt deshalb KEINE Nummer, sondern sagt, dass es sie zu
 * entscheiden gibt. Eine erfundene Nummer ist schlimmer als keine.
 */
export function naechsteRechnungsnummer(): null {
  return null
}
