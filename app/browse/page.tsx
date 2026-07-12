import { db } from '@/lib/db/prisma'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const workspace = await db.workspace.findFirst({ orderBy: { createdAt: 'asc' } })
  return {
    title: `Browse | CompareIt`,
    description: `All published product comparisons${workspace ? ` by ${workspace.slug}` : ''}.`,
  }
}

export default async function BrowsePage() {
  // For multi-tenant SaaS: would filter by workspaceId from URL param
  // For now: show all published pages from the primary workspace
  const workspace = await db.workspace.findFirst({ orderBy: { createdAt: 'asc' } })

  const pages = await db.comparison.findMany({
    where: {
      status: 'published',
      ...(workspace ? { workspaceId: workspace.id } : {}),
    },
    include: {
      category: true,
      products: {
        select: { id: true, imageUrl: true },
        take: 4,
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { publishedAt: 'desc' },
  })

  // Group by category
  const byCategory: Record<string, typeof pages> = {}
  for (const p of pages) {
    const cat = p.category.name
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(p)
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="border-b border-outline-variant bg-surface-low">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="font-heading font-bold text-xl text-on-surface hover:text-primary transition-colors">
            CompareIt
          </Link>
          <span className="text-xs font-mono text-on-surface-variant">
            {pages.length} published
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="font-heading text-4xl font-bold text-on-surface">All Comparisons</h1>
          <p className="text-on-surface-variant text-sm mt-2">
            Detailed product comparisons and curated lists — click to explore.
          </p>
        </div>

        {pages.length === 0 ? (
          <p className="text-on-surface-variant text-center py-16">No published pages yet.</p>
        ) : (
          <div className="space-y-10">
            {Object.entries(byCategory).map(([cat, items]) => (
              <section key={cat}>
                <h2 className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-3 pb-2 border-b border-outline-variant">
                  {cat}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map(p => {
                    const url = p.pageType === 'roundup' ? `/list/${p.slug}` : `/compare/${p.slug}`
                    return (
                      <Link key={p.id} href={url}
                        className="flex items-center gap-4 p-4 bg-surface-low border border-outline-variant rounded-lg hover:border-primary/50 hover:bg-surface-high/30 transition-all group">
                        {/* Thumbnail strip */}
                        <div className="flex gap-1 flex-shrink-0">
                          {p.products.slice(0, 3).map(prod => (
                            prod.imageUrl
                              ? <img key={prod.id} src={prod.imageUrl} alt="" className="w-10 h-10 object-contain rounded bg-surface-high" />
                              : <div key={prod.id} className="w-10 h-10 rounded bg-surface-high" />
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading font-semibold text-on-surface group-hover:text-primary transition-colors text-sm leading-snug">
                            {p.title}
                          </h3>
                          <p className="text-xs text-on-surface-variant mt-1">
                            {p.products.length} products
                            {p.publishedAt && ` · ${new Date(p.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <Badge
                            label={p.pageType === 'roundup' ? 'List' : 'Compare'}
                            variant={p.pageType === 'roundup' ? 'success' : 'primary'}
                          />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
