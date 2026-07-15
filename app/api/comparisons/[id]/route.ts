import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db/prisma'
import { getCurrentWorkspace } from '@/lib/workspace/current'
import { getMaxProducts } from '@/lib/usage/limits'

const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  introText: z.string().optional(),
  aiVerdict: z.string().optional(),
  products: z.array(z.object({
    id: z.string().optional(),
    position: z.number(),
    url: z.string().url(),
    affiliateUrl: z.string().url().nullable().optional(),
    name: z.string(),
    imageUrl: z.string().nullable().optional(),
    price: z.string().nullable().optional(),
    userNotes: z.string().nullable().optional(),
    isTopPick: z.boolean().optional(),
    rating: z.number().min(0).max(5).nullable().optional(),
    reviewCount: z.number().int().nullable().optional(),
    fetchedRaw: z.any().optional(),
    specs: z.array(z.object({ specKey: z.string(), specValue: z.string() })).optional(),
    prosCons: z.array(z.object({ type: z.enum(['pro', 'con']), text: z.string(), position: z.number() })).optional(),
  })).optional(),
})

async function getComparison(id: string, workspaceId: string) {
  return db.comparison.findFirst({
    where: { id, workspaceId },
    include: {
      category: true,
      products: {
        orderBy: { position: 'asc' },
        include: { specs: true, prosCons: { orderBy: { position: 'asc' } } },
      },
    },
  })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspace = await getCurrentWorkspace()
    const comparison = await getComparison(params.id, workspace.id)
    if (!comparison) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: comparison })
  } catch (error) {
    const isAuth = error instanceof Error && error.message.includes('Unauthorized')
    return NextResponse.json({ error: isAuth ? 'Unauthorized' : 'Internal server error' }, { status: isAuth ? 401 : 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspace = await getCurrentWorkspace()
    const existing = await getComparison(params.id, workspace.id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const input = updateSchema.parse(body)
    const { products, ...comparisonFields } = input

    const maxProducts = getMaxProducts(workspace.plan)
    if (products && maxProducts !== null && products.length > maxProducts) {
      return NextResponse.json(
        { error: `Maximum ${maxProducts} products allowed on your plan` },
        { status: 429 }
      )
    }

    if (Object.keys(comparisonFields).length > 0) {
      await db.comparison.update({ where: { id: params.id }, data: comparisonFields })
    }

    if (products) {
      const keepIds = products.filter(p => p.id).map(p => p.id as string)
      await db.product.deleteMany({
        where: { comparisonId: params.id, id: { notIn: keepIds } },
      })

      for (const p of products) {
        const productData = {
          position: p.position, url: p.url, affiliateUrl: p.affiliateUrl ?? null,
          name: p.name, imageUrl: p.imageUrl ?? null, price: p.price ?? null,
          userNotes: p.userNotes ?? null, isTopPick: p.isTopPick ?? false,
          rating: p.rating ?? null, reviewCount: p.reviewCount ?? null,
          fetchedRaw: p.fetchedRaw ?? undefined,
        }

        let productId = p.id
        if (productId) {
          await db.product.update({ where: { id: productId, comparisonId: params.id }, data: productData })
        } else {
          const created = await db.product.create({
            data: { ...productData, comparisonId: params.id },
          })
          productId = created.id
        }

        if (p.specs) {
          await db.spec.deleteMany({ where: { productId } })
          await db.spec.createMany({
            data: p.specs.map(s => ({ productId: productId!, specKey: s.specKey, specValue: s.specValue })),
          })
        }
        if (p.prosCons) {
          await db.prosCons.deleteMany({ where: { productId } })
          await db.prosCons.createMany({
            data: p.prosCons.map(pc => ({ productId: productId!, type: pc.type, text: pc.text, position: pc.position })),
          })
        }
      }
    }

    const updated = await getComparison(params.id, workspace.id)
    return NextResponse.json({ data: updated })
  } catch (error) {
    const isAuth = error instanceof Error && error.message.includes('Unauthorized')
    if (isAuth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const message = error instanceof Error ? error.message : 'Request failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspace = await getCurrentWorkspace()
    const existing = await getComparison(params.id, workspace.id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.comparison.delete({ where: { id: params.id } })
    return NextResponse.json({ data: { deleted: true } })
  } catch (error) {
    const isAuth = error instanceof Error && error.message.includes('Unauthorized')
    return NextResponse.json({ error: isAuth ? 'Unauthorized' : 'Internal server error' }, { status: isAuth ? 401 : 500 })
  }
}
