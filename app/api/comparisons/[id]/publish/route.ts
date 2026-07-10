import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/prisma'
import { getCurrentWorkspace } from '@/lib/workspace/current'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspace = await getCurrentWorkspace()
    const existing = await db.comparison.findFirst({
      where: { id: params.id, workspaceId: workspace.id },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const newStatus = existing.status === 'published' ? 'draft' : 'published'
    const updated = await db.comparison.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        publishedAt: newStatus === 'published' ? new Date() : null,
      },
    })
    return NextResponse.json({ data: updated })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
