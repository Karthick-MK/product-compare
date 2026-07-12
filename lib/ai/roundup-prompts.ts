import type { Product } from '@/types'

export function buildRoundupPrompt(
  products: Product[],
  overallNotes?: string | null
): string {
  const productDescriptions = products
    .map((p, i) => `
Product ${i + 1}: ${p.name}
Price: ${p.price ?? 'Unknown'}
URL: ${p.url}
${p.userNotes ? `Owner's research notes:\n${p.userNotes}` : ''}
Fetched page content (first 1500 chars):
${JSON.stringify((p as unknown as Record<string, unknown>).fetchedRaw ?? '').slice(0, 1500)}
`)
    .join('\n---\n')

  return `You are a product expert writing a "Top ${products.length}" roundup list.

${overallNotes ? `Overall context from the owner:\n${overallNotes}\n` : ''}

PRODUCTS:
${productDescriptions}

Respond ONLY with a JSON object (no markdown fences, no explanation):
{
  "products": [
    {
      "productIndex": 0,
      "shortDescription": "2-3 sentence product summary focusing on who it's best for and key strengths",
      "highlights": ["Highlight one", "Highlight two", "Highlight three"]
    }
  ],
  "verdict": "1-2 sentence overall summary of the list"
}

Rules:
- productIndex: 0-based, matches order above
- shortDescription: 2-3 sentences, direct and specific
- highlights: exactly 3 items, short phrases (5-8 words each), factual
- verdict: brief overall summary`
}
