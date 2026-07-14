'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface PageItem {
  id: string
  title: string
  slug: string
  pageType: string
  introText: string | null
  publishedAt: Date | null
  category: { name: string }
  products: { id: string; imageUrl: string | null; name: string }[]
}

interface Props {
  pages: PageItem[]
  totalCount: number
}

export function BrowseSearch({ pages, totalCount }: Props) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<'all' | 'comparison' | 'roundup'>('all')

  const categories = useMemo(() => Array.from(new Set(pages.map(p => p.category.name))).sort(), [pages])

  const filtered = useMemo(() => {
    return pages.filter(p => {
      if (activeType !== 'all' && p.pageType !== activeType) return false
      if (activeCategory && p.category.name !== activeCategory) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        if (!p.title.toLowerCase().includes(q) &&
            !p.products.some(pr => pr.name.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [pages, query, activeCategory, activeType])

  const byCategory = useMemo(() => {
    const map: Record<string, typeof filtered> = {}
    for (const p of filtered) {
      const cat = p.category.name
      if (!map[cat]) map[cat] = []
      map[cat].push(p)
    }
    return map
  }, [filtered])

  const hasFilters = query || activeCategory || activeType !== 'all'

  return (
    <div className="space-y-6">
      {/* Search + filters */}
      <div className="space-y-3">
        <input
          type="search"
          placeholder="Search comparisons or products…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-surface-low border border-outline-variant rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
        />

        {/* Type chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['all', 'comparison', 'roundup'] as const).map(t => (
            <button key={t} onClick={() => setActiveType(t)}
              className={`flex-shrink-0 text-xs font-mono rounded-full px-3 py-1.5 border transition-colors ${
                activeType === t
                  ? 'bg-primary text-surface border-primary'
                  : 'border-outline-variant text-on-surface-variant hover:border-primary/50 hover:text-on-surface'
              }`}>
              {t === 'all' ? 'All' : t === 'comparison' ? 'Compare' : 'Top Lists'}
            </button>
          ))}
          <span className="text-outline-variant">|</span>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`flex-shrink-0 text-xs font-mono rounded-full px-3 py-1.5 border transition-colors ${
                activeCategory === cat
                  ? 'bg-secondary/20 text-secondary border-secondary/40'
                  : 'border-outline-variant text-on-surface-variant hover:border-secondary/30 hover:text-on-surface'
              }`}>
              {cat}
            </button>
          ))}
          {hasFilters && (
            <button onClick={() => { setQuery(''); setActiveCategory(null); setActiveType('all') }}
              className="flex-shrink-0 text-xs text-tertiary hover:underline ml-1">
              Clear ×
            </button>
          )}
        </div>
        <p className="text-xs font-mono text-on-surface-variant">
          {filtered.length === totalCount ? `${totalCount} comparisons` : `${filtered.length} of ${totalCount}`}
        </p>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-center text-on-surface-variant py-16 text-sm">No results.</p>
      ) : (
        <div className="space-y-10">
          {Object.entries(byCategory).map(([cat, items]) => (
            <section key={cat} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-semibold text-on-surface">{cat}</h2>
                <span className="text-xs font-mono text-on-surface-variant">{items.length}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(p => {
                  const heroImage = p.products.find(prod => prod.imageUrl)?.imageUrl
                  const extra = p.products.length > 3 ? p.products.length - 3 : 0
                  const url = p.pageType === 'roundup' ? `/list/${p.slug}` : `/compare/${p.slug}`

                  return (
                    <Link key={p.id} href={url}
                      className="group relative flex overflow-hidden rounded-xl border border-outline-variant bg-surface-low hover:border-primary/50 transition-all">

                      <div className="w-36 flex-shrink-0 relative bg-surface-high overflow-hidden">
                        {heroImage ? (
                          <img src={heroImage} alt={p.title}
                            className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-opacity" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-3xl text-outline opacity-20">◫</span>
                          </div>
                        )}
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

                      <div className="flex-1 p-4 flex flex-col gap-2 min-w-0">
                        <h3 className="font-heading font-semibold text-on-surface text-sm leading-snug group-hover:text-primary transition-colors">
                          {p.title}
                        </h3>
                        <p className="text-xs font-mono text-on-surface-variant">
                          {p.products.length} products
                          {p.publishedAt && ` · ${new Date(p.publishedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}
                        </p>
                        {p.introText && (
                          <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">{p.introText}</p>
                        )}
                        <div className="flex items-center justify-between mt-auto pt-1">
                          <div className="flex items-center gap-1">
                            {p.products.slice(0, 3).map(prod => (
                              prod.imageUrl
                                ? <img key={prod.id} src={prod.imageUrl} alt="" className="w-6 h-6 rounded-full object-contain bg-surface-high border border-outline-variant" />
                                : <div key={prod.id} className="w-6 h-6 rounded-full bg-surface-high border border-outline-variant" />
                            ))}
                            {extra > 0 && <span className="text-xs font-mono text-on-surface-variant ml-1">+{extra}</span>}
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
  )
}
