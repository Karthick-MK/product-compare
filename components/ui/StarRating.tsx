interface Props {
  rating: number  // 0-5
  reviewCount?: number
}

export function StarRating({ rating, reviewCount }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className={`text-sm ${i <= Math.round(rating) ? 'text-yellow-400' : 'text-surface-bright'}`}>★</span>
        ))}
      </div>
      <span className="text-xs font-mono text-on-surface">{rating.toFixed(1)}</span>
      {reviewCount && <span className="text-xs text-on-surface-variant">({reviewCount.toLocaleString()})</span>}
    </div>
  )
}
