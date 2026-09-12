// @vitest-environment node
/**
 * Der Prüfvorgang hinter dem Stufenmodell.
 *
 * Drei Eigenschaften trägt dieser Test, und alle drei sind der Grund, warum
 * es den Vorgang überhaupt gibt:
 *
 *   1. Eine Entscheidung braucht einen Namen. `approved`/`rejected` ohne
 *      Prüfer wäre wieder das, was `salons.is_verified` heute ist.
 *   2. Eine Ablehnung braucht einen Grund — sonst weiß der Betroffene nicht,
 *      ob er ein besseres Foto schicken oder es lassen soll.
 *   3. `expired` ist ein eigener Zustand. „War einmal belegt, ist es nicht
 *      mehr" ist etwas anderes als „durchgefallen" und als „nie versucht".
 *
 * Und über allem: der Vorgang kann eine Dimension bestätigen, aber das
 * öffentliche Abzeichen bleibt trotzdem zu.
 */
import { describe, it, expect } from 'vitest'
import {
  REVIEW_TRANSITIONS,
  darfNachreichen,
  darfReviewWechseln,
  eroeffneReview,
  laeuftBaldAb,
  pruefungDurchWenErlaubt,
  reVerifikationFaellig,
  wechsleReview,
  type ReviewVorgang,
} from '@/modules/verification/review'
import { darfAlsVerifiziertGelten, verifikationsprofil } from '@/modules/verification/verification'

const T0 = '2026-09-12T08:00:00.000Z'
const PRUEFER = '33333333-3333-4333-8333-333333333333'

function neu(): ReviewVorgang {
  return eroeffneReview({
    id: 'rv-1',
    subjectId: 'salon-1',
    subjectType: 'salon',
    dimension: 'qualifikation',
  })
}

function eingereicht(): ReviewVorgang {
  const r = wechsleReview(neu(), 'submitted', 'provider', T0, { documentIds: ['doc-1'] })
  if (!r.ok) throw new Error(r.grund)
  return r.vorgang
}

function inPruefung(): ReviewVorgang {
  const r = wechsleReview(eingereicht(), 'in_review', 'reviewer', T0, { reviewerId: PRUEFER })
  if (!r.ok) throw new Error(r.grund)
  return r.vorgang
}

describe('Der Weg durch den Vorgang', () => {
  it('beginnt bei not_submitted, ohne Pruefer und ohne Ablauf', () => {
    const v = neu()
    expect(v.status).toBe('not_submitted')
    expect(v.reviewerId).toBeNull()
    expect(v.expiresAt).toBeNull()
    expect(v.timeline).toHaveLength(0)
  })

  it('Einreichen → Pruefung → Genehmigung', () => {
    const g = wechsleReview(inPruefung(), 'approved', 'reviewer', T0, {
      reviewerId: PRUEFER,
      expiresAt: '2027-09-12T00:00:00.000Z',
      note: 'Approbationsurkunde gesehen',
    })
    expect(g.ok).toBe(true)
    if (!g.ok) return
    expect(g.vorgang.status).toBe('approved')
    expect(g.vorgang.reviewerId).toBe(PRUEFER)
    expect(g.vorgang.reviewedAt).toBe(T0)
    expect(g.vorgang.expiresAt).toBe('2027-09-12T00:00:00.000Z')
    // Jeder Wechsel waechst den Verlauf.
    expect(g.vorgang.timeline).toHaveLength(3)
  })

  it('Rueckfrage und erneutes Einreichen', () => {
    const frage = wechsleReview(inPruefung(), 'info_requested', 'reviewer', T0, {
      reviewerId: PRUEFER,
      note: 'Rueckseite fehlt',
    })
    expect(frage.ok).toBe(true)
    if (!frage.ok) return
    const wieder = wechsleReview(frage.vorgang, 'submitted', 'provider', T0, {
      documentIds: ['doc-1', 'doc-2'],
    })
    expect(wieder.ok).toBe(true)
    if (!wieder.ok) return
    expect(wieder.vorgang.documentIds).toHaveLength(2)
  })

  it('nicht vorgesehene Wechsel werden abgewiesen', () => {
    // Direkt von not_submitted auf approved — ohne dass jemand etwas
    // eingereicht oder angesehen hat.
    expect(darfReviewWechseln(neu(), 'approved', 'reviewer')).toBe(false)
    // Der Anbieter genehmigt sich selbst.
    expect(darfReviewWechseln(inPruefung(), 'approved', 'provider')).toBe(false)
    // Der Pruefer reicht ein.
    expect(darfReviewWechseln(neu(), 'submitted', 'reviewer')).toBe(false)
  })
})

