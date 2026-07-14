import type { Metadata } from 'next'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://product-compare-chi.vercel.app'),
  title: { default: 'CompareIt', template: '%s | CompareIt' },
  description: 'AI-powered product comparisons and top-pick roundups.',
  openGraph: { siteName: 'CompareIt', type: 'website' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
