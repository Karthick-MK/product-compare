# CompareIt

AI-powered product comparison and roundup pages. Admins create pages, AI generates specs/pros/cons, publish to shareable URLs.

## Stack

- **Next.js 14** App Router, TypeScript strict
- **Prisma 6 + PostgreSQL** (Neon serverless — no `$transaction`)
- **Clerk v5** auth
- **Groq** (llama-3.3-70b-versatile) for AI generation
- **Jina AI** for product URL extraction

## Getting Started

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local` and fill in keys. See [Environment Variables](#environment-variables).

---

## Admin: Save & Publish Flow

### Save

There are four independent save paths — all hit `PUT /api/comparisons/[id]`:

| Trigger | What's saved |
|---|---|
| "Save" button in header actions | Current `products` array (URLs, names, positions) |
| "Save changes" button in inline table | Updated specs, pros/cons, rating, price from inline edits |
| Page Description textarea `onBlur` | `introText` field only |
| AI Verdict `InlineEditCell` `onSave` | `aiVerdict` field only |

**`PUT /api/comparisons/[id]` logic:**
1. Auth — `getCurrentWorkspace()` checks Clerk session; auto-upgrades to `admin` plan if `ADMIN_CLERK_USER_ID` matches
2. Zod validates body (partial — only provided fields are updated)
3. Plan limit check — blocks if `products.length > maxProducts` for the workspace plan
4. Updates `comparison` row for any top-level fields (title, introText, aiVerdict)
5. Deletes products not in the incoming list (by id)
6. Upserts each product: `update` if `id` present, `create` otherwise
7. For each product: deletes all specs → `createMany` new specs; same for prosCons
8. Returns full comparison with nested products, specs, prosCons

> **Neon constraint:** No `db.$transaction` — Neon serverless drops the connection mid-transaction. All writes are sequential individual queries.

### Publish

"Publish →" / "Re-publish" button calls `POST /api/comparisons/[id]/publish`:

1. Toggles `status`: `draft` → `published` or `published` → `draft`
2. **Auto-generates `introText`** on first publish if the field is blank:
   - comparison: `"Compare A vs B vs C — detailed specs, pros & cons, pricing and expert verdict."`
   - roundup: `"Top N picks: A, B, C — ranked by performance, value and user ratings."`
3. Sets `publishedAt = now` (or `null` on unpublish)
4. Client updates badge from response `data.status`; "View Live →" link appears

**Public URL after publish:**
- `pageType = 'comparison'` → `/compare/[slug]`
- `pageType = 'roundup'` → `/list/[slug]`

### Full Admin Edit Page Flow

```
Load page
  └─ GET /api/comparisons/[id]
        └─ setComparison(data)  →  products, specs, prosCons in state

Add/edit products  →  local state only (no API call)

Save button
  └─ PUT /api/comparisons/[id] { products }
        └─ on ok: load() re-fetches, refreshes UI

Generate (AI)
  └─ POST /api/comparisons/[id]/generate
        └─ on done: save() + load()

Inline table edits (specs / pros-cons / rating / price)
  └─ "Save changes" button
        └─ PUT /api/comparisons/[id] { products: local }
              └─ on ok: onSaved() → load()

Publish button
  └─ POST /api/comparisons/[id]/publish
        └─ updates status badge in-place (no full reload)
```

---

## Plan Limits

Configured via env vars (defaults in `lib/usage/limits.ts`):

| Env var | Default | Description |
|---|---|---|
| `FREE_MAX_PRODUCTS` | `3` | Max products per comparison on free plan |
| `FREE_MAX_COMPARISONS` | `5` | Max comparisons on free plan |
| `ADMIN_CLERK_USER_ID` | — | Clerk user ID auto-upgraded to `admin` plan |

`null` = unlimited (admin plan).

---

## Environment Variables

```
# Database
DATABASE_URL=

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
ADMIN_CLERK_USER_ID=

# AI
GROQ_API_KEY=
JINA_API_KEY=          # optional, unauthenticated Jina still works

# App
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
NEXT_PUBLIC_USE_AI=true

# Plan limits (optional, see defaults above)
FREE_MAX_PRODUCTS=3
FREE_MAX_COMPARISONS=5
```

---

## Key Architectural Notes

- **No `$transaction`** — Neon serverless incompatible. All DB writes are sequential `await db.*` calls.
- **Admin auto-upgrade** — `getCurrentWorkspace()` checks `ADMIN_CLERK_USER_ID` on every request and upgrades the workspace plan in-place.
- **Embed** — `/embed/compare/[slug]` and `/embed/list/[slug]` are stripped pages with `frame-ancestors *` CSP header. Embed button is admin-only (edit page only).
- **SEO** — JSON-LD Product+ItemList schema, dynamic sitemap at `/sitemap.xml`, vs-pair combinations rendered in-page for multi-product comparisons.
