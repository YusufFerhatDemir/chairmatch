'use server'

import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { registerSchema } from './auth.schemas'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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
    await prisma.user.update({
      where: { id: data.user.id },
      data: {
        fullName,
        email,
      },
    })
  } catch {
    // Profile may not exist yet if trigger hasn't fired
  }

  return { success: true }
}
