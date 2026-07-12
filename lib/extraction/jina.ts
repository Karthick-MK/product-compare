import type { FetchedProductData } from '@/types'

export async function fetchProductFromUrl(url: string): Promise<FetchedProductData> {
  const jinaUrl = `https://r.jina.ai/${url}`

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Return-Format': 'markdown',
    'X-With-Images-Summary': 'true',
  }
  if (process.env.JINA_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`
  }

  const response = await fetch(jinaUrl, { headers })

  if (!response.ok) {
    throw new Error(`Jina fetch failed: ${response.status}`)
  }

  const markdown: string = await response.text()

  // Title: try H1, then first bold, then first non-empty line
  const h1Match = markdown.match(/^#\s+(.+)$/m)
  const boldMatch = markdown.match(/\*\*(.{10,100})\*\*/)
  const firstLine = markdown.split('\n').find(l => l.trim().length > 10)?.trim()
  const name = (h1Match?.[1] ?? boldMatch?.[1] ?? firstLine ?? 'Unknown Product').trim()

  // Image: first real image URL (skip tiny icons < 50 chars)
  const imageRegex = /!\[.*?\]\((https?:\/\/[^\s)]{30,})\)/g
  const firstImageMatch = imageRegex.exec(markdown)
  const imageUrl = firstImageMatch?.[1] ?? null

  // Price: handles ₹, $, £, €, Rs — with optional commas
  const priceMatch = markdown.match(/(?:Rs\.?\s*|₹\s*|MRP\s*:?\s*[₹]?\s*)[\d,]+(?:\.\d{2})?|[₹$£€][\d,]+(?:\.\d{2})?/)
  const price = priceMatch ? priceMatch[0].trim() : null

  const description = markdown.slice(0, 3000)

  return { name, imageUrl, price, description, rawMarkdown: markdown }
}
