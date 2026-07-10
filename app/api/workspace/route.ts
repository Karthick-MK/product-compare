import { NextResponse } from 'next/server'
import { getCurrentWorkspace } from '@/lib/workspace/current'

export async function GET() {
  try {
    const workspace = await getCurrentWorkspace()
    return NextResponse.json({ data: workspace })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
