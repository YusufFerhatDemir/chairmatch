// @vitest-environment node
/**
 * Track 21: der Name des Sitzungs-Cookies.
 *
 * `authjs.session-token` war ein gewoehnlicher Cookie-Name. Cookie-Setzen
 * kennt keine Herkunftstrennung: jede Subdomain von chairmatch.de — auch eine
 * ueber HTTP ausgelieferte — kann ein Cookie mit `Domain=.chairmatch.de`
 * setzen und damit das echte ueberschreiben. Genau daran haengt
 * Session-Fixation: der Angreifer setzt SEINEN Token, das Opfer arbeitet in
 * dessen Sitzung weiter. Das `secure`-Flag hilft dagegen nicht — es regelt,
 * wohin der Browser sendet, nicht, wer setzen darf.
 *
 * Der `__Secure-`-Praefix ist die Regel, die der Browser dagegen durchsetzt:
 * ein so benanntes Cookie nimmt er nur ueber HTTPS und nur mit `Secure`
 * entgegen. Auth.js benennt das Cookie in einer HTTPS-Umgebung von sich aus
 * so; die feste Zeichenkette hier hat diesen Schutz weggenommen.
 *
 * Eigene Datei, weil der Name beim Laden des Moduls aus NODE_ENV entsteht —
 * er laesst sich nur ueber `resetModules` + Neuimport in beiden Zustaenden
 * pruefen.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

process.env.AUTH_SECRET ??= 'test-secret-nur-fuer-vitest'
process.env.NEXTAUTH_SECRET ??= 'test-secret-nur-fuer-vitest'

type CookieConfig = {
  cookies: { sessionToken: { name: string; options: Record<string, unknown> } }
}

async function ladeConfig(nodeEnv: string): Promise<CookieConfig> {
  vi.resetModules()
  vi.stubEnv('NODE_ENV', nodeEnv as 'production' | 'development' | 'test')
  const mod = await import('@/modules/auth/auth.config')
  return mod.authOptions as unknown as CookieConfig
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('Track 21 — Sitzungs-Cookie', () => {
  // Erhoehtes Zeitlimit nur hier (Track-22-Nachtrag): dieser Test macht den
  // ERSTEN `resetModules` + Neuimport der Datei und zieht damit den gesamten
  // auth.config-Graph kalt herein (NextAuth, Supabase, bcrypt). Im
  // vollstaendigen Lauf ueber 77 parallele Dateien hat das die 5-Sekunden-
  // Vorgabe zeitweise gerissen — einzeln laeuft der Test in unter einer
  // Sekunde. Die Zusage bleibt unveraendert, nur die Frist ist ehrlich.
  it('traegt in Produktion den __Secure-Praefix', async () => {
    const config = await ladeConfig('production')
    expect(config.cookies.sessionToken.name).toBe('__Secure-authjs.session-token')
  }, 30_000)

  it('setzt in Produktion secure, httpOnly und sameSite=lax', async () => {
    const config = await ladeConfig('production')
    const options = config.cookies.sessionToken.options
    expect(options.secure).toBe(true)
    expect(options.httpOnly).toBe(true)
    expect(options.sameSite).toBe('lax')
    expect(options.path).toBe('/')
  })

  it('laesst den Praefix in der Entwicklung weg — sonst lehnt der Browser das Cookie ueber http ab', async () => {
    const config = await ladeConfig('development')
    expect(config.cookies.sessionToken.name).toBe('authjs.session-token')
    expect(config.cookies.sessionToken.options.secure).toBe(false)
  })

  it('setzt den Praefix nie ohne secure — die Kombination wuerde der Browser verwerfen', async () => {
    for (const env of ['production', 'development', 'test']) {
      const config = await ladeConfig(env)
      const { name, options } = config.cookies.sessionToken
      if (name.startsWith('__Secure-')) {
        expect(options.secure, env).toBe(true)
      }
    }
  })
})
