/**
 * Der Ursprung, auf den wir Besucher zurueckschicken duerfen.
 *
 * Sechs Stellen bauten ihre Rueckkehr-URLs bis Track 12 so:
 *
 *     const origin = req.headers.get('origin') || 'https://www.chairmatch.de'
 *
 * `Origin` ist ein Request-Header. Im Browser setzt ihn der Browser, aber
 * dieser Endpunkt ist nicht auf Browser angewiesen — `curl -H 'Origin:
 * https://chairmatch-zahlung.example' …` genuegt. Der Wert landete
 * ungeprueft in `success_url` und `cancel_url` der Stripe-Checkout-Session
 * und in `return_url`/`refresh_url` des Connect-Onboardings.
 *
 * Was daraus folgt: eine ECHTE, von uns erzeugte Stripe-Session, gehostet
 * auf checkout.stripe.com, mit unserem Produktnamen und unserem Betrag — die
 * nach der Zahlung auf eine fremde Domain weiterleitet. Das ist die
 * ueberzeugendste Form von Phishing, die es fuer eine Zahlungsseite gibt,
 * denn die Zahlungsseite selbst ist echt. Beim Connect-Onboarding wiegt es
 * noch schwerer: dort landet der Anbieter nach der Eingabe seiner Bank- und
 * Ausweisdaten auf der Seite des Angreifers.
 *
 * Deshalb: Der Header darf nur noch BESTAETIGEN, welchen unserer eigenen
 * Urspruenge wir nehmen — er darf keinen neuen mehr einfuehren.
 */

/** Fester Ursprung, wenn nichts anderes passt. */
export const DEFAULT_ORIGIN = 'https://www.chairmatch.de'

/**
 * Alle Ursprunge, die zu dieser Installation gehoeren.
 *
 * `VERCEL_URL` und `VERCEL_BRANCH_URL` setzt Vercel selbst fuer das gerade
 * laufende Deployment — sie kommen aus der Umgebung, nicht aus dem Request,
 * und sind deshalb genauso vertrauenswuerdig wie eine feste Liste. Ohne sie
 * wuerde jeder Preview-Checkout auf die Produktion zurueckspringen.
 */
export function allowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const list = [
    DEFAULT_ORIGIN,
    'https://chairmatch.de',
    env.NEXT_PUBLIC_APP_URL,
    env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
    env.VERCEL_BRANCH_URL ? `https://${env.VERCEL_BRANCH_URL}` : undefined,
    // Nur in der lokalen Entwicklung — sonst waere http://localhost:3000 ein
    // gueltiges Ziel fuer eine produktive Zahlung.
    env.NODE_ENV === 'development' ? 'http://localhost:3000' : undefined,
  ]

  const normalised = new Set<string>()
  for (const entry of list) {
    if (!entry) continue
    try {
      // `new URL(...).origin` wirft Pfad, Query und abschliessenden Slash weg;
      // 'https://www.chairmatch.de/' und 'https://www.chairmatch.de' sollen
      // nicht als zwei verschiedene Eintraege gelten.
      normalised.add(new URL(entry).origin)
    } catch {
      // Ein kaputt gesetztes NEXT_PUBLIC_APP_URL soll die Zahlung nicht
      // verhindern — es faellt nur aus der Liste.
    }
  }
  return [...normalised]
}

/**
 * Den Ursprung fuer Rueckkehr-URLs bestimmen.
 *
 * Der Header wird uebernommen, wenn er einem unserer eigenen Ursprunge
 * entspricht — sonst gilt `NEXT_PUBLIC_APP_URL` bzw. die Produktionsadresse.
 * Ein fremder Wert fuehrt also nicht zu einem Fehler, sondern schlicht
 * zurueck zu uns.
 */
export function resolveAppOrigin(
  originHeader: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const allowed = allowedOrigins(env)

  if (originHeader) {
    try {
      const candidate = new URL(originHeader).origin
      if (allowed.includes(candidate)) return candidate
    } catch {
      // Kein gueltiger Ursprung — faellt unten auf die eigene Adresse zurueck.
    }
  }

  const configured = env.NEXT_PUBLIC_APP_URL
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      /* siehe oben */
    }
  }
  return DEFAULT_ORIGIN
}

/** Bequemlichkeit fuer Route-Handler: nimmt den Request statt des Headers. */
export function appOriginFromRequest(req: {
  headers: { get(name: string): string | null }
}): string {
  return resolveAppOrigin(req.headers.get('origin'))
}
