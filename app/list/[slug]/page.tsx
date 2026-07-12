import { notFound } from 'next/navigation'
import { db } from '@/lib/db/prisma'
import { RoundupGrid } from '@/components/roundup/RoundupGrid'
import { AiVerdict } from '@/components/comparison/AiVerdict'
import { Badge } from '@/components/ui/Badge'
import type { Metadata } from 'next'
import type { Product } from '@/types'

interface Props {
  params: { slug: string }
}

async function getRoundup(slug: string) {
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
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const roundup = await getRoundup(params.slug)
  if (!roundup) return { title: 'Not Found' }
  return {
    title: `${roundup.title} | CompareIt`,
    description: roundup.introText ?? `Top picks: ${roundup.title}`,
  }
}

export default async function RoundupPage({ params }: Props) {
  const roundup = await getRoundup(params.slug)
  if (!roundup) notFound()

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
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

        {/* Product grid */}
        <RoundupGrid products={roundup.products as unknown as Product[]} />

        {/* AI Verdict */}
        {roundup.aiVerdict && <AiVerdict verdict={roundup.aiVerdict} />}

        {/* Disclaimer */}
        <p className="mt-6 text-xs text-on-surface-variant text-center">
          Prices are approximate and may vary. Last updated{' '}
          {roundup.publishedAt ? new Date(roundup.publishedAt).toLocaleDateString() : 'recently'}.
        </p>
      </div>
    </div>
  )
}
