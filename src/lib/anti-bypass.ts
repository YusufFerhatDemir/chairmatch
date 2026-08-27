/**
 * Anti-Bypass-Detection: erkennt wenn User in In-App-Messaging versuchen
 * Kontakt außerhalb der Plattform aufzunehmen.
 *
 * Strategie: Regex-Detection (schnell, deterministisch) — keine LLM-
 * Inferenz im Hot-Path (zu langsam, zu teuer). LLM könnte später
 * für Edge-Cases nachgeschaltet werden.
 *
 * Zweck: Marketplace-Schutz vor Bypass. Bei Treffer: Warnung an
 * Sender + Soft-Block des Outbound-Texts.
 */

/** Deutsche & internationale Telefonnummer-Patterns */
const PHONE_PATTERNS: RegExp[] = [
  /\b0\d{2,4}[\s\-/]?\d{3,12}\b/,           // 0xxx-yyy oder 0xxx yyy
  /\+49[\s-]?\d{2,4}[\s-]?\d{3,12}/,       // +49-xxx-yyy
  /\b\d{3}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/,   // 030 1234567 etc.
  /\b1\s*5\s*\d\s*[-\s]?(?:\d\s*){7,10}/i,   // 015x... mit Leerzeichen-Trick (15x...)
]

/** Email-Adressen */
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/

/**
 * URLs ausserhalb chairmatch.de.
 *
 * Die Ausnahme muss auf den HOST zeigen und dort enden. Vorher stand da
 * `(?!chairmatch\.de|.*\.chairmatch\.de\b)`, und beide Alternativen waren
 * zu locker:
 *
 *   https://chairmatch.de.evil.com/phish   → galt als eigene Domain
 *   https://evil.com/pfad/a.chairmatch.de  → `.*` fand den Namen irgendwo
 *                                            hinten im Pfad
 *
 * Die erste Variante ist die gefaehrlichere: eine Lookalike-Domain lief
 * ungeprueft durch die Nachrichten. Jetzt muss auf den Namen direkt ein
 * Host-Ende folgen (`/`, `?`, `#`, `:` oder Stringende), Subdomains sind
 * ueber das optionale Praefix weiterhin erlaubt.
 */
const URL_PATTERN =
  /\bhttps?:\/\/(?!(?:[a-z0-9-]+\.)*chairmatch\.de(?:[:/?#]|$))[^\s]+/i

/** Social-Media-Mentions / Handles */
const SOCIAL_KEYWORDS = [
  'whatsapp', 'whats app', 'wa.me', 'wapp', 'wsapp',
  'instagram', 'insta', 'ig:', 'ig @', '@insta', 'dm mir', 'dm me',
  'telegram', 'tg:', 't.me/',
  'signal', 'snapchat', 'snap me',
  'tiktok', 'tt:',
]

const SOCIAL_REGEX = new RegExp(
  '\\b(' + SOCIAL_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')).join('|') + ')\\b',
  'i'
)

/** Tarn-Versuche: "null sieben null drei zwei..." als Spelled-Out-Number */
const SPELLED_OUT_NUMBERS = /\b(null|eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zero|one|two|three|four|five|six|seven|eight|nine)\s+(null|eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zero|one|two|three|four|five|six|seven|eight|nine)\s+(null|eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zero|one|two|three|four|five|six|seven|eight|nine)/i

export interface BypassDetectionResult {
  triggered: boolean
  reasons: string[]
  /** Confidence 0-1, basierend auf Anzahl Treffer */
  confidence: number
}

export function detectBypass(text: string): BypassDetectionResult {
  const reasons: string[] = []

  for (const regex of PHONE_PATTERNS) {
    if (regex.test(text)) {
      reasons.push('Telefonnummer erkannt')
      break
    }
  }

  if (EMAIL_PATTERN.test(text)) {
    reasons.push('Email-Adresse erkannt')
  }

  if (URL_PATTERN.test(text)) {
    reasons.push('Externer Link erkannt')
  }

  if (SOCIAL_REGEX.test(text)) {
    reasons.push('Social-Media-Mention erkannt')
  }

  if (SPELLED_OUT_NUMBERS.test(text)) {
    reasons.push('Ausgeschriebene Zahlen erkannt (Tarn-Verdacht)')
  }

  // 8+ aufeinanderfolgende Ziffern auch ohne Trennzeichen
  if (/\d{8,}/.test(text.replace(/\s/g, ''))) {
    reasons.push('Lange Ziffernfolge erkannt')
  }

  return {
    triggered: reasons.length > 0,
    reasons,
    confidence: Math.min(1, reasons.length * 0.4),
  }
}

/**
 * Generiert eine User-freundliche Warnung für den Sender.
 */
export function bypassWarningMessage(detection: BypassDetectionResult): string {
  return `🔒 Sicherheits-Hinweis

Dein Text enthält möglicherweise Kontaktdaten (${detection.reasons.join(', ')}).

Aus Sicherheitsgründen werden Kontaktdaten in dieser Nachricht nicht weitergeleitet — sie werden automatisch nach erfolgreicher Buchung freigeschaltet.

Falls du eine konkrete Frage hast: stell sie hier direkt. Die Plattform-Garantie greift nur bei Buchungen über ChairMatch.`
}
