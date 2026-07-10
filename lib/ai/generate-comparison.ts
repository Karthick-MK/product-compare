import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/db/prisma'
import { buildComparisonPrompt } from './prompts'
import type { GeneratedComparison } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// AI response shape uses productIndex (0-based), not productId
interface AIProduct {
  productIndex: number
  specs: Record<string, string>
  pros: string[]
  cons: string[]
}

interface AIResponse {
  specKeys: string[]
  products: AIProduct[]
  verdict: string
}

export async function generateComparison(comparisonId: string): Promise<GeneratedComparison> {
  const comparison = await db.comparison.findUniqueOrThrow({
    where: { id: comparisonId },
    include: { category: true, products: { orderBy: { position: 'asc' } } },
  })

  const prompt = buildComparisonPrompt(
    comparison.category as unknown as import('@/types').Category,
    comparison.products as unknown as import('@/types').Product[],
    comparison.introText
  )

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  if (!text) throw new Error('AI returned empty response')

  // Strip markdown code fences if model added them despite instructions
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()

  if (!cleaned || !cleaned.startsWith('{')) {
    throw new Error('AI returned invalid JSON response')
  }

  const aiResponse = JSON.parse(cleaned) as AIResponse

  // Persist to DB: clear existing specs/prosCons, write new ones
  await db.$transaction(async (tx) => {
    for (const genProduct of aiResponse.products) {
      const product = comparison.products[genProduct.productIndex]
      if (!product) continue

      // Clear old specs and pros/cons
      await tx.spec.deleteMany({ where: { productId: product.id } })
      await tx.prosCons.deleteMany({ where: { productId: product.id } })

      // Write new specs
      await tx.spec.createMany({
        data: aiResponse.specKeys.map((key) => ({
          productId: product.id,
          specKey: key,
          specValue: genProduct.specs[key] ?? 'N/A',
        })),
      })

      // Write pros
      await tx.prosCons.createMany({
        data: genProduct.pros.map((text, i) => ({
          productId: product.id,
          type: 'pro',
          text,
          position: i,
        })),
      })

      // Write cons
      await tx.prosCons.createMany({
        data: genProduct.cons.map((text, i) => ({
          productId: product.id,
          type: 'con',
          text,
          position: i,
        })),
      })
    }

    // Save verdict
    await tx.comparison.update({
      where: { id: comparisonId },
      data: { aiVerdict: aiResponse.verdict },
    })
  })

  // Map AI response (productIndex) → GeneratedComparison shape (productId)
  return {
    specKeys: aiResponse.specKeys,
    products: aiResponse.products
      .filter(g => comparison.products[g.productIndex] !== undefined)
      .map(g => ({
        productId: comparison.products[g.productIndex].id,
        specs: g.specs,
        pros: g.pros,
        cons: g.cons,
      })),
    verdict: aiResponse.verdict,
  }
}
