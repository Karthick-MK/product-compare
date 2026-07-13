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

      {/* Mobile: horizontal | Desktop: vertical */}
      <div className="flex md:flex-col">

        {/* Image — left on mobile (w-28), full-width on desktop */}
        <div className="relative flex-shrink-0 w-28 md:w-full h-28 md:h-36 bg-surface-high overflow-hidden">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name}
              className="w-full h-full object-contain p-2" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs text-on-surface-variant">No image</span>
            </div>
          )}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <span className="font-mono text-xs font-bold bg-surface/80 text-on-surface rounded px-1.5 py-0.5">
              #{rank}
            </span>
            {isTopPick && <Badge label="Top Pick" variant="primary" />}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 flex flex-col gap-1.5 min-w-0">
          <h3 className="font-heading font-semibold text-on-surface text-sm leading-snug line-clamp-2">
            {product.name}
          </h3>

          {product.rating && (
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-xs">
                {'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}
              </span>
              <span className="text-xs font-mono text-on-surface">{product.rating.toFixed(1)}</span>
              {product.reviewCount && (
                <span className="text-xs text-on-surface-variant">({product.reviewCount.toLocaleString()})</span>
              )}
            </div>
          )}

          {/* Description — desktop only */}
          {product.shortDescription && (
            <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2 hidden md:block">
              {product.shortDescription}
            </p>
          )}

          {/* Highlights — desktop only in content area */}
          {highlights.length > 0 && (
            <ul className="space-y-0.5 hidden md:block">
              {highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-1 text-xs text-on-surface">
                  <span className="text-secondary flex-shrink-0">✓</span>
                  {h.text}
                </li>
              ))}
            </ul>
          )}

          {/* Price + CTA */}
          <div className="flex items-center gap-2 mt-auto pt-1">
            {product.price && (
              <p className="font-heading font-bold text-sm md:text-base text-on-surface flex-shrink-0">
                {product.price}
              </p>
            )}
            {product.affiliateUrl ? (
              <a href={product.affiliateUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-center border border-primary text-primary text-xs font-body font-medium rounded px-2 py-1.5 hover:bg-primary/10 transition-colors whitespace-nowrap">
                View Deal →
              </a>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </div>
      </div>

      {/* Highlights — mobile only, below the horizontal layout */}
      {highlights.length > 0 && (
        <ul className="md:hidden border-t border-outline-variant px-3 py-2 space-y-1">
          {highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-1 text-xs text-on-surface">
              <span className="text-secondary flex-shrink-0">✓</span>
              {h.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
