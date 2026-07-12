import Link from 'next/link'
import { db } from '@/lib/db/prisma'
import { getCurrentWorkspace } from '@/lib/workspace/current'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace()
  const comparisons = await db.comparison.findMany({
    where: { workspaceId: workspace.id },
    include: {
      category: true,
      products: { select: { id: true, imageUrl: true }, take: 3, orderBy: { position: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const published = comparisons.filter(c => c.status === 'published').length
  const drafts = comparisons.filter(c => c.status === 'draft').length
  const roundupsCount = comparisons.filter(c => c.pageType === 'roundup').length

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-on-surface">Dashboard</h1>
          <p className="text-sm text-on-surface-variant mt-1">Manage your comparisons and roundups</p>
        </div>
        <Link href="/comparisons/new">
          <Button>+ New Page</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: comparisons.length, color: 'text-on-surface' },
          { label: 'Published', value: published, color: 'text-secondary' },
          { label: 'Drafts', value: drafts, color: 'text-on-surface-variant' },
          { label: 'Roundups', value: roundupsCount, color: 'text-primary' },
        ].map(s => (
          <div key={s.label} className="bg-surface-low border border-outline-variant rounded-lg p-4">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">{s.label}</p>
            <p className={`font-heading text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {comparisons.length === 0 ? (
        <div className="text-center py-20 border border-outline-variant border-dashed rounded-xl">
          <p className="font-heading text-lg text-on-surface">No pages yet</p>
          <p className="text-sm text-on-surface-variant mt-1 mb-4">Create your first comparison or roundup</p>
          <Link href="/comparisons/new"><Button>+ New Page</Button></Link>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">All pages</p>
          {comparisons.map(c => {
            const publicUrl = c.pageType === 'roundup' ? `/list/${c.slug}` : `/compare/${c.slug}`
            return (
              <div key={c.id}
                className="flex items-center gap-4 p-4 bg-surface-low border border-outline-variant rounded-lg hover:border-primary/30 transition-colors group">
                <div className="flex gap-1 flex-shrink-0">
                  {c.products.length === 0
                    ? <div className="w-9 h-9 rounded bg-surface-high flex items-center justify-center text-xs text-on-surface-variant">?</div>
                    : c.products.map(p => p.imageUrl
                        ? <img key={p.id} src={p.imageUrl} alt="" className="w-9 h-9 object-contain rounded bg-surface-high" />
                        : <div key={p.id} className="w-9 h-9 rounded bg-surface-high" />
                      )
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-sm text-on-surface truncate group-hover:text-primary transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {c.category.name} · {c.products.length} products
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge label={c.status} variant={c.status === 'published' ? 'success' : 'neutral'} />
                  <Badge label={c.pageType === 'roundup' ? 'Roundup' : 'Compare'} variant="neutral" />
                  <Link href={`/comparisons/${c.id}/edit`}>
                    <Button variant="outline" size="sm">Edit</Button>
                  </Link>
                  {c.status === 'published' && (
                    <Link href={publicUrl} target="_blank">
                      <Button variant="ghost" size="sm">↗</Button>
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
