/**
 * Onboarding-Uebernahme — aus einem Wizard-Entwurf werden echte Zeilen.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * DER BEFUND, DEN DIESES MODUL SCHLIESST
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Die drei Onboarding-Wizards (/anbieter/onboarding, /vermieter/onboarding,
 * /mieter/onboarding) fragen vier Schritte lang Kategorien, Leistungen,
 * Stammdaten, Ausstattung, Verfuegbarkeiten und Einwilligungen ab — und
 * beendeten sich mit genau dieser Zeile:
 *
 *     localStorage.setItem('cm_anbieter_draft', JSON.stringify({ … }))
 *     router.push('/auth?mode=register&role=anbieter')
 *
 * Danach las den Entwurf NIEMAND mehr, ausser um daraus eine Rolle fuer die
 * Anzeige im Browser abzuleiten (`src/app/(public)/konto/page.tsx`) und um
 * auf /anbieter/mein-salon einen Hygiene-Hinweis einzublenden. Es gab keine
 * Route, keine Server Action, keinen Job, der ihn in `salons`, `services`
 * oder `rental_equipment` uebertragen haette.
 *
 * Ein Anbieter, der den Wizard vollstaendig durchlief, hatte danach:
 *   - keinen Salon
 *   - keine Leistung
 *   - kein Inserat
 *   - und die Rolle `kunde` (siehe unten)
 *
 * Dieses Modul ist die fehlende Uebertragung. Es erfindet dabei nichts:
 * jeder Preis, jeder Name, jede Verfuegbarkeit kommt aus dem Entwurf des
 * Anbieters. Fehlt ein Preis, entsteht KEIN Preis — der Datensatz bleibt
 * inaktiv, bis der Anbieter ihn selbst setzt.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * WARUM DIE ROLLE HIER GESETZT WIRD
 * ═══════════════════════════════════════════════════════════════════════
 *
 * `/api/auth/register` nimmt gar keine Rolle entgegen (siehe `registerSchema`
 * in src/modules/auth/auth.schemas.ts) — jede Registrierung ueber /auth wird
 * `kunde`. Der Wizard schickte den Anbieter also in eine Registrierung, die
 * seine Rolle strukturell nicht kennen konnte, und `(provider)/layout.tsx`
 * warf ihn anschliessend mit `isProviderOrAbove()` wieder auf /auth zurueck.
 *
 * Die Rolle hier zu setzen ist KEINE neue Richtlinie: `/api/register-provider`
 * ist eine oeffentliche Route, die seit jeher aus einer Selbstauskunft
 * `role: 'anbieter'` macht. Dieselben Schranken gelten deshalb auch hier:
 *
 *   - Der Salon entsteht mit `is_active: false` und `is_verified: false`.
 *     Er taucht damit weder im Matching noch auf oeffentlichen Listen auf
 *     (Track D / Track 20), bis ihn ein Admin freischaltet.
 *   - Angehoben wird ausschliesslich von CUSTOMER auf `anbieter`.
 *     Wer bereits Anbieter, B2B, Investor, Admin oder Super-Admin ist,
 *     behaelt seine Rolle unveraendert — dieses Modul kann NIEMANDEN
 *     hoeherstufen als bis zur Anbieterrolle und niemanden herabstufen.
 *   - Die Uebernahme wird in `audit_logs` protokolliert.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * KEINE ZWEITEN SALONS
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Die Uebernahme ist wiederholbar: besitzt der Nutzer bereits einen Salon
 * (`getOwnedSalon`, dieselbe Aufloesung wie /api/me/salon), wird dieser
 * ergaenzt statt ein zweiter angelegt. Leistungen und Inserate werden ueber
 * ihren Namen abgeglichen, damit ein zweiter Durchlauf keine Dubletten
 * erzeugt.
 */

import { getOwnedSalon, type AdminClient } from '@/modules/rentals/listing.service'
import { slugify } from '@/lib/provider-registration'
import { logger } from '@/lib/logger'

/**
 * Rollen, die dieses Modul unveraendert laesst. Alles andere (`kunde`,
 * `customer`, leer) wird auf `anbieter` gehoben.
 */
