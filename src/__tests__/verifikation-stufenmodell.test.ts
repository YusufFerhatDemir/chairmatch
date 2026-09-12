// @vitest-environment node
/**
 * Das Stufenmodell der Verifikation.
 *
 * Der Test haelt vor allem EINE Eigenschaft fest, und sie ist der Grund,
 * warum es das Modul gibt: aus einem fehlenden Signal darf niemals
 * `bestaetigt` werden. Das alte Modell hatte dafuer nur ein Bit
 * (`salons.is_verified`), das ein Admin-Klick setzt — es konnte „E-Mail
 * bestaetigt" und „Facharzttitel gesehen" nicht auseinanderhalten und hat
 * trotzdem beides behauptet, auf 100 oeffentlichen Stellen, davon 21 ueber
 * Heilberufe.
 */
import { describe, it, expect } from 'vitest'
import {
  DIMENSIONEN,
  darfAlsVerifiziertGelten,
  istVonPlattformFreigeschaltet,
  verifikationsprofil,
  vertrauensstufe,
  type Dimension,
} from '@/modules/verification/verification'

const ALLE_BESTAETIGT = {
  emailBestaetigtAm: '2026-09-01T10:00:00.000Z',
  telefonBestaetigt: true,
  identitaetGeprueft: true,
  gewerbeNachweisGeprueft: true,
  qualifikationGeprueft: true,
}

describe('Fehlendes Signal wird nie zu „bestaetigt"', () => {
  it('ohne jedes Signal steht alles auf nicht_erhoben', () => {
    const p = verifikationsprofil(undefined)
    for (const d of DIMENSIONEN) expect(p[d], d).toBe('nicht_erhoben')
  })

  it('ein leeres Signal-Objekt aendert daran nichts', () => {
    const p = verifikationsprofil({})
    for (const d of DIMENSIONEN) expect(p[d], d).toBe('nicht_erhoben')
  })

  it('null-Werte sind kein Beleg', () => {
    const p = verifikationsprofil({
      emailBestaetigtAm: null,
      telefonBestaetigt: null,
      identitaetGeprueft: null,
      gewerbeNachweisGeprueft: null,
      qualifikationGeprueft: null,
    })
    for (const d of DIMENSIONEN) expect(p[d], d).toBe('nicht_erhoben')
  })

  it('ein leerer Zeitstempel ist kein Beleg', () => {
    // `''` ist ein String und waere bei einer reinen Typpruefung
    // durchgerutscht — der Beleg ist der Zeitpunkt, nicht die Existenz des
    // Feldes.
    expect(verifikationsprofil({ emailBestaetigtAm: '' }).email).toBe('nicht_erhoben')
  })
})

describe('„nicht erhoben" ist nicht dasselbe wie „offen"', () => {
  it('ein verschickter Telefoncode ist offen, nicht bestaetigt', () => {
    const p = verifikationsprofil({ telefonCodeOffen: true })
    expect(p.telefon).toBe('offen')
  })

  it('hochgeladene Nachweise machen Gewerbe und Qualifikation offen', () => {
    // Der heutige Normalfall: /api/owner/documents nimmt Dateien entgegen,
    // und kein Pfad sieht sie an. Ein Briefkasten ohne Leerung — aber
    // „liegt vor" ist eben etwas anderes als „gibt es nicht".
    const p = verifikationsprofil({ nachweiseLiegenVor: true })
    expect(p.gewerbe).toBe('offen')
    expect(p.qualifikation).toBe('offen')
    expect(p.identitaet).toBe('nicht_erhoben')
  })

  it('bestaetigt schlaegt offen', () => {
    const p = verifikationsprofil({ nachweiseLiegenVor: true, gewerbeNachweisGeprueft: true })
    expect(p.gewerbe).toBe('bestaetigt')
  })
})

