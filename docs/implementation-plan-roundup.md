# Roundup Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Roundup (Top-N list) page type alongside existing Comparison — 3-col card grid, AI-generated short descriptions and highlights, same admin workflow.

**Architecture:** Minimal schema additions (`pageType` on Comparison, `shortDescription` on Product), a second AI prompt path in the existing generate function, two new public-facing components, and a new `/list/[slug]` page. All existing comparison code untouched.

**Tech Stack:** Next.js 14 App Router, Prisma 6, Tailwind CSS, `@google/generative-ai` / `@anthropic-ai/sdk` (existing), TypeScript strict.

---

## Global Constraints

- Next.js 14 App Router — no Pages Router
- TypeScript strict — no `any`
- Dark theme classes only — no hardcoded hex colors in JSX
- Fonts: `font-heading` (Hanken Grotesk), `font-mono` (JetBrains Mono), `font-body` (Inter)
- All API routes: auth via `getCurrentWorkspace()`, return `{ data }` or `{ error }` shape
- `db` from `@/lib/db/prisma`
- `pageType` values: `'comparison'` (default) | `'roundup'`
- Public roundup URL: `/list/[slug]` (server component, 404 if not published)
- Middleware public routes must include `/list(.*)`
- Highlights stored as `ProsCons` records with `type = 'pro'`, exactly 3 per product
- `shortDescription` stored on `Product.shortDescription`

---

## File Map

```
prisma/
  schema.prisma                          # Modify: add pageType + shortDescription

types/index.ts                           # Modify: add pageType to Comparison type

lib/ai/
  roundup-prompts.ts                     # Create: buildRoundupPrompt()
  generate-comparison.ts                 # Modify: branch on pageType, handle roundup response

app/(admin)/
  comparisons/new/page.tsx               # Modify: add pageType selector (Comparison / Roundup)
  dashboard/page.tsx                     # Modify: show Roundup badge on list items

components/roundup/
  RoundupCard.tsx                        # Create: single product card
  RoundupGrid.tsx                        # Create: 3-col grid wrapper

app/list/
  [slug]/page.tsx                        # Create: public roundup page (server component)

middleware.ts                            # Modify: add /list(.*) to public routes
```

---

## Task 1: Schema + Types

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `types/index.ts`

**Interfaces:**
- Produces: `Comparison.pageType` field in DB and TypeScript; `Product.shortDescription` field

- [ ] **Step 1: Add fields to schema**

Open `prisma/schema.prisma`. Find the `Comparison` model and add after `createdAt`:

```prisma
pageType    String   @default("comparison")
```

Find the `Product` model and add after `userNotes`:

```prisma
shortDescription  String?
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-roundup
```

Expected output: `✔  Generated Prisma Client` and a new migration file created.

- [ ] **Step 3: Update TypeScript types**

Open `types/index.ts`. Find `export type ComparisonStatus` and add below it:

```typescript
export type PageType = 'comparison' | 'roundup'
```

Find the `Comparison` interface and add `pageType` after `status`:

```typescript
export interface Comparison {
  id: string
  workspaceId: string
  categoryId: string
  title: string
  slug: string
  introText: string | null
  status: ComparisonStatus
  pageType: PageType          // add this line
  aiVerdict: string | null
  publishedAt: Date | null
  createdAt: Date
  category?: Category
  products?: Product[]
}
```

Find the `Product` interface and add `shortDescription` after `userNotes`:

```typescript
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
  shortDescription: string | null   // add this line
  specs?: Spec[]
  prosCons?: ProsCons[]
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: compiled successfully, zero errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/ types/index.ts && git commit -m "feat: add pageType to Comparison, shortDescription to Product"
```

---

## Task 2: Roundup AI Generation

**Files:**
- Create: `lib/ai/roundup-prompts.ts`
- Modify: `lib/ai/generate-comparison.ts`

**Interfaces:**
- Consumes: `buildComparisonPrompt` pattern from `lib/ai/prompts.ts` (reference only)
- Produces: `buildRoundupPrompt(products, overallNotes?): string` — imported by `generate-comparison.ts`

- [ ] **Step 1: Create roundup prompt builder**

Create `lib/ai/roundup-prompts.ts`:

```typescript
import type { Product } from '@/types'

export function buildRoundupPrompt(
  products: Product[],
  overallNotes?: string | null
): string {
  const productDescriptions = products
    .map((p, i) => `
