'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ProductEntryCard } from '@/components/admin/ProductEntryCard'
import { GenerateButton } from '@/components/admin/GenerateButton'
import { InlineEditCell } from '@/components/admin/InlineEditCell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Comparison, Product } from '@/types'

export default function EditComparisonPage() {
  const params = useParams<{ id: string }>()
  const [comparison, setComparison] = useState<Comparison | null>(null)
  const [products, setProducts] = useState<Partial<Product>[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/comparisons/${params.id}`)
    const { data } = await res.json()
    setComparison(data)
    setProducts(data?.products ?? [])
  }, [params.id])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    await fetch(`/api/comparisons/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products }),
    })
    setSaving(false)
  }

  async function togglePublish() {
    const res = await fetch(`/api/comparisons/${params.id}/publish`, { method: 'POST' })
    const { data } = await res.json()
    setComparison(prev => prev ? { ...prev, status: data.status } : prev)
  }

  function addProduct() {
    setProducts(prev => [...prev, { position: prev.length, url: '' }])
  }

  if (!comparison) return <div className="text-on-surface-variant p-8">Loading...</div>

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-on-surface">{comparison.title}</h1>
          <p className="text-sm text-on-surface-variant mt-1">{comparison.category?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge label={comparison.status} variant={comparison.status === 'published' ? 'success' : 'neutral'} />
          <Button variant="outline" size="sm" onClick={togglePublish}>
            {comparison.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
          {comparison.status === 'published' && (
            <a href={`/compare/${comparison.slug}`} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm">View Live →</Button>
            </a>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-mono text-on-surface-variant">PRODUCTS</h2>
        {products.map((p, i) => (
          <ProductEntryCard
            key={i}
            index={i}
            product={p}
            onChange={updated => setProducts(prev => prev.map((item, idx) => idx === i ? updated : item))}
            onRemove={() => setProducts(prev => prev.filter((_, idx) => idx !== i))}
          />
        ))}
        <Button variant="outline" size="sm" onClick={addProduct}>+ Add Product</Button>
      </section>

      <div className="flex items-center gap-3 pt-2 border-t border-outline-variant">
        <Button variant="outline" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <GenerateButton
          comparisonId={params.id}
          onGenerated={() => { save().then(load) }}
        />
      </div>

      {comparison.aiVerdict && (
        <section className="bg-surface-low border border-outline-variant rounded p-4 space-y-4">
          <h2 className="text-sm font-mono text-on-surface-variant">AI VERDICT</h2>
          <InlineEditCell
            value={comparison.aiVerdict}
            multiline
            onSave={async (val) => {
              await fetch(`/api/comparisons/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aiVerdict: val }),
              })
              setComparison(prev => prev ? { ...prev, aiVerdict: val } : prev)
            }}
            className="text-sm text-on-surface"
          />
        </section>
      )}
    </div>
  )
}
