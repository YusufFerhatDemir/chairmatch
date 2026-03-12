import { NextResponse } from 'next/server'
import { auth, signOut } from '@/modules/auth/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/** DSGVO Art. 17: Konto-Löschung (Soft-Delete, Hard-Delete nach 30 Tagen) */
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const userId = session.user.id

  const { error } = await supabase
    .from('profiles')
    .update({
      delete_requested_at: new Date().toISOString(),
      is_active: false,
      email: null,
      full_name: 'Gelöscht',
      phone: null,
    })
    .eq('id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await signOut({ redirect: false })
  return NextResponse.json({ success: true, message: 'Konto zur Löschung markiert. Hard-Delete nach 30 Tagen.' })
}