const ROLLEN_OHNE_ANHEBUNG = new Set([
  'anbieter',
  'provider',
  'b2b',
  'business_owner',
  'investor',
  'admin',
  'super_admin',
])

/**
 * Erlaubte Werte fuer `rental_equipment.type` — der CHECK-Constraint
 * `rental_equipment_type_check` (Migration CM22, live verifiziert am
 * 2026-08-28) laesst genau diese vier zu:
 *
 *     CHECK (type IS NULL OR type IN ('stuhl', 'liege', 'raum', 'opraum'))
 *
 * Der Vermieter-Wizard bietet fuenf Kacheln an: stuhl, liege, kabine, op,
 * raum. `kabine` und `op` GIBT ES IN DER DATENBANK NICHT — ein Insert damit
 * waere an genau diesem Constraint gescheitert (23514), und zwar erst zur
 * Laufzeit. Die Abbildung steht deshalb hier, nicht im Insert:
 *
 *   - `op`     → `opraum`  (derselbe Platz, anderer Name)
 *   - `kabine` → `raum`, der ANZEIGENAME bleibt „Kabine"
 *
 * Damit geht keine Angabe des Vermieters verloren: der Typ ist die grobe
 * Klasse fuer Filter, der Name traegt, was er tatsaechlich vermietet.
 */
const PLATZ_TYP: Record<string, { type: 'stuhl' | 'liege' | 'raum' | 'opraum'; name: string }> = {
  stuhl: { type: 'stuhl', name: 'Stuhl' },
  liege: { type: 'liege', name: 'Liege' },
  kabine: { type: 'raum', name: 'Kabine' },
  op: { type: 'opraum', name: 'OP-Raum' },
  raum: { type: 'raum', name: 'Kompletter Raum' },
}

export interface OnboardingSalon {
  name: string
  category: string
  /** Freitext aus dem Wizard — wird konservativ zerlegt, siehe `adresseZerlegen`. */
  address?: string
  phone?: string
  description?: string
}

export interface OnboardingLeistung {
  name: string
  duration_minutes: number
  /**
   * Preis in Cent. `null` heisst: der Anbieter hat KEINEN Preis angegeben.
   * Dann entsteht auch keiner — die Leistung wird inaktiv angelegt.
   */
  price_cents: number | null
}

