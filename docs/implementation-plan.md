# Product Comparison Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI-powered product comparison website where the owner pastes product URLs, AI generates a beautiful category-specific comparison page, and visitors click affiliate links.

**Architecture:** Next.js 14 App Router with Clerk auth, PostgreSQL via Prisma, multi-tenant from day 1 (each user gets a workspace). Product data is fetched via Jina AI from any URL; Claude generates structured comparison content (specs, pros/cons, verdict). Admin edits inline, publishes, earns affiliate commissions.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Prisma + PostgreSQL, Clerk, Jina AI, Anthropic SDK (claude-sonnet-4-6), Vercel Blob, Vercel

---

## Global Constraints

- Node.js ≥ 20
- Next.js 14 App Router (no Pages Router)
- TypeScript strict mode — no `any`
- All DB access via Prisma client, never raw SQL
- All AI calls via `@anthropic-ai/sdk` using model `claude-sonnet-4-6`
- Jina AI base URL: `https://r.jina.ai/`
- Design tokens from `docs/design-spec.md` — dark `#0b1326` background, Electric Blue `#adc6ff` primary
- Fonts: Hanken Grotesk (headings), Inter (body), JetBrains Mono (specs/labels)
- All API routes return `{ data, error }` shape
- Plan limits checked before every AI generation call
- `admin` plan = unlimited (no limit checks)

---

## File Map

```
app/
  (auth)/sign-in/[[...sign-in]]/page.tsx     # Clerk sign-in
  (auth)/sign-up/[[...sign-up]]/page.tsx     # Clerk sign-up
  (admin)/layout.tsx                          # Admin shell with sidebar nav
  (admin)/dashboard/page.tsx                 # List all comparisons
  (admin)/comparisons/new/page.tsx           # Create comparison
  (admin)/comparisons/[id]/edit/page.tsx     # Edit comparison + generate
  (admin)/categories/page.tsx                # Manage categories
  compare/[slug]/page.tsx                    # Public comparison page
  api/
    products/fetch/route.ts                  # POST: Jina fetch product URL
    comparisons/route.ts                     # GET list, POST create
    comparisons/[id]/route.ts                # GET, PUT, DELETE
    comparisons/[id]/generate/route.ts       # POST: trigger AI generation
    comparisons/[id]/publish/route.ts        # POST: toggle publish
    categories/route.ts                      # GET list, POST create
    workspace/route.ts                       # GET current workspace
  layout.tsx                                 # Root layout with fonts
  globals.css                                # Tailwind base + CSS vars

components/
  comparison/
    ComparisonTable.tsx                      # Public matrix table (outer)
    ProductHeader.tsx                        # Product image + name + badge
    SpecRows.tsx                             # All spec rows
    ProsConsRow.tsx                          # Pros/Cons row pair
    RatingRow.tsx                            # Star rating row
    PriceRow.tsx                             # Price + View Deal button
    AiVerdict.tsx                            # AI verdict section below table
    FilterSidebar.tsx                        # Price/rating filters
  admin/
    ComparisonForm.tsx                       # Title/category/slug fields
    ProductEntryCard.tsx                     # URL input + fetched data per product
    InlineEditCell.tsx                       # Click-to-edit cell (used in edit page)
    GenerateButton.tsx                       # Generate button + loading state
  ui/
    Badge.tsx                                # TOP PICK, BEST VALUE chips
    StarRating.tsx                           # Star display component
    Button.tsx                               # Primary/outline button

lib/
  db/prisma.ts                              # Prisma client singleton
  ai/
    generate-comparison.ts                   # Claude API call + response parse
    prompts.ts                               # Prompt builder function
  extraction/
    jina.ts                                  # Jina AI product fetcher
  usage/
    limits.ts                                # Plan limit checker + incrementer
  workspace/
    current.ts                               # Get current workspace from Clerk session

prisma/
  schema.prisma
  seed.ts                                    # System categories + admin workspace

types/index.ts                              # All shared TypeScript types
middleware.ts                               # Clerk auth middleware
```

---

## Task 1: Project Setup + Design System

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`, `types/index.ts`

**Interfaces:**
- Produces: running Next.js dev server with dark theme applied, all fonts loaded

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd /Users/karthick/Documents/proj/product-compare
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*"
```

Accept all defaults. When prompted about existing files, keep them.

- [ ] **Step 2: Install dependencies**

```bash
npm install @prisma/client @clerk/nextjs @anthropic-ai/sdk @vercel/blob zod
npm install -D prisma
```

- [ ] **Step 3: Configure Tailwind with design tokens**

Replace `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0b1326',
          dim: '#0b1326',
          bright: '#31394d',
          low: '#131b2e',
          base: '#171f33',
          high: '#222a3d',
          highest: '#2d3449',
        },
        primary: '#adc6ff',
        'primary-container': '#4d8eff',
        secondary: '#4edea3',
        'secondary-container': '#00a572',
        tertiary: '#ffb2b7',
        'on-surface': '#dae2fd',
        'on-surface-variant': '#c2c6d6',
        outline: '#8c909f',
        'outline-variant': '#424754',
      },
      fontFamily: {
        heading: ['Hanken Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 4: Set up globals.css**

Replace `app/globals.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@500;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0b1326;
  --foreground: #dae2fd;
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: 'Inter', sans-serif;
}
```

- [ ] **Step 5: Set up root layout**

Replace `app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'

export const metadata: Metadata = {
  title: 'CompareIt',
  description: 'AI-powered product comparison',
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
```

- [ ] **Step 6: Define shared TypeScript types**

Create `types/index.ts`:

```typescript
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
```

- [ ] **Step 7: Create .env.local**

Create `.env.local`:

```
DATABASE_URL="postgresql://localhost:5432/product_compare"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
ANTHROPIC_API_KEY=sk-ant-...
BLOB_READ_WRITE_TOKEN=...
ADMIN_CLERK_USER_ID=user_...
```

(Fill actual values. `ADMIN_CLERK_USER_ID` is your Clerk user ID — used in seed to create admin workspace.)

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000, dark background visible.

- [ ] **Step 9: Commit**

```bash
git init
git add .
git commit -m "feat: project setup, design system, shared types"
```

---

## Task 2: Database Schema + Migrations

**Files:**
- Create: `prisma/schema.prisma`, `prisma/seed.ts`
- Modify: `package.json` (add seed script)

**Interfaces:**
- Produces: `db` (Prisma client) imported from `@/lib/db/prisma`, all tables created, system categories seeded

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write schema**

Replace `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Workspace {
  id              String        @id @default(cuid())
  ownerUserId     String        @unique
  slug            String        @unique
  plan            String        @default("free")
  customDomain    String?
  brandingEnabled Boolean       @default(true)
  createdAt       DateTime      @default(now())
  comparisons     Comparison[]
  categories      Category[]
  usage           Usage[]
}

model Usage {
  id              String    @id @default(cuid())
  workspaceId     String
  month           String    // "2026-07" format
  aiCalls         Int       @default(0)
  comparisonCount Int       @default(0)
  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, month])
}

model Category {
  id              String       @id @default(cuid())
  workspaceId     String?      // null = system category
  name            String
  defaultSpecKeys String[]
  workspace       Workspace?   @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  comparisons     Comparison[]
}

