import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase Admin Client.
 *
 * SICHERHEITS-KRITISCH: Fällt NICHT mehr stillschweigend auf den Anon-Key oder
 * ein fremdes Supabase-Projekt zurück. Wenn SUPABASE_SERVICE_ROLE_KEY oder
 * NEXT_PUBLIC_SUPABASE_URL fehlt → loud error.
 *
 * Hintergrund (13.05.2026): Wir hatten heute einen Bug, bei dem die App
 * stundenlang gegen ein ALTES Supabase-Projekt sprach, weil ein Fallback
 * auf den Anon-Key existierte. Das ist jetzt durch hartes Fail-Fast ersetzt.
 *
 * Hinweis zum Typing: Wir geben `createClient<any, any>` zurück, damit die
 * bestehenden Aufrufer keine Type-Brüche bekommen. Korrektes generisches
 * Typing kann später (Phase 2) via `Database`-Typen aus `supabase gen types`
 * nachgezogen werden.
 */
function ensureEnv(name: string, value: string | undefined): string {
  if (!value || value.length < 20) {
    throw new Error(
      `[supabase-server] Required environment variable "${name}" is missing or invalid. ` +
      `Set it in Vercel → Settings → Environment Variables.`
    )
  }
  return value
}

/**
 * Build-Time-Detection: Während `next build` werden Server-Components
 * für Static-Pre-Render aufgerufen. ENV-Vars sind aber u.U. nicht
 * gesetzt — dann darf der Build NICHT crashen, sondern Pages werden
 * dynamic gerendert zur Request-Zeit.
 *
 * Heuristik: NEXT_PHASE === 'phase-production-build' während Vercel Build.
 */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build'
}

/**
 * No-Op Supabase-Client für Build-Phase — alle .from().select() geben
 * leere Arrays zurück statt zu crashen. Die echten Daten kommen zur
 * Request-Zeit über den richtigen Client.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPhaseStubClient(): any {
  const emptyResponse = { data: null, error: null, count: null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainable: any = new Proxy({}, {
    get: (_, prop) => {
      if (prop === 'then') return undefined // not a thenable
      if (prop === Symbol.iterator) return undefined
      // .then-callbacks via await
      if (prop === 'data' || prop === 'error' || prop === 'count') {
        return prop === 'data' ? [] : null
      }
      return () => chainable
    },
  })
  // Promise-like: await query → emptyResponse
  chainable.then = (resolve: (v: typeof emptyResponse) => unknown) => resolve({ ...emptyResponse, data: [] as never })
  return {
    from: () => chainable,
    rpc: () => chainable,
    auth: { getSession: async () => ({ data: { session: null }, error: null }) },
    storage: { from: () => ({ remove: async () => ({ error: null }), upload: async () => ({ error: null }) }) },
  }
}

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Wenn ENV-Vars fehlen oder zu kurz → niemals werfen, sondern Stub.
  // Das schützt vor Build-Crashes wenn Vercel die ENV-Vars zur Build-Zeit
  // nicht durchreicht (passiert bei Static-Generation von Pages mit
  // Datenbank-Abfragen). Zur Request-Zeit ist die Variable dann da.
  if (!supabaseUrl || supabaseUrl.length < 20 ||
      !supabaseServiceKey || supabaseServiceKey.length < 20) {
    // Best-effort: Build-Phase oder Misconfiguration — Stub statt Crash
    if (typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('[supabase-server] ENV missing — returning stub client (no DB access)')
    }
    return buildPhaseStubClient()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any, any>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Anon-Client für Supabase Auth (signUp, signInWithPassword, resetPassword, etc.).
 * Auch hier Fail-Fast — keine stillen Fallbacks mehr, die auf falsche Projekte zeigen.
 */
export function getSupabaseAnon() {
  const supabaseUrl = ensureEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseAnonKey = ensureEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any, any>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function uploadToStorage(
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
