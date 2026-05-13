import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { z } from 'zod'

/**
 * Provider-Registrierung (öffentlich erreichbar).
 *
 * Wichtige Sicherheits- & UX-Fixes (13.05.2026):
 * - Keine FALLBACK_URL/FALLBACK_ANON mehr → siehe supabase-server.ts (Fail-fast)
 * - Anon-`signUp` durch Admin-Pfad ersetzt: Wir erzeugen den User mit
 *   `email_confirm: true` direkt, damit der Provider sich sofort einloggen kann.
 * - Passwort wird im Welcome-Mail mitgesendet (vorerst — später Magic-Link).
 * - Bei Salon-Insert-Fehler wird der Auth-User wieder zurückgerollt, damit
 *   keine "halbangelegten" Accounts entstehen.
 */

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

function generateSecurePassword(): string {
  // Erfüllt die App-Passwort-Policy: 10+ Zeichen, Großbuchstabe, Zahl, Sonderzeichen
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const symbols = '!@#$%&*+-?'
  const all = lower + upper + digits + symbols
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let pw = ''
  pw += upper[bytes[0] % upper.length]
  pw += digits[bytes[1] % digits.length]
  pw += symbols[bytes[2] % symbols.length]
  for (let i = 3; i < 14; i++) pw += all[bytes[i] % all.length]
  return pw
}

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
    const admin = getSupabaseAdmin()
    const password = generateSecurePassword()

    // 1. Auth-User direkt mit verifizierter Email anlegen (Admin-Pfad)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: d.em,
      password,
      email_confirm: true,
      user_metadata: { full_name: `${d.vn} ${d.nn}`, role: 'anbieter' },
    })

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: authError?.message || 'Registrierung fehlgeschlagen' },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    try {
      // 2. Profile aktualisieren (Trigger hat evtl. schon ein leeres erzeugt)
      const { error: profileError } = await admin
        .from('profiles')
        .upsert({
          id: userId,
          email: d.em,
          full_name: `${d.vn} ${d.nn}`,
          role: 'anbieter',
          phone: d.tel,
          is_active: true,
        })
      if (profileError) throw new Error('Profil: ' + profileError.message)

      // 3. Salon anlegen
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
      if (salonError) throw new Error('Salon: ' + salonError.message)

      // 4. Welcome-Mail mit Passwort senden (fail-soft)
      try {
        const { sendProviderWelcomeEmail } = await import('@/lib/email')
        await sendProviderWelcomeEmail(d.em, `${d.vn} ${d.nn}`, password)
      } catch (mailErr) {
        // Mail-Fehler darf den Provider nicht in Sackgasse stranden lassen —
        // wir geben Passwort im Response zurück (HTTPS-only) als Fallback,
        // damit das Onboarding-UI es ihm anzeigen kann.
        console.error('[register-provider] Welcome-Mail failed:', mailErr)
        return NextResponse.json({
          success: true,
          fallbackPassword: password,
          note: 'Welcome-Mail konnte nicht versendet werden. Bitte Passwort sicher notieren.',
        })
      }

      return NextResponse.json({ success: true })
    } catch (innerErr) {
      // Rollback: Auth-User löschen, sonst hat der Nutzer einen Geister-Account
      try {
        await admin.auth.admin.deleteUser(userId)
      } catch (rollbackErr) {
        console.error('[register-provider] Rollback failed:', rollbackErr)
      }
      const msg = (innerErr as Error).message || 'Unbekannter Fehler'
      return NextResponse.json(
        { error: 'Registrierung fehlgeschlagen: ' + msg },
        { status: 500 }
      )
    }
  } catch (e) {
    console.error('[register-provider] crashed:', e)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
