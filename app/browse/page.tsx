import { db } from '@/lib/db/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browse | CompareIt',
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

  const byCategory: Record<string, typeof pages> = {}
  for (const p of pages) {
    const cat = p.category.name
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(p)
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/" className="font-heading font-bold text-on-surface hover:text-primary transition-colors">
            CompareIt
          </Link>
          <span className="text-xs font-mono text-on-surface-variant">{pages.length} comparisons</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Header */}
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
          <div className="space-y-10">
            {Object.entries(byCategory).map(([cat, items]) => (
              <section key={cat} className="space-y-3">
                {/* Category header */}
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-semibold text-on-surface">{cat}</h2>
                  <span className="text-xs font-mono text-on-surface-variant">{items.length}</span>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map(p => {
                    const heroImage = p.products.find(prod => prod.imageUrl)?.imageUrl
                    const extra = p.products.length > 3 ? p.products.length - 3 : 0
                    const url = p.pageType === 'roundup' ? `/list/${p.slug}` : `/compare/${p.slug}`

                    return (
                      <Link key={p.id} href={url}
                        className="group relative flex overflow-hidden rounded-xl border border-outline-variant bg-surface-low hover:border-primary/50 transition-all">

                        {/* Hero image */}
                        <div className="w-36 flex-shrink-0 relative bg-surface-high overflow-hidden">
                          {heroImage ? (
                            <img src={heroImage} alt={p.title}
                              className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-3xl text-outline opacity-20">◫</span>
                            </div>
                          )}
                          {/* Badge on image */}
                          <div className="absolute top-2 left-2">
                            <span className={`text-xs font-mono font-bold rounded px-1.5 py-0.5 uppercase tracking-wider ${
                              p.pageType === 'roundup'
                                ? 'bg-secondary/90 text-surface'
                                : 'bg-primary/90 text-surface'
                            }`}>
                              {p.pageType === 'roundup' ? 'Top List' : 'Compare'}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 flex flex-col gap-2 min-w-0">
                          <h3 className="font-heading font-semibold text-on-surface text-sm leading-snug group-hover:text-primary transition-colors">
                            {p.title}
                          </h3>
                          <p className="text-xs font-mono text-on-surface-variant">
                            {p.products.length} products
                            {p.publishedAt && ` · ${new Date(p.publishedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}
                          </p>

                          {p.introText && (
                            <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                              {p.introText}
                            </p>
                          )}

                          {/* Thumbnails + CTA */}
                          <div className="flex items-center justify-between mt-auto pt-1">
                            <div className="flex items-center gap-1">
                              {p.products.slice(0, 3).map(prod => (
                                prod.imageUrl
                                  ? <img key={prod.id} src={prod.imageUrl} alt="" className="w-6 h-6 rounded-full object-contain bg-surface-high border border-outline-variant" />
                                  : <div key={prod.id} className="w-6 h-6 rounded-full bg-surface-high border border-outline-variant" />
                              ))}
                              {extra > 0 && (
                                <span className="text-xs font-mono text-on-surface-variant ml-1">+{extra}</span>
                              )}
                            </div>
                            <span className="text-xs font-mono bg-primary/10 text-primary border border-primary/30 rounded px-2.5 py-1 group-hover:bg-primary/20 transition-colors">
                              Open →
                            </span>
                          </div>
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
