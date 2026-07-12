import { Badge } from '@/components/ui/Badge'
import type { Product } from '@/types'

interface Props {
  product: Product
  isTopPick?: boolean
  isBestValue?: boolean
}

export function ProductHeader({ product, isTopPick, isBestValue }: Props) {
  return (
    <div className="flex flex-col items-center text-center p-4 gap-3">
      {/* Image with badge overlaid — no extra vertical space */}
      <div className="relative w-24 h-24">
        {(isTopPick || isBestValue) && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap">
            <Badge
              label={isTopPick ? 'Top Pick' : 'Best Value'}
              variant={isTopPick ? 'primary' : 'success'}
            />
          </div>
        )}
        <div className="w-24 h-24 rounded bg-surface-high flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
          ) : (
            <span className="text-xs text-on-surface-variant">No image</span>
          )}
        </div>
      </div>
      <h3 className="font-heading font-semibold text-on-surface text-sm leading-tight">{product.name}</h3>
    </div>
  )
}
