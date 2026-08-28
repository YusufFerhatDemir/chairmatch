import { getSupabaseAdmin } from '@/lib/supabase-server'
import { pruefePushEndpoint } from '@/lib/push-endpoint'
import {
  WebPushKonfigurationsFehler,
  baueVapidKopf,
  verschluesselePayload,
} from '@/lib/web-push'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:info@chairmatch.de'

/**
 * Wie viele Geraete ein Konto anmelden darf.
 *
 * Ohne Deckel ist `push_subscriptions` eine Tabelle, in die jeder angemeldete
 * Nutzer beliebig viele Zeilen zu je ~3 kB schreiben kann — und jede davon
 * verlaengert die Sendeschleife um einen ausgehenden Request.
 */
export const MAX_ABOS_PRO_KONTO = 20

interface PushSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

export type SpeicherErgebnis =
  | { ok: true; angelegt: boolean }
  | { ok: false; grund: 'endpoint_ungueltig' | 'fremdes_abo' | 'limit' | 'db'; detail?: string }

/**
 * Legt ein Push-Abonnement an oder frischt es auf.
 *
 * WARUM HIER KEIN `upsert` MEHR STEHT — der Grund ist der Kern von Track 23:
 *
 * Vorher stand hier
 *
 *     .upsert({ user_id, endpoint, p256dh, auth, updated_at }, { onConflict: 'user_id,endpoint' })
 *
 * und das konnte aus zwei unabhaengigen Gruenden nie gelingen:
 *
 *  1. `push_subscriptions` hat live KEINE Spalte `updated_at` (Sonde vom
 *     28.08.2026: `?select=updated_at` -> 42703, waehrend `created_at`
 *     42501 liefert, also existiert). PostgREST beantwortet einen Schreib-
 *     zugriff auf eine unbekannte Spalte mit einem Fehler, nicht mit einem
 *     stillen Weglassen.
 *  2. Der einzige UNIQUE-Index der Tabelle steht auf `endpoint` ALLEIN
 *     (`endpoint TEXT NOT NULL UNIQUE`, Migration 20260317). `ON CONFLICT
 *     (user_id, endpoint)` verlangt einen Index auf genau diesen beiden
 *     Spalten; Postgres antwortet sonst mit 42P10 „there is no unique or
 *     exclusion constraint matching the ON CONFLICT specification".
 *
 * Die Funktion warf daraufhin, die Route antwortete 500 — und `push_subscriptions`
 * konnte nie eine Zeile bekommen. Damit lieferte `sendPushNotification`
 * ausnahmslos `{ sent: 0, failed: 0 }`, und /api/push/send meldete dem Admin
 * `success: true`.
 *
 * Jetzt: nachsehen, dann schreiben. Das kommt ohne ON CONFLICT aus, laeuft
 * also gegen das Schema, das heute wirklich da ist, und macht nebenbei den
 * Fall sichtbar, den ein `upsert` verdeckt haette — ein Endpunkt, der bereits
 * einem ANDEREN Konto gehoert. Ein `upsert` haette ihn stillschweigend
 * umgehaengt: die Benachrichtigungen des Angreifers waeren danach auf dem
 * Geraet des Opfers gelandet und dessen eigene nirgends mehr.
 */
export async function saveSubscription(
  userId: string,
  subscription: PushSubscription,
): Promise<SpeicherErgebnis> {
  const geprueft = pruefePushEndpoint(subscription.endpoint)
  if (!geprueft.ok) {
    return { ok: false, grund: 'endpoint_ungueltig', detail: geprueft.grund }
  }

  const supabase = getSupabaseAdmin()

  const { data: vorhanden, error: leseFehler } = await supabase
    .from('push_subscriptions')
    .select('id, user_id')
    .eq('endpoint', subscription.endpoint)
    .maybeSingle()

  if (leseFehler) return { ok: false, grund: 'db', detail: leseFehler.message }

  if (vorhanden) {
    if (vorhanden.user_id !== userId) {
      return { ok: false, grund: 'fremdes_abo' }
    }
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ p256dh: subscription.p256dh, auth: subscription.auth })
      .eq('id', vorhanden.id)
      .eq('user_id', userId)
    if (error) return { ok: false, grund: 'db', detail: error.message }
    return { ok: true, angelegt: false }
  }

  const { count, error: zaehlFehler } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Der Zaehler entscheidet ueber eine Ablehnung. Faellt er aus, wird nicht
  // durchgewunken — sonst waere der Deckel bei jedem DB-Aussetzer offen.
  if (zaehlFehler) return { ok: false, grund: 'db', detail: zaehlFehler.message }
  if ((count ?? 0) >= MAX_ABOS_PRO_KONTO) return { ok: false, grund: 'limit' }

  const { error } = await supabase.from('push_subscriptions').insert({
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
  })

  if (error) {
    // 23505: zwischen Lesen und Schreiben hat jemand denselben Endpunkt
    // angelegt. Fuer denselben Nutzer ist das der gewuenschte Endzustand.
    if (error.code === '23505') return { ok: true, angelegt: false }
    return { ok: false, grund: 'db', detail: error.message }
  }
  return { ok: true, angelegt: true }
}

