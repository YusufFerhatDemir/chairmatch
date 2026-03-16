import { createClient } from '@supabase/supabase-js'

const FALLBACK_URL = 'https://pwdbjqfpgumyfktbfswg.supabase.co'
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZGJqcWZwZ3VteWZrdGJmc3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTc0MjAsImV4cCI6MjA4NzU3MzQyMH0.rLUoTNev2CVDswBAVoS2PT0xGvXbNDv7FKbDJ8i29Ws'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON

export function getSupabaseAdmin() {
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
