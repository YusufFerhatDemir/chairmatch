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

let cachedAdmin: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (cachedAdmin) return cachedAdmin

  const supabaseUrl = ensureEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseServiceKey = ensureEnv('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY)

  cachedAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cachedAdmin
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
