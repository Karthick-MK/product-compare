# Chrome Extension: CompareXT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Manifest V3 Chrome extension that injects an "Add to Compare" button on Amazon product pages, stores up to 10 products in IndexedDB, and opens a self-contained comparison tab with affiliate links.

**Architecture:** Content script scrapes product data from Amazon DOM and stores it in IndexedDB via a shared `db.js` module. A floating bar tracks the compare list. Clicking "Compare" sends a message to the background service worker which opens `compare.html` — a self-contained tab that reads IndexedDB and renders a horizontal product comparison table.

**Tech Stack:** Vanilla JS (no bundler), Manifest V3, IndexedDB, Chrome Extension APIs

## Global Constraints

- Manifest version: 3
- No npm, no bundler, no TypeScript — plain `.js` files loaded directly
- All files live under `chrome-extension/` at the repo root
- IndexedDB database name: `compareXT`, store name: `products`, key path: `asin`
- Max products: 10, enforced in `db.js`
- Affiliate tag constant: `AFFILIATE_TAG = "YOUR-TAG-HERE"` in `compare.js` — user replaces before publishing
- Amazon host permissions: `*://*.amazon.in/*` and `*://*.amazon.com/*` only
- Content scripts load order: `db.js` → `sites.js` → `content.js`

---

## File Map

| File | Responsibility |
|------|---------------|
| `chrome-extension/manifest.json` | Extension config, permissions, content script registration |
| `chrome-extension/db.js` | IndexedDB wrapper — openDB, addProduct, getAll, removeProduct, clear, getCount |
| `chrome-extension/sites.js` | Per-site config map + scrapeProduct() + getSiteConfig() helpers |
| `chrome-extension/content.js` | Injected on Amazon: detects product page, injects button + floating bar, handles user interactions |
| `chrome-extension/content.css` | Styles for injected button and floating bar |
| `chrome-extension/background.js` | Service worker: handles OPEN_COMPARE message, analytics stub |
| `chrome-extension/compare.html` | Compare tab HTML shell |
| `chrome-extension/compare.js` | Reads IndexedDB, renders product table, handles remove/clear |
| `chrome-extension/compare.css` | Compare page styles |
| `chrome-extension/popup.html` | Toolbar popup: shows count + open compare button |
| `chrome-extension/popup.js` | Reads count from IndexedDB, wires buttons |
| `chrome-extension/icons/icon.svg` | Single SVG icon used at all sizes |

---

## Task 1: Scaffold + manifest.json + icon

**Files:**
- Create: `chrome-extension/manifest.json`
- Create: `chrome-extension/icons/icon.svg`

**Interfaces:**
- Produces: loadable extension skeleton (no functionality yet)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p chrome-extension/icons
```

- [ ] **Step 2: Create the icon**

Create `chrome-extension/icons/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="16" fill="#2563eb"/>
  <text x="50%" y="54%" font-size="72" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="sans-serif">⇌</text>
