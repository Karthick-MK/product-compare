'use client'

import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ToastProvider } from '@/components/ui/Toast'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/comparisons/new', label: '+ New Page', icon: null },
  { href: '/categories', label: 'Categories', icon: '⊞' },
]

function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-surface-low border-r border-outline-variant flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-outline-variant">
        <Link href="/" className="font-heading font-bold text-lg text-on-surface hover:text-primary transition-colors">
          CompareIt
        </Link>
        <p className="text-xs text-on-surface-variant mt-0.5">Admin</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/comparisons/new' && pathname.startsWith(item.href) && item.href !== '/dashboard') || pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-high'
              }`}>
              {item.icon && <span className="text-xs opacity-70">{item.icon}</span>}
              {item.label}
            </Link>
          )
        })}

        <div className="pt-3 mt-3 border-t border-outline-variant">
          <Link href="/browse" target="_blank"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-high transition-colors">
            <span className="text-xs opacity-70">↗</span>
            View public site
          </Link>
        </div>
      </nav>

      <div className="p-4 border-t border-outline-variant">
        <UserButton />
      </div>
    </aside>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface flex">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto min-h-screen">{children}</main>
      </div>
    </ToastProvider>
  )
}
