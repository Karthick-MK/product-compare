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

function seoTitle(title: string, names: string[]): string {
  const lower = title.toLowerCase()
  const anyMissing = names.some(n => !lower.includes(n.toLowerCase()))
  if (!anyMissing || names.length === 0) return title
  return `${title}: ${names.slice(0, 3).join(' vs ')}`
}

function seoDescription(names: string[], introText: string | null, category: string): string {
  if (introText) return introText
  if (names.length === 0) return `Compare top ${category} products side by side.`
  return `Compare ${names.slice(0, 4).join(' vs ')} — specs, pros & cons, pricing and expert verdict.`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params
  const comparison = await getComparison(slug)
  if (!comparison) return { title: 'Not Found' }
  const names = comparison.products.map(p => p.name).filter(Boolean)
  const title = seoTitle(comparison.title, names)
  const description = seoDescription(names, comparison.introText, comparison.category.name)
  return {
    title,
    description,
    keywords: names.join(', '),
    openGraph: {
      title,
      description,
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

        {/* SEO: crawlable vs-pair combinations */}
        {(() => {
          const names = comparison.products.map(p => p.name).filter(Boolean)
          if (names.length < 2) return null
          const pairs: string[] = []
          if (names.length <= 5) {
            for (let i = 0; i < names.length; i++)
              for (let j = i + 1; j < names.length; j++)
                pairs.push(`${names[i]} vs ${names[j]}`)
          }
          return (
            <div className="mt-8 pt-4 border-t border-outline-variant/50">
              <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-1">
                Products compared
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {pairs.length > 0 ? pairs.join(' · ') : names.join(' · ')}
              </p>
            </div>
          )
        })()}

        <p className="mt-4 text-xs text-on-surface-variant text-center">
          Prices and ratings are approximate and may vary by region. Last updated{' '}
          {comparison.publishedAt ? new Date(comparison.publishedAt).toLocaleDateString() : 'recently'}.
        </p>
      </div>
    </div>
  )
}
