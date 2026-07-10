import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchProductFromUrl } from '@/lib/extraction/jina'
import { getCurrentWorkspace } from '@/lib/workspace/current'

const schema = z.object({ url: z.string().url() })

export async function POST(req: NextRequest) {
  try {
    await getCurrentWorkspace() // auth check
    const body: unknown = await req.json()
    const { url } = schema.parse(body)
    const data = await fetchProductFromUrl(url)
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fetch failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
