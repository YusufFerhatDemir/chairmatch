export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import CategoryIconEditor from '@/components/super-admin/CategoryIconEditor'

export default async function KategorienPage() {
  await requireRole(['super_admin'])

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('categories')
    .select('id, slug, label, icon_url')
    .order('sort_order', { ascending: true })

  const categories = (data || []).map(c => ({
    id: c.id,
    slug: c.slug,
    label: c.label,
    iconUrl: c.icon_url,
  }))

  return (
    <div>
      <h2 style={{ fontSize: 'var(--font-lg)', color: 'var(--cream)', fontWeight: 700, marginBottom: 16 }}>
        Kategorie-Icons
      </h2>
      <CategoryIconEditor categories={categories} />
    </div>
  )
}
