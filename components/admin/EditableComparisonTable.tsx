'use client'

import { useState, useEffect } from 'react'
import { InlineEditCell } from './InlineEditCell'
import type { Product } from '@/types'

interface Props {
  products: Product[]
  comparisonId: string
  onSaved: () => void
}

export function EditableComparisonTable({ products, comparisonId, onSaved }: Props) {
  const [local, setLocal] = useState<Product[]>(products)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [newSpecKey, setNewSpecKey] = useState('')

  // Re-sync when parent reloads (e.g. after rating save)
  useEffect(() => { setLocal(products) }, [products])

  const specKeys = local[0]?.specs?.map(s => s.specKey) ?? []

  function addSpecRow() {
    const key = newSpecKey.trim()
    if (!key || specKeys.includes(key)) return
    const updated = local.map(p => ({
      ...p,
      specs: [...(p.specs ?? []), { id: `new-${key}-${p.id}`, productId: p.id, specKey: key, specValue: 'N/A' }],
    }))
    setLocal(updated)
    setNewSpecKey('')
    save(updated)
  }

  async function save(updated: Product[]) {
    setSaving(true)
    await fetch(`/api/comparisons/${comparisonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: updated }),
    })
    setSaving(false)
    setLastSaved(new Date().toLocaleTimeString())
    onSaved()
  }

  function updateSpec(productIdx: number, specKey: string, value: string) {
    const updated = local.map((p, i) => {
      if (i !== productIdx) return p
      return {
        ...p,
        specs: p.specs?.map(s => s.specKey === specKey ? { ...s, specValue: value } : s) ?? [],
      }
    })
    setLocal(updated)
    save(updated)
  }

  function updateProsCons(productIdx: number, pcId: string, text: string) {
    const updated = local.map((p, i) => {
      if (i !== productIdx) return p
      return {
        ...p,
        prosCons: p.prosCons?.map(pc => pc.id === pcId ? { ...pc, text } : pc) ?? [],
      }
    })
    setLocal(updated)
    save(updated)
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-end h-4">
        {saving && <p className="text-xs text-on-surface-variant">Saving...</p>}
        {!saving && lastSaved && <p className="text-xs text-secondary">✓ Saved at {lastSaved}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border border-outline-variant rounded-lg overflow-hidden text-sm">
          <colgroup>
            <col style={{ width: '160px' }} />
            {local.map(p => <col key={p.id} />)}
          </colgroup>
          <thead>
            <tr className="border-b border-outline-variant bg-surface-high">
              <th className="px-3 py-2 text-xs font-mono text-on-surface-variant text-left">SPEC</th>
              {local.map(p => (
                <th key={p.id} className="px-3 py-2 text-xs font-heading font-semibold text-on-surface border-l border-outline-variant">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Spec rows */}
            {specKeys.map(key => (
              <tr key={key} className="border-t border-outline-variant hover:bg-surface-high/20">
                <td className="px-3 py-2 text-xs font-mono text-on-surface-variant">{key}</td>
                {local.map((p, pi) => {
                  const spec = p.specs?.find(s => s.specKey === key)
                  return (
                    <td key={p.id} className="px-3 py-2 border-l border-outline-variant font-mono">
                      <InlineEditCell
                        value={spec?.specValue ?? '—'}
                        onSave={val => updateSpec(pi, key, val)}
                        className="text-xs text-on-surface"
                      />
                    </td>
                  )
                })}
              </tr>
            ))}

            {/* Pros row */}
            <tr className="border-t border-outline-variant bg-secondary/5">
              <td className="px-3 py-2 text-xs font-mono text-secondary">PROS</td>
              {local.map((p, pi) => (
                <td key={p.id} className="px-3 py-2 border-l border-outline-variant border-t-2 border-t-secondary">
                  <ul className="space-y-1">
                    {p.prosCons?.filter(pc => pc.type === 'pro').map(pc => (
                      <li key={pc.id} className="flex items-start gap-1">
                        <span className="text-secondary text-xs mt-0.5">✓</span>
                        <InlineEditCell
                          value={pc.text}
                          onSave={val => updateProsCons(pi, pc.id, val)}
                          className="text-xs text-on-surface"
                        />
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>

            {/* Cons row */}
            <tr className="border-t border-outline-variant bg-tertiary/5">
              <td className="px-3 py-2 text-xs font-mono text-tertiary">CONS</td>
              {local.map((p, pi) => (
                <td key={p.id} className="px-3 py-2 border-l border-outline-variant border-t-2 border-t-tertiary">
                  <ul className="space-y-1">
                    {p.prosCons?.filter(pc => pc.type === 'con').map(pc => (
                      <li key={pc.id} className="flex items-start gap-1">
                        <span className="text-tertiary text-xs mt-0.5">✕</span>
                        <InlineEditCell
                          value={pc.text}
                          onSave={val => updateProsCons(pi, pc.id, val)}
                          className="text-xs text-on-surface"
                        />
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>

            {/* Rating row */}
            <tr className="border-t border-outline-variant">
              <td className="px-3 py-2 text-xs font-mono text-on-surface-variant">RATING</td>
              {local.map(p => (
                <td key={p.id} className="px-3 py-2 border-l border-outline-variant">
                  {p.rating ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-yellow-400 text-sm">{'★'.repeat(Math.round(p.rating))}{'☆'.repeat(5 - Math.round(p.rating))}</span>
                      <span className="text-xs font-mono text-on-surface">{p.rating.toFixed(1)}</span>
                      {p.reviewCount && <span className="text-xs text-on-surface-variant">({p.reviewCount.toLocaleString()})</span>}
                    </div>
                  ) : (
                    <span className="text-xs text-on-surface-variant">No rating</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Price row */}
            <tr className="border-t border-outline-variant">
              <td className="px-3 py-2 text-xs font-mono text-on-surface-variant">PRICE</td>
              {local.map(p => (
                <td key={p.id} className="px-3 py-2 border-l border-outline-variant font-heading font-bold text-on-surface">
                  {p.price ?? '—'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Add custom spec row */}
      <div className="flex gap-2 items-center">
        <input
          value={newSpecKey}
          onChange={e => setNewSpecKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSpecRow()}
          placeholder="Add spec row (e.g. Warranty)"
          className="flex-1 bg-surface-low border border-outline-variant rounded px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
        />
        <button
          onClick={addSpecRow}
          disabled={!newSpecKey.trim()}
          className="text-xs font-mono text-primary border border-primary/40 rounded px-3 py-1.5 hover:bg-primary/10 disabled:opacity-40 transition-colors"
        >
          + Add Row
        </button>
      </div>
    </div>
  )
}
