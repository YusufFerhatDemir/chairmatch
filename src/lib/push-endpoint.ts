/**
 * Pruefung des Push-Endpunkts.
 *
 * WARUM ES DAS BRAUCHT:
 *
 * Ein Push-Endpunkt ist eine URL, die der SERVER spaeter abruft. Sie kommt
 * aus dem Browser des Nutzers und landete bis Track 23 ungeprueft in
 * `push_subscriptions.endpoint` — POST /api/push/subscribe nahm jede
 * Zeichenkette bis 2000 Zeichen an. `sendPushNotification` macht daraus ein
 *
 *     fetch(sub.endpoint, { method: 'POST', ... })
 *
 * aus dem Rechenzentrum heraus. Damit bestimmt ein angemeldeter Nutzer, wohin
 * unser Server eine Anfrage schickt: `http://169.254.169.254/…` (Metadaten des
 * Hosters), `http://127.0.0.1:3000/api/…` (unsere eigenen Routen, von innen),
 * jede interne Adresse. Die Antwort sieht der Angreifer nicht — blind, aber
 * eine Anfrage aus unserem Netz ist die halbe Miete, und der VAPID-Header
 * (ein signiertes Token auf unseren Namen) geht mit.
 *
 * Deshalb: eine Positivliste. Web Push hat genau eine Handvoll Betreiber, und
 * jeder von ihnen liefert Endpunkte unter festen Hosts aus. Was nicht auf der
 * Liste steht, ist kein Push-Endpunkt — egal wie gueltig die URL aussieht.
 *
 * Geprueft wird an BEIDEN Enden: beim Speichern (damit nichts Fremdes in die
 * Tabelle kommt) und unmittelbar vor dem `fetch` (damit eine Zeile, die auf
 * anderem Weg entstanden ist — Altbestand, Migration, Direktzugriff — nicht
 * doch abgerufen wird).
 */

/** Exakte Hosts. */
const ERLAUBTE_HOSTS: readonly string[] = [
  // Chrome, Chromium, alles mit FCM
  'fcm.googleapis.com',
  'android.googleapis.com',
  // Safari / iOS
  'web.push.apple.com',
]

/**
 * Erlaubte Endungen. Firefox und Edge vergeben Endpunkte auf wechselnden
 * Unterdomaenen (`updates-autopush.stage.mozaws.net`,
 * `wns2-by3p.notify.windows.com`), deshalb hier ein Suffix statt eines
 * festen Namens. Der fuehrende Punkt ist wesentlich: ohne ihn wuerde
 * `evilnotify.windows.com` … nein, `boesenotify.windows.com` passen.
 */
const ERLAUBTE_SUFFIXE: readonly string[] = [
  '.push.services.mozilla.com',
  '.notify.windows.com',
  '.push.apple.com',
]

export const MAX_ENDPOINT_LAENGE = 2000

export type EndpointPruefung =
  | { ok: true; url: URL }
  | { ok: false; grund: string }

/**
 * Ist `host` eine IP-Adresse statt eines Namens? Wird zusaetzlich zur
 * Positivliste geprueft, damit die Absicht im Code steht und nicht nur
 * implizit aus der Liste folgt.
 */
function istIpLiteral(hostname: string): boolean {
  if (hostname.startsWith('[')) return true // IPv6 in Klammern
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
}

export function pruefePushEndpoint(roh: unknown): EndpointPruefung {
  if (typeof roh !== 'string' || roh.length === 0) {
    return { ok: false, grund: 'endpoint fehlt' }
  }
  if (roh.length > MAX_ENDPOINT_LAENGE) {
    return { ok: false, grund: `endpoint laenger als ${MAX_ENDPOINT_LAENGE} Zeichen` }
  }

  let url: URL
  try {
    url = new URL(roh)
  } catch {
    return { ok: false, grund: 'endpoint ist keine gueltige URL' }
  }

  if (url.protocol !== 'https:') {
    return { ok: false, grund: 'endpoint muss https sein' }
  }
  // Anmeldedaten in der URL sind bei keinem Push-Dienst vorgesehen und waeren
  // ein Weg, einen Proxy im eigenen Netz zu erreichen.
  if (url.username || url.password) {
    return { ok: false, grund: 'endpoint darf keine Anmeldedaten enthalten' }
  }
  // Ein abweichender Port waere ein Dienst, der nur zufaellig unter einem
  // erlaubten Namen laeuft.
  if (url.port && url.port !== '443') {
    return { ok: false, grund: 'endpoint darf keinen abweichenden Port haben' }
  }

  const host = url.hostname.toLowerCase()
  if (istIpLiteral(host)) {
    return { ok: false, grund: 'endpoint darf keine IP-Adresse sein' }
  }

  const erlaubt =
    ERLAUBTE_HOSTS.includes(host) || ERLAUBTE_SUFFIXE.some((s) => host.endsWith(s))
  if (!erlaubt) {
    return { ok: false, grund: 'endpoint gehoert zu keinem bekannten Push-Dienst' }
  }

  return { ok: true, url }
}

/** Kurzform fuer Stellen, die nur ja/nein brauchen. */
export function istErlaubterPushEndpoint(roh: unknown): boolean {
  return pruefePushEndpoint(roh).ok
}
