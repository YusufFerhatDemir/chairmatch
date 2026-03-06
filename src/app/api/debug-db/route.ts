import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, unknown> = {}

  try {
    const count = await prisma.user.count()
    results.userCount = count
  } catch (e) {
    results.userError = e instanceof Error ? e.message : String(e)
  }

  try {
    const count = await prisma.category.count()
    results.categoryCount = count
  } catch (e) {
    results.categoryError = e instanceof Error ? e.message : String(e)
  }

  try {
    const count = await prisma.salon.count()
    results.salonCount = count
  } catch (e) {
    results.salonError = e instanceof Error ? e.message : String(e)
  }

  try {
    const profile = await prisma.user.findFirst({ select: { id: true, email: true, role: true } })
    results.firstProfile = profile
  } catch (e) {
    results.profileError = e instanceof Error ? e.message : String(e)
  }

  const dbUrl = process.env.DATABASE_URL || 'NOT SET'
  results.dbUrl = dbUrl.replace(/:[^@]+@/, ':***@')
  results.dbPort = dbUrl.match(/:(\d+)\//)?.[1] || 'unknown'
  results.directUrl = (process.env.DIRECT_URL || 'NOT SET').replace(/:[^@]+@/, ':***@')
  results.hasAuthSecret = !!process.env.AUTH_SECRET
  results.hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET
  results.nodeEnv = process.env.NODE_ENV
  results.vercelEnv = process.env.VERCEL_ENV

  return NextResponse.json(results)
}
