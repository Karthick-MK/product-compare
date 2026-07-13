import { SpecRows } from './SpecRows'
import { ProsConsRow } from './ProsConsRow'
import { PriceRow } from './PriceRow'
import { StarRating } from '@/components/ui/StarRating'
import type { Product } from '@/types'

interface Props {
  products: Product[]
}

export function ComparisonTable({ products }: Props) {
  const specKeys = products[0]?.specs?.map(s => s.specKey) ?? []

  return (
    // overflow-x-auto on ALL screen sizes — matches Stitch mobile design
    <div className="overflow-x-auto rounded-lg border border-outline-variant">
      <table className="w-full min-w-[480px] border-collapse">
        <colgroup>
          <col style={{ minWidth: '120px', width: '140px' }} />
          {products.map(p => <col key={p.id} style={{ minWidth: '140px' }} />)}
        </colgroup>

        {/* Product header row */}
        <thead>
          <tr className="border-b border-outline-variant">
            <th className="px-3 py-3 text-left">
              <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">
                Specifications
              </span>
            </th>
            {products.map((p) => (
              <th key={p.id} className="border-l border-outline-variant overflow-visible">
                <div className="flex flex-col items-center text-center p-3 gap-2">
                  {/* Badge placeholder — always same height */}
                  <div className="h-5 flex items-center justify-center">
                    {p.isTopPick && (
                      <span className="text-xs font-mono font-bold bg-primary/90 text-surface rounded px-1.5 py-0.5 uppercase tracking-wider whitespace-nowrap">
                        Top Pick
                      </span>
                    )}
                  </div>
                  {/* Image */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded bg-surface-high flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" />
                      : <span className="text-xs text-on-surface-variant">No img</span>}
                  </div>
                  {/* Name */}
                  <h3 className="font-heading font-semibold text-on-surface text-xs leading-tight max-w-[120px]">
                    {p.name}
                  </h3>
                  {/* Rating */}
                  {p.rating && (
                    <StarRating rating={p.rating} reviewCount={p.reviewCount ?? undefined} />
                  )}
                  {/* Price */}
                  {p.price && (
                    <p className="font-heading font-bold text-base text-on-surface">{p.price}</p>
                  )}
                  {/* View Deal */}
                  {p.affiliateUrl && (
                    <a href={p.affiliateUrl} target="_blank" rel="noopener noreferrer"
                      className="w-full text-center border border-primary text-primary text-xs font-body font-medium rounded px-2 py-1.5 hover:bg-primary/10 transition-colors whitespace-nowrap">
                      View Deal
                    </a>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Spec sections */}
        <tbody>
          {/* Section label */}
          {specKeys.length > 0 && (
            <tr className="bg-surface-high/50">
              <td colSpan={products.length + 1} className="px-3 py-2">
                <span className="text-xs font-mono text-on-surface-variant uppercase tracking-widest">
                  Technical Specifications
                </span>
              </td>
            </tr>
          )}

          <SpecRows specKeys={specKeys} products={products} />

          {/* Pros/cons section label */}
          <tr className="bg-surface-high/50">
            <td colSpan={products.length + 1} className="px-3 py-2">
              <span className="text-xs font-mono text-on-surface-variant uppercase tracking-widest">
                Advantages &amp; Limitations
              </span>
            </td>
          </tr>

          <ProsConsRow type="pro" products={products} />
          <ProsConsRow type="con" products={products} />

          {/* Rating row */}
          <tr className="border-t border-outline-variant">
            <td className="px-3 py-3 text-xs font-mono text-on-surface-variant uppercase tracking-wider">
              User Rating
            </td>
            {products.map(p => (
              <td key={p.id} className="px-3 py-3 text-center border-l border-outline-variant">
                {p.rating
                  ? <div className="flex justify-center"><StarRating rating={p.rating} reviewCount={p.reviewCount ?? undefined} /></div>
                  : <span className="text-xs text-on-surface-variant">—</span>}
              </td>
            ))}
          </tr>

          {/* Price row — repeated at bottom for easy access */}
          <PriceRow products={products} />
        </tbody>
      </table>
    </div>
  )
}
