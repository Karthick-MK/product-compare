import { notFound } from 'next/navigation'
import { PublicNav } from '@/components/comparison/PublicNav'
import { db } from '@/lib/db/prisma'
import { FilteredRoundup } from '@/components/roundup/FilteredRoundup'
import { Badge } from '@/components/ui/Badge'
import { buildItemListJsonLd } from '@/lib/seo'
import { cache } from 'react'
import type { Metadata } from 'next'
import type { Product } from '@/types'

interface Props {
  params: { slug: string }
}

const getRoundup = cache(async (slug: string) => {
  return db.comparison.findFirst({
    where: { slug, status: 'published', pageType: 'roundup' },
    include: {
      products: {
        orderBy: { position: 'asc' },
        include: {
          prosCons: { orderBy: { position: 'asc' } },
        },
      },
    },
  })
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const roundup = await getRoundup(params.slug)
  if (!roundup) return { title: 'Not Found' }
  const names = roundup.products.map(p => p.name).filter(Boolean)
  const description = roundup.introText
    ?? (names.length > 0
      ? `Top picks: ${names.slice(0, 4).join(', ')} and more — ranked by value, performance and ratings.`
      : `Top picks: ${roundup.title}`)
  return {
    title: roundup.title,
    description,
    keywords: names.join(', '),
    openGraph: {
      title: roundup.title,
      description,
      images: roundup.products[0]?.imageUrl ? [{ url: roundup.products[0].imageUrl }] : [],
    },
  }
}

export default async function RoundupPage({ params }: Props) {
  const roundup = await getRoundup(params.slug)
  if (!roundup) notFound()

  const jsonLd = buildItemListJsonLd(
    roundup.title,
    roundup.slug,
    'roundup',
    roundup.products as unknown as Product[],
    roundup.introText,
  )

  return (
    <div className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicNav title={roundup.title} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge label="Roundup" variant="success" />
            {roundup.publishedAt && (
              <span className="text-xs text-on-surface-variant">
                Updated {new Date(roundup.publishedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          <h1 className="font-heading text-3xl font-bold text-on-surface">{roundup.title}</h1>
          {roundup.introText && (
            <p className="mt-2 text-on-surface-variant text-sm leading-relaxed max-w-2xl">
              {roundup.introText}
            </p>
          )}
        </div>

        <FilteredRoundup
          products={roundup.products as unknown as Product[]}
          aiVerdict={roundup.aiVerdict}
        />

        {/* Disclaimer */}
        <p className="mt-6 text-xs text-on-surface-variant text-center">
          Prices are approximate and may vary. Last updated{' '}
          {roundup.publishedAt ? new Date(roundup.publishedAt).toLocaleDateString() : 'recently'}.
        </p>
      </div>
    </div>
  )
}
