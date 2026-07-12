import { RoundupCard } from './RoundupCard'
import type { Product } from '@/types'

interface Props {
  products: Product[]
}

export function RoundupGrid({ products }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {products.map((product, i) => (
        <RoundupCard
          key={product.id}
          product={product}
          rank={i + 1}
          isTopPick={i === 0}
        />
      ))}
    </div>
  )
}
