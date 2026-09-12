// @vitest-environment node
/**
 * Die Buchungs-Pipeline als Lesemodell — und die Zusicherung, dass sie
 * KEINE zweite Statuswelt aufmacht.
 *
 * Die letzte Testgruppe ist die wichtigste: sie prueft, dass die Pipeline
 * genau die Statuswerte kennt, die `VALID_TRANSITIONS` fuehrt, und dass sie
 * keinen neuen erfindet. Drei der neun gefragten Stufennamen haben im
 * Schema keine Entsprechung (`REQUESTED`, `IN_PROGRESS`, `DISPUTED`) — sie
 * werden abgeleitet, nicht gespeichert. Sobald jemand sie doch als
 * `bookings.status` eintraegt, faellt hier etwas durch.
 */
import { describe, it, expect } from 'vitest'
import {
  PIPELINE_ENDSTUFEN,
  PIPELINE_REIHENFOLGE,
  istEndstufe,
  pipelineStage,
  rechnungMoeglich,
  streitIstOffen,
  streitMoeglich,
  terminFenster,
  type PipelineStage,
} from '@/modules/booking/pipeline'
import { VALID_TRANSITIONS } from '@/modules/booking/booking.types'

const TAG = '2026-09-12'
const mittags = (hhmm: string) => new Date(`${TAG}T${hhmm}:00`)

const bestaetigt = { status: 'confirmed', booking_date: TAG, start_time: '10:00', end_time: '11:00' }

describe('Gespeicherter Buchungsstatus → Stufe', () => {
  const faelle: Array<[string, PipelineStage]> = [
    ['pending', 'PENDING'],
    ['confirmed', 'CONFIRMED'],
    ['completed', 'COMPLETED'],
    ['cancelled', 'CANCELLED'],
    ['no_show', 'NO_SHOW'],
    ['refunded', 'REFUNDED'],
  ]

  it.each(faelle)('%s → %s', (status, erwartet) => {
    // Fenster absichtlich in der Vergangenheit, damit nur der Status zaehlt.
    expect(pipelineStage({ booking: { status } }, mittags('23:00'))).toBe(erwartet)
  })

  it('kennt beide Schreibweisen von cancelled', () => {
    // Im Repo kommen `cancelled` und `canceled` beide vor.
    expect(pipelineStage({ booking: { status: 'canceled' } })).toBe('CANCELLED')
  })

  it('raet bei einem unbekannten Status NICHT', () => {
    // `null` heisst „diese Pipeline kennt den Vorgang nicht" — besser als
    // eine Stufe, die nicht stimmt.
    expect(pipelineStage({ booking: { status: 'irgendwas' } })).toBeNull()
    expect(pipelineStage({})).toBeNull()
    expect(pipelineStage({ booking: null, anfrage: null })).toBeNull()
  })
})

describe('IN_PROGRESS kommt aus der Uhr, nicht aus der Datenbank', () => {
  it('nur waehrend des Fensters', () => {
    expect(pipelineStage({ booking: bestaetigt }, mittags('09:59'))).toBe('CONFIRMED')
    expect(pipelineStage({ booking: bestaetigt }, mittags('10:00'))).toBe('IN_PROGRESS')
    expect(pipelineStage({ booking: bestaetigt }, mittags('10:30'))).toBe('IN_PROGRESS')
    // Das Ende ist exklusiv: um 11:00 laeuft nichts mehr.
    expect(pipelineStage({ booking: bestaetigt }, mittags('11:00'))).toBe('CONFIRMED')
  })

  it('nur fuer bestaetigte Buchungen', () => {
    // Eine abgeschlossene Buchung ist nicht „gerade im Gange", auch wenn
    // die Uhr im Fenster steht.
    for (const status of ['pending', 'completed', 'cancelled', 'no_show', 'refunded']) {
      expect(pipelineStage({ booking: { ...bestaetigt, status } }, mittags('10:30')), status)
        .not.toBe('IN_PROGRESS')
    }
  })

  it('ein unlesbares Fenster fuehrt nie zu IN_PROGRESS', () => {
    const kaputt = [
      { status: 'confirmed', booking_date: TAG, start_time: null, end_time: '11:00' },
      { status: 'confirmed', booking_date: null, start_time: '10:00', end_time: '11:00' },
      { status: 'confirmed', booking_date: TAG, start_time: 'kaputt', end_time: '11:00' },
      // Ende vor Beginn ist kein Fenster.
      { status: 'confirmed', booking_date: TAG, start_time: '11:00', end_time: '10:00' },
    ]
    for (const b of kaputt) {
      expect(pipelineStage({ booking: b }, mittags('10:30'))).toBe('CONFIRMED')
    }
  })

  it('terminFenster liest beide Uhrzeitformate', () => {
    expect(terminFenster({ booking_date: TAG, start_time: '10:00', end_time: '11:00' })).not.toBeNull()
    expect(terminFenster({ booking_date: TAG, start_time: '10:00:00', end_time: '11:00:00' })).not.toBeNull()
    expect(terminFenster(null)).toBeNull()
  })
})

