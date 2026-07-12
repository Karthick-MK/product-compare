import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { db } from '@/lib/db/prisma'
import { buildComparisonPrompt } from './prompts'
import { buildRoundupPrompt } from './roundup-prompts'
import type { GeneratedComparison } from '@/types'

// AI_PROVIDER=claude (default) | gemini
async function callAI(prompt: string): Promise<string> {
  const provider = process.env.AI_PROVIDER ?? 'claude'

  if (provider === 'gemini') {
    const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genai.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash' })
    const result = await model.generateContent(prompt)
    return result.response.text()
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })
  return message.content[0].type === 'text' ? message.content[0].text : ''
}

function cleanJson(text: string): string {
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
  if (!cleaned || !cleaned.startsWith('{')) {
    throw new Error('AI returned invalid JSON response')
  }
  return cleaned
}

// Comparison-specific types
interface AIProduct {
  productIndex: number
  specs: Record<string, string>
  pros: string[]
  cons: string[]
}

interface AIComparisonResponse {
  specKeys: string[]
  products: AIProduct[]
  verdict: string
}

// Roundup-specific types
interface AIRoundupProduct {
  productIndex: number
  shortDescription: string
  highlights: string[]
}

interface AIRoundupResponse {
  products: AIRoundupProduct[]
  verdict: string
}

interface ComparisonWithRelations {
  id: string
  pageType: string
  introText: string | null
  category: { name: string; defaultSpecKeys: string[] }
  products: Array<{ id: string; position: number; url: string; price: string | null; userNotes: string | null }>
}

export async function generateComparison(comparisonId: string): Promise<GeneratedComparison> {
  const comparison = await db.comparison.findUniqueOrThrow({
    where: { id: comparisonId },
    include: { category: true, products: { orderBy: { position: 'asc' } } },
  })

  if (comparison.pageType === 'roundup') {
    return generateRoundup(comparison as ComparisonWithRelations)
  }

  return generateComparisonMatrix(comparison as ComparisonWithRelations)
}

async function generateComparisonMatrix(comparison: ComparisonWithRelations): Promise<GeneratedComparison> {
  const prompt = buildComparisonPrompt(
    comparison.category as unknown as import('@/types').Category,
    comparison.products as unknown as import('@/types').Product[],
    comparison.introText
  )

  const text = await callAI(prompt)
  if (!text) throw new Error('AI returned empty response')

  const aiResponse = JSON.parse(cleanJson(text)) as AIComparisonResponse

  await db.$transaction(async (tx) => {
    for (const genProduct of aiResponse.products) {
      const product = comparison.products[genProduct.productIndex]
      if (!product) continue

      await tx.spec.deleteMany({ where: { productId: product.id } })
      await tx.prosCons.deleteMany({ where: { productId: product.id } })

      await tx.spec.createMany({
        data: aiResponse.specKeys.map((key) => ({
          productId: product.id,
          specKey: key,
          specValue: genProduct.specs[key] ?? 'N/A',
        })),
      })

      await tx.prosCons.createMany({
        data: genProduct.pros.map((text, i) => ({
          productId: product.id,
          type: 'pro',
          text,
          position: i,
        })),
      })

      await tx.prosCons.createMany({
        data: genProduct.cons.map((text, i) => ({
          productId: product.id,
          type: 'con',
          text,
          position: i,
        })),
      })
    }

    await tx.comparison.update({
      where: { id: comparison.id },
      data: { aiVerdict: aiResponse.verdict },
    })
  })

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

async function generateRoundup(comparison: ComparisonWithRelations): Promise<GeneratedComparison> {
  const prompt = buildRoundupPrompt(
    comparison.products as unknown as import('@/types').Product[],
    comparison.introText
  )

  const text = await callAI(prompt)
  if (!text) throw new Error('AI returned empty response')

  const aiResponse = JSON.parse(cleanJson(text)) as AIRoundupResponse

  await db.$transaction(async (tx) => {
    for (const genProduct of aiResponse.products) {
      const product = comparison.products[genProduct.productIndex]
      if (!product) continue

      // Clear old data
      await tx.prosCons.deleteMany({ where: { productId: product.id } })

      // Write shortDescription
      await tx.product.update({
        where: { id: product.id },
        data: { shortDescription: genProduct.shortDescription },
      })

      // Write highlights as pros (exactly 3)
      await tx.prosCons.createMany({
        data: genProduct.highlights.slice(0, 3).map((text, i) => ({
          productId: product.id,
          type: 'pro',
          text,
          position: i,
        })),
      })
    }

    await tx.comparison.update({
      where: { id: comparison.id },
      data: { aiVerdict: aiResponse.verdict },
    })
  })

  // Return GeneratedComparison shape (specKeys empty for roundup)
  return {
    specKeys: [],
    products: aiResponse.products
      .filter(g => comparison.products[g.productIndex] !== undefined)
      .map(g => ({
        productId: comparison.products[g.productIndex].id,
        specs: {},
        pros: g.highlights,
        cons: [],
      })),
    verdict: aiResponse.verdict,
  }
}