describe('Eine Entscheidung braucht einen Namen', () => {
  it('Genehmigung ohne Pruefer wird abgewiesen', () => {
    const r = wechsleReview(inPruefung(), 'approved', 'reviewer', T0, {})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.grund).toMatch(/ohne Pruefer/)
  })

  it('Ablehnung ohne Pruefer wird abgewiesen', () => {
    const r = wechsleReview(inPruefung(), 'rejected', 'reviewer', T0, {
      rejectionReason: 'unreadable',
    })
    expect(r.ok).toBe(false)
  })
})

describe('Eine Ablehnung braucht einen Grund', () => {
  it('ohne Grund wird sie abgewiesen', () => {
    const r = wechsleReview(inPruefung(), 'rejected', 'reviewer', T0, { reviewerId: PRUEFER })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.grund).toMatch(/ohne Grund/)
  })

  it('mit Grund und Notiz geht sie durch', () => {
    const r = wechsleReview(inPruefung(), 'rejected', 'reviewer', T0, {
      reviewerId: PRUEFER,
      rejectionReason: 'unreadable',
      rejectionNote: 'Scan abgeschnitten',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.vorgang.rejectionReason).toBe('unreadable')
    expect(r.vorgang.rejectionNote).toBe('Scan abgeschnitten')
  })

  it('ein Grund gehoert nur an eine Ablehnung', () => {
    const r = wechsleReview(inPruefung(), 'approved', 'reviewer', T0, {
      reviewerId: PRUEFER,
      rejectionReason: 'other',
    })
    expect(r.ok).toBe(false)
  })

  it('nach einer behebbaren Ablehnung darf nachgereicht werden', () => {
    for (const grund of ['unreadable', 'expired_document', 'wrong_document', 'incomplete'] as const) {
      expect(darfNachreichen(grund), grund).toBe(true)
      const abgelehnt = wechsleReview(inPruefung(), 'rejected', 'reviewer', T0, {
        reviewerId: PRUEFER,
        rejectionReason: grund,
      })
      expect(abgelehnt.ok).toBe(true)
      if (!abgelehnt.ok) continue
      expect(darfReviewWechseln(abgelehnt.vorgang, 'submitted', 'provider')).toBe(true)
    }
  })

  it('bei Verdacht auf Faelschung und Namensabweichung NICHT', () => {
    // Ein weiterer Upload beantwortet diese Frage nicht — der Fall gehoert
    // an einen Menschen.
    for (const grund of ['suspected_forgery', 'mismatch'] as const) {
      expect(darfNachreichen(grund), grund).toBe(false)
      const abgelehnt = wechsleReview(inPruefung(), 'rejected', 'reviewer', T0, {
        reviewerId: PRUEFER,
        rejectionReason: grund,
      })
      expect(abgelehnt.ok).toBe(true)
      if (!abgelehnt.ok) continue
      expect(darfReviewWechseln(abgelehnt.vorgang, 'submitted', 'provider')).toBe(false)
    }
  })
})

