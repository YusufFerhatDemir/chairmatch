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

  results.dbUrl = process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@')

  return NextResponse.json(results)
}
