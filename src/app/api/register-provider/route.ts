import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { z } from 'zod'

const FALLBACK_URL = 'https://pwdbjqfpgumyfktbfswg.supabase.co'
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZGJqcWZwZ3VteWZrdGJmc3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTc0MjAsImV4cCI6MjA4NzU3MzQyMH0.rLUoTNev2CVDswBAVoS2PT0xGvXbNDv7FKbDJ8i29Ws'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON

const providerSchema = z.object({
  vn: z.string().min(2),
  nn: z.string().min(2),
  em: z.string().email(),
  tel: z.string().min(5),
  geschaeft: z.string().min(2),
  st: z.string().min(2),
  plz: z.string().min(4),
  city: z.string().min(2),
  kat: z.string().min(1),
  iban: z.string().optional(),
  gb: z.boolean(),
  chair: z.boolean(),
  cpr: z.string().optional(),
  agb: z.literal(true),
  dsgvo: z.literal(true),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = providerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const d = parsed.data

    // 1. Create Supabase Auth user
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const password = Math.random().toString(36).slice(-10) + 'A1!'
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: d.em,
      password,
      options: { data: { full_name: `${d.vn} ${d.nn}` } },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Registrierung fehlgeschlagen' },
        { status: 400 }
      )
    }

    const userId = authData.user.id
    const admin = getSupabaseAdmin()

    // 2. Update profile with provider role
    await admin
      .from('profiles')
      .upsert({
        id: userId,
        email: d.em,
        full_name: `${d.vn} ${d.nn}`,
        role: 'anbieter',
        phone: d.tel,
      })

    // 3. Create salon entry
    const slug = d.geschaeft
      .toLowerCase()
      .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const { error: salonError } = await admin.from('salons').insert({
      owner_id: userId,
      name: d.geschaeft,
      slug: `${slug}-${Date.now().toString(36)}`,
      city: d.city,
      street: d.st,
      postal_code: d.plz,
      category: d.kat.toLowerCase(),
      is_active: false,
      is_verified: false,
    })

    if (salonError) {
      return NextResponse.json(
        { error: 'Salon konnte nicht erstellt werden: ' + salonError.message },
        { status: 500 }
      )
    }

    // Send welcome email with temp password (do not return password in JSON)
    try {
      const { sendWelcomeEmail } = await import('@/lib/email')
      await sendWelcomeEmail(d.em, `${d.vn} ${d.nn}`)
    } catch { /* email service may not be configured */ }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
