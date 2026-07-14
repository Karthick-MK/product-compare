import { notFound } from 'next/navigation'
import { db } from '@/lib/db/prisma'
import { FilteredComparison } from '@/components/comparison/FilteredComparison'
import { PublicNav } from '@/components/comparison/PublicNav'
import { Badge } from '@/components/ui/Badge'
import { buildItemListJsonLd } from '@/lib/seo'
import type { Metadata } from 'next'
import type { Product } from '@/types'

interface Props {
  params: { slug: string }
}

async function getComparison(slug: string) {
  return db.comparison.findFirst({
    where: { slug, status: 'published', pageType: 'comparison' },
    include: {
      category: true,
      products: {
        orderBy: { position: 'asc' },
        include: {
          specs: true,
          prosCons: { orderBy: { position: 'asc' } },
        },
      },
    },
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params
  const comparison = await getComparison(slug)
  if (!comparison) return { title: 'Not Found' }
  return {
    title: comparison.title,
    description: comparison.introText ?? `Compare top ${comparison.category.name} products side by side.`,
    openGraph: {
      title: comparison.title,
      description: comparison.introText ?? `Compare top ${comparison.category.name} products side by side.`,
      images: comparison.products[0]?.imageUrl ? [{ url: comparison.products[0].imageUrl }] : [],
    },
  }
}

export default async function ComparisonPage({ params }: Props) {
  const { slug } = params
  const comparison = await getComparison(slug)
  if (!comparison) notFound()

  const jsonLd = buildItemListJsonLd(
    comparison.title,
    comparison.slug,
    'comparison',
    comparison.products as unknown as Product[],
    comparison.introText,
  )

  return (
    <div className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicNav title={comparison.title} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge label="Technical Guide" variant="success" />
            {comparison.publishedAt && (
              <span className="text-xs text-on-surface-variant">
                Updated {new Date(comparison.publishedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          <h1 className="font-heading text-3xl font-bold text-on-surface">{comparison.title}</h1>
          {comparison.introText && (
            <p className="mt-2 text-on-surface-variant text-sm leading-relaxed max-w-2xl">{comparison.introText}</p>
          )}
        </div>

        <FilteredComparison
          products={comparison.products as unknown as Product[]}
          aiVerdict={comparison.aiVerdict}
        />

        <p className="mt-6 text-xs text-on-surface-variant text-center">
          Prices and ratings are approximate and may vary by region. Last updated{' '}
          {comparison.publishedAt ? new Date(comparison.publishedAt).toLocaleDateString() : 'recently'}.
        </p>
      </div>
    </div>
  )
}