</svg>
```

- [ ] **Step 3: Create manifest.json**

Create `chrome-extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "CompareXT",
  "version": "1.0.0",
  "description": "Compare Amazon products side-by-side",
  "icons": {
    "16": "icons/icon.svg",
    "48": "icons/icon.svg",
    "128": "icons/icon.svg"
  },
  "permissions": ["storage"],
  "host_permissions": [
    "*://*.amazon.in/*",
    "*://*.amazon.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["*://*.amazon.in/*", "*://*.amazon.com/*"],
      "js": ["db.js", "sites.js", "content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icons/icon.svg"
  },
  "web_accessible_resources": [
    {
      "resources": ["compare.html"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

- [ ] **Step 4: Create empty placeholder files so Chrome doesn't error on load**

```bash
touch chrome-extension/background.js
touch chrome-extension/db.js
touch chrome-extension/sites.js
touch chrome-extension/content.js
touch chrome-extension/content.css
touch chrome-extension/compare.html
touch chrome-extension/compare.js
touch chrome-extension/compare.css
touch chrome-extension/popup.html
touch chrome-extension/popup.js
```

- [ ] **Step 5: Load extension in Chrome and verify it appears**

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" → select `chrome-extension/` folder
4. Expected: "CompareXT" appears in the list with no errors
5. Expected: blue icon appears in toolbar

- [ ] **Step 6: Commit**

```bash
git add chrome-extension/
git commit -m "feat: scaffold chrome extension manifest and icons"
```

---

## Task 2: db.js — IndexedDB wrapper

**Files:**
- Modify: `chrome-extension/db.js`

**Interfaces:**
- Produces (used by `content.js`, `compare.js`, `popup.js`):
  - `window.DB.addProduct(product)` → `Promise<void>` — throws `Error("Compare list is full (10/10)")` if count >= 10
  - `window.DB.getAll()` → `Promise<Product[]>` — sorted by `addedAt` asc
  - `window.DB.removeProduct(asin)` → `Promise<void>`
  - `window.DB.clear()` → `Promise<void>`
  - `window.DB.getCount()` → `Promise<number>`
  - `window.DB.hasProduct(asin)` → `Promise<boolean>`

- [ ] **Step 1: Write db.js**

```js
(() => {
  const DB_NAME = "compareXT";
  const STORE = "products";
  const VERSION = 1;
  const MAX = 10;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "asin" });
          store.createIndex("addedAt", "addedAt", { unique: false });
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  async function addProduct(product) {
    const db = await openDB();
    const count = await getCount();
    const already = await hasProduct(product.asin);
    if (!already && count >= MAX) {
      throw new Error(`Compare list is full (${MAX}/${MAX})`);
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(product);
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  }

  async function getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).index("addedAt").getAll();
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  async function removeProduct(asin) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(asin);
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  }

  async function clear() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  }

  async function getCount() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).count();
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  async function hasProduct(asin) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(asin);
      req.onsuccess = e => resolve(e.target.result !== undefined);
      req.onerror = e => reject(e.target.error);
    });
  }

  window.DB = { addProduct, getAll, removeProduct, clear, getCount, hasProduct };
})();
```

- [ ] **Step 2: Manually test db.js in Chrome DevTools**

1. Visit any page in Chrome
2. Open DevTools → Console
3. Paste and run this test script:

```js
// Paste db.js content first, then run:
async function testDB() {
  await DB.clear();
  console.assert((await DB.getCount()) === 0, "count should be 0");

  await DB.addProduct({ asin: "B001TEST01", site: "amazon", title: "Test", price: "₹100", image: "", rating: "4.0", reviewCount: "10", bullets: ["bullet1"], url: "http://example.com", affiliateUrl: "http://example.com?tag=test", addedAt: Date.now() });
  console.assert((await DB.getCount()) === 1, "count should be 1");
  console.assert((await DB.hasProduct("B001TEST01")) === true, "should have product");

  await DB.removeProduct("B001TEST01");
  console.assert((await DB.getCount()) === 0, "count should be 0 after remove");

  // Test max enforcement
  for (let i = 0; i < 10; i++) {
    await DB.addProduct({ asin: `B00TEST${String(i).padStart(4,"0")}`, site: "amazon", title: `P${i}`, price: "₹1", image: "", rating: "", reviewCount: "", bullets: [], url: "", affiliateUrl: "", addedAt: Date.now() + i });
  }
  try {
    await DB.addProduct({ asin: "BOVERFULL1", site: "amazon", title: "over", price: "", image: "", rating: "", reviewCount: "", bullets: [], url: "", affiliateUrl: "", addedAt: Date.now() });
    console.assert(false, "should have thrown");
  } catch(e) {
    console.assert(e.message.includes("full"), "error should mention full");
  }
  console.log("All DB tests passed");
  await DB.clear();
}
testDB().catch(console.error);
```

Expected output: `All DB tests passed`

- [ ] **Step 3: Commit**

```bash
git add chrome-extension/db.js
git commit -m "feat: add IndexedDB wrapper (db.js)"
```

---

## Task 3: sites.js — site config + scraping helpers

**Files:**
- Modify: `chrome-extension/sites.js`

**Interfaces:**
- Consumes: DOM (called from content script context)
- Produces (used by `content.js`):
  - `window.getSiteConfig(hostname)` → `SiteConfig | null`
  - `window.scrapeProduct(siteConfig)` → `ScrapedProduct` — `{ asin, title, price, image, rating, reviewCount, bullets }` — fields may be empty string if not found
  - `window.buildAffiliateUrl(asin, siteConfig)` → `string`

- [ ] **Step 1: Write sites.js**

```js
(() => {
  const SITES = {
    "amazon.in": {
      site: "amazon",
      baseUrl: "https://www.amazon.in",
      productPattern: /\/dp\//,
      extractAsin: url => (url.match(/\/dp\/([A-Z0-9]{10})/) || [])[1] || null,
      buttonAnchor: "#add-to-cart-button",
      scrape: {
        title: "#productTitle",
        priceWhole: ".a-price-whole",
        priceFraction: ".a-price-fraction",
        image: "#landingImage",
        rating: ".a-icon-alt",
        reviewCount: "#acrCustomerReviewText",
        bullets: "#feature-bullets li .a-list-item",
      },
    },
  };

  // amazon.com shares same selectors
  SITES["amazon.com"] = { ...SITES["amazon.in"], baseUrl: "https://www.amazon.com" };

  function getSiteConfig(hostname) {
    for (const key of Object.keys(SITES)) {
      if (hostname.includes(key)) return SITES[key];
    }
    return null;
  }

  function scrapeProduct(siteConfig) {
    const s = siteConfig.scrape;
    const asin = siteConfig.extractAsin(location.href);

    const titleEl = document.querySelector(s.title);
    const title = titleEl ? titleEl.textContent.trim() : "";

    const wholeEl = document.querySelector(s.priceWhole);
    const fracEl = document.querySelector(s.priceFraction);
    const price = wholeEl
      ? (wholeEl.textContent.trim().replace(/\D/g, "") + "." + (fracEl ? fracEl.textContent.trim() : "00"))
      : "";

    const imageEl = document.querySelector(s.image);
    const image = imageEl ? (imageEl.src || imageEl.getAttribute("data-old-hires") || "") : "";

    const ratingEl = document.querySelector(s.rating);
    const rating = ratingEl ? ratingEl.textContent.trim() : "";

    const reviewEl = document.querySelector(s.reviewCount);
    const reviewCount = reviewEl ? reviewEl.textContent.trim() : "";

    const bulletEls = document.querySelectorAll(s.bullets);
    const bullets = Array.from(bulletEls)
      .map(el => el.textContent.trim())
      .filter(t => t.length > 0)
      .slice(0, 8); // cap at 8 bullets

    return { asin, title, price, image, rating, reviewCount, bullets };
  }

  function buildAffiliateUrl(asin, siteConfig) {
    const AFFILIATE_TAG = "YOUR-TAG-HERE";
    return `${siteConfig.baseUrl}/dp/${asin}?tag=${AFFILIATE_TAG}`;
  }

  window.getSiteConfig = getSiteConfig;
  window.scrapeProduct = scrapeProduct;
  window.buildAffiliateUrl = buildAffiliateUrl;
})();
```

- [ ] **Step 2: Manual test — visit an Amazon product page**

1. Reload the extension at `chrome://extensions/`
2. Visit any Amazon.in product page (e.g. search for any product, click one with `/dp/` in URL)
3. Open DevTools Console
4. Run:

```js
const cfg = getSiteConfig(location.hostname);
console.log("Config found:", !!cfg);
const data = scrapeProduct(cfg);
console.log("ASIN:", data.asin);
console.log("Title:", data.title);
console.log("Price:", data.price);
console.log("Bullets:", data.bullets.length);
```

Expected: ASIN is a 10-char alphanumeric, title is the product name, at least 1 bullet.

- [ ] **Step 3: Commit**

```bash
git add chrome-extension/sites.js
git commit -m "feat: add site config map and scraping helpers (sites.js)"
```

---

## Task 4: background.js — service worker

**Files:**
- Modify: `chrome-extension/background.js`

**Interfaces:**
- Consumes: `chrome.runtime.onMessage` with `{ type: "OPEN_COMPARE" }`
- Produces: opens `compare.html` in new tab

- [ ] **Step 1: Write background.js**

```js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "OPEN_COMPARE") {
    chrome.tabs.create({ url: chrome.runtime.getURL("compare.html") });
  }
  // ponytail: analytics stub — POST to /api/ext/event when msg.type === "PRODUCT_ADDED"
});
```

- [ ] **Step 2: Reload extension and verify service worker starts**

1. Go to `chrome://extensions/`
2. Click "Reload" on CompareXT
3. Click "Service Worker" link — DevTools opens
4. Expected: no errors in console

- [ ] **Step 3: Commit**

```bash
git add chrome-extension/background.js
git commit -m "feat: add background service worker (background.js)"
```

---

## Task 5: content.js + content.css — injected UI

**Files:**
- Modify: `chrome-extension/content.js`
- Modify: `chrome-extension/content.css`

**Interfaces:**
- Consumes: `window.DB` (from db.js), `window.getSiteConfig`, `window.scrapeProduct`, `window.buildAffiliateUrl` (from sites.js)
- Produces: "Add to Compare" button in Amazon page, floating compare bar at bottom

- [ ] **Step 1: Write content.css**

```css
#cxt-add-btn {
  display: inline-block;
  margin-top: 8px;
  padding: 10px 18px;
  background: #2563eb;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
  max-width: 350px;
}
#cxt-add-btn:disabled {
  background: #94a3b8;
  cursor: default;
}
#cxt-add-btn.added {
  background: #16a34a;
}

#cxt-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999999;
  background: #1e293b;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.3);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
}
#cxt-bar-thumbs {
  display: flex;
  gap: 4px;
  flex: 1;
  overflow: hidden;
}
.cxt-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
  border: 2px solid #334155;
  cursor: pointer;
  flex-shrink: 0;
}
.cxt-thumb:hover {
  border-color: #ef4444;
}
#cxt-compare-btn {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
#cxt-compare-btn:disabled {
  background: #475569;
  cursor: default;
}
#cxt-clear-btn {
  background: transparent;
  color: #94a3b8;
  border: 1px solid #475569;
  border-radius: 20px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
#cxt-clear-btn:hover {
  color: #ef4444;
  border-color: #ef4444;
}
#cxt-fallback-pill {
  position: fixed;
  bottom: 80px;
  right: 16px;
  z-index: 999998;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 24px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

- [ ] **Step 2: Write content.js**

```js
(async () => {
  const siteConfig = getSiteConfig(location.hostname);

  // Only run on product pages
  const isProductPage = siteConfig
    ? siteConfig.productPattern.test(location.pathname)
    : location.pathname.includes("/dp/");

  if (!isProductPage) return;

  // --- Floating bar ---
  const bar = document.createElement("div");
  bar.id = "cxt-bar";
  bar.innerHTML = `
    <div id="cxt-bar-thumbs"></div>
    <button id="cxt-compare-btn" disabled>COMPARE (0)</button>
    <button id="cxt-clear-btn">× Clear</button>
  `;
  document.body.appendChild(bar);

  async function renderBar() {
    const products = await DB.getAll();
    const thumbs = document.getElementById("cxt-bar-thumbs");
    const compareBtn = document.getElementById("cxt-compare-btn");
    thumbs.innerHTML = products.map(p => `
      <img class="cxt-thumb" src="${p.image || ''}" title="${p.title}" data-asin="${p.asin}" onerror="this.style.display='none'"/>
    `).join("");
    compareBtn.textContent = `COMPARE (${products.length})`;
    compareBtn.disabled = products.length < 2;
    thumbs.querySelectorAll(".cxt-thumb").forEach(img => {
      img.addEventListener("click", async () => {
        await DB.removeProduct(img.dataset.asin);
        await renderBar();
        updateAddBtn();
      });
    });
  }

  document.getElementById("cxt-compare-btn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_COMPARE" });
  });
  document.getElementById("cxt-clear-btn").addEventListener("click", async () => {
    await DB.clear();
    await renderBar();
    updateAddBtn();
  });

  await renderBar();

  // --- "Add to Compare" button ---
  let addBtn = null;

  function createAddBtn() {
    const btn = document.createElement("button");
    btn.id = "cxt-add-btn";
    btn.textContent = "Add to Compare";
    btn.addEventListener("click", async () => {
      if (btn.disabled) return;
      try {
        const scraped = scrapeProduct(siteConfig || getFallbackConfig());
        if (!scraped.asin) { alert("Could not find product ID on this page."); return; }
        const affiliateUrl = buildAffiliateUrl(scraped.asin, siteConfig || getFallbackConfig());
        await DB.addProduct({
          ...scraped,
          site: (siteConfig || {}).site || "amazon",
          url: location.href,
          affiliateUrl,
          addedAt: Date.now(),
        });
        await updateAddBtn();
        await renderBar();
      } catch (e) {
        alert(e.message);
      }
    });
    return btn;
  }

  async function updateAddBtn() {
    if (!addBtn) return;
    const asin = siteConfig
      ? siteConfig.extractAsin(location.href)
      : (location.href.match(/\/dp\/([A-Z0-9]{10})/) || [])[1];
    const count = await DB.getCount();
    const has = asin ? await DB.hasProduct(asin) : false;
    if (has) {
      addBtn.textContent = "✓ Added";
      addBtn.disabled = true;
      addBtn.classList.add("added");
    } else if (count >= 10) {
      addBtn.textContent = "Compare full (10/10)";
      addBtn.disabled = true;
      addBtn.classList.remove("added");
    } else {
      addBtn.textContent = "Add to Compare";
      addBtn.disabled = false;
      addBtn.classList.remove("added");
    }
  }

  function getFallbackConfig() {
    return {
      site: "amazon",
      baseUrl: location.origin,
      extractAsin: url => (url.match(/\/dp\/([A-Z0-9]{10})/) || [])[1] || null,
      scrape: {
        title: "#productTitle",
        priceWhole: ".a-price-whole",
        priceFraction: ".a-price-fraction",
        image: "#landingImage",
        rating: ".a-icon-alt",
        reviewCount: "#acrCustomerReviewText",
        bullets: "#feature-bullets li .a-list-item",
      },
    };
  }

  addBtn = createAddBtn();

  if (siteConfig) {
    const anchor = document.querySelector(siteConfig.buttonAnchor);
    if (anchor) {
      anchor.parentNode.insertBefore(addBtn, anchor.nextSibling);
    } else {
      // buttonAnchor not found — fallback pill
      injectFallbackPill();
    }
  } else {
    injectFallbackPill();
  }

  function injectFallbackPill() {
    const pill = document.createElement("button");
    pill.id = "cxt-fallback-pill";
    pill.textContent = "+ Add to Compare";
    pill.addEventListener("click", () => addBtn.click());
    document.body.appendChild(pill);
  }

  await updateAddBtn();
})();
```

- [ ] **Step 3: Reload extension and test on Amazon**

1. `chrome://extensions/` → Reload CompareXT
2. Visit an Amazon.in product page (URL contains `/dp/`)
3. Expected: blue "Add to Compare" button appears below "Add to Cart"
4. Expected: dark floating bar visible at bottom of page
5. Click "Add to Compare" → button turns green "✓ Added", thumbnail appears in bar, counter shows "(1)"
6. Visit a second product, add it → counter shows "(2)", "COMPARE (2)" button becomes clickable
7. Click a thumbnail in the bar → product removed, counter decrements
8. Click "× Clear" → bar empties

- [ ] **Step 4: Commit**

```bash
git add chrome-extension/content.js chrome-extension/content.css
git commit -m "feat: inject Add to Compare button and floating bar (content.js)"
```

---

## Task 6: compare.html + compare.js + compare.css

**Files:**
- Modify: `chrome-extension/compare.html`
- Modify: `chrome-extension/compare.js`
- Modify: `chrome-extension/compare.css`

**Interfaces:**
- Consumes: `window.DB` from db.js
- Produces: horizontal comparison table tab, "Buy on Amazon" links with affiliate tag

- [ ] **Step 1: Write compare.css**

Matches the existing site's dark theme: surface `#0b1326`, primary `#adc6ff`, Hanken Grotesk + Inter from Google Fonts.

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: "Inter", -apple-system, sans-serif;
  background: #0b1326;
  color: #dae2fd;
  min-height: 100vh;
}

