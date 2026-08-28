import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit'
import { hashIp } from '@/lib/ip-hash'
import { logger } from '@/lib/logger'
import { parseDayPrice, slugify } from '@/lib/provider-registration'
import { z } from 'zod'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Oeffentliche Anbieter-Registrierung (Formular /register/anbieter).
 *
 * Vier Befunde aus Track 11, alle im selben Handler:
 *
 * 1. DAS KONTO WAR NICHT BENUTZBAR.
 *    Hier entstand ein Zufallspasswort, das nirgends hinging: es wurde nicht
 *    zurueckgegeben (richtig so), nicht gespeichert (richtig so) — und auch
 *    nicht verschickt. Der Kommentar daneben sagte "Send welcome email with
 *    temp password", `sendWelcomeEmail(to, name)` nimmt aber gar kein
 *    Passwort entgegen. Wer sich registrierte, hatte ein Supabase-Auth-Konto
 *    mit einem Passwort, das kein Mensch kannte, und keinen Hinweis darauf,
 *    dass "Passwort vergessen" der einzige Weg hinein ist. Jetzt loest die
 *    Registrierung selbst eine Passwort-Setzen-Mail aus (derselbe
 *    Supabase-Weg wie /api/auth/forgot-password), und die Bestaetigungsseite
 *    sagt, dass sie kommt.
 *
 * 2. DIE VERMIETUNGS-ANGABEN FIELEN WEG.
 *    Schritt 3 des Formulars fragt "Ja, ich vermiete Stuehle" und den Preis
 *    pro Tag, die Zusammenfassung zeigt "Stuhlmiete 45 €/Tag" — gespeichert
 *    wurde nichts davon. `salons.chair_rental` (boolean) und
 *    `salons.chair_price_day` (numeric, Euro) existieren live und blieben
 *    leer. Jetzt werden beide geschrieben.
 *
 * 3. DIE IBAN WURDE ERFRAGT UND WEGGEWORFEN.
 *    Sie stand im Schema, wurde validiert und dann nie verwendet. Das Feld
 *    ist aus dem Formular entfernt (siehe dortigen Kommentar) und wird hier
 *    nicht mehr angenommen. Auszahlungsdaten gehoeren in `payout_accounts`
 *    ueber /api/me/payout-account — eine angemeldete Route, die nur die
 *    letzten vier Stellen wieder herausgibt.
 *
 * 4. KEIN RATE-LIMIT.
 *    Ein oeffentlicher Endpunkt, der pro Aufruf ein Auth-Konto, ein Profil,
 *    einen Salon und zwei Mails erzeugt, hatte keinerlei Begrenzung.
 *
 * Ausserdem: schlug das Anlegen des Salons fehl, blieben Auth-Konto und
 * Profil zurueck und ein zweiter Versuch mit derselben Adresse lief in den
 * Signup-Fehler — die Registrierung war dauerhaft blockiert. Der Fehlerfall
 * raeumt das Profil jetzt ab und sagt es.
 */

const providerSchema = z.object({
  vn: z.string().min(2).max(100),
  nn: z.string().min(2).max(100),
  em: z.string().email(),
  tel: z.string().min(5).max(40),
  geschaeft: z.string().min(2).max(200),
  st: z.string().min(2).max(200),
  plz: z.string().min(4).max(12),
  city: z.string().min(2).max(100),
  kat: z.string().min(1).max(80),
  gb: z.boolean(),
  chair: z.boolean(),
  /** Preis pro Tag in Euro. Nur relevant, wenn `chair` gesetzt ist. */
  cpr: z.string().max(20).optional(),
  agb: z.literal(true),
  dsgvo: z.literal(true),
})

