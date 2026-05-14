/**
 * Cron-Endpoint: pingt Indexer für neue Salons + Listings + Magazin-Artikel.
 *
 * Wird stündlich aus vercel.json aufgerufen. Identifiziert URLs, die in den
 * letzten 2h aktualisiert wurden, und schickt sie an IndexNow + Google
 * Indexing API.
 *
 * Idempotent: doppelte Pings schaden nicht (Indexer dedup'en selbst).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { notifyIndexers } from '@/lib/indexing'
import { MAGAZIN_ARTIKEL } from '@/lib/seo-data/magazin'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const BASE = 'https://chairmatch.de'

export async function GET(request: NextRequest) {
  // Cron-Auth
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2h
  const urls: string[] = []

  // Salons
  try {
    const { data: salons } = await supabase
      .from('salons')
      .select('slug, updated_at')
      .eq('is_active', true)
      .gte('updated_at', since)
      .limit(500)
    for (const s of salons ?? []) {
      if (s.slug) urls.push(`${BASE}/salon/${s.slug}`)
    }
  } catch (e) {
    logger.warn('cron.index.salons_query_failed', { err: String(e) })
  }

  // Listings (Services)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: services } = await (supabase as any)
      .from('services')
      .select('id, slug, created_at')
      .eq('is_active', true)
      .gte('created_at', since)
      .limit(500)
    for (const s of services ?? []) {
      const slug = s.slug || s.id
      if (slug) urls.push(`${BASE}/listings/${slug}`)
    }
  } catch (e) {
    logger.warn('cron.index.services_query_failed', { err: String(e) })
  }

  // Neue Produkte (Marketplace)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: products } = await (supabase as any)
      .from('products')
      .select('id, slug, created_at')
      .eq('is_active', true)
      .gte('created_at', since)
      .limit(200)
    for (const p of products ?? []) {
      const slug = p.slug || p.id
      if (slug) urls.push(`${BASE}/products/${slug}`)
    }
  } catch (e) {
    logger.warn('cron.index.products_query_failed', { err: String(e) })
  }

  // Neue Magazin-Artikel (aus statischem Array, in den letzten 2h published)
  for (const a of MAGAZIN_ARTIKEL) {
    if (a.publishedAt && new Date(a.publishedAt).getTime() >= Date.now() - 2 * 60 * 60 * 1000) {
      urls.push(`${BASE}/magazin/${a.slug}`)
    }
  }

  if (urls.length === 0) {
    return NextResponse.json({ ok: true, pinged: 0, message: 'Keine neuen URLs in den letzten 2h' })
  }

  const result = await notifyIndexers(urls)

  return NextResponse.json({
    ok: true,
    pinged: urls.length,
    result,
  })
}
