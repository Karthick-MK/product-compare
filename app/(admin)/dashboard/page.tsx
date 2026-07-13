import Link from 'next/link'
import { db } from '@/lib/db/prisma'
import { getCurrentWorkspace } from '@/lib/workspace/current'
import { currentUser } from '@clerk/nextjs/server'

export default async function DashboardPage() {
  const [workspace, user] = await Promise.all([
    getCurrentWorkspace(),
    currentUser(),
  ])

  const comparisons = await db.comparison.findMany({
    where: { workspaceId: workspace.id },
    include: {
      category: true,
      products: {
        select: { id: true, imageUrl: true, name: true },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const published = comparisons.filter(c => c.status === 'published').length
  const firstName = user?.firstName ?? 'there'

  // Group by category
  const byCategory: Record<string, typeof comparisons> = {}
  for (const c of comparisons) {
    const cat = c.category.name
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(c)
  }

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between pb-5 border-b border-outline-variant">
        <div>
          <p className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-2">
            Operational Dashboard
          </p>
          <h1 className="font-heading text-3xl font-bold text-on-surface">
            Welcome back, {firstName}.
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {comparisons.length} pages created · {comparisons.reduce((a, c) => a + c.products.length, 0)} products tracked
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-heading font-bold text-secondary">{published} Published</p>
          <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Global Status</p>
        </div>
      </div>

      {/* Category groups */}
      {comparisons.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-outline-variant rounded-xl space-y-3">
          <p className="font-heading text-xl text-on-surface">No pages yet</p>
          <p className="text-sm text-on-surface-variant">Create your first comparison or roundup</p>
          <Link href="/comparisons/new"
            className="inline-flex items-center gap-2 mt-2 bg-primary text-surface text-sm font-medium rounded px-5 py-2.5 hover:bg-primary/90 transition-colors">
            + New Page
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(byCategory).map(([cat, items]) => (
            <section key={cat} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-semibold text-on-surface">{cat}</h2>
                <span className="text-xs font-mono text-on-surface-variant">{items.length} {items.length === 1 ? 'page' : 'pages'}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(c => {
                  const heroImage = c.products.find(p => p.imageUrl)?.imageUrl
                  const extraProducts = c.products.length > 3 ? c.products.length - 3 : 0
                  const publicUrl = c.pageType === 'roundup' ? `/list/${c.slug}` : `/compare/${c.slug}`
                  const isPublished = c.status === 'published'

                  return (
                    <div key={c.id}
                      className="group relative flex overflow-hidden rounded-xl border border-outline-variant bg-surface-low hover:border-primary/40 transition-colors">
                      {/* Hero image panel */}
                      <div className="w-36 flex-shrink-0 relative bg-surface-high overflow-hidden">
                        {heroImage ? (
                          <img src={heroImage} alt={c.title}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-outline">
                            <span className="text-3xl opacity-30">◫</span>
                          </div>
                        )}
                        {/* TOP RANKED badge on image */}
                        {isPublished && (
                          <div className="absolute top-2 left-2">
                            <span className="text-xs font-mono font-bold bg-primary/90 text-surface rounded px-1.5 py-0.5 uppercase tracking-wider">
                              Live
                            </span>
                          </div>
                        )}
                        {c.status === 'draft' && (
                          <div className="absolute top-2 left-2">
                            <span className="text-xs font-mono font-bold bg-surface-high/90 text-on-surface-variant rounded px-1.5 py-0.5 uppercase tracking-wider">
                              Draft
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4 flex flex-col gap-2 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-heading font-semibold text-on-surface text-sm leading-snug">
                            {c.title}
                          </h3>
                        </div>

                        <p className="text-xs font-mono text-on-surface-variant">
                          {c.products.length} products · {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                        </p>

                        {/* Type chips */}
                        <div className="flex gap-1.5 flex-wrap">
                          <span className="text-xs font-mono bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5">
                            {c.pageType === 'roundup' ? 'Roundup List' : 'Spec Matrix'}
                          </span>
                          <span className="text-xs font-mono bg-surface-high text-on-surface-variant border border-outline-variant rounded px-2 py-0.5">
                            {c.category.name}
                          </span>
                        </div>

                        {/* Product thumbnails + action */}
                        <div className="flex items-center justify-between mt-auto pt-1">
                          <div className="flex items-center gap-1">
                            {c.products.slice(0, 3).map(p => (
                              p.imageUrl
                                ? <img key={p.id} src={p.imageUrl} alt="" className="w-6 h-6 rounded-full object-contain bg-surface-high border border-outline-variant" />
                                : <div key={p.id} className="w-6 h-6 rounded-full bg-surface-high border border-outline-variant" />
                            ))}
                            {extraProducts > 0 && (
                              <span className="text-xs font-mono text-on-surface-variant ml-1">+{extraProducts}</span>
                            )}
                          </div>
                          <div className="flex gap-1.5">
                            <Link href={`/comparisons/${c.id}/edit`}
                              className="text-xs font-mono border border-outline-variant text-on-surface-variant rounded px-2.5 py-1 hover:border-primary/50 hover:text-primary transition-colors">
                              Edit
                            </Link>
                            {isPublished && (
                              <Link href={publicUrl} target="_blank"
                                className="text-xs font-mono bg-primary/10 text-primary border border-primary/30 rounded px-2.5 py-1 hover:bg-primary/20 transition-colors">
                                Open →
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Add new card */}
                <Link href="/comparisons/new"
                  className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-low/50 p-8 hover:border-primary/40 hover:bg-surface-high/30 transition-colors group min-h-[120px]">
                  <span className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant group-hover:border-primary group-hover:text-primary transition-colors text-lg">+</span>
                  <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                    Add {cat.toLowerCase()} comparison
                  </span>
                </Link>
              </div>
            </section>
          ))}

          {/* Global add button */}
          <Link href="/comparisons/new"
            className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-outline-variant p-6 hover:border-primary/40 hover:bg-surface-high/20 transition-colors group">
            <span className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant group-hover:border-primary group-hover:text-primary transition-colors text-lg">+</span>
            <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
              New category / page
            </span>
          </Link>
        </div>
      )}
    </div>
  )
}
