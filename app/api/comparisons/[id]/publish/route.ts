import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/prisma'
import { getCurrentWorkspace } from '@/lib/workspace/current'

function buildIntroText(names: string[], pageType: string): string {
  const top = names.slice(0, 4)
  if (pageType === 'roundup') {
    return `Top ${names.length} picks: ${top.join(', ')}${names.length > 4 ? ' and more' : ''} — ranked by performance, value and user ratings.`
  }
  return `Compare ${top.join(' vs ')} — detailed specs, pros & cons, pricing and expert verdict.`
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspace = await getCurrentWorkspace()
    const existing = await db.comparison.findFirst({
      where: { id: params.id, workspaceId: workspace.id },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const newStatus = existing.status === 'published' ? 'draft' : 'published'

    // Auto-generate introText on first publish if admin left it blank
    let introText = existing.introText
    if (newStatus === 'published' && !introText?.trim()) {
      const products = await db.product.findMany({
        where: { comparisonId: params.id },
        select: { name: true },
        orderBy: { position: 'asc' },
      })
      const names = products.map(p => p.name).filter(Boolean)
      if (names.length >= 2) introText = buildIntroText(names, existing.pageType)
    }

    const updated = await db.comparison.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        publishedAt: newStatus === 'published' ? new Date() : null,
        ...(newStatus === 'published' && introText ? { introText } : {}),
      },
    })
    return NextResponse.json({ data: updated })
  } catch (error) {
    const isAuth = error instanceof Error && error.message.includes('Unauthorized')
    if (isAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const message = error instanceof Error ? error.message : 'Request failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
