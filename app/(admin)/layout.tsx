import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex">
      <aside className="w-56 bg-surface-low border-r border-outline-variant flex flex-col">
        <div className="p-4 border-b border-outline-variant">
          <span className="font-heading font-bold text-lg text-on-surface">CompareIt</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-high transition-colors">
            Dashboard
          </Link>
          <Link href="/comparisons/new" className="flex items-center gap-2 px-3 py-2 rounded text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-high transition-colors">
            + New Page
          </Link>
          <Link href="/categories" className="flex items-center gap-2 px-3 py-2 rounded text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-high transition-colors">
            Categories
          </Link>
        </nav>
        <div className="p-4 border-t border-outline-variant">
          <UserButton />
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}
