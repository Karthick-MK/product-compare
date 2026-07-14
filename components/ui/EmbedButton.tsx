'use client'

import { useState } from 'react'

interface Props {
  slug: string
  title: string
  pageType: 'comparison' | 'roundup'
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://product-compare-chi.vercel.app'

export function EmbedButton({ slug, title, pageType }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const embedPath = pageType === 'roundup' ? 'list' : 'compare'
  const defaultHeight = pageType === 'roundup' ? 900 : 650
  const code = `<iframe\n  src="${BASE_URL}/embed/${embedPath}/${slug}"\n  width="100%"\n  height="${defaultHeight}"\n  frameborder="0"\n  style="border:none;border-radius:12px;"\n  title="${title}"\n></iframe>`

  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-mono border border-outline-variant text-on-surface-variant hover:border-primary/50 hover:text-on-surface rounded-full px-3 py-1.5 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
        Embed
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-80 bg-surface-low border border-outline-variant rounded-xl p-4 shadow-xl space-y-3">
          <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">Embed code</p>
          <pre className="text-xs text-on-surface bg-surface rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all border border-outline-variant">
            {code}
          </pre>
          <div className="flex items-center gap-2">
            <button
              onClick={copy}
              className="flex-1 text-xs font-mono bg-primary text-surface rounded-lg py-2 hover:bg-primary/90 transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy code'}
            </button>
            <a
              href={`${BASE_URL}/embed/${embedPath}/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono border border-outline-variant text-on-surface-variant hover:text-primary px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              Preview ↗
            </a>
          </div>
          <p className="text-xs text-on-surface-variant">
            Adjust <code className="text-primary">height</code> to fit. Paste in any HTML, WordPress, or Ghost site.
          </p>
        </div>
      )}
    </div>
  )
}
