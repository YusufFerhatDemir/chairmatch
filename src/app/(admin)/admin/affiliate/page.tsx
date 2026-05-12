export const dynamic = 'force-dynamic'

import { requireRole } from '@/modules/auth/session'
import AdminAffiliateClient from './AdminAffiliateClient'

export default async function AffiliateAdminPage() {
  await requireRole(['admin', 'super_admin'])

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', marginBottom: 16 }}>
        Affiliate-Produkte
      </h2>
      <AdminAffiliateClient />
    </div>
  )
}
