/**
 * Web Push: Verschluesselung der Nutzdaten (RFC 8291) und VAPID (RFC 8292).
 *
 * WAS HIER VORHER STAND UND WARUM ES FALSCH WAR
 *
 * `src/lib/push.ts` hat bis Track 23 zwei Dinge behauptet, die es nicht getan
 * hat:
 *
 *  1. Es setzte `Content-Encoding: aes128gcm` und schickte als Koerper
 *     unverschluesseltes JSON. Der Zweck der Verschluesselung in Web Push ist
 *     nicht die Leitung — die ist ohnehin TLS —, sondern der ZUSTELLDIENST:
 *     Google, Mozilla und Apple leiten die Nachricht weiter und sollen ihren
 *     Inhalt nicht lesen koennen. Genau das war aufgehoben. Der Inhalt sind
 *     Termine, Betraege und Bestellnummern.
 *
 *  2. Es baute das VAPID-Token mit `createSign('SHA256')`. Das liefert eine
 *     DER-kodierte ECDSA-Signatur (SEQUENCE aus zwei INTEGERn, variable
 *     Laenge). JWS/ES256 verlangt die rohe Form r||s mit festen 64 Byte.
 *     Ein Push-Dienst haette das Token also in jedem Fall abgelehnt — sofern
 *     es ueberhaupt so weit gekommen waere: der PEM-Block, den die Funktion
 *     zusammensetzte, bestand aus dem DER-Kopf `30770201010420` und dem
 *     32-Byte-Schluessel und hoerte dann auf. `0x77` = 119 Byte kuendigt eine
 *     Struktur an, in der neben dem privaten Schluessel noch die Kurven-OID
 *     und der oeffentliche Punkt stehen (3 + 34 + 12 + 70 = 119). Beides
 *     fehlte. `sign.sign()` warf, der Rueckfall („den Schluessel direkt als
 *     PEM") warf ebenfalls, und der Aufrufer zaehlte das als `failed++`.
 *
 * Beides ist hier ausgeschrieben, weil `web-push` als Abhaengigkeit nicht im
 * Projekt ist und ein halbes Verfahren schlimmer ist als gar keins: der Code
 * darf lieber ehrlich scheitern als etwas Unverschluesseltes losschicken.
 */

import {
  createCipheriv,
  createDecipheriv,
  createECDH,
  createHmac,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign as signAsym,
  verify as verifyAsym,
  type KeyObject,
} from 'crypto'

/** Groesse eines unkomprimierten P-256-Punktes (0x04 + X + Y). */
const P256_PUNKT_LAENGE = 65
/** Laenge des privaten P-256-Skalars. */
const P256_SKALAR_LAENGE = 32
/** Record-Size aus RFC 8188. Wir senden immer genau einen Record. */
export const RECORD_SIZE = 4096

export class WebPushKonfigurationsFehler extends Error {}

function b64u(buf: Buffer): string {
  return buf.toString('base64url')
}

function ausB64u(wert: string, name: string, erwarteteLaenge?: number): Buffer {
  const buf = Buffer.from(wert, 'base64url')
  if (buf.length === 0) throw new WebPushKonfigurationsFehler(`${name} ist leer`)
  if (erwarteteLaenge != null && buf.length !== erwarteteLaenge) {
    throw new WebPushKonfigurationsFehler(
      `${name} hat ${buf.length} Byte, erwartet ${erwarteteLaenge}`,
    )
  }
  return buf
}

// ---------------------------------------------------------------------------
// HKDF (RFC 5869), ausgeschrieben
// ---------------------------------------------------------------------------
// Nur SHA-256 und nur L <= 32, also genau eine Runde in der Expand-Phase.
// Ausgeschrieben statt `hkdfSync`, weil in RFC 8291 der Zwischenwert PRK
// zweimal weiterverwendet wird und die Rechnung so Schritt fuer Schritt gegen
// den Text der Norm zu lesen ist.

function hkdfExtract(salt: Buffer, ikm: Buffer): Buffer {
  return createHmac('sha256', salt).update(ikm).digest()
}

