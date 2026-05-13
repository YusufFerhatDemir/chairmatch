export const dynamic = 'force-dynamic'

import { requireRole } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import CampaignEditor from './CampaignEditor'

interface PageProps {
  searchParams: Promise<{ id?: string }>
}

interface CampaignData {
  id: string
  subject: string
  preview_text: string | null
  html_content: string
  audience_filter: Record<string, unknown> | null
  status: string
}

export default async function NewCampaignPage({ searchParams }: PageProps) {
  const session = await requireRole(['admin', 'super_admin'])
  const params = await searchParams
  const id = params.id
  const userEmail = (session.user as { email?: string }).email || ''

  let initial: CampaignData | null = null
  if (id) {
    const sb = getSupabaseAdmin()
    const { data } = await sb
      .from('newsletter_campaigns')
      .select('id, subject, preview_text, html_content, audience_filter, status')
      .eq('id', id)
      .maybeSingle()
    initial = (data as unknown as CampaignData | null) ?? null
  }

  // verfügbare Tags ermitteln (aus existierenden Subscribers)
  const sb = getSupabaseAdmin()
  const { data: tagData } = await sb
    .from('newsletter_subscribers')
    .select('tags')
    .not('tags', 'is', null)
    .limit(2000)

  const tagSet = new Set<string>()
  for (const row of (tagData || []) as Array<{ tags: string[] | null }>) {
    for (const t of row.tags || []) if (t) tagSet.add(t)
  }
  const availableTags = Array.from(tagSet).sort()

  return (
    <CampaignEditor
      initial={initial}
      availableTags={availableTags}
      defaultTestEmail={userEmail}
    />
  )
}
