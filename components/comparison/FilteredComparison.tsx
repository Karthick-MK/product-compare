'use client'

import { useState, useMemo } from 'react'
import { ComparisonTable } from './ComparisonTable'
import { AiVerdict } from './AiVerdict'
import type { Product } from '@/types'

interface Props {
  products: Product[]
  aiVerdict: string | null
}

export function FilteredComparison({ products, aiVerdict }: Props) {
  const [minRating, setMinRating] = useState(0)
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'rating'>('default')

  const filtered = useMemo(() => {
    let result = [...products]
    if (minRating > 0) result = result.filter(p => p.rating && p.rating >= minRating)
    if (sortBy === 'rating') result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    else if (sortBy === 'price-asc') result.sort((a, b) =>
      parseFloat((a.price ?? '0').replace(/[^0-9.]/g, '')) - parseFloat((b.price ?? '0').replace(/[^0-9.]/g, '')))
    else if (sortBy === 'price-desc') result.sort((a, b) =>
      parseFloat((b.price ?? '0').replace(/[^0-9.]/g, '')) - parseFloat((a.price ?? '0').replace(/[^0-9.]/g, '')))
    return result
  }, [products, minRating, sortBy])

  const hasFilters = minRating > 0 || sortBy !== 'default'

  return (
    <div className="space-y-4">
      {/* Filter chips — scrollable on mobile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider flex-shrink-0">Filters</span>

        {/* Sort chips */}
        {[
          { value: 'default', label: 'All Products' },
          { value: 'rating', label: 'Top Rated' },
          { value: 'price-asc', label: 'Price ↑' },
          { value: 'price-desc', label: 'Price ↓' },
        ].map(opt => (
          <button key={opt.value}
            onClick={() => setSortBy(opt.value as typeof sortBy)}
            className={`flex-shrink-0 text-xs font-mono rounded-full px-3 py-1.5 border transition-colors ${
              sortBy === opt.value
                ? 'bg-primary text-surface border-primary'
                : 'border-outline-variant text-on-surface-variant hover:border-primary/50 hover:text-on-surface'
            }`}>
            {opt.label}
          </button>
        ))}

        {/* Rating filter chips */}
        {[
          { value: 4, label: '4+ ★' },
          { value: 3, label: '3+ ★' },
        ].map(opt => (
          <button key={opt.value}
            onClick={() => setMinRating(minRating === opt.value ? 0 : opt.value)}
            className={`flex-shrink-0 text-xs font-mono rounded-full px-3 py-1.5 border transition-colors ${
              minRating === opt.value
                ? 'bg-secondary/20 text-secondary border-secondary/40'
                : 'border-outline-variant text-on-surface-variant hover:border-secondary/30'
            }`}>
            {opt.label}
          </button>
        ))}

        {hasFilters && (
          <button
            onClick={() => { setMinRating(0); setSortBy('default') }}
            className="flex-shrink-0 text-xs text-tertiary hover:underline">
            Clear ×
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-on-surface-variant py-8 text-sm">No products match these filters.</p>
      ) : (
        <ComparisonTable products={filtered} />
      )}

      {aiVerdict && <AiVerdict verdict={aiVerdict} />}
    </div>
  )
}