export interface SendeErgebnis {
  sent: number
  failed: number
  /** Zeilen, deren Endpunkt heute nicht mehr erlaubt ist. */
  skipped: number
  /** Gesetzt, wenn gar nicht erst gesendet wurde (VAPID unbrauchbar). */
  konfigurationsfehler?: string
}

/**
 * Schickt eine Benachrichtigung an alle Geraete eines Kontos.
 *
 * Zwei Dinge, die vorher fehlten:
 *
 *  - Die Nutzdaten werden nach RFC 8291 verschluesselt. Vorher ging JSON im
 *    Klartext raus, mit `Content-Encoding: aes128gcm` im Kopf. Der Push-Dienst
 *    (Google/Mozilla/Apple) haette Titel und Text mitgelesen — das sind
 *    Termine, Betraege und Bestellnummern.
 *  - Der Endpunkt wird unmittelbar vor dem Aufruf noch einmal geprueft. Er ist
 *    eine URL aus Nutzerhand; ohne Pruefung bestimmt ein angemeldetes Konto,
 *    wohin unser Server eine Anfrage schickt (siehe src/lib/push-endpoint.ts).
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
): Promise<SendeErgebnis> {
  const supabase = getSupabaseAdmin()

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to fetch subscriptions: ${error.message}`)
  }

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0, skipped: 0 }
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: '/' },
  })

  const jetzt = Math.floor(Date.now() / 1000)
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const sub of subscriptions) {
    const geprueft = pruefePushEndpoint(sub.endpoint)
    if (!geprueft.ok) {
      console.error('[push] Endpunkt abgelehnt:', geprueft.grund)
      skipped++
      continue
    }

    let koerper: Buffer
    let vapid: { Authorization: string }
    try {
      koerper = verschluesselePayload(payload, { p256dh: sub.p256dh, auth: sub.auth })
      vapid = baueVapidKopf(
        sub.endpoint,
        { privateKey: VAPID_PRIVATE_KEY, publicKey: VAPID_PUBLIC_KEY || undefined, subject: VAPID_EMAIL },
        jetzt,
      )
    } catch (err) {
      // Ein Konfigurationsfehler betrifft jede Zeile gleichermassen — dann
      // hat es keinen Sinn, die Schleife weiterlaufen zu lassen und am Ende
      // eine Zahl zu melden, die nach Zustellversuchen aussieht.
      if (err instanceof WebPushKonfigurationsFehler) {
        console.error('[push] VAPID unbrauchbar:', err.message)
        return { sent, failed, skipped, konfigurationsfehler: err.message }
      }
      console.error('[push] Verschluesselung fehlgeschlagen:', err)
      failed++
      continue
    }

    try {
      const response = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          ...vapid,
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aes128gcm',
          TTL: '86400',
        },
        body: new Uint8Array(koerper),
      })

      if (response.status === 201 || response.status === 200) {
        sent++
      } else if (response.status === 404 || response.status === 410) {
        // Abonnement abgelaufen oder zurueckgezogen — die Zeile ist tot.
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint)
          .eq('user_id', userId)
        failed++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return { sent, failed, skipped }
}

/**
 * Entfernt alle Push-Abos eines Kontos. Gebraucht bei der Konto-Loeschung:
 * `push_subscriptions.user_id` haengt zwar per ON DELETE CASCADE an
 * `profiles`, aber die Loeschung anonymisiert das Profil nur — die Zeile
 * bleibt sonst mitsamt Geraete-Endpunkt stehen.
 */
export async function deleteSubscriptionsForUser(userId: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', userId)
  return { error: error?.message ?? null }
}