describe('Ein offener Streitfall schlaegt alles', () => {
  it('auch eine abgeschlossene oder stornierte Buchung', () => {
    // Das ist der Zustand, an dem jemand arbeiten muss — also der, der
    // angezeigt gehoert.
    for (const status of ['completed', 'cancelled', 'no_show', 'refunded', 'confirmed']) {
      expect(pipelineStage({ booking: { status }, streit: { status: 'open' } }), status)
        .toBe('DISPUTED')
    }
  })

  it('jeder offene Streitstatus zaehlt', () => {
    for (const s of ['open', 'awaiting_response', 'in_review', 'escalated']) {
      expect(streitIstOffen({ status: s }), s).toBe(true)
    }
  })

  it('ein geschlossener Streitfall schlaegt nichts', () => {
    // Danach zaehlt wieder, was mit der Buchung passiert ist.
    for (const s of ['resolved', 'withdrawn']) {
      expect(streitIstOffen({ status: s }), s).toBe(false)
      expect(pipelineStage({ booking: { status: 'completed' }, streit: { status: s } }))
        .toBe('COMPLETED')
    }
  })

  it('kein Streitfall ist kein offener Streitfall', () => {
    expect(streitIstOffen(null)).toBe(false)
    expect(streitIstOffen(undefined)).toBe(false)
    expect(streitIstOffen({})).toBe(false)
  })
})

describe('REQUESTED ist die Mietanfrage, nicht ein fehlender Buchungsstatus', () => {
  it('eine offene Anfrage ohne Buchung ist REQUESTED', () => {
    expect(pipelineStage({ anfrage: { status: 'open' } })).toBe('REQUESTED')
  })

  it('angenommen heisst: Buchung folgt', () => {
    expect(pipelineStage({ anfrage: { status: 'accepted' } })).toBe('PENDING')
  })

  it('abgelehnt und zurueckgezogen enden gleich', () => {
    expect(pipelineStage({ anfrage: { status: 'declined' } })).toBe('CANCELLED')
    expect(pipelineStage({ anfrage: { status: 'withdrawn' } })).toBe('CANCELLED')
  })

  it('sobald eine Buchung existiert, zaehlt sie', () => {
    // Die Buchung ist der spaetere und damit maßgebliche Vorgang.
    expect(
      pipelineStage({ booking: { status: 'confirmed' }, anfrage: { status: 'open' } }, mittags('23:00')),
    ).toBe('CONFIRMED')
  })
})

describe('Was an welcher Stufe moeglich ist', () => {
  it('Rechnung nur, wo etwas stattgefunden hat', () => {
    expect(rechnungMoeglich('COMPLETED')).toBe(true)
    // No-Show kann eine Gebuehr tragen (no_show_fee_cents), also auch einen Beleg.
    expect(rechnungMoeglich('NO_SHOW')).toBe(true)
    // Bei CANCELLED haengt es an der Stornoregel — und die ist offen.
    for (const s of ['REQUESTED', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'CANCELLED', 'DISPUTED', 'REFUNDED'] as const) {
      expect(rechnungMoeglich(s), s).toBe(false)
    }
    expect(rechnungMoeglich(null)).toBe(false)
  })

  it('Streitfall nicht vor dem Termin', () => {
    // Bis dahin ist Absagen der richtige Weg, nicht Streiten.
    for (const s of ['REQUESTED', 'PENDING', 'CONFIRMED'] as const) {
      expect(streitMoeglich(s), s).toBe(false)
    }
    for (const s of ['IN_PROGRESS', 'COMPLETED', 'NO_SHOW'] as const) {
      expect(streitMoeglich(s), s).toBe(true)
    }
  })

  it('Endstufen sind Endstufen', () => {
    for (const s of PIPELINE_ENDSTUFEN) expect(istEndstufe(s)).toBe(true)
    for (const s of ['REQUESTED', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DISPUTED'] as const) {
      expect(istEndstufe(s), s).toBe(false)
    }
  })
})

describe('KEINE zweite Statuswelt', () => {
  it('die Pipeline deckt jeden Status aus VALID_TRANSITIONS ab', () => {
    // Kommt ein Statuswert in der Uebergangstabelle dazu, den die Pipeline
    // nicht kennt, liefert sie dafuer `null` — und dieser Test faellt durch.
    const stati = new Set(VALID_TRANSITIONS.flatMap(t => [t.from, t.to]))
    for (const s of stati) {
      expect(pipelineStage({ booking: { status: s } }, mittags('23:00')), s).not.toBeNull()
    }
  })

  it('die drei abgeleiteten Stufen stehen NICHT in VALID_TRANSITIONS', () => {
    // Der eigentliche Riegel gegen die zweite Statuswelt: REQUESTED,
    // IN_PROGRESS und DISPUTED sind Ableitungen. Traegt jemand sie als
    // gespeicherten Buchungsstatus nach, ist derselbe Sachverhalt an zwei
    // Orten — und irgendwann widersprechen sie sich.
    const gespeichert = new Set(
      VALID_TRANSITIONS.flatMap(t => [t.from, t.to]).map(s => s.toLowerCase()),
    )
    for (const abgeleitet of ['requested', 'in_progress', 'disputed']) {
      expect(gespeichert.has(abgeleitet), abgeleitet).toBe(false)
    }
  })

  it('die Reihenfolge enthaelt jede Stufe genau einmal', () => {
    expect(new Set(PIPELINE_REIHENFOLGE).size).toBe(PIPELINE_REIHENFOLGE.length)
    expect(PIPELINE_REIHENFOLGE).toHaveLength(9)
  })
})