model Comparison {
  id          String            @id @default(cuid())
  workspaceId String
  categoryId  String
  title       String
  slug        String
  introText   String?
  status      String            @default("draft")
  aiVerdict   String?
  publishedAt DateTime?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  workspace   Workspace         @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  category    Category          @relation(fields: [categoryId], references: [id])
  products    Product[]

  @@unique([workspaceId, slug])
}

model Product {
  id           String      @id @default(cuid())
  comparisonId String
  position     Int
  url          String
  affiliateUrl String?
  name         String
  imageUrl     String?
  imageSource  String      @default("fetched")
  price        String?
  userNotes    String?
  fetchedRaw   Json?
  comparison   Comparison  @relation(fields: [comparisonId], references: [id], onDelete: Cascade)
  specs        Spec[]
  prosCons     ProsCons[]
}

model Spec {
  id        String  @id @default(cuid())
  productId String
  specKey   String
  specValue String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model ProsCons {
  id        String  @id @default(cuid())
  productId String
  type      String  // "pro" or "con"
  text      String
  position  Int
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 3: Create Prisma client singleton**

Create `lib/db/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 4: Write seed script**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SYSTEM_CATEGORIES = [
  {
    name: 'Fitness Equipment',
    defaultSpecKeys: ['Weight Range', 'Increments', 'Material', 'Dimensions', 'Max Load'],
  },
  {
    name: 'Protein Supplements',
    defaultSpecKeys: ['Protein / Serving', 'Calories', 'Primary Source', 'Amino Profile', 'Servings'],
  },
  {
    name: 'Mobile Phones',
    defaultSpecKeys: ['Display', 'Processor', 'RAM', 'Storage', 'Battery', 'Camera', 'OS'],
  },
  {
    name: 'Laptops',
    defaultSpecKeys: ['Processor', 'RAM', 'Storage', 'Display', 'Battery Life', 'Weight', 'OS'],
  },
  {
    name: 'Headphones',
    defaultSpecKeys: ['Driver Size', 'Frequency Response', 'Noise Cancellation', 'Battery', 'Connectivity'],
  },
  {
    name: 'General',
    defaultSpecKeys: ['Key Feature 1', 'Key Feature 2', 'Key Feature 3', 'Material', 'Warranty'],
  },
]

async function main() {
  // Upsert system categories (workspaceId = null)
  for (const cat of SYSTEM_CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.name }, // won't match, always creates
      update: {},
      create: {
        name: cat.name,
        defaultSpecKeys: cat.defaultSpecKeys,
        workspaceId: null,
      },
    })
  }

  // Create admin workspace if ADMIN_CLERK_USER_ID is set
  const adminUserId = process.env.ADMIN_CLERK_USER_ID
  if (adminUserId) {
    await prisma.workspace.upsert({
      where: { ownerUserId: adminUserId },
      update: { plan: 'admin' },
      create: {
        ownerUserId: adminUserId,
        slug: 'admin',
        plan: 'admin',
        brandingEnabled: false,
      },
    })
    console.log('Admin workspace created/updated')
  }

  console.log('Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 5: Add seed script to package.json**

Add to `package.json` under `"scripts"`:

```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

And add `ts-node`:

```bash
npm install -D ts-node
```

- [ ] **Step 6: Run migration and seed**

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

Expected: migration file created, 6 system categories inserted, admin workspace created.

- [ ] **Step 7: Verify with Prisma Studio**

```bash
npx prisma studio
```

Expected: browser opens, `Category` table shows 6 rows.

- [ ] **Step 8: Commit**

```bash
git add prisma/ lib/db/ package.json
git commit -m "feat: database schema, migrations, seed data"
```

---

## Task 3: Auth + Workspace Middleware

**Files:**
- Create: `middleware.ts`, `lib/workspace/current.ts`, `app/(auth)/sign-in/[[...sign-in]]/page.tsx`, `app/(auth)/sign-up/[[...sign-up]]/page.tsx`, `app/api/workspace/route.ts`

**Interfaces:**
- Consumes: `db` from `@/lib/db/prisma`, `Workspace` type from `@/types`
- Produces: `getCurrentWorkspace(): Promise<Workspace>` — called in all admin API routes and server components

- [ ] **Step 1: Create Clerk middleware**

Create `middleware.ts` at project root:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/compare(.*)',
  '/api/webhook(.*)',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
```

- [ ] **Step 2: Create sign-in page**

Create `app/(auth)/sign-in/[[...sign-in]]/page.tsx`:

```typescript
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <SignIn />
    </div>
  )
}
```

- [ ] **Step 3: Create sign-up page**

Create `app/(auth)/sign-up/[[...sign-up]]/page.tsx`:

```typescript
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <SignUp />
    </div>
  )
}
```

- [ ] **Step 4: Create workspace helper**

Create `lib/workspace/current.ts`:

```typescript
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db/prisma'
import type { Workspace } from '@/types'

export async function getCurrentWorkspace(): Promise<Workspace> {
  const { userId } = auth()
  if (!userId) throw new Error('Unauthorized')

  let workspace = await db.workspace.findUnique({
    where: { ownerUserId: userId },
  })

  if (!workspace) {
    // Auto-create workspace on first login
    workspace = await db.workspace.create({
      data: {
        ownerUserId: userId,
        slug: userId.slice(-8), // temp slug, user can change later
        plan: 'free',
        brandingEnabled: true,
      },
    })
  }

  return workspace as Workspace
}
```

- [ ] **Step 5: Create workspace API route**

Create `app/api/workspace/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getCurrentWorkspace } from '@/lib/workspace/current'

export async function GET() {
  try {
    const workspace = await getCurrentWorkspace()
    return NextResponse.json({ data: workspace })
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

- [ ] **Step 6: Test auth flow**

```bash
npm run dev
```

Open http://localhost:3000/dashboard — should redirect to /sign-in.
Sign up with a test account — should redirect to /dashboard (404 for now is fine).
Hit GET /api/workspace — should return workspace object.

- [ ] **Step 7: Commit**

```bash
git add middleware.ts lib/workspace/ app/\(auth\)/ app/api/workspace/
git commit -m "feat: clerk auth, auto workspace creation on first login"
```

---

## Task 4: Product Data Extraction (Jina AI)

**Files:**
- Create: `lib/extraction/jina.ts`, `app/api/products/fetch/route.ts`

**Interfaces:**
- Produces: `fetchProductFromUrl(url: string): Promise<FetchedProductData>` — called by the admin UI when user pastes a product URL

- [ ] **Step 1: Write Jina extraction function**

Create `lib/extraction/jina.ts`:

```typescript
import type { FetchedProductData } from '@/types'

export async function fetchProductFromUrl(url: string): Promise<FetchedProductData> {
  const jinaUrl = `https://r.jina.ai/${url}`

  const response = await fetch(jinaUrl, {
    headers: {
      Accept: 'application/json',
      'X-Return-Format': 'markdown',
    },
  })

  if (!response.ok) {
    throw new Error(`Jina fetch failed: ${response.status}`)
  }

  const markdown: string = await response.text()

  // Extract title: first H1 or first line
  const titleMatch = markdown.match(/^#\s+(.+)$/m)
  const name = titleMatch ? titleMatch[1].trim() : 'Unknown Product'

  // Extract first image URL from markdown
  const imageMatch = markdown.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/)
  const imageUrl = imageMatch ? imageMatch[1] : null

  // Extract price pattern (handles ₹, $, £, etc.)
  const priceMatch = markdown.match(/[₹$£€][\d,]+(?:\.\d{2})?/)
  const price = priceMatch ? priceMatch[0] : null

  // Use full markdown as raw text for AI context
  const description = markdown.slice(0, 3000) // cap at 3k chars for prompt

  return { name, imageUrl, price, description, rawMarkdown: markdown }
}
```

- [ ] **Step 2: Create API route**

Create `app/api/products/fetch/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchProductFromUrl } from '@/lib/extraction/jina'
import { getCurrentWorkspace } from '@/lib/workspace/current'

