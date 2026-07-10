interface BadgeProps {
  label: string
  variant?: 'primary' | 'success' | 'error' | 'neutral'
}

export function Badge({ label, variant = 'primary' }: BadgeProps) {
  const variants = {
    primary: 'bg-primary/20 text-primary border-primary/40',
    success: 'bg-secondary/20 text-secondary border-secondary/40',
    error: 'bg-tertiary/20 text-tertiary border-tertiary/40',
    neutral: 'bg-surface-high text-on-surface-variant border-outline-variant',
  }
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-mono font-bold rounded border tracking-widest uppercase ${variants[variant]}`}>
      {label}
    </span>
  )
}
