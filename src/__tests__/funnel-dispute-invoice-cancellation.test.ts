// @vitest-environment node
/**
 * Die drei fehlenden Funnel-Stufen.
 *
 * Der rote Faden durch alle drei Testgruppen ist derselbe und der Grund,
 * warum die Module ueberhaupt so gebaut sind: **eine fehlende Angabe darf
 * nie zu einer Zahl werden.** Weder zu 0 noch zum vollen Betrag. Beide
 * Richtungen waeren erfunden, und die guenstigere ist nicht die harmlosere
 * — sie kostet nur jemand anderen.
 */
import { describe, it, expect } from 'vitest'
import {
  cancellationOutcome,
  noShowOutcome,
  type CancellationPolicy,
} from '@/modules/booking/cancellation'
import {
  DISPUTE_RESPONSE_HOURS,
  darfWechseln,
  eroeffne,
  folgeNachFristablauf,
  fristAbgelaufen,
  istEndzustand,
  wechsle,
  type Dispute,
} from '@/modules/booking/dispute'
import {
  fehlendePflichtangaben,
  istAusstellbar,
  naechsteRechnungsnummer,
  offenerBetragCents,
  storniere,
  summe,
  zahlungsstand,
  type Invoice,
} from '@/modules/booking/invoice'

// ════════════════════════════════════════════════════════════════════
describe('Storno — ohne Regel keine Zahl', () => {
  it('ohne Regel ist das Ergebnis unbestimmt, nicht kostenlos', () => {
    const r = cancellationOutcome(null, 72, 5000)
    expect(r.kind).toBe('unbestimmt')
    expect(r.feeCents).toBeNull()
  })

  it('Frist ohne Gebuehrenart bleibt unbestimmt', () => {
    // Der heutige Zustand: `cancellationHours` gibt es, ein Gebuehrenfeld
    // nicht. Daraus „also kostenlos" zu machen waere eine Erfindung.
    const p: CancellationPolicy = { cancellationWindowHours: 48 }
    expect(cancellationOutcome(p, 12, 5000).kind).toBe('unbestimmt')
  })

  it('innerhalb der Frist ist kostenlos — das folgt aus der Regel', () => {
    const p: CancellationPolicy = { cancellationWindowHours: 48 }
    const r = cancellationOutcome(p, 72, 5000)
    expect(r.kind).toBe('free')
    expect(r.feeCents).toBe(0)
  })

  it('rechnet Prozent und Festbetrag aus der Regel', () => {
    const prozent: CancellationPolicy = {
      cancellationWindowHours: 48,
      cancellationFeeType: 'percent',
      cancellationFeeValue: 50,
    }
    expect(cancellationOutcome(prozent, 12, 5000)).toMatchObject({ kind: 'fee', feeCents: 2500 })

    const fest: CancellationPolicy = {
      cancellationWindowHours: 48,
      cancellationFeeType: 'fixed',
      cancellationFeeValue: 1500,
    }
    expect(cancellationOutcome(fest, 12, 5000)).toMatchObject({ kind: 'fee', feeCents: 1500 })
  })

  it('eine Gebuehr uebersteigt nie den Buchungswert', () => {
    // Sonst wuerde aus einer Absage eine Forderung.
    const p: CancellationPolicy = {
      cancellationWindowHours: 48,
      cancellationFeeType: 'fixed',
      cancellationFeeValue: 999_999,
    }
    expect(cancellationOutcome(p, 1, 5000)).toMatchObject({ kind: 'fee', feeCents: 5000 })
  })

  it('ein Prozentsatz ueber 100 ist kein Anteil, sondern ein Fehler', () => {
    const p: CancellationPolicy = {
      cancellationWindowHours: 48,
      cancellationFeeType: 'percent',
      cancellationFeeValue: 150,
    }
    expect(cancellationOutcome(p, 1, 5000).kind).toBe('unbestimmt')
  })

  it('die Staffel schlaegt das Einzelfenster und greift die passende Stufe', () => {
    const p: CancellationPolicy = {
      cancellationWindowHours: 1, // wuerde alles kostenlos machen
      tiers: [
        { hoursBefore: 48, feeType: 'none' },
        { hoursBefore: 24, feeType: 'percent', feeValue: 50 },
        { hoursBefore: 0, feeType: 'percent', feeValue: 100 },
      ],
    }
    expect(cancellationOutcome(p, 72, 10_000).kind).toBe('free')
    expect(cancellationOutcome(p, 30, 10_000)).toMatchObject({ feeCents: 5000 })
    expect(cancellationOutcome(p, 2, 10_000)).toMatchObject({ feeCents: 10_000 })
  })

  it('unterhalb der niedrigsten Staffelstufe bleibt es unbestimmt', () => {
    // Der Termin liegt in der Vergangenheit und die Staffel sagt dazu
    // nichts. „Also voller Preis" waere genau die Erfindung.
    const p: CancellationPolicy = { tiers: [{ hoursBefore: 24, feeType: 'percent', feeValue: 50 }] }
    expect(cancellationOutcome(p, -3, 10_000).kind).toBe('unbestimmt')
  })

  it('No-Show nutzt das einzige Feld, das es wirklich gibt', () => {
    expect(noShowOutcome({ noShowFeeCents: 2000 }, 5000)).toMatchObject({ feeCents: 2000 })
    expect(noShowOutcome({ noShowFeeCents: 0 }, 5000).kind).toBe('free')
    expect(noShowOutcome({}, 5000).kind).toBe('unbestimmt')
    expect(noShowOutcome(null, 5000).kind).toBe('unbestimmt')
  })
})

