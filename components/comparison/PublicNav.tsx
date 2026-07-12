import Link from 'next/link'

interface Props {
  title: string
}

export function PublicNav({ title }: Props) {
  return (
    <nav className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-4">
        <Link href="/browse" className="text-xs text-on-surface-variant hover:text-primary transition-colors flex-shrink-0">
          ← Browse
        </Link>
        <span className="text-outline-variant">|</span>
        <p className="text-sm font-heading font-semibold text-on-surface truncate">{title}</p>
        <Link href="/" className="ml-auto text-xs font-mono text-on-surface-variant hover:text-primary transition-colors flex-shrink-0">
          CompareIt
        </Link>
      </div>
    </nav>
  )
}
