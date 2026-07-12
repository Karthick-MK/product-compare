export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-surface-high rounded ${className}`} />
  )
}

export function EditPageSkeleton() {
  return (
    <div className="max-w-5xl space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
      <div className="flex gap-3 pt-2 border-t border-outline-variant">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-40" />
      </div>
    </div>
  )
}