function hkdfExpand(prk: Buffer, info: Buffer, laenge: number): Buffer {
  if (laenge > 32) throw new Error('hkdfExpand: nur eine Runde vorgesehen')
  const t = createHmac('sha256', prk)
    .update(Buffer.concat([info, Buffer.from([0x01])]))
    .digest()
  return t.subarray(0, laenge)
}

/** `label || 0x00` — die Info-Zeichenketten aus RFC 8291/8188. */
function info(label: string): Buffer {
  return Buffer.concat([Buffer.from(label, 'ascii'), Buffer.from([0x00])])
}

// ---------------------------------------------------------------------------
// RFC 8291 — Nutzdaten verschluesseln
// ---------------------------------------------------------------------------

export interface Abonnementschluessel {
  /** Oeffentlicher Schluessel des Browsers, base64url, 65 Byte. */
  p256dh: string
  /** Auth-Secret des Abonnements, base64url, 16 Byte. */
  auth: string
}

/**
 * Verschluesselt `nutzdaten` fuer ein Abonnement.
 *
 * Rueckgabe ist der vollstaendige HTTP-Koerper nach RFC 8188:
 *
 *     salt (16) | rs (4) | idlen (1) | keyid (65) | ciphertext
 *
 * `salt` und das kurzlebige Schluesselpaar sind je Aufruf neu. Der Parameter
 * `testSalt`/`testSchluessel` existiert ausschliesslich fuer den Test gegen
 * feste Werte — im Produktivpfad wird er nie gesetzt.
 */
export function verschluesselePayload(
  nutzdaten: string,
  schluessel: Abonnementschluessel,
  test?: { salt?: Buffer; privatSkalar?: Buffer },
): Buffer {
  const uaPublic = ausB64u(schluessel.p256dh, 'p256dh', P256_PUNKT_LAENGE)
  const authSecret = ausB64u(schluessel.auth, 'auth')

  const ecdh = createECDH('prime256v1')
  if (test?.privatSkalar) {
    ecdh.setPrivateKey(test.privatSkalar)
  } else {
    ecdh.generateKeys()
  }
  const asPublic = ecdh.getPublicKey() // unkomprimiert, 65 Byte
  const gemeinsam = ecdh.computeSecret(uaPublic)

  // Schritt 1: aus dem ECDH-Geheimnis und dem Auth-Secret das IKM ableiten.
  //   PRK_key = HMAC(auth_secret, ecdh_secret)
  //   key_info = "WebPush: info" || 0x00 || ua_public || as_public
  //   IKM = HKDF-Expand(PRK_key, key_info, 32)
  const prkKey = hkdfExtract(authSecret, gemeinsam)
  const keyInfo = Buffer.concat([info('WebPush: info'), uaPublic, asPublic])
  const ikm = hkdfExpand(prkKey, keyInfo, 32)

  // Schritt 2: daraus Content-Encryption-Key und Nonce (RFC 8188).
  const salt = test?.salt ?? randomBytes(16)
  const prk = hkdfExtract(salt, ikm)
  const cek = hkdfExpand(prk, info('Content-Encoding: aes128gcm'), 16)
  const nonce = hkdfExpand(prk, info('Content-Encoding: nonce'), 12)

  // Schritt 3: ein einzelner Record. `0x02` ist das Trennzeichen fuer den
  // LETZTEN Record; `0x01` waere „es folgt noch einer".
  const klartext = Buffer.concat([Buffer.from(nutzdaten, 'utf8'), Buffer.from([0x02])])

  const cipher = createCipheriv('aes-128-gcm', cek, nonce)
  const ciphertext = Buffer.concat([cipher.update(klartext), cipher.final(), cipher.getAuthTag()])

  const kopf = Buffer.alloc(16 + 4 + 1)
  salt.copy(kopf, 0)
  kopf.writeUInt32BE(RECORD_SIZE, 16)
  kopf.writeUInt8(asPublic.length, 20)

  const koerper = Buffer.concat([kopf, asPublic, ciphertext])

  // Ein Record darf `rs` nicht ueberschreiten. Bei 4096 Byte und einer
  // Titel-/Text-Begrenzung von 200/2000 Zeichen ist das nie knapp — die
  // Pruefung steht hier, damit es auffaellt, falls sich das aendert.
  if (ciphertext.length > RECORD_SIZE) {
    throw new Error('Push-Nutzdaten ueberschreiten die Record-Size')
  }
  return koerper
}

