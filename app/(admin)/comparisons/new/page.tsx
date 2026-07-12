'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { Category } from '@/types'

export default function NewComparisonPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [slug, setSlug] = useState('')
  const [pageType, setPageType] = useState<'comparison' | 'roundup'>('comparison')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(({ data }) => {
      setCategories(data ?? [])
      if (data?.length) setCategoryId(data[0].id)
    })
  }, [])

  // Auto-generate slug from title
  useEffect(() => {
    setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }, [title])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/comparisons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, categoryId, slug, pageType }),
    })
    const { data, error: err } = await res.json()
    setLoading(false)
    if (err) { setError(err); return }
    router.push(`/comparisons/${data.id}/edit`)
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-heading text-2xl font-bold text-on-surface mb-6">New Comparison</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-mono text-on-surface-variant mb-1">TITLE</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Best Adjustable Dumbbells 2024"
            required
            className="w-full bg-surface-low border border-outline-variant rounded px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-mono text-on-surface-variant mb-1">CATEGORY</label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            required
            className="w-full bg-surface-low border border-outline-variant rounded px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-primary"
          >
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-mono text-on-surface-variant mb-1">SLUG</label>
          <input
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="best-adjustable-dumbbells-2024"
            required
            className="w-full bg-surface-low border border-outline-variant rounded px-3 py-2 text-on-surface text-sm font-mono focus:outline-none focus:border-primary"
          />
          <p className="text-xs text-on-surface-variant mt-1">/compare/{slug || '...'}</p>
        </div>
        <div>
          <label className="block text-sm font-mono text-on-surface-variant mb-2">TYPE</label>
          <div className="flex gap-3">
            {(['comparison', 'roundup'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setPageType(type)}
                className={`px-4 py-2 rounded text-sm font-mono border transition-colors ${
                  pageType === type
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
                }`}
              >
                {type === 'comparison' ? 'Comparison' : 'Roundup / Top-N'}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-tertiary">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating...' : 'Create & Add Products →'}
        </Button>
      </form>
    </div>
  )
}
