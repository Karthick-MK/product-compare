import { db } from '@/lib/db/prisma'
import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://product-compare-chi.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await db.comparison.findMany({
    where: { status: 'published' },
    select: { slug: true, pageType: true, updatedAt: true },
  })

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/browse`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    ...pages.map(p => ({
      url: `${BASE_URL}/${p.pageType === 'roundup' ? 'list' : 'compare'}/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
