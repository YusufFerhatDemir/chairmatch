import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const salon = await prisma.salon.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        services: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        staff: { where: { isActive: true } },
        rentalEquipment: { where: { isAvailable: true } },
      },
    })

    if (!salon) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(salon)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
