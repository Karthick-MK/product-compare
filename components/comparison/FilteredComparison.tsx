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
  const [highlightBest, setHighlightBest] = useState(false)

  const filtered = useMemo(() => {
    let result = [...products]

    if (minRating > 0) {
      result = result.filter(p => p.rating && p.rating >= minRating)
    }

    if (sortBy === 'rating') {
      result = result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    } else if (sortBy === 'price-asc') {
      result = result.sort((a, b) => {
        const pa = parseFloat((a.price ?? '0').replace(/[^0-9.]/g, ''))
        const pb = parseFloat((b.price ?? '0').replace(/[^0-9.]/g, ''))
        return pa - pb
      })
    } else if (sortBy === 'price-desc') {
      result = result.sort((a, b) => {
        const pa = parseFloat((a.price ?? '0').replace(/[^0-9.]/g, ''))
        const pb = parseFloat((b.price ?? '0').replace(/[^0-9.]/g, ''))
        return pb - pa
      })
    }

    return result
  }, [products, minRating, sortBy])

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-surface-low border border-outline-variant rounded-lg">
        <span className="text-xs font-mono text-on-surface-variant">FILTERS</span>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="bg-surface border border-outline-variant rounded px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-primary"
        >
          <option value="default">Default order</option>
          <option value="rating">Highest rated</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>

        <select
          value={minRating}
          onChange={e => setMinRating(Number(e.target.value))}
          className="bg-surface border border-outline-variant rounded px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-primary"
        >
          <option value={0}>Any rating</option>
          <option value={4}>4+ stars</option>
          <option value={3}>3+ stars</option>
        </select>

        <label className="flex items-center gap-1.5 text-xs text-on-surface-variant cursor-pointer">
          <input
            type="checkbox"
            checked={highlightBest}
            onChange={e => setHighlightBest(e.target.checked)}
            className="accent-primary"
          />
          Highlight best value
        </label>

        {(minRating > 0 || sortBy !== 'default') && (
          <button
            onClick={() => { setMinRating(0); setSortBy('default') }}
            className="text-xs text-tertiary hover:underline ml-auto"
          >
            Clear filters
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