const schema = z.object({ url: z.string().url() })

export async function POST(req: NextRequest) {
  try {
    await getCurrentWorkspace() // auth check
    const body = await req.json()
    const { url } = schema.parse(body)
    const data = await fetchProductFromUrl(url)
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fetch failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
```

- [ ] **Step 3: Test with real URL**

```bash
curl -X POST http://localhost:3000/api/products/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.amazon.in/dp/B07XXXXXXXX"}'
```

Expected: `{ data: { name: "...", imageUrl: "...", price: "₹...", description: "..." } }`

(Use any real Amazon product URL for the test.)

- [ ] **Step 4: Commit**

```bash
git add lib/extraction/ app/api/products/
git commit -m "feat: Jina AI product URL extraction"
```

---

## Task 5: Usage Limits

**Files:**
- Create: `lib/usage/limits.ts`

**Interfaces:**
- Produces:
  - `checkAiGenerationLimit(workspaceId: string, plan: string): Promise<void>` — throws if limit exceeded
  - `incrementAiUsage(workspaceId: string): Promise<void>` — call after successful generation
  - `checkComparisonLimit(workspaceId: string, plan: string): Promise<void>` — throws if limit exceeded
  - `incrementComparisonCount(workspaceId: string): Promise<void>` — call after comparison created

- [ ] **Step 1: Write limits module**

Create `lib/usage/limits.ts`:

```typescript
import { db } from '@/lib/db/prisma'
import type { Plan, UsageLimits } from '@/types'

const PLAN_LIMITS: Record<Plan, UsageLimits> = {
  admin: { maxComparisons: null, maxAiCallsPerMonth: null, maxProductsPerComparison: 6 },
  free:  { maxComparisons: 3,    maxAiCallsPerMonth: 10,   maxProductsPerComparison: 3 },
  pro:   { maxComparisons: null, maxAiCallsPerMonth: 100,  maxProductsPerComparison: 6 },
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function getOrCreateUsage(workspaceId: string) {
  const month = currentMonth()
  return db.usage.upsert({
    where: { workspaceId_month: { workspaceId, month } },
    create: { workspaceId, month },
    update: {},
  })
}

export async function checkAiGenerationLimit(workspaceId: string, plan: string): Promise<void> {
  const limits = PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.free
  if (limits.maxAiCallsPerMonth === null) return // unlimited

  const usage = await getOrCreateUsage(workspaceId)
  if (usage.aiCalls >= limits.maxAiCallsPerMonth) {
    throw new Error(`AI generation limit reached (${limits.maxAiCallsPerMonth}/month). Upgrade to Pro.`)
  }
}

export async function incrementAiUsage(workspaceId: string): Promise<void> {
  const month = currentMonth()
  await db.usage.upsert({
    where: { workspaceId_month: { workspaceId, month } },
    create: { workspaceId, month, aiCalls: 1 },
    update: { aiCalls: { increment: 1 } },
  })
}

export async function checkComparisonLimit(workspaceId: string, plan: string): Promise<void> {
  const limits = PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.free
  if (limits.maxComparisons === null) return

  const count = await db.comparison.count({ where: { workspaceId } })
  if (count >= limits.maxComparisons) {
    throw new Error(`Comparison limit reached (${limits.maxComparisons} max on free plan). Upgrade to Pro.`)
  }
}

export async function incrementComparisonCount(workspaceId: string): Promise<void> {
  const month = currentMonth()
  await db.usage.upsert({
    where: { workspaceId_month: { workspaceId, month } },
    create: { workspaceId, month, comparisonCount: 1 },
    update: { comparisonCount: { increment: 1 } },
  })
}

export function getMaxProducts(plan: string): number {
  return (PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.free).maxProductsPerComparison
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/usage/
git commit -m "feat: plan-based usage limits (free/pro/admin)"
```

---

## Task 6: AI Comparison Generation

**Files:**
- Create: `lib/ai/prompts.ts`, `lib/ai/generate-comparison.ts`, `app/api/comparisons/[id]/generate/route.ts`

**Interfaces:**
- Consumes: `checkAiGenerationLimit`, `incrementAiUsage` from `@/lib/usage/limits`, `getCurrentWorkspace` from `@/lib/workspace/current`, `db` from `@/lib/db/prisma`
- Produces: `generateComparison(comparisonId: string, workspaceId: string, plan: string): Promise<GeneratedComparison>` — writes specs/prosCons/verdict to DB

- [ ] **Step 1: Write prompt builder**

Create `lib/ai/prompts.ts`:

```typescript
import type { Product, Category } from '@/types'

export function buildComparisonPrompt(
  category: Category,
  products: Product[],
  overallNotes?: string | null
): string {
  const productDescriptions = products
    .map((p, i) => `
Product ${i + 1}: ${p.name}
Price: ${p.price ?? 'Unknown'}
URL: ${p.url}
${p.userNotes ? `Owner's research notes:\n${p.userNotes}` : ''}
Fetched page content (first 2000 chars):
${JSON.stringify(p.fetchedRaw ?? '').slice(0, 2000)}
`)
    .join('\n---\n')

  return `You are a product comparison expert. Generate a structured comparison for the category "${category.name}".

Default spec keys for this category: ${category.defaultSpecKeys.join(', ')}
You may use these or choose more relevant ones based on the actual products. Use 4-7 spec keys total.

${overallNotes ? `Overall comparison context from the owner:\n${overallNotes}\n` : ''}

PRODUCTS TO COMPARE:
${productDescriptions}

Respond ONLY with a JSON object matching this exact schema (no markdown, no explanation):
{
  "specKeys": ["Spec Name 1", "Spec Name 2", ...],
  "products": [
    {
      "productIndex": 0,
      "specs": {"Spec Name 1": "value", "Spec Name 2": "value"},
      "pros": ["Pro 1", "Pro 2", "Pro 3"],
      "cons": ["Con 1", "Con 2"]
    }
  ],
  "verdict": "2-3 sentence AI verdict comparing products and giving a recommendation"
}

Rules:
- specs: fill every specKey for every product; use "N/A" if unknown
- pros/cons: 2-4 items each, specific and factual
- verdict: direct recommendation with brief reasoning
- productIndex: 0-based, matches order of products above`
}
```

- [ ] **Step 2: Write AI generation function**

Create `lib/ai/generate-comparison.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/db/prisma'
import { buildComparisonPrompt } from './prompts'
import type { GeneratedComparison } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateComparison(comparisonId: string): Promise<GeneratedComparison> {
  const comparison = await db.comparison.findUniqueOrThrow({
    where: { id: comparisonId },
    include: { category: true, products: { orderBy: { position: 'asc' } } },
  })

  const prompt = buildComparisonPrompt(
    comparison.category as any,
    comparison.products as any,
    comparison.introText
  )

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const generated: GeneratedComparison = JSON.parse(text)

  // Persist to DB: clear existing specs/prosCons, write new ones
  await db.$transaction(async (tx) => {
    for (const genProduct of generated.products) {
      const product = comparison.products[genProduct.productIndex]
      if (!product) continue

      // Clear old specs and pros/cons
      await tx.spec.deleteMany({ where: { productId: product.id } })
      await tx.prosCons.deleteMany({ where: { productId: product.id } })

      // Write new specs
      await tx.spec.createMany({
        data: generated.specKeys.map((key) => ({
          productId: product.id,
          specKey: key,
          specValue: genProduct.specs[key] ?? 'N/A',
        })),
      })

      // Write pros
      await tx.prosCons.createMany({
        data: genProduct.pros.map((text, i) => ({
          productId: product.id,
          type: 'pro',
          text,
          position: i,
        })),
      })

      // Write cons
      await tx.prosCons.createMany({
        data: genProduct.cons.map((text, i) => ({
          productId: product.id,
          type: 'con',
          text,
          position: i,
        })),
      })
    }

    // Save verdict
    await tx.comparison.update({
      where: { id: comparisonId },
      data: { aiVerdict: generated.verdict },
    })
  })

  return generated
}
```

- [ ] **Step 3: Create generate API route**

Create `app/api/comparisons/[id]/generate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentWorkspace } from '@/lib/workspace/current'
import { checkAiGenerationLimit, incrementAiUsage } from '@/lib/usage/limits'
import { generateComparison } from '@/lib/ai/generate-comparison'
import { db } from '@/lib/db/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspace = await getCurrentWorkspace()

    // Verify comparison belongs to this workspace
    const comparison = await db.comparison.findFirst({
      where: { id: params.id, workspaceId: workspace.id },
    })
    if (!comparison) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await checkAiGenerationLimit(workspace.id, workspace.plan)
    const result = await generateComparison(params.id)
    await incrementAiUsage(workspace.id)

    return NextResponse.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/ai/ app/api/comparisons/
git commit -m "feat: AI comparison generation via Claude, usage limit enforcement"
```

---

## Task 7: Comparison CRUD API

**Files:**
- Create: `app/api/comparisons/route.ts`, `app/api/comparisons/[id]/route.ts`, `app/api/comparisons/[id]/publish/route.ts`, `app/api/categories/route.ts`

**Interfaces:**
- Consumes: `db`, `getCurrentWorkspace`, `checkComparisonLimit`, `incrementComparisonCount`, `getMaxProducts`
- Produces: REST endpoints consumed by admin UI in Task 8

- [ ] **Step 1: Comparisons list + create**

Create `app/api/comparisons/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db/prisma'
import { getCurrentWorkspace } from '@/lib/workspace/current'
import { checkComparisonLimit, incrementComparisonCount } from '@/lib/usage/limits'

const createSchema = z.object({
  title: z.string().min(3).max(200),
  categoryId: z.string(),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
  introText: z.string().optional(),
})

export async function GET() {
  try {
    const workspace = await getCurrentWorkspace()
    const comparisons = await db.comparison.findMany({
      where: { workspaceId: workspace.id },
      include: { category: true, products: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: comparisons })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspace = await getCurrentWorkspace()
    await checkComparisonLimit(workspace.id, workspace.plan)

    const body = await req.json()
    const input = createSchema.parse(body)

    const comparison = await db.comparison.create({
      data: { ...input, workspaceId: workspace.id, status: 'draft' },
      include: { category: true },
    })

    await incrementComparisonCount(workspace.id)
    return NextResponse.json({ data: comparison }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
```

- [ ] **Step 2: Comparison get + update + delete**

Create `app/api/comparisons/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db/prisma'
import { getCurrentWorkspace } from '@/lib/workspace/current'

const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  introText: z.string().optional(),
  aiVerdict: z.string().optional(),
  products: z.array(z.object({
    id: z.string().optional(),        // existing product
    position: z.number(),
    url: z.string().url(),
    affiliateUrl: z.string().url().nullable().optional(),
    name: z.string(),
    imageUrl: z.string().nullable().optional(),
    price: z.string().nullable().optional(),
    userNotes: z.string().nullable().optional(),
    fetchedRaw: z.any().optional(),
    specs: z.array(z.object({ specKey: z.string(), specValue: z.string() })).optional(),
    prosCons: z.array(z.object({ type: z.enum(['pro', 'con']), text: z.string(), position: z.number() })).optional(),
  })).optional(),
})

async function getComparison(id: string, workspaceId: string) {
  return db.comparison.findFirst({
    where: { id, workspaceId },
    include: {
      category: true,
      products: {
        orderBy: { position: 'asc' },
        include: { specs: true, prosCons: { orderBy: { position: 'asc' } } },
      },
    },
  })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspace = await getCurrentWorkspace()
    const comparison = await getComparison(params.id, workspace.id)
    if (!comparison) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: comparison })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspace = await getCurrentWorkspace()
    const existing = await getComparison(params.id, workspace.id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const input = updateSchema.parse(body)
    const { products, ...comparisonFields } = input

    await db.$transaction(async (tx) => {
      if (Object.keys(comparisonFields).length > 0) {
        await tx.comparison.update({ where: { id: params.id }, data: comparisonFields })
      }

      if (products) {
        // Delete products not in update
        const keepIds = products.filter(p => p.id).map(p => p.id as string)
        await tx.product.deleteMany({
          where: { comparisonId: params.id, id: { notIn: keepIds } },
        })

        for (const p of products) {
          const productData = {
            position: p.position, url: p.url, affiliateUrl: p.affiliateUrl ?? null,
            name: p.name, imageUrl: p.imageUrl ?? null, price: p.price ?? null,
            userNotes: p.userNotes ?? null, fetchedRaw: p.fetchedRaw ?? undefined,
          }

          let productId = p.id
          if (productId) {
            await tx.product.update({ where: { id: productId }, data: productData })
          } else {
            const created = await tx.product.create({
              data: { ...productData, comparisonId: params.id },
            })
            productId = created.id
          }

          if (p.specs) {
            await tx.spec.deleteMany({ where: { productId } })
            await tx.spec.createMany({
              data: p.specs.map(s => ({ productId: productId!, specKey: s.specKey, specValue: s.specValue })),
            })
          }
          if (p.prosCons) {
            await tx.prosCons.deleteMany({ where: { productId } })
            await tx.prosCons.createMany({
              data: p.prosCons.map(pc => ({ productId: productId!, type: pc.type, text: pc.text, position: pc.position })),
            })
          }
        }
      }
    })

    const updated = await getComparison(params.id, workspace.id)
    return NextResponse.json({ data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspace = await getCurrentWorkspace()
    const existing = await getComparison(params.id, workspace.id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await db.comparison.delete({ where: { id: params.id } })
    return NextResponse.json({ data: { deleted: true } })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

- [ ] **Step 3: Publish toggle**

Create `app/api/comparisons/[id]/publish/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/prisma'
import { getCurrentWorkspace } from '@/lib/workspace/current'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspace = await getCurrentWorkspace()
    const existing = await db.comparison.findFirst({
      where: { id: params.id, workspaceId: workspace.id },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const newStatus = existing.status === 'published' ? 'draft' : 'published'
    const updated = await db.comparison.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        publishedAt: newStatus === 'published' ? new Date() : null,
      },
    })
    return NextResponse.json({ data: updated })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

- [ ] **Step 4: Categories API**

Create `app/api/categories/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db/prisma'
import { getCurrentWorkspace } from '@/lib/workspace/current'

const createSchema = z.object({
  name: z.string().min(2).max(100),
  defaultSpecKeys: z.array(z.string()).min(1).max(10),
})

export async function GET() {
  try {
    const workspace = await getCurrentWorkspace()
    const categories = await db.category.findMany({
      where: { OR: [{ workspaceId: null }, { workspaceId: workspace.id }] },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ data: categories })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspace = await getCurrentWorkspace()
    if (workspace.plan === 'free') {
      return NextResponse.json({ error: 'Custom categories require Pro plan' }, { status: 403 })
    }
    const body = await req.json()
    const input = createSchema.parse(body)
    const category = await db.category.create({
      data: { ...input, workspaceId: workspace.id },
    })
    return NextResponse.json({ data: category }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/comparisons/ app/api/categories/
git commit -m "feat: comparison and category CRUD API endpoints"
```

---

## Task 8: Admin UI — Dashboard + Create Comparison

**Files:**
- Create: `app/(admin)/layout.tsx`, `app/(admin)/dashboard/page.tsx`, `app/(admin)/comparisons/new/page.tsx`, `components/ui/Button.tsx`, `components/ui/Badge.tsx`

**Interfaces:**
- Consumes: all API routes from Task 7
- Produces: working admin dashboard, create comparison form

- [ ] **Step 1: Create UI components**

Create `components/ui/Button.tsx`:

```typescript
import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const base = 'font-body font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' }
  const variants = {
    primary: 'bg-primary text-surface hover:bg-primary/90',
    outline: 'border border-primary text-primary hover:bg-primary/10',
    ghost: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-high',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
```

Create `components/ui/Badge.tsx`:

```typescript
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
```

- [ ] **Step 2: Admin layout**

Create `app/(admin)/layout.tsx`:

```typescript
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
            New Comparison
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
```

- [ ] **Step 3: Dashboard page**

Create `app/(admin)/dashboard/page.tsx`:

```typescript
import Link from 'next/link'
import { db } from '@/lib/db/prisma'
import { getCurrentWorkspace } from '@/lib/workspace/current'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace()
  const comparisons = await db.comparison.findMany({
    where: { workspaceId: workspace.id },
    include: { category: true, products: { select: { id: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-on-surface">Comparisons</h1>
        <Link href="/comparisons/new">
          <Button>+ New Comparison</Button>
        </Link>
      </div>

      {comparisons.length === 0 ? (
        <div className="text-center py-20 text-on-surface-variant">
          <p className="text-lg">No comparisons yet.</p>
          <Link href="/comparisons/new" className="text-primary hover:underline mt-2 block">Create your first one</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {comparisons.map((c) => (
            <div key={c.id} className="bg-surface-low border border-outline-variant rounded p-4 flex items-center justify-between">
              <div>
                <h2 className="font-heading font-semibold text-on-surface">{c.title}</h2>
                <p className="text-sm text-on-surface-variant mt-0.5">
                  {c.category.name} · {c.products.length} products
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge label={c.status} variant={c.status === 'published' ? 'success' : 'neutral'} />
                <Link href={`/comparisons/${c.id}/edit`}>
                  <Button variant="outline" size="sm">Edit</Button>
                </Link>
                {c.status === 'published' && (
                  <Link href={`/compare/${c.slug}`} target="_blank">
                    <Button variant="ghost" size="sm">View →</Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create comparison page**

Create `app/(admin)/comparisons/new/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { Category } from '@/types'

export default function NewComparisonPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(({ data }) => {
      setCategories(data ?? [])
      if (data?.length) setCategoryId(data[0].id)
    })
  }, [])

  // Auto-generate slug from title
  useEffect(() => {
    setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }, [title])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/comparisons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, categoryId, slug }),
    })
    const { data, error: err } = await res.json()
    setLoading(false)
    if (err) { setError(err); return }
    router.push(`/comparisons/${data.id}/edit`)
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-heading text-2xl font-bold text-on-surface mb-6">New Comparison</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-mono text-on-surface-variant mb-1">TITLE</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Best Adjustable Dumbbells 2024"
            required
            className="w-full bg-surface-low border border-outline-variant rounded px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-mono text-on-surface-variant mb-1">CATEGORY</label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            required
            className="w-full bg-surface-low border border-outline-variant rounded px-3 py-2 text-on-surface text-sm focus:outline-none focus:border-primary"
          >
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-mono text-on-surface-variant mb-1">SLUG</label>
          <input
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="best-adjustable-dumbbells-2024"
            required
            className="w-full bg-surface-low border border-outline-variant rounded px-3 py-2 text-on-surface text-sm font-mono focus:outline-none focus:border-primary"
          />
          <p className="text-xs text-on-surface-variant mt-1">/compare/{slug || '...'}</p>
        </div>
        {error && <p className="text-sm text-tertiary">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating...' : 'Create & Add Products →'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Test admin flow**

```bash
npm run dev
```

1. Sign in, navigate to /dashboard
2. Click "New Comparison"
3. Fill title "Test Dumbbells", pick "Fitness Equipment", submit
4. Should redirect to `/comparisons/{id}/edit` (404 for now)

- [ ] **Step 6: Commit**

```bash
git add app/\(admin\)/ components/ui/
git commit -m "feat: admin dashboard, create comparison form, UI components"
```

---

## Task 9: Admin UI — Product Entry + AI Generation

**Files:**
- Create: `app/(admin)/comparisons/[id]/edit/page.tsx`, `components/admin/ProductEntryCard.tsx`, `components/admin/GenerateButton.tsx`, `components/admin/InlineEditCell.tsx`

**Interfaces:**
- Consumes: `GET /api/comparisons/[id]`, `POST /api/products/fetch`, `POST /api/comparisons/[id]/generate`, `PUT /api/comparisons/[id]`, `POST /api/comparisons/[id]/publish`
- Produces: full comparison editor — add products, fetch data, generate AI content, edit inline, publish

- [ ] **Step 1: ProductEntryCard component**

Create `components/admin/ProductEntryCard.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { Product, FetchedProductData } from '@/types'

interface Props {
  index: number
  product: Partial<Product>
  onChange: (updated: Partial<Product>) => void
  onRemove: () => void
}

export function ProductEntryCard({ index, product, onChange, onRemove }: Props) {
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')

  async function fetchUrl() {
    if (!product.url) return
    setFetching(true)
    setFetchError('')
    const res = await fetch('/api/products/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: product.url }),
    })
    const { data, error } = await res.json()
    setFetching(false)
    if (error) { setFetchError(error); return }
    const fetched: FetchedProductData = data
    onChange({
      ...product,
      name: fetched.name,
      imageUrl: fetched.imageUrl ?? undefined,
      price: fetched.price ?? undefined,
      fetchedRaw: { description: fetched.description },
    })
  }

  return (
    <div className="bg-surface-low border border-outline-variant rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-on-surface-variant">PRODUCT {index + 1}</span>
        <button onClick={onRemove} className="text-xs text-tertiary hover:text-tertiary/80">Remove</button>
      </div>

      <div className="flex gap-2">
        <input
          value={product.url ?? ''}
          onChange={e => onChange({ ...product, url: e.target.value })}
          placeholder="https://amazon.in/dp/..."
          className="flex-1 bg-surface border border-outline-variant rounded px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary"
        />
        <Button size="sm" variant="outline" onClick={fetchUrl} disabled={fetching || !product.url}>
          {fetching ? '...' : 'Fetch'}
        </Button>
      </div>

      {fetchError && <p className="text-xs text-tertiary">{fetchError}</p>}

      {product.name && (
        <div className="grid grid-cols-[80px_1fr] gap-3 items-start">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-20 h-20 object-contain rounded bg-surface-high" />
          ) : (
            <div className="w-20 h-20 rounded bg-surface-high flex items-center justify-center text-xs text-on-surface-variant">No image</div>
          )}
          <div className="space-y-2">
            <input
              value={product.name ?? ''}
              onChange={e => onChange({ ...product, name: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded px-2 py-1 text-sm text-on-surface focus:outline-none focus:border-primary"
            />
            <input
              value={product.price ?? ''}
              onChange={e => onChange({ ...product, price: e.target.value })}
              placeholder="₹2,499"
              className="w-32 bg-surface border border-outline-variant rounded px-2 py-1 text-sm text-on-surface font-mono focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      <input
        value={product.affiliateUrl ?? ''}
        onChange={e => onChange({ ...product, affiliateUrl: e.target.value })}
        placeholder="Affiliate URL (your tracked link)"
        className="w-full bg-surface border border-outline-variant rounded px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary"
      />

      <textarea
        value={product.userNotes ?? ''}
        onChange={e => onChange({ ...product, userNotes: e.target.value })}
        placeholder="Your research notes for this product (Gemini output, your experience, etc.)"
        rows={3}
        className="w-full bg-surface border border-outline-variant rounded px-3 py-1.5 text-sm text-on-surface resize-none focus:outline-none focus:border-primary"
      />
    </div>
  )
}
```

- [ ] **Step 2: GenerateButton component**

Create `components/admin/GenerateButton.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface Props {
  comparisonId: string
  onGenerated: () => void
}

export function GenerateButton({ comparisonId, onGenerated }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/comparisons/${comparisonId}/generate`, { method: 'POST' })
    const { error: err } = await res.json()
    setLoading(false)
    if (err) { setError(err); return }
    onGenerated()
  }

  return (
    <div>
      <Button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : '✦ Generate Comparison'}
      </Button>
      {error && <p className="text-xs text-tertiary mt-1">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: InlineEditCell component**

Create `components/admin/InlineEditCell.tsx`:

```typescript
'use client'

import { useState } from 'react'

interface Props {
  value: string
  onSave: (value: string) => void
  className?: string
  multiline?: boolean
}

export function InlineEditCell({ value, onSave, className = '', multiline = false }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function handleBlur() {
    setEditing(false)
    onSave(draft)
  }

  if (editing) {
    return multiline ? (
      <textarea
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        className={`bg-surface-high border border-primary rounded px-2 py-1 text-sm text-on-surface w-full resize-none focus:outline-none ${className}`}
        rows={3}
      />
    ) : (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => e.key === 'Enter' && handleBlur()}
        className={`bg-surface-high border border-primary rounded px-2 py-1 text-sm text-on-surface w-full focus:outline-none ${className}`}
      />
    )
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true) }}
      className={`cursor-pointer hover:bg-surface-high rounded px-1 transition-colors ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-on-surface-variant italic text-xs">click to edit</span>}
    </span>
  )
}
```

- [ ] **Step 4: Edit comparison page**

Create `app/(admin)/comparisons/[id]/edit/page.tsx`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProductEntryCard } from '@/components/admin/ProductEntryCard'
import { GenerateButton } from '@/components/admin/GenerateButton'
import { InlineEditCell } from '@/components/admin/InlineEditCell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Comparison, Product } from '@/types'

export default function EditComparisonPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [comparison, setComparison] = useState<Comparison | null>(null)
  const [products, setProducts] = useState<Partial<Product>[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/comparisons/${params.id}`)
    const { data } = await res.json()
    setComparison(data)
    setProducts(data?.products ?? [])
  }, [params.id])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    await fetch(`/api/comparisons/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products }),
    })
    setSaving(false)
  }

  async function togglePublish() {
    const res = await fetch(`/api/comparisons/${params.id}/publish`, { method: 'POST' })
    const { data } = await res.json()
    setComparison(prev => prev ? { ...prev, status: data.status } : prev)
  }

  function addProduct() {
    setProducts(prev => [...prev, { position: prev.length, url: '' }])
  }

  if (!comparison) return <div className="text-on-surface-variant">Loading...</div>

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-on-surface">{comparison.title}</h1>
          <p className="text-sm text-on-surface-variant mt-1">{comparison.category?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge label={comparison.status} variant={comparison.status === 'published' ? 'success' : 'neutral'} />
          <Button variant="outline" size="sm" onClick={togglePublish}>
            {comparison.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
          {comparison.status === 'published' && (
            <a href={`/compare/${comparison.slug}`} target="_blank">
              <Button variant="ghost" size="sm">View Live →</Button>
            </a>
          )}
        </div>
      </div>

      {/* Products */}
      <section className="space-y-3">
        <h2 className="text-sm font-mono text-on-surface-variant">PRODUCTS</h2>
        {products.map((p, i) => (
          <ProductEntryCard
            key={i}
            index={i}
            product={p}
            onChange={updated => setProducts(prev => prev.map((item, idx) => idx === i ? updated : item))}
            onRemove={() => setProducts(prev => prev.filter((_, idx) => idx !== i))}
          />
        ))}
        <Button variant="outline" size="sm" onClick={addProduct}>+ Add Product</Button>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-outline-variant">
        <Button variant="outline" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <GenerateButton
          comparisonId={params.id}
          onGenerated={() => { save().then(load) }}
        />
      </div>

      {/* Generated preview */}
      {comparison.aiVerdict && (
        <section className="bg-surface-low border border-outline-variant rounded p-4 space-y-4">
          <h2 className="text-sm font-mono text-on-surface-variant">AI VERDICT</h2>
          <InlineEditCell
            value={comparison.aiVerdict}
            multiline
            onSave={async (val) => {
              await fetch(`/api/comparisons/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aiVerdict: val }),
              })
              setComparison(prev => prev ? { ...prev, aiVerdict: val } : prev)
            }}
            className="text-sm text-on-surface"
          />
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Test full admin flow**

