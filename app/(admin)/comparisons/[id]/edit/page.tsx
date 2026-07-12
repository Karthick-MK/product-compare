'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ProductEntryCard } from '@/components/admin/ProductEntryCard'
import { GenerateButton } from '@/components/admin/GenerateButton'
import { InlineEditCell } from '@/components/admin/InlineEditCell'
import { EditableComparisonTable } from '@/components/admin/EditableComparisonTable'
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
    const res = await fetch(`/api/comparisons/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products }),
    })
    setSaving(false)
    if (res.ok) await load()
  }

  async function togglePublish() {
    const res = await fetch(`/api/comparisons/${params.id}/publish`, { method: 'POST' })
    const { data } = await res.json()
    setComparison(prev => prev ? { ...prev, status: data.status } : prev)
  }

  function addProduct() {
    setProducts(prev => [...prev, { position: prev.length, url: '' }])
  }

  // Products with specs loaded (after generation)
  const generatedProducts = (comparison?.products ?? []) as Product[]
  const hasGenerated = generatedProducts.some(p => p.specs && p.specs.length > 0)

  // Public page URL based on page type
  const publicUrl = comparison?.pageType === 'roundup'
    ? `/list/${comparison.slug}`
    : `/compare/${comparison?.slug}`

  if (!comparison) return <div className="text-on-surface-variant p-8">Loading...</div>

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
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
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm">View Live →</Button>
            </a>
          )}
        </div>
      </div>

      {/* Page description */}
      <section className="space-y-2">
        <h2 className="text-sm font-mono text-on-surface-variant">PAGE DESCRIPTION</h2>
        <textarea
          defaultValue={comparison.introText ?? ''}
          onBlur={async (e) => {
            await fetch(`/api/comparisons/${params.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ introText: e.target.value }),
            })
          }}
          placeholder="Describe this comparison page — shown below the title on the public page"
          rows={2}
          className="w-full bg-surface-low border border-outline-variant rounded px-3 py-2 text-sm text-on-surface resize-none focus:outline-none focus:border-primary"
        />
      </section>

      {/* Products */}
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

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-outline-variant">
        <Button variant="outline" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <GenerateButton
          comparisonId={params.id}
          onGenerated={async () => { await save(); await load() }}
        />
      </div>

      {/* Generated preview — visible after generation, before publish */}
      {hasGenerated && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-mono text-on-surface-variant">PREVIEW</h2>
            <span className="text-xs text-on-surface-variant">(review before publishing)</span>
          </div>
          <EditableComparisonTable
            products={generatedProducts}
            comparisonId={params.id}
            onSaved={load}
          />

          {/* AI Verdict inline edit */}
          {comparison.aiVerdict && (
            <div className="bg-surface-low border border-outline-variant rounded p-4 space-y-2">
              <h3 className="text-xs font-mono text-on-surface-variant">AI VERDICT</h3>
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
            </div>
          )}

          {/* Sticky publish bar */}
          <div className="sticky bottom-4 flex items-center gap-3 p-4 bg-surface-high border border-outline-variant rounded-lg shadow-lg">
            <Badge label={comparison.status} variant={comparison.status === 'published' ? 'success' : 'neutral'} />
            <p className="text-sm text-on-surface-variant flex-1">
              {comparison.status === 'draft' ? 'Edits saved. Publish when ready.' : 'Live. Edits save automatically.'}
            </p>
            {comparison.status === 'published' && (
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm">View Live →</Button>
              </a>
            )}
            {comparison.status === 'published' && (
              <button onClick={togglePublish} className="text-xs text-on-surface-variant hover:text-tertiary transition-colors">
                Unpublish
              </button>
            )}
            <Button onClick={togglePublish}>
              {comparison.status === 'published' ? 'Re-publish' : 'Publish →'}
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