export interface OnboardingVermietung {
  plaetze: { art: string; anzahl: number }[]
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

export interface OnboardingEntwurf {
  quelle: 'anbieter' | 'vermieter'
  salon: OnboardingSalon
  leistungen?: OnboardingLeistung[]
  vermietung?: OnboardingVermietung
  einwilligungen: Record<string, boolean>
}

export interface UebernahmeErgebnis {
  salonId: string
  salonAngelegt: boolean
  rolleAngehoben: boolean
  leistungenAngelegt: number
  /** Leistungen ohne Preis — inaktiv angelegt, der Anbieter muss nachtragen. */
  leistungenOhnePreis: number
  inserateAngelegt: number
  /** Inserate ohne Tagespreis bleiben offline (Constraint `…_online_needs_price`). */
  inserateOffline: number
  /** true, wenn aus der Adresse keine Stadt zu gewinnen war. */
  adresseUnvollstaendig: boolean
}

/**
 * Adress-Freitext → Spalten, aber nur wenn es eindeutig ist.
 *
 * Die Wizards haben EIN Adressfeld, `salons` hat vier Spalten (`street`,
 * `house_number`, `postal_code`, `city`). Geraten wird hier nichts: erkannt
 * wird ausschliesslich die uebliche deutsche Schreibweise
 *
 *     Musterstrasse 12, 10115 Berlin
 *     Musterstrasse 12 · 10115 Berlin
 *
 * Passt sie nicht, landet der komplette Text in `street` und `city` bleibt
 * leer — mit `adresseUnvollstaendig: true` in der Antwort. Eine falsch
 * geratene Stadt waere schlimmer als eine fehlende: der Salon erschiene
 * unter dem falschen Ort in /[stadt] und im Matching.
 */
export function adresseZerlegen(roh: string | undefined): {
  street: string | null
  house_number: string | null
  postal_code: string | null
  city: string | null
  vollstaendig: boolean
} {
  const text = (roh || '').trim()
  if (!text) {
    return { street: null, house_number: null, postal_code: null, city: null, vollstaendig: false }
  }

  const treffer = text.match(
    /^(.+?)\s+(\d+\s*[a-zA-Z]?)\s*[,·]\s*(\d{5})\s+(.+)$/,
  )
  if (treffer) {
    return {
      street: treffer[1].trim(),
      house_number: treffer[2].replace(/\s+/g, ''),
      postal_code: treffer[3],
      city: treffer[4].trim(),
      vollstaendig: true,
    }
  }

  return { street: text, house_number: null, postal_code: null, city: null, vollstaendig: false }
}

/**
 * Hebt die Rolle auf `anbieter` — und nur von unten nach oben.
 *
 * Gibt zurueck, ob tatsaechlich geschrieben wurde.
 */
async function rolleAnheben(supabase: AdminClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(`Profil nicht lesbar: ${error.message}`)
  if (!data) throw new Error('Kein Profil zu dieser Sitzung')

  const rolle = String(data.role || '').toLowerCase()
  if (ROLLEN_OHNE_ANHEBUNG.has(rolle)) return false

  const { error: updateFehler } = await supabase
    .from('profiles')
    .update({ role: 'anbieter' })
    .eq('id', userId)

  if (updateFehler) throw new Error(`Rolle nicht setzbar: ${updateFehler.message}`)
  return true
}

/**
 * Uebertraegt einen Onboarding-Entwurf in die Datenbank.
 *
 * Der Aufrufer hat die Sitzung bereits geprueft — `userId` ist der
 * angemeldete Nutzer und niemand sonst.
 */
export async function entwurfUebernehmen(
  supabase: AdminClient,
  userId: string,
  entwurf: OnboardingEntwurf,
): Promise<UebernahmeErgebnis> {
  const rolleAngehoben = await rolleAnheben(supabase, userId)

  const adresse = adresseZerlegen(entwurf.salon.address)

  // ── Salon: vorhandenen ergaenzen statt einen zweiten anlegen ──────────
  let salon = await getOwnedSalon(supabase, userId)
  let salonAngelegt = false

  if (!salon) {
    const { data, error } = await supabase
      .from('salons')
      .insert({
        owner_id: userId,
        name: entwurf.salon.name,
        slug: `${slugify(entwurf.salon.name)}-${Date.now().toString(36)}`,
        category: entwurf.salon.category.toLowerCase(),
        street: adresse.street,
        house_number: adresse.house_number,
        postal_code: adresse.postal_code,
        city: adresse.city,
        phone: entwurf.salon.phone || null,
        description: entwurf.salon.description || null,
        // Dieselbe Schranke wie in /api/register-provider: eine
        // Selbstauskunft schaltet keinen Salon live.
        is_active: false,
        is_verified: false,
        chair_rental: !!entwurf.vermietung,
      })
      .select('id, name, owner_id')
      .single()

    if (error) throw new Error(`Salon konnte nicht angelegt werden: ${error.message}`)
    salon = data as { id: string; name: string; owner_id: string }
    salonAngelegt = true
  } else {
    // Ein zweiter Durchlauf ergaenzt nur, was noch leer ist — bereits
    // gepflegte Stammdaten werden NICHT vom Entwurf ueberschrieben.
    const nachtrag: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (entwurf.vermietung) nachtrag.chair_rental = true
    if (entwurf.salon.description) nachtrag.description = entwurf.salon.description

    const { error } = await supabase.from('salons').update(nachtrag).eq('id', salon.id)
    if (error) throw new Error(`Salon konnte nicht ergaenzt werden: ${error.message}`)
  }

  const salonId = salon.id

  // ── Leistungen ───────────────────────────────────────────────────────
  let leistungenAngelegt = 0
  let leistungenOhnePreis = 0

  const leistungen = entwurf.leistungen ?? []
  if (leistungen.length > 0) {
    const { data: vorhanden, error: leseFehler } = await supabase
      .from('services')
      .select('name')
      .eq('salon_id', salonId)

    if (leseFehler) throw new Error(`Leistungen nicht lesbar: ${leseFehler.message}`)

    const bekannt = new Set((vorhanden || []).map((s: { name: string }) => s.name.toLowerCase()))
    const neu = leistungen
      .filter((l) => !bekannt.has(l.name.toLowerCase()))
      .map((l, i) => ({
        salon_id: salonId,
        name: l.name,
        duration_minutes: l.duration_minutes,
        // KEIN erfundener Preis. Fehlt die Angabe, steht 0 in der Spalte
        // UND die Leistung ist inaktiv — sie ist damit nicht buchbar und
        // kann niemandem als „kostenlos" erscheinen.
        price_cents: l.price_cents ?? 0,
        is_active: l.price_cents !== null && l.price_cents > 0,
        sort_order: i,
      }))

    leistungenOhnePreis = neu.filter((s) => !s.is_active).length

    if (neu.length > 0) {
      const { error } = await supabase.from('services').insert(neu)
      if (error) throw new Error(`Leistungen konnten nicht angelegt werden: ${error.message}`)
      leistungenAngelegt = neu.length
    }
  }

  // ── Vermietung ───────────────────────────────────────────────────────
  let inserateAngelegt = 0
  let inserateOffline = 0

  if (entwurf.vermietung) {
    const v = entwurf.vermietung
    const tagespreis = v.preise.day_cents ?? null

    const { data: vorhandeneInserate, error: leseFehler } = await supabase
      .from('rental_equipment')
      .select('name')
      .eq('salon_id', salonId)

    if (leseFehler) throw new Error(`Inserate nicht lesbar: ${leseFehler.message}`)

    const bekannt = new Set(
      (vorhandeneInserate || []).map((e: { name: string }) => e.name.toLowerCase()),
    )

    const zeilen: Record<string, unknown>[] = []
    for (const platz of v.plaetze) {
      const abbildung = PLATZ_TYP[platz.art]
      if (!abbildung || platz.anzahl < 1) continue

      for (let i = 1; i <= platz.anzahl; i++) {
        const name = platz.anzahl > 1 ? `${abbildung.name} ${i}` : abbildung.name
        if (bekannt.has(name.toLowerCase())) continue
        bekannt.add(name.toLowerCase())

        zeilen.push({
          salon_id: salonId,
          type: abbildung.type,
          name,
          description: v.beschreibung || null,
          price_per_day_cents: tagespreis,
          price_per_hour_cents: v.preise.hour_cents ?? null,
          price_per_week_cents: v.preise.week_cents ?? null,
          price_per_month_cents: v.preise.month_cents ?? null,
          available_days: v.available_days.length > 0 ? v.available_days : null,
          available_from: v.available_from || null,
          available_to: v.available_to || null,
          features: v.features.length > 0 ? v.features : null,
          // `rental_equipment_online_needs_price` (CM22) verbietet ein
          // sichtbares Inserat ohne Tagespreis. Wer im Wizard nur einen
          // Stundenpreis angegeben hat, bekommt das Inserat angelegt —
          // aber offline, statt eines 23514 beim Speichern.
          is_available: !!tagespreis && tagespreis > 0,
        })
      }
    }

    if (zeilen.length > 0) {
      const { error } = await supabase.from('rental_equipment').insert(zeilen)
      if (error) throw new Error(`Inserate konnten nicht angelegt werden: ${error.message}`)
      inserateAngelegt = zeilen.length
      inserateOffline = zeilen.filter((z) => z.is_available !== true).length
    }
  }

  // ── Protokoll ────────────────────────────────────────────────────────
  const { error: protokollFehler } = await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'onboarding_draft_applied',
    entity: 'salon',
    entity_id: salonId,
    details: {
      quelle: entwurf.quelle,
      einwilligungen: entwurf.einwilligungen,
      rolle_angehoben: rolleAngehoben,
      salon_angelegt: salonAngelegt,
      leistungen: leistungenAngelegt,
      inserate: inserateAngelegt,
    },
  })
  if (protokollFehler) {
    logger.error('onboarding.audit_log_failed', { userId, err: protokollFehler.message })
  }

  return {
    salonId,
    salonAngelegt,
    rolleAngehoben,
    leistungenAngelegt,
    leistungenOhnePreis,
    inserateAngelegt,
    inserateOffline,
    adresseUnvollstaendig: !adresse.vollstaendig,
  }
}
