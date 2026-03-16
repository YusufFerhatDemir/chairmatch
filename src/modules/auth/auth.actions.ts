'use server'

import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { registerSchema } from './auth.schemas'

const FALLBACK_URL = 'https://pwdbjqfpgumyfktbfswg.supabase.co'
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZGJqcWZwZ3VteWZrdGJmc3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTc0MjAsImV4cCI6MjA4NzU3MzQyMH0.rLUoTNev2CVDswBAVoS2PT0xGvXbNDv7FKbDJ8i29Ws'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON

export async function signUpAction(formData: FormData) {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    fullName: formData.get('fullName') as string,
  }

  const parsed = registerSchema.safeParse(rawData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { email, password, fullName } = parsed.data

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: 'Registrierung fehlgeschlagen' }
  }

  // Profile is auto-created by Supabase trigger (handle_new_user)
  // But update the name in case trigger doesn't set it
  try {
    const supabaseAdmin = getSupabaseAdmin()
    await supabaseAdmin
      .from('profiles')
      .update({ full_name: fullName, email })
      .eq('id', data.user.id)
  } catch {
    // Profile may not exist yet if trigger hasn't fired
  }

  return { success: true }
}