describe('Ablehnung sperrt', () => {
  it('schlaegt auch ein positives Signal', () => {
    // „geprueft und durchgefallen" darf nicht von einem spaeter gesetzten
    // Haken ueberschrieben werden.
    const p = verifikationsprofil({ ...ALLE_BESTAETIGT, abgelehnt: ['qualifikation'] })
    expect(p.qualifikation).toBe('abgelehnt')
    expect(p.gewerbe).toBe('bestaetigt')
  })

  it('zieht die Gesamtstufe herunter', () => {
    const p = verifikationsprofil({ ...ALLE_BESTAETIGT, abgelehnt: ['telefon'] })
    expect(vertrauensstufe(p)).toBe('basis')
  })
})

describe('Vertrauensstufe ist aufsteigend', () => {
  const faelle: Array<[string, Parameters<typeof verifikationsprofil>[0], string]> = [
    ['nichts', {}, 'keine'],
    ['nur E-Mail', { emailBestaetigtAm: ALLE_BESTAETIGT.emailBestaetigtAm }, 'basis'],
    [
      'E-Mail + Telefon',
      { emailBestaetigtAm: ALLE_BESTAETIGT.emailBestaetigtAm, telefonBestaetigt: true },
      'kontakt',
    ],
    [
      'bis Gewerbe',
      {
        emailBestaetigtAm: ALLE_BESTAETIGT.emailBestaetigtAm,
        telefonBestaetigt: true,
        identitaetGeprueft: true,
        gewerbeNachweisGeprueft: true,
      },
      'geschaeftlich',
    ],
    ['alles', ALLE_BESTAETIGT, 'fachlich'],
  ]

  it.each(faelle)('%s → %s', (_name, signale, erwartet) => {
    expect(vertrauensstufe(verifikationsprofil(signale))).toBe(erwartet)
  })

  it('eine Luecke weiter unten verhindert die hoehere Stufe', () => {
    // Qualifikation bestaetigt, aber Telefon nicht: „fachlich" waere eine
    // Aussage, die sich selbst widerspricht.
    const p = verifikationsprofil({ ...ALLE_BESTAETIGT, telefonBestaetigt: false })
    expect(vertrauensstufe(p)).toBe('basis')
  })
})

describe('Das oeffentliche Abzeichen bleibt zu', () => {
  it('auch bei voller Verifikation — die Schwelle ist nicht entschieden', () => {
    const p = verifikationsprofil(ALLE_BESTAETIGT)
    expect(vertrauensstufe(p)).toBe('fachlich')

    const urteil = darfAlsVerifiziertGelten(p)
    expect(urteil.erlaubt).toBe(false)
    expect(urteil.grund).toMatch(/BUSINESS_DECISION_REQUIRED/)
  })
})

describe('is_verified heisst „freigeschaltet", nicht „geprueft"', () => {
  it('liest das Flag, ohne es zu einer Pruefung zu erklaeren', () => {
    expect(istVonPlattformFreigeschaltet({ is_verified: true })).toBe(true)
    expect(istVonPlattformFreigeschaltet({ is_verified: false })).toBe(false)
    expect(istVonPlattformFreigeschaltet({ is_verified: null })).toBe(false)
    expect(istVonPlattformFreigeschaltet(null)).toBe(false)
  })

  it('hat mit der Vertrauensstufe nichts zu tun', () => {
    // Der Admin-Klick sagt nichts ueber Signale aus. Wer beides koppelt,
    // baut die alte Vermischung neu.
    const p = verifikationsprofil({})
    expect(vertrauensstufe(p)).toBe('keine')
    expect(istVonPlattformFreigeschaltet({ is_verified: true })).toBe(true)
  })
})

describe('Alle Dimensionen sind abgedeckt', () => {
  it('das Profil hat genau die fuenf benannten Dimensionen', () => {
    // Faellt auf, wenn jemand eine Dimension ergaenzt und die Stufenleiter
    // in `vertrauensstufe` nicht nachzieht.
    const p = verifikationsprofil(ALLE_BESTAETIGT)
    expect(Object.keys(p).sort()).toEqual([...DIMENSIONEN].sort())
  })

  it('jede Dimension laesst sich einzeln ablehnen', () => {
    for (const d of DIMENSIONEN) {
      const p = verifikationsprofil({ ...ALLE_BESTAETIGT, abgelehnt: [d as Dimension] })
      expect(p[d], d).toBe('abgelehnt')
    }
  })
})