// ════════════════════════════════════════════════════════════════════
const T0 = '2026-09-12T08:00:00.000Z'

function offenerFall(): Dispute {
  return eroeffne({
    id: 'd1',
    bookingId: 'b1',
    openedBy: 'customer',
    reason: 'hygiene',
    openedAt: T0,
  })
}

describe('Streitfall — Zustandsmaschine', () => {
  it('ein neuer Fall ist offen und hat sofort eine Frist', () => {
    const d = offenerFall()
    expect(d.status).toBe('open')
    expect(d.resolution).toBeNull()
    expect(d.timeline).toHaveLength(1)
    // 48 Stunden nach T0.
    expect(d.responseDueAt).toBe('2026-09-14T08:00:00.000Z')
  })

  it('nur der Eroeffner darf zurueckziehen', () => {
    const d = offenerFall() // vom Kunden eroeffnet
    expect(darfWechseln(d, 'withdrawn', 'customer')).toBe(true)
    // Sonst waere „Beschwerde des Kunden zurueckziehen" der bequemste Weg
    // aus jedem Streit.
    expect(darfWechseln(d, 'withdrawn', 'provider')).toBe(false)
    expect(darfWechseln(d, 'withdrawn', 'platform')).toBe(false)
  })

  it('nur die Plattform entscheidet', () => {
    const d = { ...offenerFall(), status: 'in_review' as const }
    expect(darfWechseln(d, 'resolved', 'platform')).toBe(true)
    expect(darfWechseln(d, 'resolved', 'provider')).toBe(false)
    expect(darfWechseln(d, 'resolved', 'customer')).toBe(false)
  })

  it('aus einem Endzustand fuehrt kein Weg zurueck', () => {
    for (const s of ['resolved', 'withdrawn'] as const) {
      expect(istEndzustand(s)).toBe(true)
      const d = { ...offenerFall(), status: s }
      expect(darfWechseln(d, 'in_review', 'platform')).toBe(false)
      expect(darfWechseln(d, 'escalated', 'platform')).toBe(false)
    }
  })

  it('ein Abschluss ohne Ausgang ist kein Abschluss', () => {
    const d = { ...offenerFall(), status: 'in_review' as const }
    const ohne = wechsle(d, 'resolved', 'platform', T0, 'fertig')
    expect(ohne.ok).toBe(false)

    const mit = wechsle(d, 'resolved', 'platform', T0, 'fertig', 'partial_refund')
    expect(mit.ok).toBe(true)
    if (mit.ok) {
      expect(mit.dispute.resolution).toBe('partial_refund')
      expect(mit.dispute.resolvedAt).toBe(T0)
    }
  })

  it('ein Ausgang gehoert nur an den Abschluss', () => {
    const d = offenerFall()
    const r = wechsle(d, 'in_review', 'platform', T0, 'sehe mir das an', 'no_action')
    expect(r.ok).toBe(false)
  })

  it('jeder Wechsel waechst den Verlauf', () => {
    const d = offenerFall()
    const r = wechsle(d, 'in_review', 'platform', T0, 'uebernommen')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.dispute.timeline).toHaveLength(2)
      expect(r.dispute.timeline.at(-1)).toMatchObject({ by: 'platform', status: 'in_review' })
    }
  })
})

describe('Streitfall — Frist', () => {
  const spaeter = new Date('2026-09-14T08:00:01.000Z')
  const frueher = new Date('2026-09-13T08:00:00.000Z')

  it('laeuft nach 48 Stunden ab', () => {
    expect(DISPUTE_RESPONSE_HOURS).toBe(48)
    const d = offenerFall()
    expect(fristAbgelaufen(d, frueher)).toBe(false)
    expect(fristAbgelaufen(d, spaeter)).toBe(true)
  })

  it('ein abgeschlossener Fall reisst keine Frist mehr', () => {
    // Sonst zaehlte die Uhr fuer erledigte Faelle ewig weiter.
    const d = { ...offenerFall(), status: 'resolved' as const }
    expect(fristAbgelaufen(d, spaeter)).toBe(false)
  })

  it('ein Fristablauf loest KEINE Automatik aus', () => {
    const f = folgeNachFristablauf()
    expect(f.automatik).toBe(false)
    expect(f.grund).toMatch(/BUSINESS_DECISION_REQUIRED/)
  })
})

