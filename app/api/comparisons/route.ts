import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db/prisma'
import { getCurrentWorkspace } from '@/lib/workspace/current'
import { checkComparisonLimit } from '@/lib/usage/limits'

const createSchema = z.object({
  title: z.string().min(3).max(200),
  categoryId: z.string(),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
  introText: z.string().optional(),
  pageType: z.enum(['comparison', 'roundup']).default('comparison'),
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
  } catch (error) {
    const isAuth = error instanceof Error && error.message.includes('Unauthorized')
    return NextResponse.json({ error: isAuth ? 'Unauthorized' : 'Internal server error' }, { status: isAuth ? 401 : 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspace = await getCurrentWorkspace()
    await checkComparisonLimit(workspace.id, workspace.plan)

    const body = await req.json()
    const input = createSchema.parse(body)

    const cat = await db.category.findFirst({
      where: {
        id: input.categoryId,
        OR: [{ workspaceId: null }, { workspaceId: workspace.id }],
      },
    })
    if (!cat) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const comparison = await db.$transaction(async (tx) => {
      const created = await tx.comparison.create({
        data: { ...input, workspaceId: workspace.id, status: 'draft' },
        include: { category: true },
      })
      const month = new Date().toISOString().slice(0, 7) // YYYY-MM
      await tx.usage.upsert({
        where: { workspaceId_month: { workspaceId: workspace.id, month } },
        create: { workspaceId: workspace.id, month, comparisonCount: 1 },
        update: { comparisonCount: { increment: 1 } },
      })
      return created
    })
    return NextResponse.json({ data: comparison }, { status: 201 })
  } catch (error) {
    const isAuth = error instanceof Error && error.message.includes('Unauthorized')
    if (isAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const message = error instanceof Error ? error.message : 'Request failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