// ---------------------------------------------------------------------------
// RFC 8292 — VAPID
// ---------------------------------------------------------------------------

/**
 * Baut aus dem rohen 32-Byte-Skalar einen Schluessel, mit dem Node signieren
 * kann. Der Weg fuehrt ueber SEC1-DER, weil `createPrivateKey` kein rohes
 * Skalar annimmt:
 *
 *     SEQUENCE {
 *       INTEGER 1
 *       OCTET STRING (32)              -- privater Skalar
 *       [0] OID 1.2.840.10045.3.1.7    -- prime256v1
 *       [1] BIT STRING (65)            -- oeffentlicher Punkt
 *     }
 */
function privatSchluesselAusSkalar(skalar: Buffer): { key: KeyObject; publicRaw: Buffer } {
  const ecdh = createECDH('prime256v1')
  ecdh.setPrivateKey(skalar)
  const publicRaw = ecdh.getPublicKey()

  const der = Buffer.concat([
    Buffer.from([0x30, 0x77, 0x02, 0x01, 0x01, 0x04, 0x20]),
    skalar,
    Buffer.from([0xa0, 0x0a, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07]),
    Buffer.from([0xa1, 0x44, 0x03, 0x42, 0x00]),
    publicRaw,
  ])

  const pem =
    '-----BEGIN EC PRIVATE KEY-----\n' +
    (der.toString('base64').match(/.{1,64}/g) ?? []).join('\n') +
    '\n-----END EC PRIVATE KEY-----\n'

  return { key: createPrivateKey(pem), publicRaw }
}

export interface VapidSchluesselpaar {
  /** base64url, 32 Byte. */
  privateKey: string
  /** base64url, 65 Byte. Optional — wird sonst abgeleitet. */
  publicKey?: string
  /** `mailto:` oder `https:` — der Kontakt aus RFC 8292 §2.1. */
  subject: string
}

export interface VapidKopfzeilen {
  Authorization: string
}

/**
 * Erzeugt die VAPID-Kopfzeile fuer genau einen Endpunkt.
 *
 * `aud` ist der Origin des Endpunkts — das Token gilt damit nur bei dem
 * Dienst, an den es geht.
 *
 * Passt `publicKey` nicht zum privaten Schluessel, wird geworfen statt
 * gesendet: der Dienst wuerde sonst mit 401 antworten, und die einzige Spur
 * davon waere ein hochgezaehlter Fehlerzaehler.
 */
