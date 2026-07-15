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

  // Nav/site-name lines to skip when extracting product name
  const navPattern = /amazon\.com|flipkart|myntra|meesho|results for|skip to|back to|sign in|my cart|wish\s*list|homepage|just a moment|^\s*home\s*$/i

  // All H1/H2 headings, pick first one that looks like a product title
  const headings = Array.from(markdown.matchAll(/^#{1,2}\s+(.+)$/gm))
    .map(m => m[1].replace(/\*\*/g, '').trim())
    .filter(l => l.length > 15 && l.length < 300 && !navPattern.test(l))

  const boldMatch = markdown.match(/\*\*([^*]{15,200})\*\*/)
  const firstMeaningfulLine = markdown.split('\n')
    .map(l => l.replace(/^#+\s*/, '').trim())
    .find(l => l.length > 20 && !navPattern.test(l))

  const name = (headings[0] ?? boldMatch?.[1] ?? firstMeaningfulLine ?? 'Unknown Product').trim()

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
