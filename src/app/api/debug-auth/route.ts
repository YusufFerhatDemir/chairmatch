// TEMP DEBUG ENDPOINT — checks NextAuth config sanity
// Delete after fixing the auth issue.

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const report: Record<string, unknown> = {}

  // 1) ENV check
  const envKeys = [
    'AUTH_SECRET',
    'NEXTAUTH_SECRET',
    'AUTH_URL',
    'NEXTAUTH_URL',
    'AUTH_TRUST_HOST',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NODE_ENV',
    'VERCEL',
    'VERCEL_ENV',
    'VERCEL_URL',
  ]
  const env: Record<string, string> = {}
  for (const k of envKeys) {
    const v = process.env[k]
    if (v === undefined) env[k] = '__UNSET__'
    else if (v === '') env[k] = '__EMPTY__'
    else env[k] = `set(len=${v.length},prefix=${v.slice(0, 6)}...)`
  }
  report.env = env

  // 2) Try to import auth and call it
  try {
    const mod = await import('@/modules/auth/auth.config')
    report.import = 'OK'
    report.exports = Object.keys(mod)

    try {
      // Try calling auth() — this is what fails on /api/auth/session
      const session = await mod.auth()
      report.session_call = 'OK'
      report.session = session ? 'has-session' : 'null-session'
    } catch (e) {
      const err = e as Error
      report.session_call = 'FAILED'
      report.session_error_name = err.name
      report.session_error_message = err.message
      report.session_error_stack = err.stack?.slice(0, 1500)
    }
  } catch (e) {
    const err = e as Error
    report.import = 'FAILED'
    report.import_error_name = err.name
    report.import_error_message = err.message
    report.import_error_stack = err.stack?.slice(0, 1500)
  }

  // 3) Try to require next-auth and report version
  try {
    const pkg = await import('next-auth/package.json' as unknown as string)
    report.next_auth_version = (pkg as { default?: { version?: string }; version?: string }).default?.version || (pkg as { version?: string }).version
  } catch (e) {
    report.next_auth_version = `err: ${(e as Error).message}`
  }

  return NextResponse.json(report, { status: 200 })
}
