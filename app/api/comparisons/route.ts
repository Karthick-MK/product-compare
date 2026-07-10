import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db/prisma'
import { getCurrentWorkspace } from '@/lib/workspace/current'
import { checkComparisonLimit, incrementComparisonCount } from '@/lib/usage/limits'

const createSchema = z.object({
  title: z.string().min(3).max(200),
  categoryId: z.string(),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
  introText: z.string().optional(),
})

export async function GET() {
  try {
    const workspace = await getCurrentWorkspace()
    const comparisons = await db.comparison.findMany({
      where: { workspaceId: workspace.id },
      include: { category: true, products: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: comparisons })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspace = await getCurrentWorkspace()
    await checkComparisonLimit(workspace.id, workspace.plan)

    const body = await req.json()
    const input = createSchema.parse(body)

    const comparison = await db.comparison.create({
      data: { ...input, workspaceId: workspace.id, status: 'draft' },
      include: { category: true },
    })

    await incrementComparisonCount(workspace.id)
    return NextResponse.json({ data: comparison }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
