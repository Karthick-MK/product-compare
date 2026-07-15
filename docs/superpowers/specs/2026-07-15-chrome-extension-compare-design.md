# Chrome Extension: Product Compare

**Date:** 2026-07-15  
**Scope:** Standalone Chrome extension (Manifest V3). Amazon-only v1, multi-site-ready architecture.

---

## Goal

Inject an "Add to Compare" button on Amazon product pages. Let users collect up to 10 products. Open a self-contained compare tab with affiliate links. No external server dependency.

---

## File Structure

```
chrome-extension/
├── manifest.json       # MV3, minimal permissions
├── background.js       # service worker, optional sync stub
├── content.js          # injected on Amazon: scrapes + injects UI
├── content.css         # floating bar + button styles
├── compare.html        # standalone compare tab
├── compare.js          # reads IndexedDB, renders table
├── compare.css         # compare page styles
├── db.js               # shared IndexedDB wrapper
├── sites.js            # per-site config map
└── icons/              # 16/48/128px PNG
```

---

## Data Model

**IndexedDB:** database `compareXT`, object store `products`, key path `asin`.

```js
{
  asin: string,          // primary key, from URL /dp/ASIN
  site: string,          // "amazon" — reserved for multi-site
  title: string,
  price: string,         // display string e.g. "₹4,999"
  image: string,         // main product image URL
  rating: string,        // "4.3 out of 5 stars"
  reviewCount: string,   // "1,243 ratings"
  bullets: string[],     // "About this item" list items
  url: string,           // original product page URL
  affiliateUrl: string,  // amazon.in/dp/ASIN?tag=AFFILIATE_TAG
  addedAt: number        // Date.now()
}
```

Max 10 products enforced at write time in `db.js`.

---

## User Flow

### On an Amazon product page
1. Content script detects `/dp/` URL pattern
2. Injects "Add to Compare" button adjacent to `#add-to-cart-button`
3. Button states:
   - Default: "Add to Compare"
   - Already added: "✓ Added" (disabled)
   - List full: "Compare full (10/10)" (disabled)
4. On click: scrape page → write to IndexedDB → update floating bar

### Floating bar (always visible on Amazon pages)
```
[ img img img ... ]  [ COMPARE (4) ]  [ × Clear All ]
```
- Fixed bottom of viewport
- Thumbnails of added products (click to remove)
- "Compare" button opens compare.html in new tab
- "Clear All" wipes IndexedDB

### Fallback (selector fails or unknown site)
Floating "Add to Compare" pill button fixed bottom-right. Scrapes page best-effort using fallback selectors. Always present so any product page works.

---

## Scraping Selectors (Amazon)

| Field        | Selector                               |
|--------------|----------------------------------------|
| Title        | `#productTitle`                        |
| Price        | `.a-price-whole` + `.a-price-fraction` |
| Image        | `#landingImage` (src attribute)        |
| Rating       | `.a-icon-alt` (first match)            |
| Review count | `#acrCustomerReviewText`               |
| ASIN         | URL regex `/\/dp\/([A-Z0-9]{10})/`     |
| Bullets      | `#feature-bullets li .a-list-item`     |

---

## Multi-Site Architecture (`sites.js`)

```js
const SITES = {
  "amazon.in": {
    productPattern: /\/dp\//,
    extractId: url => url.match(/\/dp\/([A-Z0-9]{10})/)?.[1],
    buttonAnchor: "#add-to-cart-button",
    scrape: {
      title: "#productTitle",
      price: { whole: ".a-price-whole", fraction: ".a-price-fraction" },
      image: "#landingImage",
      rating: ".a-icon-alt",
      reviewCount: "#acrCustomerReviewText",
      bullets: "#feature-bullets li .a-list-item",
    },
  },
  "amazon.com": { /* same as amazon.in */ },
}
```

Content script resolution order:
1. Match hostname → site config found → use config selectors
2. Config found but `buttonAnchor` not in DOM → inject fallback pill, still use scrape selectors
3. No config for hostname → inject fallback pill, skip structured scrape

Adding a new site = one object in `SITES`. No other code changes.

---

## Compare Page (`compare.html`)

New tab, reads IndexedDB on load.

**Layout:** horizontal table, products as columns.

| Row            | Content                                  |
|----------------|------------------------------------------|
| Image          | Product image, links to affiliateUrl     |
| Title          | Full product title                       |
| Price          | Highlighted price string                 |
| Rating         | Stars + review count                     |
| Features       | Bullet points, scrollable                |
| Buy button     | "Buy on Amazon →" → affiliateUrl         |
| Remove         | Removes column, updates IndexedDB        |

Header: product count + "Clear All" button.

**Affiliate tag:** constant `AFFILIATE_TAG` in `compare.js`. Every product URL rewritten to `https://www.amazon.in/dp/ASIN?tag=AFFILIATE_TAG`.

---

## Manifest V3

```json
{
  "manifest_version": 3,
  "name": "CompareXT",
  "version": "1.0.0",
  "permissions": ["storage"],
  "host_permissions": ["*://*.amazon.in/*", "*://*.amazon.com/*"],
  "background": { "service_worker": "background.js" },
  "content_scripts": [{
    "matches": ["*://*.amazon.in/*", "*://*.amazon.com/*"],
    "js": ["db.js", "sites.js", "content.js"],
    "css": ["content.css"]
  }],
  "action": { "default_popup": "popup.html" },
  "web_accessible_resources": [{
    "resources": ["compare.html"],
    "matches": ["<all_urls>"]
  }]
}
```

Minimal permissions — no `webRequest`, no `<all_urls>` content script. Passes Chrome Web Store review faster.

---

## Background Service Worker (`background.js`)

Handles message routing between content script and compare page.

```js
// ponytail: optional sync stub — wire up when backend ready
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "OPEN_COMPARE") {
    chrome.tabs.create({ url: chrome.runtime.getURL("compare.html") });
  }
  // TODO: POST to analytics endpoint when msg.type === "PRODUCT_ADDED"
});
```

---

## Constraints

- Max 10 products: enforced in `db.js` `addProduct()` — throws if count >= 10
- ASIN deduplication: `put()` on existing ASIN overwrites (idempotent re-add)
- Amazon DOM changes: if scrape selectors return empty strings, product is still saved with partial data — compare page handles missing fields gracefully
- No auth, no network calls in v1
