import type { Product } from '@/types'

interface Props {
  products: Product[]
}

export function PriceRow({ products }: Props) {
  return (
    <tr className="border-t border-outline-variant">
      <td className="px-4 py-4 text-xs font-mono text-on-surface-variant uppercase tracking-wider sticky left-0 bg-surface shadow-[2px_0_6px_rgba(0,0,0,0.4)]">
        UNIT PRICE
      </td>
      {products.map(p => (
        <td key={p.id} className="px-4 py-4 text-center border-l border-outline-variant">
          <div className="space-y-2">
            <p className="font-heading font-bold text-lg text-on-surface">{p.price ?? '—'}</p>
            {p.affiliateUrl ? (
              <a
                href={p.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full border border-primary text-primary text-xs font-body font-medium rounded px-3 py-1.5 hover:bg-primary/10 transition-colors"
              >
                View Deal
              </a>
            ) : (
              <span className="text-xs text-on-surface-variant">No link</span>
            )}
          </div>
        </td>
      ))}
    </tr>
  )
}
