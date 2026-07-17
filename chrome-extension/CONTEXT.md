# CompareXT — Chrome Extension Handoff Document

## What This Is

A Chrome Extension (Manifest V3) called **CompareXT** that injects "Add to Compare" buttons across Amazon and Flipkart product listing pages and product detail pages. Users collect up to 10 products in a floating bar, then open a compare page that fetches full spec tables side-by-side.

**Affiliate tag**: `karthickcart-21` (Amazon Associates, India)

---

## File Structure

```
chrome-extension/
  manifest.json          — MV3 manifest
  background.js          — service worker: handles OPEN_COMPARE message
  db.js                  — storage layer (chrome.storage.local)
  sites.js               — registry reader + scrapeProduct/buildAffiliateUrl utils
  sites/
    amazon.js            — Amazon site config (amazon.in + amazon.com)
    flipkart.js          — Flipkart site config (cards working; product page TBD)
  content.js             — injected on all supported pages
  content.css            — styles for injected buttons + floating bar
  compare.html           — compare page (opened in new tab)
  compare.js             — compare page logic: enrichment + spec table render
  compare.css            — compare page styles
  popup.html / popup.js  — toolbar popup (open compare, clear all, count)
  page-refs/amazon/      — reference HTML files for selector research
    browsing.html
    product-list.html
    single-product-detailed-page.html
```

---

## Architecture