Product ${i + 1}: ${p.name}
Price: ${p.price ?? 'Unknown'}
URL: ${p.url}
${p.userNotes ? `Owner's research notes:\n${p.userNotes}` : ''}
Fetched page content (first 1500 chars):
${JSON.stringify(p.fetchedRaw ?? '').slice(0, 1500)}
`)
    .join('\n---\n')

  return `You are a product expert writing a "Top ${products.length}" roundup list.

${overallNotes ? `Overall context from the owner:\n${overallNotes}\n` : ''}

PRODUCTS:
${productDescriptions}

Respond ONLY with a JSON object (no markdown fences, no explanation):
{
  "products": [
    {
      "productIndex": 0,
      "shortDescription": "2-3 sentence product summary focusing on who it's best for and key strengths",
      "highlights": ["Highlight one", "Highlight two", "Highlight three"]
    }
  ],
  "verdict": "1-2 sentence overall summary of the list"
}

Rules:
- productIndex: 0-based, matches order above
- shortDescription: 2-3 sentences, direct and specific
- highlights: exactly 3 items, short phrases (5-8 words each), factual
- verdict: brief overall summary`
}
```

- [ ] **Step 2: Modify generate-comparison.ts to handle roundup**

Read `lib/ai/generate-comparison.ts`. Add the roundup import at the top and add a roundup handler. Replace the file content with:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { db } from '@/lib/db/prisma'
import { buildComparisonPrompt } from './prompts'
import { buildRoundupPrompt } from './roundup-prompts'
import type { GeneratedComparison } from '@/types'

// AI_PROVIDER=claude (default) | gemini
async function callAI(prompt: string): Promise<string> {
  const provider = process.env.AI_PROVIDER ?? 'claude'

  if (provider === 'gemini') {
    const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genai.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash' })
    const result = await model.generateContent(prompt)
    return result.response.text()
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })
  return message.content[0].type === 'text' ? message.content[0].text : ''
}

function cleanJson(text: string): string {
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
  if (!cleaned || !cleaned.startsWith('{')) {
    throw new Error('AI returned invalid JSON response')
  }
  return cleaned
}

// Comparison-specific types
interface AIProduct {
  productIndex: number
  specs: Record<string, string>
  pros: string[]
  cons: string[]
}

interface AIComparisonResponse {
  specKeys: string[]
  products: AIProduct[]
  verdict: string
}

// Roundup-specific types
interface AIRoundupProduct {
  productIndex: number
  shortDescription: string
  highlights: string[]
}

interface AIRoundupResponse {
  products: AIRoundupProduct[]
  verdict: string
}

export async function generateComparison(comparisonId: string): Promise<GeneratedComparison> {
  const comparison = await db.comparison.findUniqueOrThrow({
    where: { id: comparisonId },
    include: { category: true, products: { orderBy: { position: 'asc' } } },
  })

  if (comparison.pageType === 'roundup') {
    return generateRoundup(comparison)
  }

  return generateComparisonMatrix(comparison)
}

async function generateComparisonMatrix(
  comparison: Awaited<ReturnType<typeof db.comparison.findUniqueOrThrow<{ include: { category: true; products: { orderBy: { position: 'asc' } } } }>>>
): Promise<GeneratedComparison> {
  const prompt = buildComparisonPrompt(
    comparison.category as unknown as import('@/types').Category,
    comparison.products as unknown as import('@/types').Product[],
    comparison.introText
  )

  const text = await callAI(prompt)
  if (!text) throw new Error('AI returned empty response')

  const aiResponse = JSON.parse(cleanJson(text)) as AIComparisonResponse

  await db.$transaction(async (tx) => {
    for (const genProduct of aiResponse.products) {
      const product = comparison.products[genProduct.productIndex]
      if (!product) continue

      await tx.spec.deleteMany({ where: { productId: product.id } })
      await tx.prosCons.deleteMany({ where: { productId: product.id } })

      await tx.spec.createMany({
        data: aiResponse.specKeys.map((key) => ({
          productId: product.id,
          specKey: key,
          specValue: genProduct.specs[key] ?? 'N/A',
        })),
      })

      await tx.prosCons.createMany({
        data: genProduct.pros.map((text, i) => ({
          productId: product.id,
          type: 'pro',
          text,
          position: i,
        })),
      })

      await tx.prosCons.createMany({
        data: genProduct.cons.map((text, i) => ({
          productId: product.id,
          type: 'con',
          text,
          position: i,
        })),
      })
    }

    await tx.comparison.update({
      where: { id: comparison.id },
      data: { aiVerdict: aiResponse.verdict },
    })
  })

  return {
    specKeys: aiResponse.specKeys,
    products: aiResponse.products
      .filter(g => comparison.products[g.productIndex] !== undefined)
      .map(g => ({
        productId: comparison.products[g.productIndex].id,
        specs: g.specs,
        pros: g.pros,
        cons: g.cons,
      })),
    verdict: aiResponse.verdict,
  }
}

