/**
 * Public IndexNow-Key-File-Endpoint.
 *
 * Bing/Yandex/Seznam fetchen https://www.chairmatch.de/<KEY>.txt zur
 * Verifizierung. Wir stellen den Inhalt unter /api/indexnow/key bereit
 * und routen via next.config.ts oder middleware.
 *
 * Alternativ: ENV INDEXNOW_KEY als plain text File unter public/
 * legen — aber dann müssten wir bei Key-Rotation neu deployen. Diese
 * dynamische Route macht Rotation per ENV einfach.
 */

import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  const key = process.env.INDEXNOW_KEY
  if (!key) {
    return new NextResponse('not configured', { status: 404 })
  }
  return new NextResponse(key, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}
