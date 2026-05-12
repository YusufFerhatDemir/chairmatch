export const dynamic = 'force-dynamic'

import { requireRole } from '@/modules/auth/session'
import SubscribersClient from './SubscribersClient'

export default async function SubscribersPage() {
  await requireRole(['admin', 'super_admin'])
  return <SubscribersClient />
}
