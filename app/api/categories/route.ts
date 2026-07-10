import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db/prisma'
import { getCurrentWorkspace } from '@/lib/workspace/current'

const createSchema = z.object({
  name: z.string().min(2).max(100),
  defaultSpecKeys: z.array(z.string()).min(1).max(10),
})

export async function GET() {
  try {
    const workspace = await getCurrentWorkspace()
    const categories = await db.category.findMany({
      where: { OR: [{ workspaceId: null }, { workspaceId: workspace.id }] },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ data: categories })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspace = await getCurrentWorkspace()
    if (workspace.plan === 'free') {
      return NextResponse.json({ error: 'Custom categories require Pro plan' }, { status: 403 })
    }
    const body = await req.json()
    const input = createSchema.parse(body)
    const category = await db.category.create({
      data: { ...input, workspaceId: workspace.id },
    })
    return NextResponse.json({ data: category }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
