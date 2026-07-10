import { ProductHeader } from './ProductHeader'
import { SpecRows } from './SpecRows'
import { ProsConsRow } from './ProsConsRow'
import { PriceRow } from './PriceRow'
import type { Product } from '@/types'

interface Props {
  products: Product[]
}

export function ComparisonTable({ products }: Props) {
  const specKeys = products[0]?.specs?.map(s => s.specKey) ?? []

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border border-outline-variant rounded-lg overflow-hidden">
          <colgroup>
            <col style={{ width: '180px' }} />
            {products.map(p => <col key={p.id} />)}
          </colgroup>
          <thead>
            <tr className="border-b border-outline-variant">
              <th className="px-4 py-2 text-xs font-mono text-on-surface-variant uppercase text-left">
                MODEL SPECIFICATIONS
              </th>
              {products.map((p, i) => (
                <th key={p.id} className="border-l border-outline-variant">
                  <ProductHeader product={p} isTopPick={i === 0} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SpecRows specKeys={specKeys} products={products} />
            <ProsConsRow type="pro" products={products} />
            <ProsConsRow type="con" products={products} />
            <PriceRow products={products} />
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="md:hidden space-y-4">
        {products.map((p, i) => (
          <div key={p.id} className="border border-outline-variant rounded-lg overflow-hidden">
            <div className="bg-surface-low p-4">
              <ProductHeader product={p} isTopPick={i === 0} />
            </div>
            <div className="divide-y divide-outline-variant">
              {specKeys.map(key => {
                const spec = p.specs?.find(s => s.specKey === key)
                return (
                  <div key={key} className="flex justify-between px-4 py-2.5">
                    <span className="text-xs font-mono text-on-surface-variant uppercase">{key}</span>
                    <span className="text-xs font-mono text-on-surface">{spec?.specValue ?? '—'}</span>
                  </div>
                )
              })}
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-mono text-secondary uppercase mb-1">Pros</p>
                <ul className="space-y-1">
                  {p.prosCons?.filter(pc => pc.type === 'pro').map((pc, j) => (
                    <li key={j} className="text-xs text-on-surface flex gap-1"><span className="text-secondary">✓</span>{pc.text}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-mono text-tertiary uppercase mb-1">Cons</p>
                <ul className="space-y-1">
                  {p.prosCons?.filter(pc => pc.type === 'con').map((pc, j) => (
                    <li key={j} className="text-xs text-on-surface flex gap-1"><span className="text-tertiary">✕</span>{pc.text}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="px-4 pb-4">
              <p className="font-heading font-bold text-xl text-on-surface mb-2">{p.price ?? '—'}</p>
              {p.affiliateUrl && (
                <a href={p.affiliateUrl} target="_blank" rel="noopener noreferrer"
                  className="block w-full text-center border border-primary text-primary text-sm font-medium rounded px-4 py-2 hover:bg-primary/10 transition-colors">
                  View Deal
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
