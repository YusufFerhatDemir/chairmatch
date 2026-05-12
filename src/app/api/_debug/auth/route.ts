/**
 * DEBUG ENDPOINT — entfernen nach Login-Fix
 * Replays die komplette authorize()-Logik und gibt detaillierte Fehler zurück.
 * Nur über ?key=<secret> erreichbar.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-server'

const FALLBACK_URL = 'https://vlrviyrgggzhayepfmop.supabase.co'
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZscnZpeXJnZ2d6aGF5ZXBmbW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODIyNzYsImV4cCI6MjA4ODE1ODI3Nn0.pvcZqzAm-ARWVsSv6hKUnTwZeggVJcwYN---4jUfyA0'
const DEBUG_KEY = process.env.DEBUG_KEY || 'cm-debug-2026'

export async function POST(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('key') !== DEBUG_KEY) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const steps: Record<string, unknown> = {}

  try {
    const body = await request.json()
    const email = String(body.email || '').trim()
    const password = String(body.password || '')

    steps.env = {
      NODE_ENV: process.env.NODE_ENV,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET || !!process.env.AUTH_SECRET,
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown',
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON

    // 1. Supabase Auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    steps.supabaseAuth = {
      success: !authError && !!authData?.user,
      userId: authData?.user?.id,
      error: authError?.message,
      userMetadata: authData?.user?.user_metadata,
    }

    if (authError || !authData?.user) {
      return NextResponse.json({ ok: false, steps })
    }

    // 2. Profile lookup with service role
    try {
      const supabaseAdmin = getSupabaseAdmin()
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, role, is_active')
        .eq('id', authData.user.id)
        .single()

      steps.profileLookup = {
        success: !profileError && !!profile,
        profile,
        error: profileError?.message,
        errorCode: profileError?.code,
      }
    } catch (e) {
      steps.profileLookup = { success: false, crashError: (e as Error).message }
    }

    return NextResponse.json({ ok: true, steps })
  } catch (e) {
    return NextResponse.json({ ok: false, steps, error: (e as Error).message, stack: (e as Error).stack }, { status: 500 })
  }
}
