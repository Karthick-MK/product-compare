'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { Product, FetchedProductData } from '@/types'

interface Props {
  index: number
  product: Partial<Product>
  onChange: (updated: Partial<Product>) => void
  onRemove: () => void
}

export function ProductEntryCard({ index, product, onChange, onRemove }: Props) {
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')

  async function fetchUrl() {
    if (!product.url) return
    setFetching(true)
    setFetchError('')
    const res = await fetch('/api/products/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: product.url }),
    })
    const { data, error } = await res.json()
    setFetching(false)
    if (error) { setFetchError(error); return }
    const fetched: FetchedProductData = data
    onChange({
      ...product,
      name: fetched.name,
      imageUrl: fetched.imageUrl ?? undefined,
      price: fetched.price ?? undefined,
    })
  }

  return (
    <div className="bg-surface-low border border-outline-variant rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-on-surface-variant">PRODUCT {index + 1}</span>
        <button onClick={onRemove} className="text-xs text-tertiary hover:text-tertiary/80">Remove</button>
      </div>

      <div className="flex gap-2">
        <input
          value={product.url ?? ''}
          onChange={e => onChange({ ...product, url: e.target.value })}
          placeholder="https://amazon.in/dp/..."
          className="flex-1 bg-surface border border-outline-variant rounded px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary"
        />
        <Button size="sm" variant="outline" onClick={fetchUrl} disabled={fetching || !product.url}>
          {fetching ? '...' : 'Fetch'}
        </Button>
      </div>

      {fetchError && <p className="text-xs text-tertiary">{fetchError}</p>}

      {/* Name + price always visible (not conditional) */}
      <div className="grid grid-cols-[80px_1fr] gap-3 items-start">
        <div className="space-y-1">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name ?? 'product'} className="w-20 h-20 object-contain rounded bg-surface-high" />
          ) : (
            <div className="w-20 h-20 rounded bg-surface-high flex items-center justify-center text-xs text-on-surface-variant text-center leading-tight p-1">
              No image
            </div>
          )}
          {/* Manual image URL */}
          <input
            value={product.imageUrl ?? ''}
            onChange={e => onChange({ ...product, imageUrl: e.target.value })}
            placeholder="Paste image URL"
            className="w-20 bg-surface border border-outline-variant rounded px-1.5 py-1 text-xs text-on-surface focus:outline-none focus:border-primary"
          />
        </div>
        <div className="space-y-2">
          <input
            value={product.name ?? ''}
            onChange={e => onChange({ ...product, name: e.target.value })}
            placeholder="Product name"
            className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-sm text-on-surface focus:outline-none focus:border-primary"
          />
          <input
            value={product.price ?? ''}
            onChange={e => onChange({ ...product, price: e.target.value })}
            placeholder="₹2,499"
            className="w-32 bg-surface border border-outline-variant rounded px-2 py-1 text-sm text-on-surface font-mono focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={product.affiliateUrl ?? ''}
          onChange={e => onChange({ ...product, affiliateUrl: e.target.value })}
          placeholder="Affiliate URL (your tracked link)"
          className="flex-1 bg-surface border border-outline-variant rounded px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary"
        />
        <input
          type="number"
          min="0" max="5" step="0.1"
          value={product.rating ?? ''}
          onChange={e => onChange({ ...product, rating: e.target.value ? parseFloat(e.target.value) : null })}
          placeholder="Rating"
          className="w-20 bg-surface border border-outline-variant rounded px-2 py-1.5 text-sm text-on-surface font-mono focus:outline-none focus:border-primary"
        />
        <input
          type="number"
          min="0"
          value={product.reviewCount ?? ''}
          onChange={e => onChange({ ...product, reviewCount: e.target.value ? parseInt(e.target.value) : null })}
          placeholder="Reviews"
          className="w-24 bg-surface border border-outline-variant rounded px-2 py-1.5 text-sm text-on-surface font-mono focus:outline-none focus:border-primary"
        />
      </div>

      <textarea
        value={product.userNotes ?? ''}
        onChange={e => onChange({ ...product, userNotes: e.target.value })}
        placeholder="Your research notes for this product (Gemini output, your experience, etc.)"
        rows={3}
        className="w-full bg-surface border border-outline-variant rounded px-3 py-1.5 text-sm text-on-surface resize-none focus:outline-none focus:border-primary"
      />
    </div>
  )
}
