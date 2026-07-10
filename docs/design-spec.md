# Product Comparison Platform — Design Spec
**Date:** 2026-07-10  
**Status:** Approved for implementation

---

## Overview

AI-powered product comparison website. User pastes product URLs from any store (Amazon, Flipkart, Walmart, etc.), system auto-fetches product data, AI generates a beautiful category-specific comparison page. Owner edits manually, publishes, earns affiliate commissions. Built multi-tenant from day 1 so it can be flipped to SaaS for other content creators (YouTubers, bloggers) later.

**Primary user (MVP):** Owner — uses own YouTube channel to drive traffic, earns affiliate commissions.  
**Future users (SaaS):** Other content creators who pay for their own workspace.

---

## Business Model

| Phase | Revenue source |
|---|---|
| MVP | Affiliate commissions on "View Deal" clicks |
| SaaS | Monthly subscription (Free / Pro) per workspace |

**Affiliate:** Amazon Associates, Flipkart affiliate, etc. Owner provides affiliate URLs manually per product.

**SaaS plans:**

| | Free | Pro (~₹999/month) |
|---|---|---|
| Comparison pages | 3 | Unlimited |
| AI generations/month | 10 | 100 |
| Products per comparison | 3 | 6 |
| Custom categories | ✗ | ✓ |
| Remove branding | ✗ | ✓ |
| Custom domain | ✗ | ✓ |

Owner account = `admin` plan = no limits.

---

## Architecture

**Stack:**
- **Frontend + Backend:** Next.js 14 (App Router)
- **Database:** PostgreSQL (via Prisma)
- **Auth:** Clerk (handles multi-tenancy, org/workspace model)
- **Product data extraction:** Jina AI (`r.jina.ai/{url}`) or Firecrawl API
- **AI generation:** Claude API (claude-sonnet-4-6)
- **Image storage:** Cloudflare R2 (for uploaded/fallback images)
- **Hosting:** Vercel
- **Payments (SaaS phase):** Stripe

**Key architectural decision:** Multi-tenant from day 1. Each workspace is isolated in DB via `workspace_id`. Owner's workspace is created on first login. SaaS = add Stripe + plan enforcement, no structural rewrites needed.

---

## Data Model

```
workspaces
  id, owner_user_id, slug, plan (admin|free|pro), 
  custom_domain, branding_enabled, created_at

users
  id, clerk_user_id, workspace_id, email, role

usage
  workspace_id, month (YYYY-MM), ai_calls, comparison_count

categories
  id, workspace_id, name, default_spec_keys[]
  (e.g. "Fitness Equipment" → ["Weight Range", "Increments", "Material"])
  system categories shared across all workspaces; custom categories per workspace

comparisons
  id, workspace_id, category_id, title, slug, 
  intro_text, status (draft|published), ai_verdict, 
  published_at, created_at

products
  id, comparison_id, position, url, affiliate_url,
  name, image_url, image_source (fetched|uploaded),
  price, user_notes, fetched_raw (jsonb)

specs
  id, product_id, spec_key, spec_value

pros_cons
  id, product_id, type (pro|con), text, position
```

---

## Admin Flow (Comparison Creation)

### Step 1 — New Comparison
- Title (e.g. `Best Mobile Phones Under ₹10,000`)
- Category: pick existing or create new
  - Category defines default spec rows AI will populate
- Slug: auto-generated, editable
- Optional: intro paragraph (shown on public page above comparison table)

### Step 2 — Add Products (2–6)
Per product:
- **URL** — paste any product URL (Amazon/Flipkart/any)
- System calls Jina/Firecrawl → extracts: name, image, price, description, specs
- If image fetch fails → show "Upload image" button
- If data incomplete → all fields editable inline
- **Affiliate URL** — your affiliate link for this product
- **Your notes** — textarea for personal research, Gemini output, or context from other YouTubers. AI uses this to enrich the comparison.

### Step 3 — Generate
Click "Generate Comparison" → AI pipeline:
1. Receives all product data + user notes
2. Determines category-appropriate spec rows
3. Fills spec values per product
4. Generates pros/cons per product (2–4 each)
5. Writes AI verdict paragraph

### Step 4 — Review & Edit
- Every cell editable inline (click to edit)
- Add/remove spec rows
- Add/remove pros/cons
- Rewrite AI verdict
- Swap images
- Preview → Publish

---

## AI Pipeline

**Input to Claude:**
```
Category: [name]
Default spec keys for this category: [list]

Products:
1. Name: [name]
   Fetched data: [Jina/Firecrawl markdown output]
   User notes: [pasted research]
   Price: [price]

2. ... (repeat per product)

Overall comparison context: [optional intro notes]
```

**Output (JSON schema):**
```json
{
  "spec_keys": ["Weight Range", "Increments", "Material"],
  "products": [
    {
      "specs": {"Weight Range": "2.5–24kg", "Increments": "15 steps", "Material": "German Iron"},
      "pros": ["Compact", "Slim profile"],
      "cons": ["Premium pricing"]
    }
  ],
  "verdict": "For most home gym users, Product A delivers the best value..."
}
```

Manual edits override AI output. AI output is the starting point, not the final answer.

---

## Public Comparison Page

URL pattern: `/{workspace-slug}/compare/{comparison-slug}`  
For owner: `/compare/{slug}` (root domain)

Page structure:
- Header: title, category badge, last updated
- Filter sidebar: price range, rating filter, display mode
- Comparison matrix table (from designs):
  - Products as columns with image + name + badge (TOP PICK, BEST VALUE)
  - Spec rows (category-specific, monospaced values)
  - Pros row (green chips)
  - Cons row (red chips)
  - Rating row
  - Price row + "View Deal" button (affiliate link)
- AI Verdict section below table
- Disclaimer: "Prices approximate, last synced X hours ago"

Design system: dark theme, `#0b1326` background, Electric Blue primary, Hanken Grotesk + Inter + JetBrains Mono (as per DESIGN.md).

---

## SaaS Readiness

These are in place from day 1, even if unused until SaaS launch:

1. `workspaces` table — every user gets one on signup
2. `usage` table — tracks AI calls and comparison count per month
3. `plan` field on workspace — `admin` bypasses all checks
4. Limit enforcement middleware — checks usage before every AI generation call
5. Workspace-scoped URLs — `/compare/...` for owner, `/{slug}/compare/...` for others
6. To activate SaaS: add Stripe webhook that updates `plan` on payment → done

---

## Out of Scope (MVP)

- Browser extension
- YouTube channel scraping / auto-importing from video descriptions  
- User comments / ratings
- Email notifications
- Mobile app
- Multiple users per workspace (team collaboration)
- Analytics dashboard

---

## Success Criteria (MVP)

- Owner can create a comparison page in under 10 minutes
- AI generation produces usable output without manual fix on >80% of products
- Published pages load under 2 seconds
- Affiliate "View Deal" links track correctly
- Works on mobile (stacked card layout)