```bash
npm run dev
```

1. Go to /dashboard → New Comparison → fill form → submit
2. On edit page: add product URL → click Fetch → verify name/image/price populated
3. Fill affiliate URL + personal notes for 2-3 products
4. Click "Save" → verify saved via GET /api/comparisons/[id]
5. Click "Generate Comparison" → wait for Claude → verify AI Verdict appears below

- [ ] **Step 6: Commit**

```bash
git add app/\(admin\)/comparisons/ components/admin/
git commit -m "feat: product entry UI, AI generation trigger, inline editor"
```

---

## Task 10: Public Comparison Page

**Files:**
- Create: `app/compare/[slug]/page.tsx`, `components/comparison/ComparisonTable.tsx`, `components/comparison/ProductHeader.tsx`, `components/comparison/SpecRows.tsx`, `components/comparison/ProsConsRow.tsx`, `components/comparison/RatingRow.tsx`, `components/comparison/PriceRow.tsx`, `components/comparison/AiVerdict.tsx`, `components/ui/StarRating.tsx`

**Interfaces:**
- Consumes: DB (server component) — comparison with products, specs, prosCons
- Produces: publicly accessible comparison page at `/compare/[slug]`

- [ ] **Step 1: StarRating component**

Create `components/ui/StarRating.tsx`:

