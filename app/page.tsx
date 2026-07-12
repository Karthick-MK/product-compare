import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <nav className="border-b border-outline-variant px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="font-heading font-bold text-xl text-on-surface">CompareIt</span>
        <div className="flex items-center gap-3">
          <Link href="/browse" className="text-sm font-body text-on-surface-variant hover:text-on-surface transition-colors">
            Browse
          </Link>
          <Link href="/dashboard" className="text-sm font-body text-primary border border-primary rounded px-4 py-1.5 hover:bg-primary/10 transition-colors">
            Dashboard →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="inline-block text-xs font-mono uppercase tracking-widest text-secondary border border-secondary/40 bg-secondary/10 rounded px-3 py-1 mb-6">
          AI-Powered
        </span>
        <h1 className="font-heading text-5xl font-bold text-on-surface leading-tight">
          Compare products.<br />Buy smarter.
        </h1>
        <p className="mt-5 text-on-surface-variant text-lg leading-relaxed max-w-xl mx-auto">
          Side-by-side product comparisons and curated top picks — powered by AI, enriched with real research.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="bg-primary text-surface font-body font-medium text-sm rounded px-6 py-3 hover:bg-primary/90 transition-colors"
          >
            Create a Comparison
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: '⚡',
            title: 'Paste links, done',
            desc: 'Add product URLs from any store — Amazon, Flipkart, Walmart. AI fetches specs and writes the comparison.',
          },
          {
            icon: '🎯',
            title: 'Your research, included',
            desc: 'Add your own notes and research. AI blends it with fetched data for a comparison that reflects real expertise.',
          },
          {
            icon: '💰',
            title: 'Earn with affiliate links',
            desc: 'Every "View Deal" button carries your affiliate link. Share your comparison pages and earn commission.',
          },
        ].map((f) => (
          <div key={f.title} className="bg-surface-low border border-outline-variant rounded-lg p-5">
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="font-heading font-semibold text-on-surface mb-2">{f.title}</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
