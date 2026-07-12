# Roundup / Top-N List Feature — Design Spec
**Date:** 2026-07-11
**Status:** Approved for implementation

---

## Overview

Add a second content type — **Roundup** — alongside the existing Comparison. A Roundup is a ranked list of products (e.g., "Top 10 Gadgets Under ₹2000") displayed as a 3-column card grid. Designed for YouTube creators who currently paste product links in video descriptions — they paste the same links here, AI auto-fills everything, and they get a shareable affiliate page.

---

## Admin Flow

Identical to comparison creation. No new admin pages needed — the existing create/edit flow handles both types via a `pageType` selector.

1. Create page: choose title, category (optional), **type = Roundup**, slug
2. Edit page: add products (paste URL → Jina fetch → name/image/price auto-filled)
3. Add affiliate URL + personal notes per product (same as comparison)
4. Click "Generate" → AI writes short description + 3 bullet highlights per product
5. Edit inline, reorder by dragging (position field), publish
6. Public URL: `/list/[slug]`

---

## Data Model Changes

**`Comparison` model** — add one field:
```prisma
pageType  String  @default("comparison")  // "comparison" | "roundup"
```

**`Product` model** — add one field:
```prisma
shortDescription  String?
```

Bullet highlights use the **existing `ProsCons` table** with `type = 'pro'` (3 items). No new table. Existing pros rendering component reused on the card.

No other schema changes. Migration: `prisma migrate dev --name add-roundup`.

---

## AI Generation (Roundup prompt)

Different prompt from comparison — no spec matrix. Per product generates:
- `shortDescription`: 2-3 sentence summary
- `highlights`: 3 bullet points (stored as ProsCons with type='pro')

Output JSON shape:
```json
{
  "products": [
    {
      "productIndex": 0,
      "shortDescription": "...",
      "highlights": ["...", "...", "..."]
    }
  ],
  "verdict": "Overall summary of the roundup (optional)"
}
```

Stored: `shortDescription` → `product.shortDescription`, highlights → `prosCons` (type='pro', position 0-2).

---

## Public Roundup Page

**URL:** `/list/[slug]`

**Layout:**
- Header: title, intro text, last updated badge
- 3-column grid desktop (`grid-cols-3`), 1-column mobile (`grid-cols-1`)
- Each card: rank badge, image, name, short description, 3 bullet highlights, price, "View Deal" affiliate button
- AI verdict (optional) shown below the grid
- Disclaimer (same as comparison page)

**Card structure:**
```
┌──────────────────────┐
│ #1        [TOP PICK] │  ← rank number + optional badge
│     [product image]  │
│  Product Name        │
│  Short 2-3 sentence  │
│  AI description.     │
│  • Highlight one     │
│  • Highlight two     │
│  • Highlight three   │
│  ₹1,499              │
│  [View Deal →]       │
└──────────────────────┘
```

**Reused components:** `Badge`, `Button`, `AiVerdict`, dark theme tokens, `font-heading`, `font-mono`.

**New components:**
- `components/roundup/RoundupGrid.tsx` — 3-col grid wrapper
- `components/roundup/RoundupCard.tsx` — single product card
- `app/list/[slug]/page.tsx` — server component, queries DB, 404 if not published

---

## Routing

| URL | Purpose |
|---|---|
| `/compare/[slug]` | Existing comparison page (unchanged) |
| `/list/[slug]` | New roundup page |

Admin public middleware: add `/list(.*)` to public routes in `middleware.ts`.

---

## Out of Scope

- Drag-to-reorder in admin UI (position set by add order; manual reorder via position field edit)
- Separate roundup categories (reuse existing category system)
- Voting / user ratings
- Pagination (if >12 products, all shown — no infinite scroll)