```typescript
interface Props {
  rating: number  // 0-5
  reviewCount?: number
}

export function StarRating({ rating, reviewCount }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className={`text-sm ${i <= Math.round(rating) ? 'text-yellow-400' : 'text-surface-bright'}`}>★</span>
        ))}
      </div>
      <span className="text-xs font-mono text-on-surface">{rating.toFixed(1)}</span>
      {reviewCount && <span className="text-xs text-on-surface-variant">({reviewCount.toLocaleString()})</span>}
    </div>
  )
}
```

- [ ] **Step 2: ProductHeader component**

Create `components/comparison/ProductHeader.tsx`:

```typescript
import { Badge } from '@/components/ui/Badge'
import type { Product } from '@/types'

interface Props {
  product: Product
  isTopPick?: boolean
  isBestValue?: boolean
}

export function ProductHeader({ product, isTopPick, isBestValue }: Props) {
  return (
    <div className="flex flex-col items-center text-center p-4 gap-3">
      {(isTopPick || isBestValue) && (
        <Badge label={isTopPick ? 'Top Pick' : 'Best Value'} variant={isTopPick ? 'primary' : 'success'} />
      )}
      <div className="w-24 h-24 rounded bg-surface-high flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
        ) : (
          <span className="text-xs text-on-surface-variant">No image</span>
        )}
      </div>
      <h3 className="font-heading font-semibold text-on-surface text-sm leading-tight">{product.name}</h3>
    </div>
  )
}
```