async function generateRoundup(
  comparison: Awaited<ReturnType<typeof db.comparison.findUniqueOrThrow<{ include: { category: true; products: { orderBy: { position: 'asc' } } } }>>>
): Promise<GeneratedComparison> {
  const prompt = buildRoundupPrompt(
    comparison.products as unknown as import('@/types').Product[],
    comparison.introText
  )

  const text = await callAI(prompt)
  if (!text) throw new Error('AI returned empty response')

  const aiResponse = JSON.parse(cleanJson(text)) as AIRoundupResponse

  await db.$transaction(async (tx) => {
    for (const genProduct of aiResponse.products) {
      const product = comparison.products[genProduct.productIndex]
      if (!product) continue

      // Clear old data
      await tx.prosCons.deleteMany({ where: { productId: product.id } })

      // Write shortDescription
      await tx.product.update({
        where: { id: product.id },
        data: { shortDescription: genProduct.shortDescription },
      })

      // Write highlights as pros (exactly 3)
      await tx.prosCons.createMany({
        data: genProduct.highlights.slice(0, 3).map((text, i) => ({
          productId: product.id,
          type: 'pro',
          text,
          position: i,
        })),
      })
    }

    await tx.comparison.update({
      where: { id: comparison.id },
      data: { aiVerdict: aiResponse.verdict },
    })
  })

  // Return GeneratedComparison shape (specKeys empty for roundup)
  return {
    specKeys: [],
    products: aiResponse.products
      .filter(g => comparison.products[g.productIndex] !== undefined)
      .map(g => ({
        productId: comparison.products[g.productIndex].id,
        specs: {},
        pros: g.highlights,
        cons: [],
      })),
    verdict: aiResponse.verdict,
  }
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: compiled successfully, zero errors.

- [ ] **Step 4: Commit**

```bash
git add lib/ai/ && git commit -m "feat: roundup AI generation — shortDescription + highlights"
```

---

## Task 3: Admin UI — pageType Selector + Dashboard Badge

**Files:**
- Modify: `app/(admin)/comparisons/new/page.tsx`
- Modify: `app/(admin)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `POST /api/comparisons` — already accepts any fields via zod; `pageType` just needs to be added to the zod schema in `app/api/comparisons/route.ts` and passed through

**Note:** Also modify `app/api/comparisons/route.ts` to accept `pageType` in the create schema.

- [ ] **Step 1: Update create API to accept pageType**

Open `app/api/comparisons/route.ts`. Find `createSchema` and add `pageType`:

```typescript
const createSchema = z.object({
  title: z.string().min(3).max(200),
  categoryId: z.string(),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
  introText: z.string().optional(),
  pageType: z.enum(['comparison', 'roundup']).default('comparison'),
})
```

- [ ] **Step 2: Add pageType selector to create form**

Open `app/(admin)/comparisons/new/page.tsx`. Read it first.

Add `pageType` state after existing state declarations:
```typescript
const [pageType, setPageType] = useState<'comparison' | 'roundup'>('comparison')
```

Add to the form body (after slug field, before submit button):
```typescript
<div>
  <label className="block text-sm font-mono text-on-surface-variant mb-2">TYPE</label>
  <div className="flex gap-3">
    {(['comparison', 'roundup'] as const).map(type => (
      <button
        key={type}
        type="button"
        onClick={() => setPageType(type)}
        className={`px-4 py-2 rounded text-sm font-mono border transition-colors ${
          pageType === type
            ? 'border-primary text-primary bg-primary/10'
            : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
        }`}
      >
        {type === 'comparison' ? 'Comparison' : 'Roundup / Top-N'}
      </button>
    ))}
  </div>
</div>
```

Add `pageType` to the POST body in `handleSubmit`:
```typescript
body: JSON.stringify({ title, categoryId, slug, pageType }),
```

- [ ] **Step 3: Show type badge on dashboard**

Open `app/(admin)/dashboard/page.tsx`. Read it first.

In the comparison list item, add a type badge next to the category/products count line. Find the `<p className="text-sm text-on-surface-variant ...">` line and update:

```typescript
<p className="text-sm text-on-surface-variant mt-0.5">
  {c.category.name} · {c.products.length} products
  {c.pageType === 'roundup' && (
    <span className="ml-2 text-xs font-mono bg-primary/10 text-primary border border-primary/30 rounded px-1.5 py-0.5">
      ROUNDUP
    </span>
  )}
</p>
```

Note: `c.pageType` is now available since Task 1 added it to the schema. Prisma will return it automatically.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: compiled successfully, zero errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(admin\)/ app/api/comparisons/route.ts && git commit -m "feat: pageType selector in create form, roundup badge on dashboard"
```

---

## Task 4: Roundup Components

**Files:**
- Create: `components/roundup/RoundupCard.tsx`
- Create: `components/roundup/RoundupGrid.tsx`

**Interfaces:**
- Consumes: `Product` type (with `shortDescription`, `prosCons`, `price`, `affiliateUrl`, `imageUrl`, `name`)
- Produces: `<RoundupGrid products={products} />` — used by Task 5 page

- [ ] **Step 1: Create RoundupCard**

Create `components/roundup/RoundupCard.tsx`:

```typescript
import { Badge } from '@/components/ui/Badge'
import type { Product } from '@/types'

interface Props {
  product: Product
  rank: number
  isTopPick?: boolean
}

export function RoundupCard({ product, rank, isTopPick }: Props) {
  const highlights = product.prosCons
    ?.filter(pc => pc.type === 'pro')
    .sort((a, b) => a.position - b.position)
    .slice(0, 3) ?? []

  return (
    <div className="bg-surface-low border border-outline-variant rounded-lg overflow-hidden flex flex-col">
      {/* Rank + badge */}
      <div className="flex items-center justify-between px-4 pt-4">
        <span className="font-mono text-2xl font-bold text-on-surface-variant">
          #{rank}
        </span>
        {isTopPick && <Badge label="Top Pick" variant="primary" />}
      </div>

      {/* Image */}
      <div className="flex justify-center px-4 py-3">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-28 h-28 object-contain rounded bg-surface-high"
          />
        ) : (
          <div className="w-28 h-28 rounded bg-surface-high flex items-center justify-center">
            <span className="text-xs text-on-surface-variant">No image</span>
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="font-heading font-semibold text-on-surface text-sm px-4 pb-2 leading-snug">
        {product.name}
      </h3>

      {/* Short description */}
      {product.shortDescription && (
        <p className="text-xs text-on-surface-variant px-4 pb-3 leading-relaxed flex-1">
          {product.shortDescription}
        </p>
      )}

      {/* Highlights */}
      {highlights.length > 0 && (
        <ul className="px-4 pb-3 space-y-1">
          {highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-on-surface">
              <span className="text-secondary flex-shrink-0 mt-0.5">✓</span>
              {h.text}
            </li>
          ))}
        </ul>
      )}

      {/* Price + CTA */}
      <div className="px-4 pb-4 mt-auto">
        {product.price && (
          <p className="font-heading font-bold text-lg text-on-surface mb-2">
            {product.price}
          </p>
        )}
        {product.affiliateUrl ? (
          <a
            href={product.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center border border-primary text-primary text-xs font-body font-medium rounded px-3 py-2 hover:bg-primary/10 transition-colors"
          >
            View Deal →
          </a>
        ) : (
          <div className="h-8" />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create RoundupGrid**

Create `components/roundup/RoundupGrid.tsx`:

```typescript
import { RoundupCard } from './RoundupCard'
import type { Product } from '@/types'

interface Props {
  products: Product[]
}

export function RoundupGrid({ products }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {products.map((product, i) => (
        <RoundupCard
          key={product.id}
          product={product}
          rank={i + 1}
          isTopPick={i === 0}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: compiled successfully, zero errors.

- [ ] **Step 4: Commit**

```bash
git add components/roundup/ && git commit -m "feat: RoundupCard and RoundupGrid components"
```

---

## Task 5: Public Roundup Page + Middleware

**Files:**
- Create: `app/list/[slug]/page.tsx`
- Modify: `middleware.ts`

**Interfaces:**
- Consumes: `RoundupGrid` from `components/roundup/RoundupGrid`, `AiVerdict` from `components/comparison/AiVerdict`, `Badge` from `components/ui/Badge`, `db` from `lib/db/prisma`
- Produces: public page at `/list/[slug]`

- [ ] **Step 1: Add /list to public routes in middleware**

Open `middleware.ts`. Read it first.

Find the `isPublicRoute` declaration and add `/list(.*)`:

```typescript
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/compare(.*)',
  '/list(.*)',         // add this line
  '/api/webhook(.*)',
])
```

- [ ] **Step 2: Create public roundup page**

Create `app/list/[slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { db } from '@/lib/db/prisma'
import { RoundupGrid } from '@/components/roundup/RoundupGrid'
import { AiVerdict } from '@/components/comparison/AiVerdict'
import { Badge } from '@/components/ui/Badge'
import type { Metadata } from 'next'
import type { Product } from '@/types'

interface Props {
  params: { slug: string }
}

async function getRoundup(slug: string) {
  return db.comparison.findFirst({
    where: { slug, status: 'published', pageType: 'roundup' },
    include: {
      products: {
        orderBy: { position: 'asc' },
        include: {
          prosCons: { orderBy: { position: 'asc' } },
        },
      },
    },
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const roundup = await getRoundup(params.slug)
  if (!roundup) return { title: 'Not Found' }
  return {
    title: `${roundup.title} | CompareIt`,
    description: roundup.introText ?? `Top picks: ${roundup.title}`,
  }
}

export default async function RoundupPage({ params }: Props) {
  const roundup = await getRoundup(params.slug)
  if (!roundup) notFound()

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge label="Roundup" variant="success" />
            {roundup.publishedAt && (
              <span className="text-xs text-on-surface-variant">
                Updated {new Date(roundup.publishedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          <h1 className="font-heading text-3xl font-bold text-on-surface">{roundup.title}</h1>
          {roundup.introText && (
            <p className="mt-2 text-on-surface-variant text-sm leading-relaxed max-w-2xl">
              {roundup.introText}
            </p>
          )}
        </div>

        {/* Product grid */}
        <RoundupGrid products={roundup.products as unknown as Product[]} />

        {/* AI Verdict */}
        {roundup.aiVerdict && <AiVerdict verdict={roundup.aiVerdict} />}

        {/* Disclaimer */}
        <p className="mt-6 text-xs text-on-surface-variant text-center">
          Prices are approximate and may vary. Last updated{' '}
          {roundup.publishedAt ? new Date(roundup.publishedAt).toLocaleDateString() : 'recently'}.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: compiled successfully, all routes shown including `ƒ /list/[slug]`.

- [ ] **Step 4: End-to-end manual test**

```bash
npm run dev
```

1. Go to `/dashboard` → New Comparison → select type "Roundup / Top-N" → fill title + slug → Create
2. On edit page: add 3 products, paste URLs, click Fetch on each
3. Click "Generate Comparison" → wait → verify AI verdict appears
4. Click "Publish"
5. Open `/list/[your-slug]` → verify 3-column card grid, ranks, highlights, View Deal buttons

- [ ] **Step 5: Commit**

```bash
git add app/list/ middleware.ts && git commit -m "feat: public roundup page at /list/[slug], middleware public route"
```

---

## Self-Review

**Spec coverage:**
- ✓ `pageType` field on Comparison — Task 1
- ✓ `shortDescription` field on Product — Task 1
- ✓ Highlights stored as ProsCons(type='pro') — Task 2
- ✓ Same admin workflow (paste URL → Jina → AI generate → edit → publish) — Tasks 2, 3
- ✓ pageType selector in create form — Task 3
- ✓ Roundup badge on dashboard — Task 3
- ✓ AI generates shortDescription + highlights (not specs) — Task 2
- ✓ 3-col grid desktop, 1-col mobile — Task 4
- ✓ Rank badge (#1, #2...) + TOP PICK on first — Task 4
- ✓ `/list/[slug]` public page, 404 if not published — Task 5
- ✓ `/list(.*)` added to middleware public routes — Task 5
- ✓ `AiVerdict` reused below grid — Task 5
- ✓ Existing comparison pages untouched