/** Ein Formular pro Minute und IP reicht; fuenf pro Stunde decken Tippfehler ab. */
const RATE_IP = { scope: 'register-provider', max: 5, windowMs: 60 * 60_000 }
/** Zusaetzlich pro Adresse — ein IP-Wechsel soll die Mailflut nicht neu starten. */
const RATE_EMAIL = { scope: 'register-provider-email', max: 3, windowMs: 60 * 60_000 }

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req)
    const ipLimit = checkRateLimit(ip, RATE_IP)
    if (ipLimit.limited) {
      return rateLimitResponse(ipLimit, 'Zu viele Registrierungen. Bitte spaeter erneut versuchen.')
    }

    const body = await req.json()
    const parsed = providerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const d = parsed.data
    const email = d.em.toLowerCase().trim()

    const emailLimit = checkRateLimit(email, RATE_EMAIL)
    if (emailLimit.limited) {
      return rateLimitResponse(emailLimit, 'Zu viele Registrierungen fuer diese Adresse.')
    }

    // 1. Supabase-Auth-Konto anlegen.
    //
    // Das Passwort ist bewusst Zufall und verlaesst diesen Block nie: gesetzt
    // wird es gleich unten ueber die Passwort-Mail. Ein aus dem Formular
    // uebernommenes Passwort waere hier auch keine Option — das Formular fragt
    // gar keines ab.
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    const password = Array.from(bytes, b => b.toString(36)).join('').slice(0, 24) + 'A1!'
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: `${d.vn} ${d.nn}`, role: 'anbieter' } },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Registrierung fehlgeschlagen' },
        { status: 400 }
      )
    }

    const userId = authData.user.id
    const admin = getSupabaseAdmin()

    // 2. Profil mit Anbieter-Rolle
    const { error: profileError } = await admin
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: `${d.vn} ${d.nn}`,
        role: 'anbieter',
        phone: d.tel,
      })

    if (profileError) {
      logger.error('register-provider.profile_failed', { userId, err: profileError.message })
      return NextResponse.json(
        { error: 'Profil konnte nicht angelegt werden. Bitte spaeter erneut versuchen.' },
        { status: 500 }
      )
    }

    // 3. Salon anlegen — inklusive der Vermietungs-Angaben aus Schritt 3.
    const dayPrice = d.chair ? parseDayPrice(d.cpr) : null
    const { error: salonError } = await admin.from('salons').insert({
      owner_id: userId,
      name: d.geschaeft,
      slug: `${slugify(d.geschaeft)}-${Date.now().toString(36)}`,
      city: d.city,
      street: d.st,
      postal_code: d.plz,
      category: d.kat.toLowerCase(),
      is_active: false,
      is_verified: false,
      chair_rental: d.chair,
      chair_price_day: dayPrice,
    })

    if (salonError) {
      // Aufraeumen — und zwar das AUTH-KONTO ZUERST.
      //
      // Bis Track 13 stand hier nur `profiles.delete()`. Der Auth-Nutzer blieb
      // stehen, und damit entstand genau der Zustand, den `authorizeCredentials`
      // frueher mit der Rolle aus `user_metadata` beantwortet hat: ein
      // anmeldbares Konto OHNE Zeile in `profiles`. Da `signUp` hier
      // `data: { role: 'anbieter' }` in die Metadaten schreibt und jeder
      // Kontoinhaber sie mit dem oeffentlichen Anon-Key selbst ueberschreiben
      // kann (`supabase.auth.updateUser({ data: { role: 'super_admin' } })`),
      // war das ein Weg zur frei gewaehlten Rolle. Die Ursache ist in
      // auth.config.ts beseitigt; die Quelle des Zustands hier.
      //
      // Zweiter Effekt, den das Loeschen des Profils allein NICHT geloest hat:
      // ein erneuter Versuch mit derselben Adresse lief weiter in
      // "User already registered", weil das Auth-Konto ja blieb. Erst mit
      // diesem Schritt ist die Registrierung wirklich wiederholbar.
      logger.error('register-provider.salon_failed', { userId, err: salonError.message })

      let authGeloescht = false
      try {
        const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId)
        authGeloescht = !authDeleteError
        if (authDeleteError) {
          logger.error('register-provider.auth_cleanup_failed', {
            userId,
            err: authDeleteError.message,
          })
        }
      } catch (e) {
        logger.error('register-provider.auth_cleanup_failed', { userId, err: String(e) })
      }

      // Das Profil geht NUR mit dem Auth-Konto. Bleibt das Konto stehen, muss
      // auch das Profil bleiben — sonst ist der verwaiste Nutzer wieder da.
      if (authGeloescht) {
        await admin.from('profiles').delete().eq('id', userId)
      }

      return NextResponse.json(
        { error: 'Salon konnte nicht erstellt werden. Bitte spaeter erneut versuchen.' },
        { status: 500 }
      )
    }

    // 4. Einwilligungen protokollieren.
    //
    // Nicht in `consents`: diese Tabelle haengt live an einer Buchung
    // (`booking_id` NOT NULL, siehe src/test/live-schema.ts) und ist fuer den
    // Behandlungs-Consent gedacht. Die Registrierungs-Einwilligung gehoert
    // in das Protokoll, das es dafuer gibt.
    const { error: consentError } = await admin.from('audit_logs').insert({
      user_id: userId,
      action: 'provider_registration_consent',
      entity: 'profile',
      entity_id: userId,
      // `ip` stand hier bis Track 12 im KLARTEXT. Das Rate-Limit oben braucht
      // die Adresse tatsaechlich, das Einwilligungs-Protokoll nicht: es muss
      // belegen koennen, DASS die Einwilligung aus einer bestimmten Sitzung
      // kam, nicht aus welcher Wohnung. Derselbe HMAC wie in `consent_logs`,
      // damit beide Protokolle vergleichbar bleiben (src/lib/ip-hash.ts).
      details: { agb: d.agb, dsgvo: d.dsgvo, gewerbeschein_angegeben: d.gb, ip_hash: hashIp(ip) },
    })
    if (consentError) {
      logger.error('register-provider.consent_log_failed', { userId, err: consentError.message })
    }

    // 5. Passwort-Mail. OHNE sie kommt niemand in das eben angelegte Konto.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.chairmatch.de'}/auth/reset-password`,
    })
    if (resetError) {
      logger.error('register-provider.password_mail_failed', { userId, err: resetError.message })
    }

    // 6. Begruessung — die Anbieter-Fassung, nicht die Kunden-Fassung.
    try {
      const { sendProviderWelcomeEmail } = await import('@/lib/email')
      await sendProviderWelcomeEmail(email, `${d.vn} ${d.nn}`, d.geschaeft)
    } catch (e) {
      logger.warn('register-provider.welcome_mail_failed', { userId, err: String(e) })
    }

    return NextResponse.json({
      success: true,
      // Der Browser soll sagen koennen, ob die Passwort-Mail wirklich raus
      // ist — "E-Mail folgt" ohne Mail war genau der Zustand vorher.
      passwordEmailSent: !resetError,
    })
  } catch (e) {
    logger.error('register-provider.unhandled', e)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