- [ ] **Step 3: SpecRows component**

Create `components/comparison/SpecRows.tsx`:

```typescript
import type { Product } from '@/types'

interface Props {
  specKeys: string[]
  products: Product[]
}

export function SpecRows({ specKeys, products }: Props) {
  return (
    <>
      {specKeys.map(key => (
        <tr key={key} className="border-t border-outline-variant hover:bg-surface-high/30 transition-colors">
          <td className="px-4 py-3 text-xs font-mono text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
            {key}
          </td>
          {products.map(p => {
            const spec = p.specs?.find(s => s.specKey === key)
            return (
              <td key={p.id} className="px-4 py-3 text-sm font-mono text-on-surface text-center">
                {spec?.specValue ?? '—'}
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}
```

- [ ] **Step 4: ProsConsRow component**

Create `components/comparison/ProsConsRow.tsx`:

```typescript
import type { Product, ProsConsType } from '@/types'

interface Props {
  type: ProsConsType
  products: Product[]
}

export function ProsConsRow({ type, products }: Props) {
  const isPro = type === 'pro'
  const borderColor = isPro ? 'border-t-secondary' : 'border-t-tertiary'
  const bgColor = isPro ? 'bg-secondary/5' : 'bg-tertiary/5'
  const textColor = isPro ? 'text-secondary' : 'text-tertiary'
  const icon = isPro ? '✓' : '✕'
  const label = isPro ? 'KEY PROS' : 'KEY CONS'

  return (
    <tr className={`border-t border-outline-variant ${bgColor}`}>
      <td className="px-4 py-3">
        <span className={`text-xs font-mono uppercase tracking-wider ${textColor}`}>{label}</span>
      </td>
      {products.map(p => {
        const items = p.prosCons?.filter(pc => pc.type === type).sort((a, b) => a.position - b.position) ?? []
        return (
          <td key={p.id} className={`px-4 py-3 border-t-2 ${borderColor}`}>
            <ul className="space-y-1">
              {items.map((pc, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-on-surface">
                  <span className={`${textColor} flex-shrink-0 mt-0.5`}>{icon}</span>
                  {pc.text}
                </li>
              ))}
            </ul>
          </td>
        )
      })}
    </tr>
  )
}
```