export function baueVapidKopf(
  endpoint: string,
  paar: VapidSchluesselpaar,
  jetztSekunden: number,
): VapidKopfzeilen {
  if (!paar.privateKey) throw new WebPushKonfigurationsFehler('VAPID_PRIVATE_KEY fehlt')
  if (!/^(mailto:|https:)/.test(paar.subject)) {
    throw new WebPushKonfigurationsFehler('VAPID_EMAIL muss mailto: oder https: sein')
  }

  const skalar = ausB64u(paar.privateKey, 'VAPID_PRIVATE_KEY', P256_SKALAR_LAENGE)
  const { key, publicRaw } = privatSchluesselAusSkalar(skalar)

  if (paar.publicKey) {
    const angegeben = ausB64u(paar.publicKey, 'VAPID_PUBLIC_KEY', P256_PUNKT_LAENGE)
    if (!angegeben.equals(publicRaw)) {
      throw new WebPushKonfigurationsFehler(
        'VAPID_PUBLIC_KEY passt nicht zu VAPID_PRIVATE_KEY',
      )
    }
  }

  const aud = new URL(endpoint).origin
  const kopf = b64u(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  // 12 Stunden ist das Maximum aus RFC 8292 §2.
  const nutz = b64u(
    Buffer.from(
      JSON.stringify({ aud, exp: Math.floor(jetztSekunden) + 12 * 60 * 60, sub: paar.subject }),
    ),
  )
  const zuSignieren = Buffer.from(`${kopf}.${nutz}`, 'ascii')

  // `ieee-p1363` ist der Unterschied zwischen einem gueltigen ES256-Token und
  // einer DER-Signatur, die jeder Push-Dienst ablehnt.
  const signatur = signAsym('sha256', zuSignieren, { key, dsaEncoding: 'ieee-p1363' })
  if (signatur.length !== 64) {
    throw new Error(`ES256-Signatur hat ${signatur.length} Byte, erwartet 64`)
  }

  const jwt = `${kopf}.${nutz}.${b64u(signatur)}`
  return { Authorization: `vapid t=${jwt}, k=${b64u(publicRaw)}` }
}

/**
 * Gegenprobe fuer den Test: haelt die Signatur einer Pruefung stand?
 * Steht hier und nicht im Test, damit die Kodierung (`ieee-p1363`) an genau
 * einer Stelle festgelegt ist.
 */
export function pruefeVapidSignatur(jwt: string, publicKeyB64u: string): boolean {
  const [kopf, nutz, sig] = jwt.split('.')
  if (!kopf || !nutz || !sig) return false
  const punkt = Buffer.from(publicKeyB64u, 'base64url')
  if (punkt.length !== P256_PUNKT_LAENGE) return false

  const ecdh = createECDH('prime256v1')
  ecdh.generateKeys()
  // SPKI-Huelle fuer einen rohen P-256-Punkt.
  const spki = Buffer.concat([
    Buffer.from(
      '3059301306072a8648ce3d020106082a8648ce3d030107034200',
      'hex',
    ),
    punkt,
  ])
  const key = createPublicKey({ key: spki, format: 'der', type: 'spki' })
  return verifyAsym(
    'sha256',
    Buffer.from(`${kopf}.${nutz}`, 'ascii'),
    { key, dsaEncoding: 'ieee-p1363' },
    Buffer.from(sig, 'base64url'),
  )
}

/**
 * Entschluesselt einen Koerper aus `verschluesselePayload` — nur fuer den
 * Test. Der Produktivcode entschluesselt nie; das macht der Browser.
 */
export function entschluesselePayloadFuerTest(
  koerper: Buffer,
  uaPrivatSkalar: Buffer,
  authSecret: Buffer,
): string {
  const salt = koerper.subarray(0, 16)
  const idlen = koerper.readUInt8(20)
  const asPublic = koerper.subarray(21, 21 + idlen)
  const ciphertext = koerper.subarray(21 + idlen)

  const ecdh = createECDH('prime256v1')
  ecdh.setPrivateKey(uaPrivatSkalar)
  const uaPublic = ecdh.getPublicKey()
  const gemeinsam = ecdh.computeSecret(asPublic)

  const prkKey = hkdfExtract(authSecret, gemeinsam)
  const keyInfo = Buffer.concat([info('WebPush: info'), uaPublic, asPublic])
  const ikm = hkdfExpand(prkKey, keyInfo, 32)
  const prk = hkdfExtract(salt, ikm)
  const cek = hkdfExpand(prk, info('Content-Encoding: aes128gcm'), 16)
  const nonce = hkdfExpand(prk, info('Content-Encoding: nonce'), 12)

  const decipher = createDecipheriv('aes-128-gcm', cek, nonce)
  decipher.setAuthTag(ciphertext.subarray(ciphertext.length - 16))
  const klartext = Buffer.concat([
    decipher.update(ciphertext.subarray(0, ciphertext.length - 16)),
    decipher.final(),
  ])
  return klartext.subarray(0, klartext.length - 1).toString('utf8')
}
