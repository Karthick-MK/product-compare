import { NextRequest, NextResponse } from 'next/server'
import { getCurrentWorkspace } from '@/lib/workspace/current'
import { checkAiGenerationLimit, incrementAiUsage } from '@/lib/usage/limits'
import { generateComparison } from '@/lib/ai/generate-comparison'
import { db } from '@/lib/db/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspace = await getCurrentWorkspace()

    // Verify comparison belongs to this workspace
    const comparison = await db.comparison.findFirst({
      where: { id: params.id, workspaceId: workspace.id },
    })
    if (!comparison) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await checkAiGenerationLimit(workspace.id, workspace.plan)
    const result = await generateComparison(params.id)
    await incrementAiUsage(workspace.id)

    return NextResponse.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