- [ ] **Step 5: PriceRow component**

Create `components/comparison/PriceRow.tsx`:

```typescript
import type { Product } from '@/types'

interface Props {
  products: Product[]
}

export function PriceRow({ products }: Props) {
  return (
    <tr className="border-t border-outline-variant">
      <td className="px-4 py-4 text-xs font-mono text-on-surface-variant uppercase tracking-wider">
        UNIT PRICE
      </td>
      {products.map(p => (
        <td key={p.id} className="px-4 py-4 text-center">
          <div className="space-y-2">
            <p className="font-heading font-bold text-lg text-on-surface">{p.price ?? '—'}</p>
            {p.affiliateUrl ? (
              <a
                href={p.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full border border-primary text-primary text-xs font-body font-medium rounded px-3 py-1.5 hover:bg-primary/10 transition-colors"
              >
                View Deal
              </a>
            ) : (
              <span className="text-xs text-on-surface-variant">No link</span>
            )}
          </div>
        </td>
      ))}
    </tr>
  )
}
```

- [ ] **Step 6: AiVerdict component**

Create `components/comparison/AiVerdict.tsx`:

```typescript
interface Props {
  verdict: string
}

export function AiVerdict({ verdict }: Props) {
  return (
    <div className="mt-6 bg-surface-low border border-outline-variant rounded p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">AI VERDICT</span>
        <span className="text-xs bg-primary/20 text-primary border border-primary/30 rounded px-2 py-0.5 font-mono">claude</span>
      </div>
      <p className="text-sm text-on-surface leading-relaxed">{verdict}</p>
    </div>
  )
}
```

- [ ] **Step 7: ComparisonTable component**

Create `components/comparison/ComparisonTable.tsx`:

```typescript
import { ProductHeader } from './ProductHeader'
import { SpecRows } from './SpecRows'
import { ProsConsRow } from './ProsConsRow'
import { PriceRow } from './PriceRow'
import type { Product } from '@/types'

interface Props {
  products: Product[]
}

export function ComparisonTable({ products }: Props) {
  const specKeys = products[0]?.specs?.map(s => s.specKey) ?? []
  const colWidth = `${100 / (products.length + 1)}%`

  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-outline-variant rounded-lg overflow-hidden">
        <colgroup>
          <col style={{ width: '180px' }} />
          {products.map(p => <col key={p.id} style={{ width: colWidth }} />)}
        </colgroup>
        <thead>
          <tr className="border-b border-outline-variant">
            <th className="px-4 py-2 text-xs font-mono text-on-surface-variant uppercase text-left">
              MODEL SPECIFICATIONS
            </th>
            {products.map((p, i) => (
              <th key={p.id} className="border-l border-outline-variant">
                <ProductHeader
                  product={p}
                  isTopPick={i === 0}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <SpecRows specKeys={specKeys} products={products} />
          <ProsConsRow type="pro" products={products} />
          <ProsConsRow type="con" products={products} />
          <PriceRow products={products} />
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 8: Public comparison page**

Create `app/compare/[slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { db } from '@/lib/db/prisma'
import { ComparisonTable } from '@/components/comparison/ComparisonTable'
import { AiVerdict } from '@/components/comparison/AiVerdict'
import { Badge } from '@/components/ui/Badge'
import type { Metadata } from 'next'
import type { Product } from '@/types'

interface Props {
  params: { slug: string }
}

async function getComparison(slug: string) {
  return db.comparison.findFirst({
    where: { slug, status: 'published' },
    include: {
      category: true,
      products: {
        orderBy: { position: 'asc' },
        include: {
          specs: true,
          prosCons: { orderBy: { position: 'asc' } },
        },
      },
    },
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const comparison = await getComparison(params.slug)
  if (!comparison) return { title: 'Not Found' }
  return {
    title: `${comparison.title} | CompareIt`,
    description: comparison.introText ?? `Compare top ${comparison.category.name} products side by side.`,
  }
}

export default async function ComparisonPage({ params }: Props) {
  const comparison = await getComparison(params.slug)
  if (!comparison) notFound()

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge label="Technical Guide" variant="success" />
            {comparison.publishedAt && (
              <span className="text-xs text-on-surface-variant">
                Updated {new Date(comparison.publishedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          <h1 className="font-heading text-3xl font-bold text-on-surface">{comparison.title}</h1>
          {comparison.introText && (
            <p className="mt-2 text-on-surface-variant text-sm leading-relaxed max-w-2xl">{comparison.introText}</p>
          )}
        </div>

        {/* Comparison table */}
        <ComparisonTable products={comparison.products as Product[]} />

        {/* AI Verdict */}
        {comparison.aiVerdict && <AiVerdict verdict={comparison.aiVerdict} />}

        {/* Disclaimer */}
        <p className="mt-6 text-xs text-on-surface-variant text-center">
          Prices and ratings are approximate and may vary by region. Last updated{' '}
          {comparison.publishedAt ? new Date(comparison.publishedAt).toLocaleDateString() : 'recently'}.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 9: End-to-end test**

```bash
npm run dev
```

1. Create comparison in admin, add 2-3 products, fetch URLs, save
2. Click "Generate Comparison" → wait for AI
3. Click "Publish" 
4. Open `/compare/{your-slug}` in browser
5. Verify: product images, spec rows, pros/cons, AI verdict, "View Deal" buttons all render

- [ ] **Step 10: Commit**

```bash
git add app/compare/ components/comparison/ components/ui/StarRating.tsx
git commit -m "feat: public comparison page with full comparison table"
```

---

## Task 11: Mobile Responsive Layout

**Files:**
- Modify: `components/comparison/ComparisonTable.tsx`, `app/compare/[slug]/page.tsx`

**Interfaces:**
- No new interfaces — responsive variant of existing components

- [ ] **Step 1: Mobile stacked layout for comparison table**

Edit `components/comparison/ComparisonTable.tsx` — add mobile card view:

```typescript
import { ProductHeader } from './ProductHeader'
import { SpecRows } from './SpecRows'
import { ProsConsRow } from './ProsConsRow'
import { PriceRow } from './PriceRow'
import type { Product } from '@/types'

interface Props {
  products: Product[]
}

export function ComparisonTable({ products }: Props) {
  const specKeys = products[0]?.specs?.map(s => s.specKey) ?? []

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border border-outline-variant rounded-lg overflow-hidden">
          <colgroup>
            <col style={{ width: '180px' }} />
            {products.map(p => <col key={p.id} />)}
          </colgroup>
          <thead>
            <tr className="border-b border-outline-variant">
              <th className="px-4 py-2 text-xs font-mono text-on-surface-variant uppercase text-left">
                MODEL SPECIFICATIONS
              </th>
              {products.map((p, i) => (
                <th key={p.id} className="border-l border-outline-variant">
                  <ProductHeader product={p} isTopPick={i === 0} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SpecRows specKeys={specKeys} products={products} />
            <ProsConsRow type="pro" products={products} />
            <ProsConsRow type="con" products={products} />
            <PriceRow products={products} />
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="md:hidden space-y-4">
        {products.map((p, i) => (
          <div key={p.id} className="border border-outline-variant rounded-lg overflow-hidden">
            <div className="bg-surface-low p-4">
              <ProductHeader product={p} isTopPick={i === 0} />
            </div>
            <div className="divide-y divide-outline-variant">
              {specKeys.map(key => {
                const spec = p.specs?.find(s => s.specKey === key)
                return (
                  <div key={key} className="flex justify-between px-4 py-2.5">
                    <span className="text-xs font-mono text-on-surface-variant uppercase">{key}</span>
                    <span className="text-xs font-mono text-on-surface">{spec?.specValue ?? '—'}</span>
                  </div>
                )
              })}
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-mono text-secondary uppercase mb-1">Pros</p>
                <ul className="space-y-1">
                  {p.prosCons?.filter(pc => pc.type === 'pro').map((pc, j) => (
                    <li key={j} className="text-xs text-on-surface flex gap-1"><span className="text-secondary">✓</span>{pc.text}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-mono text-tertiary uppercase mb-1">Cons</p>
                <ul className="space-y-1">
                  {p.prosCons?.filter(pc => pc.type === 'con').map((pc, j) => (
                    <li key={j} className="text-xs text-on-surface flex gap-1"><span className="text-tertiary">✕</span>{pc.text}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="px-4 pb-4">
              <p className="font-heading font-bold text-xl text-on-surface mb-2">{p.price ?? '—'}</p>
              {p.affiliateUrl && (
                <a href={p.affiliateUrl} target="_blank" rel="noopener noreferrer"
                  className="block w-full text-center border border-primary text-primary text-sm font-medium rounded px-4 py-2 hover:bg-primary/10 transition-colors">
                  View Deal
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Test on mobile viewport**

Open browser DevTools → toggle device toolbar → set to iPhone 12 (390px).
Verify: stacked cards visible, no horizontal scroll, "View Deal" buttons tappable.

- [ ] **Step 3: Commit**

```bash
git add components/comparison/ComparisonTable.tsx
git commit -m "feat: mobile responsive stacked card layout for comparison table"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✓ Multi-tenant workspaces from day 1 (Tasks 2, 3)
- ✓ Jina AI product extraction (Task 4)
- ✓ Plan limits: free/pro/admin (Task 5)
- ✓ AI generation via Claude (Task 6)
- ✓ Comparison CRUD + publish toggle (Task 7)
- ✓ Admin UI: create, add products, fetch, notes, affiliate URL (Tasks 8, 9)
- ✓ Inline editing (Task 9 — InlineEditCell)
- ✓ Public comparison page matching designs (Task 10)
- ✓ Mobile responsive (Task 11)
- ✓ Category system — system + custom per workspace (Task 7)
- ✓ Design tokens from DESIGN.md (Task 1)

**Not in plan (out of scope per spec):**
- Custom domain routing
- Stripe billing integration
- Image upload to Vercel Blob (fallback path exists, upload UI deferred)
- Categories admin page (API exists in Task 7, UI page skipped — use API directly for now)
