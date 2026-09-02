/**
 * Onboarding-Entwurf im Browser — Ablage, Uebernahme, Aufraeumen.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * WARUM DER ENTWURF UEBERHAUPT IM BROWSER LIEGT
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Die Wizards laufen VOR der Registrierung: wer /anbieter/onboarding
 * durchklickt, hat noch kein Konto und damit keine Sitzung. Ein
 * serverseitiger Entwurf haette an dieser Stelle nichts, woran er haengen
 * koennte — ausser einer anonymen Kennung, die selbst wieder ein
 * Datenspeicher waere. Der Entwurf bleibt deshalb lokal, bis es eine
 * Sitzung gibt, und wird dann EINMAL an /api/onboarding/salon geschickt.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * WAS HIER NICHT MEHR HINEINGEHOERT: IBAN UND STEUER-ID
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Bis zu diesem Stand legten alle drei Wizards ihren `legal`-Block
 * unveraendert im `localStorage` ab — inklusive IBAN und Steuer-ID, im
 * Klartext, unbegrenzt haltbar, lesbar fuer jedes Skript auf der Domain.
 * Angekommen ist die IBAN dabei nirgends: es gibt keinen Leser dieser
 * Felder ausser der Rollenerkennung in /konto, die nur PRUEFT, OB ein
 * Entwurf existiert.
 *
 * Damit war es dieselbe Konstellation, die /api/register-provider bereits
 * hinter sich hat (siehe Befund 3 im dortigen Kopfkommentar): erfragt,
 * gespeichert, nie verwendet. Nur eine Stufe schlechter, weil das
 * Bankdatum den Browser gar nicht erst verliess und trotzdem liegen blieb.
 *
 * Bankverbindungen gehoeren nach `payout_accounts` ueber die angemeldete
 * Route /api/me/payout-account, die davon nur die letzten vier Stellen
 * wieder herausgibt. `speichereEntwurf()` filtert `iban` und `tax`
 * deshalb aktiv heraus — auch wenn ein Aufrufer sie mitgibt.
 */

export type EntwurfArt = 'anbieter' | 'vermieter' | 'mieter'

const SCHLUESSEL: Record<EntwurfArt, string> = {
  anbieter: 'cm_anbieter_draft',
  vermieter: 'cm_vermieter_draft',
  mieter: 'cm_mieter_draft',
}

/** Felder, die niemals in den localStorage gehoeren. */
const VERBOTEN = new Set(['iban', 'tax', 'vat', 'ustid', 'steuerid'])

/**
 * Nutzlast fuer /api/onboarding/salon. Bewusst dieselbe Form wie das
 * Zod-Schema der Route — so gibt es keine zweite Uebersetzung, die
 * auseinanderlaufen kann.
 */
export interface UebernahmeNutzlast {
  quelle: 'anbieter' | 'vermieter'
  salon: {
    name: string
    category: string
    address?: string
    phone?: string
    description?: string
  }
  leistungen?: { name: string; duration_minutes: number; price_cents: number | null }[]
  vermietung?: {
    plaetze: { art: 'stuhl' | 'liege' | 'kabine' | 'op' | 'raum'; anzahl: number }[]
    features: string[]
    beschreibung?: string
    preise: {
      hour_cents?: number | null
      day_cents?: number | null
      week_cents?: number | null
      month_cents?: number | null
    }
    available_days: string[]
    available_from?: string | null
    available_to?: string | null
  }
  einwilligungen: Record<string, boolean>
}

/**
 * Ein abgelegter Entwurf. `uebernahme` ist der Teil, den der Server
 * spaeter bekommt; die uebrigen Felder bleiben fuer die Anzeige im
 * Browser (z. B. `cats` fuer den Hygiene-Hinweis auf /anbieter/mein-salon).
 */
export interface AbgelegterEntwurf {
  uebernahme?: UebernahmeNutzlast
  [key: string]: unknown
}

