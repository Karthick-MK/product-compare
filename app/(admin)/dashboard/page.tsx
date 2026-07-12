import Link from 'next/link'
import { db } from '@/lib/db/prisma'
import { getCurrentWorkspace } from '@/lib/workspace/current'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace()
  const comparisons = await db.comparison.findMany({
    where: { workspaceId: workspace.id },
    include: { category: true, products: { select: { id: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-on-surface">Comparisons</h1>
        <Link href="/comparisons/new">
          <Button>+ New Comparison</Button>
        </Link>
      </div>

      {comparisons.length === 0 ? (
        <div className="text-center py-20 text-on-surface-variant">
          <p className="text-lg">No comparisons yet.</p>
          <Link href="/comparisons/new" className="text-primary hover:underline mt-2 block">Create your first one</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {comparisons.map((c) => (
            <div key={c.id} className="bg-surface-low border border-outline-variant rounded p-4 flex items-center justify-between">
              <div>
                <h2 className="font-heading font-semibold text-on-surface">{c.title}</h2>
                <p className="text-sm text-on-surface-variant mt-0.5">
                  {c.category.name} · {c.products.length} products
                  {c.pageType === 'roundup' && (
                    <span className="ml-2 text-xs font-mono bg-primary/10 text-primary border border-primary/30 rounded px-1.5 py-0.5">
                      ROUNDUP
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge label={c.status} variant={c.status === 'published' ? 'success' : 'neutral'} />
                <Link href={`/comparisons/${c.id}/edit`}>
                  <Button variant="outline" size="sm">Edit</Button>
                </Link>
                {c.status === 'published' && (
                  <Link href={`/compare/${c.slug}`} target="_blank">
                    <Button variant="ghost" size="sm">View →</Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
