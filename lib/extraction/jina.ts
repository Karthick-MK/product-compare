import type { FetchedProductData } from '@/types'

export async function fetchProductFromUrl(url: string): Promise<FetchedProductData> {
  const jinaUrl = `https://r.jina.ai/${url}`

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Return-Format': 'markdown',
  }
  if (process.env.JINA_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`
  }

  const response = await fetch(jinaUrl, { headers })

  if (!response.ok) {
    throw new Error(`Jina fetch failed: ${response.status}`)
  }

  const markdown: string = await response.text()

  const titleMatch = markdown.match(/^#\s+(.+)$/m)
  const name = titleMatch ? titleMatch[1].trim() : 'Unknown Product'

  const imageMatch = markdown.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/)
  const imageUrl = imageMatch ? imageMatch[1] : null

  // ponytail: covers ₹ $ £ € — add more symbols if needed
  const priceMatch = markdown.match(/[₹$£€][\d,]+(?:\.\d{2})?/)
  const price = priceMatch ? priceMatch[0] : null

  const description = markdown.slice(0, 3000)

  return { name, imageUrl, price, description, rawMarkdown: markdown }
}