/** Entfernt Bank- und Steuerdaten aus beliebig tief verschachtelten Objekten. */
function ohneBankdaten(wert: unknown): unknown {
  if (Array.isArray(wert)) return wert.map(ohneBankdaten)
  if (wert && typeof wert === 'object') {
    const raus: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(wert as Record<string, unknown>)) {
      if (VERBOTEN.has(k.toLowerCase())) continue
      raus[k] = ohneBankdaten(v)
    }
    return raus
  }
  return wert
}

export function speichereEntwurf(art: EntwurfArt, entwurf: AbgelegterEntwurf): void {
  try {
    localStorage.setItem(SCHLUESSEL[art], JSON.stringify(ohneBankdaten(entwurf)))
  } catch {
    // localStorage kann in Inkognito-Modi geblockt sein — der Wizard soll
    // deshalb nicht abbrechen, der Nutzer landet nur ohne Entwurf in der
    // Registrierung.
  }
}

export function leseEntwurf(art: EntwurfArt): AbgelegterEntwurf | null {
  try {
    const roh = localStorage.getItem(SCHLUESSEL[art])
    if (!roh) return null
    const obj = JSON.parse(roh)
    return obj && typeof obj === 'object' ? (obj as AbgelegterEntwurf) : null
  } catch {
    return null
  }
}

export function loescheEntwurf(art: EntwurfArt): void {
  try {
    localStorage.removeItem(SCHLUESSEL[art])
  } catch {
    /* nichts zu tun */
  }
}

/** Der erste vorliegende Salon-Entwurf — Anbieter hat Vorrang vor Vermieter. */
export function offenerSalonEntwurf(): { art: 'anbieter' | 'vermieter'; entwurf: AbgelegterEntwurf } | null {
  for (const art of ['anbieter', 'vermieter'] as const) {
    const entwurf = leseEntwurf(art)
    if (entwurf?.uebernahme) return { art, entwurf }
  }
  return null
}

export interface UebernahmeAntwort {
  salonId: string
  salonAngelegt: boolean
  rolleAngehoben: boolean
  leistungenAngelegt: number
  leistungenOhnePreis: number
  inserateAngelegt: number
  inserateOffline: number
  adresseUnvollstaendig: boolean
}

/**
 * Schickt einen offenen Entwurf an den Server. Nur nach erfolgreicher
 * Anmeldung aufrufen — ohne Sitzung antwortet die Route mit 401.
 *
 * Der Entwurf wird NUR bei Erfolg geloescht. Scheitert die Uebernahme
 * (Netz, 500), bleibt er liegen und der naechste Anlauf kann ihn erneut
 * schicken; die Route legt keine Dubletten an.
 */
export async function uebernehmeOffenenEntwurf(): Promise<
  { ok: true; ergebnis: UebernahmeAntwort } | { ok: false; fehler: string } | null
> {
  const offen = offenerSalonEntwurf()
  if (!offen?.entwurf.uebernahme) return null

  try {
    const res = await fetch('/api/onboarding/salon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(offen.entwurf.uebernahme),
    })
    const daten = await res.json().catch(() => ({}))

    if (!res.ok) {
      return { ok: false, fehler: daten?.error || 'Übernahme fehlgeschlagen' }
    }

    loescheEntwurf(offen.art)
    return { ok: true, ergebnis: daten as UebernahmeAntwort }
  } catch {
    return { ok: false, fehler: 'Netzwerkfehler bei der Übernahme' }
  }
}

/** Euro-Eingabe („45", „45,50", „45.50") → Cent. Leer/ungueltig → null. */
export function euroZuCent(eingabe: string | undefined | null): number | null {
  const text = String(eingabe ?? '').trim().replace(',', '.')
  if (!text) return null
  const zahl = Number(text)
  if (!Number.isFinite(zahl) || zahl < 0) return null
  return Math.round(zahl * 100)
}
