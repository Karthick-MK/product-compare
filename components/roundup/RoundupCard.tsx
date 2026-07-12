import { Badge } from '@/components/ui/Badge'
import type { Product } from '@/types'

interface Props {
  product: Product
  rank: number
  isTopPick?: boolean
}

export function RoundupCard({ product, rank, isTopPick }: Props) {
  const highlights = product.prosCons
    ?.filter(pc => pc.type === 'pro')
    .sort((a, b) => a.position - b.position)
    .slice(0, 3) ?? []

  return (
    <div className="bg-surface-low border border-outline-variant rounded-lg overflow-hidden flex flex-col">
      {/* Rank + badge */}
      <div className="flex items-center justify-between px-4 pt-4">
        <span className="font-mono text-2xl font-bold text-on-surface-variant">
          #{rank}
        </span>
        {isTopPick && <Badge label="Top Pick" variant="primary" />}
      </div>

      {/* Image */}
      <div className="flex justify-center px-4 py-3">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-28 h-28 object-contain rounded bg-surface-high"
          />
        ) : (
          <div className="w-28 h-28 rounded bg-surface-high flex items-center justify-center">
            <span className="text-xs text-on-surface-variant">No image</span>
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="font-heading font-semibold text-on-surface text-sm px-4 pb-2 leading-snug">
        {product.name}
      </h3>

      {/* Short description */}
      {product.shortDescription && (
        <p className="text-xs text-on-surface-variant px-4 pb-3 leading-relaxed flex-1">
          {product.shortDescription}
        </p>
      )}

      {/* Highlights */}
      {highlights.length > 0 && (
        <ul className="px-4 pb-3 space-y-1">
          {highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-on-surface">
              <span className="text-secondary flex-shrink-0 mt-0.5">✓</span>
              {h.text}
            </li>
          ))}
        </ul>
      )}

      {/* Price + CTA */}
      <div className="px-4 pb-4 mt-auto">
        {product.price && (
          <p className="font-heading font-bold text-lg text-on-surface mb-2">
            {product.price}
          </p>
        )}
        {product.affiliateUrl ? (
          <a
            href={product.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center border border-primary text-primary text-xs font-body font-medium rounded px-3 py-2 hover:bg-primary/10 transition-colors"
          >
            View Deal →
          </a>
        ) : (
          <div className="h-8" />
        )}
      </div>
    </div>
  )
}
