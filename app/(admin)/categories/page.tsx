'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import type { Category } from '@/types'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [keys, setKeys] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    const res = await fetch('/api/categories')
    const { data } = await res.json()
    setCategories(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const defaultSpecKeys = keys.split(',').map(k => k.trim()).filter(Boolean)
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, defaultSpecKeys }),
    })
    const { error: err } = await res.json()
    setLoading(false)
    if (err) { setError(err); return }
    setName('')
    setKeys('')
    load()
  }

  const system = categories.filter(c => !c.workspaceId)
  const custom = categories.filter(c => c.workspaceId)

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="font-heading text-2xl font-bold text-on-surface">Categories</h1>

      {/* System categories */}
      <section className="space-y-3">
        <h2 className="text-sm font-mono text-on-surface-variant">SYSTEM CATEGORIES</h2>
        <div className="space-y-2">
          {system.map(c => (
            <div key={c.id} className="bg-surface-low border border-outline-variant rounded p-3">
              <p className="text-sm font-heading font-semibold text-on-surface">{c.name}</p>
              <p className="text-xs text-on-surface-variant mt-1 font-mono">{c.defaultSpecKeys.join(', ')}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Custom categories */}
      {custom.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-mono text-on-surface-variant">YOUR CATEGORIES</h2>
          <div className="space-y-2">
            {custom.map(c => (
              <div key={c.id} className="bg-surface-low border border-primary/30 rounded p-3">
                <p className="text-sm font-heading font-semibold text-on-surface">{c.name}</p>
                <p className="text-xs text-on-surface-variant mt-1 font-mono">{c.defaultSpecKeys.join(', ')}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Add custom category */}
      <section className="space-y-3">
        <h2 className="text-sm font-mono text-on-surface-variant">ADD CUSTOM CATEGORY</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Category name (e.g. Protein Powder)"
            required
            className="w-full bg-surface-low border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
          />
          <input
            value={keys}
            onChange={e => setKeys(e.target.value)}
            placeholder="Spec keys, comma separated (e.g. Protein/Serving, Calories, Source)"
            required
            className="w-full bg-surface-low border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary"
          />
          {error && <p className="text-xs text-tertiary">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Category'}</Button>
        </form>
        <p className="text-xs text-on-surface-variant">Custom categories require Pro plan.</p>
      </section>
    </div>
  )
}
