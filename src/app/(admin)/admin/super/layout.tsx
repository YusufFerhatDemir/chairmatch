import { requireRole } from '@/modules/auth/session'
import SuperAdminTabs from './tabs'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['super_admin'])

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 16 }}>Super Admin</h2>
      <SuperAdminTabs />
      {children}
    </div>
  )
}
