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
  NACHWEIS_ZU_PRUEFEN,
  darfAlsVerifiziertGelten,
  istHeilberuf,
  istVonPlattformFreigeschaltet,
  legacyUebergang,
  nachweisGueltig,
  nachweisbedarf,
  tierAusVertrauensstufe,
  verifikationsprofil,
  vertrauensstufe,
  vertrauensstufeAusTier,
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

// ════════════════════════════════════════════════════════════════════
// Legacy-Uebergang, Nachweis, Nachweisbedarf
// ════════════════════════════════════════════════════════════════════

describe('Der Altbestand landet auf UNVERIFIED', () => {
  it('is_verified=true wird zu UNVERIFIED + legacy_verified=true', () => {
    // Der Kern der Migration: der Admin-Klick geht nicht verloren, wird
    // aber nicht zur Pruefung erklaert.
    expect(legacyUebergang({ is_verified: true })).toEqual({
      verification_tier: 'UNVERIFIED',
      legacy_verified: true,
    })
  })

  it('ohne Flag bleibt legacy_verified false', () => {
    for (const s of [{ is_verified: false }, { is_verified: null }, {}, null, undefined]) {
      expect(legacyUebergang(s)).toEqual({
        verification_tier: 'UNVERIFIED',
        legacy_verified: false,
      })
    }
  })

  it('KEIN Salon bekommt durch die Migration eine Stufe', () => {
    // Waere hier irgendwo etwas anderes als UNVERIFIED moeglich, waere aus
    // einem Klick eine Pruefung geworden.
    for (const s of [{ is_verified: true }, { is_verified: false }, null]) {
      expect(legacyUebergang(s).verification_tier).toBe('UNVERIFIED')
    }
  })
})

describe('Tier und Vertrauensstufe sind dasselbe in zwei Schreibweisen', () => {
  it('hin und zurueck ergibt das Original', () => {
    for (const s of ['keine', 'basis', 'kontakt', 'geschaeftlich', 'fachlich'] as const) {
      expect(vertrauensstufeAusTier(tierAusVertrauensstufe(s))).toBe(s)
    }
  })

  it('nichts Geprueftes ist UNVERIFIED', () => {
    expect(tierAusVertrauensstufe(vertrauensstufe(verifikationsprofil({})))).toBe('UNVERIFIED')
  })

  it('volle Verifikation ist PROFESSIONAL', () => {
    expect(tierAusVertrauensstufe(vertrauensstufe(verifikationsprofil(ALLE_BESTAETIGT)))).toBe(
      'PROFESSIONAL',
    )
  })
})

describe('Nachweise laufen ab', () => {
  const jetzt = new Date('2026-09-12T00:00:00.000Z')

  it('ohne Ablaufdatum gilt der Nachweis unbefristet', () => {
    expect(nachweisGueltig({ verification_expiry: null }, jetzt)).toBe(true)
    expect(nachweisGueltig(null, jetzt)).toBe(true)
  })

  it('ein abgelaufener Nachweis belegt nichts mehr', () => {
    // Eine NiSV-Fachkunde von 2019 belegt heute nichts.
    expect(nachweisGueltig({ verification_expiry: '2026-09-11T23:59:59.000Z' }, jetzt)).toBe(false)
    expect(nachweisGueltig({ verification_expiry: '2027-01-01T00:00:00.000Z' }, jetzt)).toBe(true)
  })

  it('ein unlesbares Datum belegt auch nichts', () => {
    expect(nachweisGueltig({ verification_expiry: 'demnaechst' }, jetzt)).toBe(false)
  })
})

describe('Welche Kategorien einen Qualifikationsnachweis brauchen', () => {
  it('die drei Heilberuf-Kategorien sind erkannt', () => {
    for (const k of ['arzt', 'opraum', 'aesthetik']) {
      expect(istHeilberuf(k), k).toBe(true)
      expect(nachweisbedarf(k)?.grund, k).toBe('heilberuf')
    }
  })

  it('Kosmetik haengt an der Geraetefachkunde, nicht an der Heilkunde', () => {
    // Die Kategorie-Unterzeile nennt ausdruecklich „Laser".
    expect(nachweisbedarf('kosmetik')?.grund).toBe('geraetefachkunde')
    expect(istHeilberuf('kosmetik')).toBe(false)
  })

  it('Friseur ist zulassungspflichtiges Handwerk', () => {
    expect(nachweisbedarf('friseur')?.grund).toBe('handwerk')
    expect(istHeilberuf('friseur')).toBe(false)
  })

  it('Kategorien ohne Nachweisbedarf liefern null', () => {
    for (const k of ['barber', 'nail', 'massage', 'lash', 'angebote', 'termin']) {
      expect(nachweisbedarf(k), k).toBeNull()
    }
  })

  it('unbekannt oder leer ist kein Bedarf', () => {
    expect(nachweisbedarf(null)).toBeNull()
    expect(nachweisbedarf('')).toBeNull()
    expect(nachweisbedarf('gibt-es-nicht')).toBeNull()
  })

  it('jeder Eintrag nennt einen Anlass', () => {
    // Ein Nachweisbedarf ohne Begruendung waere genau die Sorte Behauptung,
    // die das Modul abschaffen soll.
    for (const [k, v] of Object.entries(NACHWEIS_ZU_PRUEFEN)) {
      expect(v.anlass.length, k).toBeGreaterThan(20)
    }
  })
})
