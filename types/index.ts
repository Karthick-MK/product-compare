export type Plan = 'admin' | 'free' | 'pro'
export type ComparisonStatus = 'draft' | 'published'
export type ProsConsType = 'pro' | 'con'
export type ImageSource = 'fetched' | 'uploaded'

export interface Workspace {
  id: string
  ownerUserId: string
  slug: string
  plan: Plan
  customDomain: string | null
  brandingEnabled: boolean
  createdAt: Date
}

export interface Category {
  id: string
  workspaceId: string | null  // null = system category
  name: string
  defaultSpecKeys: string[]
}

export interface Comparison {
  id: string
  workspaceId: string
  categoryId: string
  title: string
  slug: string
  introText: string | null
  status: ComparisonStatus
  aiVerdict: string | null
  publishedAt: Date | null
  createdAt: Date
  category?: Category
  products?: Product[]
}

export interface Product {
  id: string
  comparisonId: string
  position: number
  url: string
  affiliateUrl: string | null
  name: string
  imageUrl: string | null
  imageSource: ImageSource
  price: string | null
  userNotes: string | null
  specs?: Spec[]
  prosCons?: ProsCons[]
}

export interface Spec {
  id: string
  productId: string
  specKey: string
  specValue: string
}

export interface ProsCons {
  id: string
  productId: string
  type: ProsConsType
  text: string
  position: number
}

export interface FetchedProductData {
  name: string
  imageUrl: string | null
  price: string | null
  description: string
  rawMarkdown: string
}

export interface GeneratedComparison {
  specKeys: string[]
  products: Array<{
    productId: string
    specs: Record<string, string>
    pros: string[]
    cons: string[]
  }>
  verdict: string
}

export interface UsageLimits {
  maxComparisons: number | null  // null = unlimited
  maxAiCallsPerMonth: number | null
  maxProductsPerComparison: number
}
