import { Sidebar } from '@/components/admin/Sidebar'
import { ToastProvider } from '@/components/ui/Toast'

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
