import { notFound } from 'next/navigation'
import { db } from '@/lib/db/prisma'
import { RoundupGrid } from '@/components/roundup/RoundupGrid'
import type { Product } from '@/types'

interface Props {
  params: { slug: string }
}

export default async function EmbedRoundupPage({ params }: Props) {
  const roundup = await db.comparison.findFirst({
    where: { slug: params.slug, status: 'published', pageType: 'roundup' },
    include: {
      products: {
        orderBy: { position: 'asc' },
        include: { prosCons: { orderBy: { position: 'asc' } } },
      },
    },
  })
  if (!roundup) notFound()

  return (
    <div className="bg-surface min-h-screen p-4">
      <h2 className="font-heading font-bold text-on-surface text-lg mb-4 leading-snug">
        {roundup.title}
      </h2>

      <RoundupGrid products={roundup.products as unknown as Product[]} />

      <div className="mt-4 flex justify-end">
        <a
          href={`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/list/${roundup.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-on-surface-variant hover:text-primary transition-colors"
        >
          Full list on CompareIt ↗
        </a>
      </div>
    </div>
  )
}
