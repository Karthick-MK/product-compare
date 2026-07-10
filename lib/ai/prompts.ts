import type { Product, Category } from '@/types'

export function buildComparisonPrompt(
  category: Category,
  products: Product[],
  overallNotes?: string | null
): string {
  const productDescriptions = products
    .map((p, i) => `
Product ${i + 1}: ${p.name}
Price: ${p.price ?? 'Unknown'}
URL: ${p.url}
${p.userNotes ? `Owner's research notes:\n${p.userNotes}` : ''}
Fetched page content (first 2000 chars):
${JSON.stringify((p as unknown as Record<string, unknown>).fetchedRaw ?? '').slice(0, 2000)}
`)
    .join('\n---\n')

  return `You are a product comparison expert. Generate a structured comparison for the category "${category.name}".

Default spec keys for this category: ${category.defaultSpecKeys.join(', ')}
You may use these or choose more relevant ones based on the actual products. Use 4-7 spec keys total.

${overallNotes ? `Overall comparison context from the owner:\n${overallNotes}\n` : ''}

PRODUCTS TO COMPARE:
${productDescriptions}

Respond ONLY with a JSON object matching this exact schema (no markdown, no explanation):
{
  "specKeys": ["Spec Name 1", "Spec Name 2", ...],
  "products": [
    {
      "productIndex": 0,
      "specs": {"Spec Name 1": "value", "Spec Name 2": "value"},
      "pros": ["Pro 1", "Pro 2", "Pro 3"],
      "cons": ["Con 1", "Con 2"]
    }
  ],
  "verdict": "2-3 sentence AI verdict comparing products and giving a recommendation"
}

Rules:
- specs: fill every specKey for every product; use "N/A" if unknown
- pros/cons: 2-4 items each, specific and factual
- verdict: direct recommendation with brief reasoning
- productIndex: 0-based, matches order of products above`
}
