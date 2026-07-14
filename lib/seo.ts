import type { Product } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://product-compare-chi.vercel.app'

export function buildItemListJsonLd(
  title: string,
  slug: string,
  pageType: 'comparison' | 'roundup',
  products: Product[],
  description?: string | null,
) {
  const pageUrl = `${BASE_URL}/${pageType === 'roundup' ? 'list' : 'compare'}/${slug}`

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    description: description ?? undefined,
    url: pageUrl,
    itemListElement: products.map((p, i) => {
      const item: Record<string, unknown> = {
        '@type': 'Product',
        name: p.name,
      }
      if (p.imageUrl) item.image = p.imageUrl
      if (p.url) item.url = p.url
      if (p.rating && p.reviewCount) {
        item.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: p.rating,
          reviewCount: p.reviewCount,
        }
      }
      return { '@type': 'ListItem', position: i + 1, item }
    }),
  }
}