describe('Re-Verifikation', () => {
  function genehmigt(expiresAt: string | null): ReviewVorgang {
    const r = wechsleReview(inPruefung(), 'approved', 'reviewer', T0, {
      reviewerId: PRUEFER,
      expiresAt,
    })
    if (!r.ok) throw new Error(r.grund)
    return r.vorgang
  }

  const jetzt = new Date('2026-09-12T12:00:00.000Z')

  it('unbefristet wird nie faellig', () => {
    expect(reVerifikationFaellig(genehmigt(null), jetzt)).toBe(false)
  })

  it('abgelaufen ist faellig', () => {
    expect(reVerifikationFaellig(genehmigt('2026-09-12T11:00:00.000Z'), jetzt)).toBe(true)
    expect(reVerifikationFaellig(genehmigt('2026-09-13T00:00:00.000Z'), jetzt)).toBe(false)
  })

  it('ein unlesbares Datum belegt nichts, also faellig', () => {
    expect(reVerifikationFaellig(genehmigt('irgendwann'), jetzt)).toBe(true)
  })

  it('nur ein GENEHMIGTER Vorgang kann ablaufen', () => {
    // Ein abgelaufenes Datum an einem abgelehnten oder nie eingereichten
    // Vorgang bedeutet nichts.
    for (const status of ['not_submitted', 'submitted', 'in_review', 'rejected', 'expired'] as const) {
      expect(
        reVerifikationFaellig({ status, expiresAt: '2020-01-01T00:00:00.000Z' }, jetzt),
        status,
      ).toBe(false)
    }
  })

  it('Erinnerung greift im Fenster davor, nicht danach', () => {
    expect(laeuftBaldAb(genehmigt('2026-10-01T00:00:00.000Z'), 30, jetzt)).toBe(true)
    expect(laeuftBaldAb(genehmigt('2027-01-01T00:00:00.000Z'), 30, jetzt)).toBe(false)
    // Schon abgelaufen ist nicht „laeuft bald ab".
    expect(laeuftBaldAb(genehmigt('2026-09-01T00:00:00.000Z'), 30, jetzt)).toBe(false)
  })

  it('System setzt auf expired, Anbieter reicht danach neu ein', () => {
    const v = genehmigt('2026-09-12T11:00:00.000Z')
    const abgelaufen = wechsleReview(v, 'expired', 'system', T0, { note: 'Nachweis abgelaufen' })
    expect(abgelaufen.ok).toBe(true)
    if (!abgelaufen.ok) return
    expect(abgelaufen.vorgang.status).toBe('expired')
    expect(darfReviewWechseln(abgelaufen.vorgang, 'submitted', 'provider')).toBe(true)
    // Und der Pruefer kann nicht einfach wieder genehmigen, ohne dass etwas
    // eingereicht wurde.
    expect(darfReviewWechseln(abgelaufen.vorgang, 'approved', 'reviewer')).toBe(false)
  })
})

describe('Der Vorgang oeffnet das Abzeichen NICHT', () => {
  it('auch eine Genehmigung aendert daran nichts', () => {
    const g = wechsleReview(inPruefung(), 'approved', 'reviewer', T0, { reviewerId: PRUEFER })
    expect(g.ok).toBe(true)
    // Das Abzeichen haengt nicht am Vorgang, sondern an einer Entscheidung,
    // die nicht getroffen ist.
    const urteil = darfAlsVerifiziertGelten(
      verifikationsprofil({
        emailBestaetigtAm: T0,
        telefonBestaetigt: true,
        identitaetGeprueft: true,
        gewerbeNachweisGeprueft: true,
        qualifikationGeprueft: true,
      }),
    )
    expect(urteil.erlaubt).toBe(false)
  })

  it('wer pruefen darf, ist nicht entschieden', () => {
    const p = pruefungDurchWenErlaubt()
    expect(p.entschieden).toBe(false)
    expect(p.grund).toMatch(/BUSINESS_DECISION_REQUIRED/)
  })
})

describe('Die Uebergangstabelle ist die einzige Quelle', () => {
  it('jeder Uebergang nennt from, to und actor', () => {
    for (const t of REVIEW_TRANSITIONS) {
      expect(t.from).toBeTruthy()
      expect(t.to).toBeTruthy()
      expect(['provider', 'reviewer', 'system']).toContain(t.actor)
    }
  })

  it('nur das System laesst etwas ablaufen', () => {
    const ablauf = REVIEW_TRANSITIONS.filter(t => t.to === 'expired')
    expect(ablauf).toHaveLength(1)
    expect(ablauf[0].actor).toBe('system')
    expect(ablauf[0].from).toBe('approved')
  })
})
