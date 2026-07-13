'use client'

import Link from 'next/link'

interface Props {
  title: string
  browseUrl?: string
}

export function PublicNav({ title, browseUrl = '/browse' }: Props) {
  return (
    <>
      {/* Top sticky nav */}
      <nav className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-3">
          <Link href={browseUrl} className="text-on-surface-variant hover:text-primary transition-colors flex-shrink-0 p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" />
            </svg>
          </Link>
          <p className="text-sm font-heading font-semibold text-on-surface truncate flex-1">{title}</p>
          <Link href="/" className="text-xs font-mono text-on-surface-variant hover:text-primary transition-colors flex-shrink-0">
            CompareIt
          </Link>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface/95 backdrop-blur-md border-t border-outline-variant">
        <div className="flex items-center justify-around h-14 px-2">
          <Link href={browseUrl} className="flex flex-col items-center gap-0.5 text-on-surface-variant hover:text-primary transition-colors px-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" />
            </svg>
            <span className="text-xs font-mono">Browse</span>
          </Link>
          <Link href="/" className="flex flex-col items-center gap-0.5 text-on-surface-variant hover:text-primary transition-colors px-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-xs font-mono">Home</span>
          </Link>
          <a href="#" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
            className="flex flex-col items-center gap-0.5 text-on-surface-variant hover:text-primary transition-colors px-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="20" y2="12" /><line x1="12" y1="18" x2="20" y2="18" />
            </svg>
            <span className="text-xs font-mono">Filter</span>
          </a>
        </div>
      </div>

      {/* Bottom nav spacer on mobile */}
      <div className="h-14 md:hidden" />
    </>
  )
}
