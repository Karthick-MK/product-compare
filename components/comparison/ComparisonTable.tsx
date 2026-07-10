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
  const colWidth = `${100 / (products.length + 1)}%`

  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-outline-variant rounded-lg overflow-hidden">
        <colgroup>
          <col style={{ width: '180px' }} />
          {products.map(p => <col key={p.id} style={{ width: colWidth }} />)}
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
  )
}
