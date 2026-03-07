export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProviderDashboardClient from '@/components/ProviderDashboardClient'

export default async function ProviderDashboardPage() {
  const session = await getServerSession()
  if (!session?.user) redirect('/auth')

  const supabase = getSupabaseAdmin()

  const { data: salon } = await supabase
    .from('salons')
    .select('*')
    .eq('owner_id', session.user.id)
    .limit(1)
    .single()

  if (!salon) {
    return (
      <div className="shell">
        <div className="screen" style={{ padding: 'var(--pad)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <h2 style={{ color: 'var(--cream)', marginBottom: 16 }}>Kein Salon gefunden</h2>
          <p style={{ color: 'var(--stone)', marginBottom: 24 }}>Registriere dich als Anbieter, um dein Dashboard zu nutzen.</p>
          <Link href="/register/anbieter" className="bgold" style={{ maxWidth: 200, textDecoration: 'none' }}>Jetzt registrieren</Link>
        </div>
      </div>
    )
  }

  const [
    { data: services },
    { data: bookings },
    { data: reviews },
  ] = await Promise.all([
    supabase.from('services').select('*').eq('salon_id', salon.id).eq('is_active', true).order('sort_order', { ascending: true }),
    supabase.from('bookings').select('*, service:services(name), customer:profiles(full_name)').eq('salon_id', salon.id).in('status', ['pending', 'confirmed']).order('booking_date', { ascending: true }).limit(20),
    supabase.from('reviews').select('*, customer:profiles(full_name)').eq('salon_id', salon.id).order('created_at', { ascending: false }).limit(10),
  ])

  return (
    <ProviderDashboardClient
      salon={salon}
      services={services ?? []}
      bookings={bookings ?? []}
      reviews={reviews ?? []}
    />
  )
}
