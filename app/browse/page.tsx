import { db } from '@/lib/db/prisma'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browse Comparisons | CompareIt',
  description: 'Browse all published product comparisons and roundups.',
}

export default async function BrowsePage() {
  const pages = await db.comparison.findMany({
    where: { status: 'published' },
    include: {
      category: true,
      products: { select: { id: true, imageUrl: true }, take: 3, orderBy: { position: 'asc' } },
    },
    orderBy: { publishedAt: 'desc' },
  })

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <Link href="/" className="text-xs text-on-surface-variant hover:text-primary transition-colors">← Home</Link>
          <h1 className="font-heading text-3xl font-bold text-on-surface mt-3">Browse</h1>
          <p className="text-on-surface-variant text-sm mt-1">All published comparisons and roundups</p>
        </div>

        {pages.length === 0 ? (
          <p className="text-on-surface-variant text-center py-16">No published pages yet.</p>
        ) : (
          <div className="space-y-3">
            {pages.map(p => {
              const url = p.pageType === 'roundup' ? `/list/${p.slug}` : `/compare/${p.slug}`
              return (
                <Link key={p.id} href={url}
                  className="flex items-center gap-4 p-4 bg-surface-low border border-outline-variant rounded-lg hover:border-primary/40 transition-colors group">
                  {/* Thumbnail strip */}
                  <div className="flex gap-1 flex-shrink-0">
                    {p.products.map(prod => (
                      prod.imageUrl
                        ? <img key={prod.id} src={prod.imageUrl} alt="" className="w-10 h-10 object-contain rounded bg-surface-high" />
                        : <div key={prod.id} className="w-10 h-10 rounded bg-surface-high" />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-heading font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                      {p.title}
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {p.category.name} · {p.products.length} products
                      {p.publishedAt && ` · ${new Date(p.publishedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}
                    </p>
                  </div>
                  <Badge label={p.pageType === 'roundup' ? 'Roundup' : 'Comparison'} variant={p.pageType === 'roundup' ? 'success' : 'primary'} />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