// ════════════════════════════════════════════════════════════════════
function rechnung(over: Partial<Invoice> = {}): Invoice {
  return {
    id: 'r1',
    number: null,
    bookingId: 'b1',
    issuerId: 'salon-1',
    recipientId: 'kunde-1',
    status: 'draft',
    issuedAt: null,
    dueAt: null,
    lines: [{ description: 'Stuhlmiete 1 Tag', quantity: 1, unitPriceCents: 5000 }],
    taxRatePercent: null,
    paidCents: 0,
    ...over,
  }
}

describe('Rechnung — ohne Steuersatz kein Beleg', () => {
  it('rechnet ohne Steuersatz keine Steuer dazu', () => {
    // Ein Default von 19 % waere dieselbe Klasse Fehler wie ein erfundener
    // Preis, nur mit Finanzamt.
    expect(summe(rechnung())).toEqual({ netCents: 5000, taxCents: 0, grossCents: 5000 })
  })

  it('rechnet mit Steuersatz korrekt', () => {
    expect(summe(rechnung({ taxRatePercent: 19 }))).toEqual({
      netCents: 5000,
      taxCents: 950,
      grossCents: 5950,
    })
  })

  it('nennt die fehlenden Pflichtangaben und bleibt nicht ausstellbar', () => {
    const fehlt = fehlendePflichtangaben(rechnung())
    expect(fehlt).toContain('Rechnungsnummer')
    expect(fehlt).toContain('Ausstellungsdatum')
    expect(fehlt).toContain('Steuersatz (oder ausdrueckliche Steuerbefreiung)')
    expect(istAusstellbar(rechnung())).toBe(false)
  })

  it('ist vollstaendig, wenn alles da ist', () => {
    const v = rechnung({ number: '2026-0001', issuedAt: T0, taxRatePercent: 0 })
    expect(fehlendePflichtangaben(v)).toEqual([])
    expect(istAusstellbar(v)).toBe(true)
    // Steuersatz 0 ist eine Aussage (Befreiung), nicht „fehlt".
    expect(summe(v).taxCents).toBe(0)
  })

  it('mehrere Positionen mit Menge', () => {
    const v = rechnung({
      taxRatePercent: 19,
      lines: [
        { description: 'Stuhl', quantity: 3, unitPriceCents: 4500 },
        { description: 'Schrank', quantity: 1, unitPriceCents: 500 },
      ],
    })
    expect(summe(v).netCents).toBe(14_000)
  })
})

describe('Rechnung — Zahlungsstand, kein Geldtransfer', () => {
  const v = rechnung({ number: '1', issuedAt: T0, taxRatePercent: 0, status: 'issued' })

  it('offen, teilweise, bezahlt', () => {
    expect(zahlungsstand({ ...v, paidCents: 0 })).toBe('issued')
    expect(zahlungsstand({ ...v, paidCents: 2000 })).toBe('partially_paid')
    expect(zahlungsstand({ ...v, paidCents: 5000 })).toBe('paid')
    expect(zahlungsstand({ ...v, paidCents: 9999 })).toBe('paid')
  })

  it('offener Betrag wird nie negativ', () => {
    expect(offenerBetragCents({ ...v, paidCents: 9999 })).toBe(0)
    expect(offenerBetragCents({ ...v, paidCents: 2000 })).toBe(3000)
  })

  it('Entwurf und Storno bleiben, was sie sind', () => {
    expect(zahlungsstand({ ...v, status: 'draft', paidCents: 5000 })).toBe('draft')
    expect(zahlungsstand({ ...v, status: 'cancelled', paidCents: 5000 })).toBe('cancelled')
  })

  it('Stornieren loescht nichts', () => {
    // In Deutschland ist der Weg eine Gutschrift, keine Loeschung — Nummer,
    // Positionen und Datum bleiben stehen.
    const s = storniere({ ...v, paidCents: 1000 })
    expect(s.status).toBe('cancelled')
    expect(s.number).toBe('1')
    expect(s.issuedAt).toBe(T0)
    expect(s.lines).toHaveLength(1)
  })

  it('vergibt keine Rechnungsnummer', () => {
    // Der Nummernkreis ist eine Entscheidung mit Nebenwirkungen (pro
    // Aussteller? Luecken bei ROLLBACK? Jahreswechsel?).
    expect(naechsteRechnungsnummer()).toBeNull()
  })
})