header {
  background: #131b2e;
  border-bottom: 1px solid #424754;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 10;
}
header h1 {
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: #adc6ff;
  flex: 1;
  letter-spacing: -0.01em;
}
header span { font-size: 12px; color: #c2c6d6; }
#clear-all-btn {
  background: transparent;
  border: 1px solid #424754;
  color: #c2c6d6;
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, color 0.15s;
}
#clear-all-btn:hover { color: #ffb2b7; border-color: #ffb2b7; }

#empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 70vh;
  gap: 8px;
  color: #c2c6d6;
  font-size: 15px;
}
#empty-state span:last-child { font-size: 13px; color: #424754; }

#compare-wrapper {
  overflow-x: auto;
  padding: 24px;
}
#compare-table {
  display: flex;
  gap: 0;
  min-width: max-content;
}

.product-col {
  width: 240px;
  background: #131b2e;
  border: 1px solid #424754;
  border-right: none;
  display: flex;
  flex-direction: column;
  transition: background 0.15s;
}
.product-col:first-child { border-radius: 10px 0 0 10px; }
.product-col:last-child { border-right: 1px solid #424754; border-radius: 0 10px 10px 0; }
.product-col:hover { background: #1a2540; }

.col-image-wrap {
  padding: 20px;
  background: #0b1326;
  border-bottom: 1px solid #424754;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 170px;
  position: relative;
}
.col-image-wrap a { display: flex; align-items: center; justify-content: center; }
.col-image-wrap img {
  max-width: 130px;
  max-height: 130px;
  object-fit: contain;
}

.col-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}
.col-title {
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  color: #dae2fd;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.col-price {
  font-family: "Hanken Grotesk", sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #adc6ff;
  letter-spacing: -0.02em;
}
.col-rating {
  font-size: 11px;
  color: #c2c6d6;
  display: flex;
  align-items: center;
  gap: 4px;
}
.col-rating .stars { color: #fbbf24; letter-spacing: 1px; }

.col-bullets-label {
  font-size: 10px;
  font-family: "JetBrains Mono", monospace;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #424754;
  padding-top: 4px;
  border-top: 1px solid #424754;
}
.col-bullets {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: 180px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #424754 transparent;
}
.col-bullets li {
  font-size: 11.5px;
  color: #c2c6d6;
  line-height: 1.45;
  padding-left: 12px;
  position: relative;
}
.col-bullets li::before {
  content: "›";
  position: absolute;
  left: 0;
  color: #4edea3;
  font-weight: 700;
}

.col-footer {
  padding: 14px 16px;
  border-top: 1px solid #424754;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.buy-btn {
  display: block;
  text-align: center;
  background: #ff9900;
  color: #0b1326;
  font-family: "Hanken Grotesk", sans-serif;
  font-weight: 700;
  font-size: 13px;
  padding: 10px;
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.15s;
}
.buy-btn:hover { background: #ffb347; }
.remove-btn {
  display: block;
  text-align: center;
  background: transparent;
  border: none;
  color: #424754;
  font-size: 11px;
  cursor: pointer;
  padding: 3px;
  font-family: inherit;
  transition: color 0.15s;
}
.remove-btn:hover { color: #ffb2b7; }
```

- [ ] **Step 2: Write compare.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>CompareXT</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="compare.css"/>
</head>
<body>
  <header>
    <h1>CompareXT</h1>
    <span id="product-count"></span>
    <button id="clear-all-btn">Clear All</button>
  </header>
  <div id="compare-wrapper">
    <div id="compare-table"></div>
  </div>
  <div id="empty-state" style="display:none">
    <span>No products to compare.</span>
    <span>Visit an Amazon product page and click "Add to Compare".</span>
  </div>
  <script src="db.js"></script>
  <script src="compare.js"></script>
</body>
</html>
```

- [ ] **Step 3: Write compare.js**

```js
const AFFILIATE_TAG = "YOUR-TAG-HERE";

function buildAffiliateUrl(asin, site) {
  const base = "https://www.amazon.in";
  return `${base}/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

function starString(ratingText) {
  const match = ratingText && ratingText.match(/(\d+(\.\d+)?)/);
  if (!match) return "";
  const n = parseFloat(match[1]);
  const full = Math.floor(n);
  const half = n - full >= 0.5 ? 1 : 0;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - half);
}

function renderProduct(product) {
  const affiliateUrl = buildAffiliateUrl(product.asin, product.site);
  const col = document.createElement("div");
  col.className = "product-col";
  col.dataset.asin = product.asin;

  const bulletsHtml = product.bullets && product.bullets.length
    ? `<div class="col-bullets-label">Features</div>
       <ul class="col-bullets">${product.bullets.map(b => `<li>${b}</li>`).join("")}</ul>`
    : "";

  const stars = starString(product.rating);

  col.innerHTML = `
    <div class="col-image-wrap">
      <a href="${affiliateUrl}" target="_blank" rel="noopener">
        <img src="${product.image || ""}" alt="${product.title}" onerror="this.style.display='none'"/>
      </a>
    </div>
    <div class="col-body">
      <div class="col-title">${product.title || "Unknown product"}</div>
      <div class="col-price">${product.price ? "₹" + product.price : "—"}</div>
      ${product.rating ? `<div class="col-rating"><span class="stars">${stars}</span><span>${product.rating}</span>${product.reviewCount ? `<span>· ${product.reviewCount}</span>` : ""}</div>` : ""}
      ${bulletsHtml}
    </div>
    <div class="col-footer">
      <a class="buy-btn" href="${affiliateUrl}" target="_blank" rel="noopener">Buy on Amazon →</a>
      <button class="remove-btn" data-asin="${product.asin}">Remove</button>
    </div>
  `;
  return col;
}

async function render() {
  const products = await DB.getAll();
  const table = document.getElementById("compare-table");
  const wrapper = document.getElementById("compare-wrapper");
  const empty = document.getElementById("empty-state");
  const count = document.getElementById("product-count");

  table.innerHTML = "";

  if (products.length === 0) {
    wrapper.style.display = "none";
    empty.style.display = "flex";
    count.textContent = "";
    return;
  }

  wrapper.style.display = "block";
  empty.style.display = "none";
  count.textContent = `${products.length} product${products.length !== 1 ? "s" : ""}`;

  products.forEach(p => {
    const col = renderProduct(p);
    col.querySelector(".remove-btn").addEventListener("click", async () => {
      await DB.removeProduct(p.asin);
      await render();
    });
    table.appendChild(col);
  });
}

document.getElementById("clear-all-btn").addEventListener("click", async () => {
  await DB.clear();
  await render();
});

render();
```

- [ ] **Step 4: Test the compare page**

1. Reload extension at `chrome://extensions/`
2. Visit 2–3 Amazon product pages, click "Add to Compare" on each
3. Click "COMPARE (N)" in the floating bar
4. Expected: new tab opens with dark (`#0b1326`) background, matching the main site's theme
5. Expected: each column has image, title, price in `#adc6ff` blue, star rating, bullet list with teal `›` markers
6. Expected: orange "Buy on Amazon →" button at bottom of each column
7. Click "Remove" → column disappears, count updates
8. Click "Clear All" → empty state shown on dark background

- [ ] **Step 5: Commit**

```bash
git add chrome-extension/compare.html chrome-extension/compare.js chrome-extension/compare.css
git commit -m "feat: add compare tab page with affiliate links (compare.html)"
```

---

## Task 7: popup.html + popup.js — toolbar popup

**Files:**
- Modify: `chrome-extension/popup.html`
- Modify: `chrome-extension/popup.js`

**Interfaces:**
- Consumes: `window.DB` from db.js
- Produces: toolbar popup showing product count, "Open Compare" and "Clear All" buttons

- [ ] **Step 1: Write popup.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { width: 220px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 16px; color: #1e293b; }
    h2 { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
    #count { font-size: 13px; color: #64748b; margin-bottom: 16px; }
    button { width: 100%; padding: 9px; border-radius: 8px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 8px; }
    #open-btn { background: #2563eb; color: #fff; }
    #open-btn:disabled { background: #94a3b8; cursor: default; }
    #clear-btn { background: transparent; border: 1px solid #e2e8f0; color: #64748b; }
    #clear-btn:hover { border-color: #ef4444; color: #ef4444; }
  </style>
</head>
<body>
  <h2>CompareXT</h2>
  <div id="count">Loading…</div>
  <button id="open-btn" disabled>Open Compare</button>
  <button id="clear-btn">Clear All</button>
  <script src="db.js"></script>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write popup.js**

```js
async function init() {
  const count = await DB.getCount();
  document.getElementById("count").textContent =
    count === 0 ? "No products added yet" : `${count} product${count !== 1 ? "s" : ""} in compare list`;
  const openBtn = document.getElementById("open-btn");
  openBtn.disabled = count < 2;
  openBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_COMPARE" });
    window.close();
  });
  document.getElementById("clear-btn").addEventListener("click", async () => {
    await DB.clear();
    await init();
  });
}
init();
```

- [ ] **Step 3: Test the popup**

1. Reload extension
2. Click the CompareXT icon in Chrome toolbar
3. Expected: popup opens showing "No products added yet", "Open Compare" is disabled
4. Add 2 products on Amazon, re-open popup
5. Expected: shows "2 products in compare list", "Open Compare" is enabled
6. Click "Open Compare" → compare tab opens, popup closes
7. Re-open popup → click "Clear All" → count resets to 0

- [ ] **Step 4: Final smoke test (end-to-end)**

1. Clear all data via popup
2. Visit 3 different Amazon.in product pages, add each to compare
3. Click extension icon → popup shows "3 products"
4. Click "Open Compare" → compare tab opens with 3 columns
5. Each column: image, title, price, rating, bullets, orange "Buy on Amazon →" button
6. Click "Buy on Amazon →" → opens Amazon URL with `?tag=YOUR-TAG-HERE` in URL
7. Remove one product → 2 columns remain
8. Clear all → empty state shown

- [ ] **Step 5: Commit**

```bash
git add chrome-extension/popup.html chrome-extension/popup.js
git commit -m "feat: add toolbar popup (popup.html)"
```

---

## Task 8: Set your affiliate tag

**Files:**
- Modify: `chrome-extension/compare.js` line with `AFFILIATE_TAG`
- Modify: `chrome-extension/sites.js` line with `AFFILIATE_TAG`

- [ ] **Step 1: Replace placeholder tag in compare.js**

In `chrome-extension/compare.js`, change:
```js
const AFFILIATE_TAG = "YOUR-TAG-HERE";
```
to your actual Amazon Associates tag (format: `yourname-21` for India).

- [ ] **Step 2: Replace placeholder tag in sites.js**

In `chrome-extension/sites.js`, change:
```js
const AFFILIATE_TAG = "YOUR-TAG-HERE";
```
to the same tag.

- [ ] **Step 3: Verify affiliate URL**

1. Add a product, open compare tab
2. Right-click "Buy on Amazon →" → Copy link address
3. Verify URL contains `?tag=yourname-21`

- [ ] **Step 4: Commit**

```bash
git add chrome-extension/compare.js chrome-extension/sites.js
git commit -m "feat: set Amazon Associates affiliate tag"
```
