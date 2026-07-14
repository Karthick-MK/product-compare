import { notFound } from 'next/navigation'
import { db } from '@/lib/db/prisma'
import { ComparisonTable } from '@/components/comparison/ComparisonTable'
import type { Product } from '@/types'

interface Props {
  params: { slug: string }
}

export default async function EmbedComparisonPage({ params }: Props) {
  const comparison = await db.comparison.findFirst({
    where: { slug: params.slug, status: 'published', pageType: 'comparison' },
    include: {
      products: {
        orderBy: { position: 'asc' },
        include: { specs: true, prosCons: { orderBy: { position: 'asc' } } },
      },
    },
  })
  if (!comparison) notFound()

  return (
    <div className="bg-surface min-h-screen p-4">
      <h2 className="font-heading font-bold text-on-surface text-lg mb-4 leading-snug">
        {comparison.title}
      </h2>

      <ComparisonTable products={comparison.products as unknown as Product[]} />

      <div className="mt-4 flex justify-end">
        <a
          href={`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/compare/${comparison.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-on-surface-variant hover:text-primary transition-colors"
        >
          Full comparison on CompareIt ↗
        </a>
      </div>
    </div>
  )
}
