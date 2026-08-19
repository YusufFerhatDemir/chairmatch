import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

/**
 * Server-only Supabase-Client mit `service_role`.
 *
 * Kein Fallback auf den Anon-Key: ein fehlender Service-Key würde sonst still
 * dazu führen, dass Admin-Abfragen als `anon` laufen — mit RLS also leere
 * Ergebnisse statt eines erkennbaren Fehlers liefern.
 */
export function getSupabaseAdmin() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL fehlt — getSupabaseAdmin() kann keinen Client erzeugen.'
    )
  }

  if (!supabaseServiceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY fehlt — getSupabaseAdmin() faellt bewusst NICHT auf den Anon-Key zurueck. ' +
        'Env-Variable in Vercel/.env.local setzen.'
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
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