### Storage
`db.js` wraps `chrome.storage.local` under key `compareXT_products` (array of product objects). Used by both content scripts (on amazon.in, flipkart.com) and the compare page (chrome-extension:// origin). Switching to `chrome.storage.local` was necessary because IndexedDB is origin-scoped — the compare page couldn't read data written by content scripts.

### Site Registry
Each `sites/*.js` file registers a config object into `window.SITE_REGISTRY`. `sites.js` provides `getSiteConfig(hostname)`, `scrapeProduct(cfg)`, and `buildAffiliateUrl(id, cfg)`.

**Adding a new site**: create `sites/walmart.js`, add one `content_scripts` block + `host_permissions` entry in `manifest.json`. Zero other files change.

### Content Script Load Order (per manifest)
```
db.js → sites/amazon.js → sites.js → content.js   (Amazon pages)
db.js → sites/flipkart.js → sites.js → content.js  (Flipkart pages)
```

---

## Product Object Schema (stored in chrome.storage.local)

```js
{
  asin: "B0CTHD9DRR",          // product ID (ASIN for Amazon, PID for Flipkart)
  site: "amazon",               // "amazon" | "flipkart"
  title: "...",
  price: "16990.00",            // string, digits + decimal
  image: "https://...",
  rating: "4.3 out of 5 stars",
  reviewCount: "1,234 ratings",
  bullets: ["feature 1", ...],  // up to 8, from product page
  url: "https://www.amazon.in/dp/B0CTHD9DRR",
  affiliateUrl: "https://www.amazon.in/gp/aws/cart/add.html?ASIN.1=B0CTHD9DRR&Quantity.1=1&tag=karthickcart-21",
  addedAt: 1720000000000,       // Date.now()
  specTable: {                  // populated by enrichment on compare page open
    "Brand Name": "Cockatoo",
    "Item Weight": "24 Kilograms",
    ...
  }
}
```

---

## Site Config Shape (both sites follow this)

```js
{
  site: "amazon",
  baseUrl: "https://www.amazon.in",
  productPattern: /\/dp\//,          // test against location.pathname
  searchPattern: /^\/s\b/,
  extractAsin: url => "...",         // extract product ID from URL
  buttonAnchor: "#addToCart_feature_div, #almAddToCart_feature_div",
  scrape: { title, priceWhole, priceFraction, image, rating, reviewCount, bullets },

  // Card injection (listing pages)
  cardSelector: "...",               // CSS selector for card containers
  extractCardId: cardEl => "...",    // extract product ID from card DOM
  scrapeCard: cardEl => ({ title, image, price, rating, reviewCount, detailPath }),

  // Optional overrides
  buildAffiliateUrl: id => "...",    // if absent, falls back to Amazon add-to-cart format
  enrichProduct: async product => product,  // fetches detail page, adds specTable + title + bullets
}
```

---

## Amazon Selectors (confirmed against page-refs/)

| Data | Selector |
|------|----------|
| Product title | `#productTitle` |
| Price whole | `.a-price-whole` |
| Price fraction | `.a-price-fraction` |
| Main image | `#landingImage` |
| Rating | `.a-icon-alt` |
| Review count | `#acrCustomerReviewText` |
| Feature bullets | `#feature-bullets li .a-list-item` |
| Spec table rows | `table.prodDetTable tr` |
| Spec key | `th.prodDetSectionEntry` |
| Spec value | `td.prodDetAttrValue` |
| Add to cart div | `#addToCart_feature_div` |
| ALM add to cart (Amazon Fresh) | `#almAddToCart_feature_div` |

### Amazon Card Types (all handled)

| Type | Selector | ASIN source |
|------|----------|-------------|
| Standard search result | `[data-component-type="s-search-result"][data-asin]` | `data-asin` |
| p13n widget (with data-asin) | `[data-csa-c-item-type="asin"][data-asin]` | `data-asin` |
| Buy-again / carousel | `[data-csa-c-item-type="asin"][data-csa-c-item-id^="amzn1.asin."]` | split `data-csa-c-item-id` on `.`, take last part |
| Standard listing card | `.s-card-container` | href regex `/dp/([A-Z0-9]{10})/` |
| Obfuscated carousel | `[class*="_cDEzb_productContainer_"]` | href regex |

**Button insertion**: after `[data-cy="delivery-recipe"]`, else before `[aria-label^="Add to Cart"]`, else `appendChild`.

**Button anchor for product page**: tries `#addToCart_feature_div` then `#almAddToCart_feature_div`; skips if inside `.aok-hidden` or `[aria-hidden="true"]` (Amazon Fresh accordion).

---

## Flipkart Selectors (listing cards only — product page TBD)

| Data | Selector / Source |
|------|-------------------|
| Card container | `[data-tkid]` where tkid = `"UUID.PID.TYPE"` (exactly 3 dots) |
| Product ID | `data-tkid` split on `.` → index 1 (the PID) |
| Title | `a.pIpigb` (title attribute or textContent) |
| Image | `img.UCc1lI` |
| Price | `.hZ3P6w` |
| Rating | `.MKiFS6` |
| Review count | `.PvbNMB` |

**Note**: Flipkart class names are obfuscated and rotate. Update `sites/flipkart.js` `scrapeCard` when they change.

**Flipkart product page**: `buttonAnchor` and `scrape` selectors are placeholders. Need product page HTML to fill them in. Share a Flipkart product detail page HTML and update `sites/flipkart.js`.

---

## Compare Page (compare.html)

1. Loads `db.js`, `sites/amazon.js`, `sites/flipkart.js`, `sites.js`, `compare.js`
2. `render()` → `DB.getAll()` → renders product header cards immediately
3. For products with empty `specTable`: calls `cfg.enrichProduct(product)` in parallel
   — Amazon enrichment: `fetch(origin/dp/ASIN)` → DOMParser → extract title + bullets + `prodDetTable` rows
4. Saves enriched products back to DB (so next open is instant)
5. Re-renders: product header row + spec comparison table
6. "Show differences only" toggle: hides rows where all product values are identical

---

## Key Known Issues / Pending Work

- **Flipkart product page button**: `buttonAnchor: ""` means no button on Flipkart product detail pages. Need HTML to confirm selectors.
- **Flipkart enrichProduct**: not implemented. Needs Flipkart product page spec table selectors.
- **Flipkart class names rotate**: `scrapeCard` selectors will break when Flipkart deploys new CSS.
- **Extension context invalidated**: after extension reload, content scripts on open tabs throw. Fix: hard-refresh tabs after reloading the extension. The error is caught gracefully in db.js.
- **Cross-site compare**: works — Amazon + Flipkart products can be compared together. specTable only populated for Amazon (until Flipkart enrichProduct is added).

---

## Affiliate Setup

- Amazon: tag `karthickcart-21` hardcoded in `sites.js` `buildAffiliateUrl`. URL format: `https://www.amazon.in/gp/aws/cart/add.html?ASIN.1=ASIN&Quantity.1=1&tag=karthickcart-21` (90-day cookie window via add-to-cart URL).
- Flipkart: no affiliate tag yet. Uses direct product URL.

---

## Adding a New Site (e.g. Meesho)

1. Create `chrome-extension/sites/meesho.js` following the same shape as `amazon.js`
2. Add to `manifest.json`:
   - `host_permissions`: `"*://*.meesho.com/*"`
   - New `content_scripts` block with `"sites/meesho.js"` in js array
   - `web_accessible_resources` matches entry
3. Load `sites/meesho.js` in `compare.html` `<script>` tags
4. No changes to `content.js`, `sites.js`, `db.js`, or `compare.js`
