import { redirect } from 'next/navigation'
import { getServerSession } from '@/modules/auth/session'
import { isProviderOrAbove } from '@/lib/rbac'
import ProviderShell from '@/components/provider/ProviderShell'

export const dynamic = 'force-dynamic'

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  if (!session?.user) redirect('/auth')

  const role = (session.user as { role?: string }).role
  if (!isProviderOrAbove(role)) redirect('/auth')

  return <ProviderShell>{children}</ProviderShell>
}
