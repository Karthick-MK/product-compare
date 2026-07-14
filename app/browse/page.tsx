import { db } from '@/lib/db/prisma'
import { BrowseSearch } from '@/components/browse/BrowseSearch'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browse',
  description: 'Browse all published product comparisons and roundups.',
}

export default async function BrowsePage() {
  const pages = await db.comparison.findMany({
    where: { status: 'published' },
    include: {
      category: true,
      products: {
        select: { id: true, imageUrl: true, name: true },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { publishedAt: 'desc' },
  })

  return (
    <div className="min-h-screen bg-surface">
      <nav className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/" className="font-heading font-bold text-on-surface hover:text-primary transition-colors">
            CompareIt
          </Link>
          <span className="text-xs font-mono text-on-surface-variant">{pages.length} comparisons</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div className="pb-6 border-b border-outline-variant">
          <p className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-2">Browse</p>
          <h1 className="font-heading text-3xl font-bold text-on-surface">All Comparisons</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Detailed product comparisons and curated top lists
          </p>
        </div>

        {pages.length === 0 ? (
          <p className="text-center text-on-surface-variant py-20">No published pages yet.</p>
        ) : (
          <BrowseSearch pages={pages} totalCount={pages.length} />
        )}
      </div>
    </div>
  )
}
