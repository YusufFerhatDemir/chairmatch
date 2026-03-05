export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/modules/auth/session'
import CategoryIconEditor from '@/components/super-admin/CategoryIconEditor'

export default async function KategorienPage() {
  await requireRole(['super_admin'])

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true, slug: true, label: true, iconUrl: true },
  })

  return (
    <div>
      <h2 style={{ fontSize: 'var(--font-lg)', color: 'var(--cream)', fontWeight: 700, marginBottom: 16 }}>
        Kategorie-Icons
      </h2>
      <CategoryIconEditor categories={categories} />
    </div>
  )
}
