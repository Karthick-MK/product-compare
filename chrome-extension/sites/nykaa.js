window.SITE_REGISTRY = window.SITE_REGISTRY || {};

// Nykaa is a React/Emotion app: every visible class is a rotating hash (css-xxxx),
// so nothing CSS-based is reliable long-term. Robust anchors here are:
//   - the URL shape  /<slug>/p/<numericId>?productId=<numericId>
//   - accessible text: aria-label="N out of 5 star(s)", "Discounted price ₹N", h1
//   - on the live page, JSON-LD (schema.org Product) + window.__PRELOADED_STATE__
// The saved page-refs are DOM-only slices (no <head>/scripts), so enrichProduct
// reads structured data when the live server response has it and falls back to
// the same DOM/text anchors otherwise.
window.SITE_REGISTRY["nykaa.com"] = {
  site: "nykaa",
  baseUrl: "https://www.nykaa.com",
  productPattern: /\/p\/\d+/,
  searchPattern: /\/(search\/result|c\/\d+)/,
  extractAsin: url => {
    const q = url.match(/[?&]productId=(\d+)/);
    if (q) return q[1];
    const p = url.match(/\/p\/(\d+)/);
    return p ? p[1] : "";
  },

  // Buy-box is a hashed <div>, no stable anchor → floating pill (see content.js).
  // Title/price/rating come from the DOM text anchors; image/id/specs are refilled
  // by enrichProduct from the live product page's structured data.
  buttonAnchor: "",
  scrape: {
    title: "h1",
    priceWhole: "",
    priceFraction: "",
    image: "",
    rating: '[aria-label*="out of 5 star"]',
    reviewCount: "",
    bullets: "",
  },

  // No Nykaa affiliate program wired up — point the buy button at the product page.
  buildAffiliateUrl: id => `https://www.nykaa.com/p/${id}?productId=${id}`,

  // --- Card (listing / search / category grids) ---
  // Each product tile is a `.productWrapper` (non-hashed, stable) wrapping an
  // <a href=".../p/<id>?productId=<id>">.
  cardSelector: '.productWrapper, a[href*="/p/"]',

  extractCardId: cardEl => {
    // Skip bare anchors nested inside a .productWrapper (the wrapper handles them).
    if (cardEl.matches('a[href*="/p/"]') &&
        cardEl.parentElement && cardEl.parentElement.closest('.productWrapper')) {
      return null;
    }
    const href = cardEl.matches('a[href]')
      ? cardEl.getAttribute('href')
      : (cardEl.querySelector('a[href*="/p/"]') || {}).getAttribute?.('href');
    if (!href) return null;
    const q = href.match(/[?&]productId=(\d+)/);
    if (q) return q[1];
    const p = href.match(/\/p\/(\d+)/);
    return p ? p[1] : null;
  },

  scrapeCard: cardEl => {
    const linkEl = cardEl.matches('a[href*="/p/"]')
      ? cardEl
      : cardEl.querySelector('a[href*="/p/"]');
    const scope   = linkEl || cardEl;
    const titleEl = scope.querySelector('h2') || scope.querySelector('h3');
    const imageEl = scope.querySelector('img');

    // Nykaa renders an accessible price line "Regular price ₹X. Discounted price ₹Y."
    // — parse the text (class hashes rotate) and prefer the discounted figure.
    const priceLine = Array.from(scope.querySelectorAll('span'))
      .map(s => s.textContent)
      .find(t => /Discounted price\s*₹/.test(t)) || "";
    const disc = priceLine.match(/Discounted price\s*₹([\d,]+)/);
    const reg  = priceLine.match(/Regular price\s*₹([\d,]+)/);
    const price = disc ? disc[1].replace(/,/g, "") + ".00"
                : reg  ? reg[1].replace(/,/g, "") + ".00"
                : "";

    const ratingEl = scope.querySelector('[aria-label*="out of 5 star"]');
    const ratingM  = ratingEl && (ratingEl.getAttribute('aria-label').match(/([\d.]+)\s*out of 5/));
    const reviewEl = scope.querySelector('[aria-label$="reviews"], [aria-label$="review"]');
    const reviewM  = reviewEl && (reviewEl.getAttribute('aria-label').match(/([\d,]+)/));

    const href = linkEl ? (linkEl.getAttribute('href') || '') : '';
    return {
      title:       titleEl ? titleEl.textContent.trim()
                 : imageEl ? (imageEl.getAttribute('alt') || '').trim() : "",
      image:       imageEl ? (imageEl.getAttribute('src') || imageEl.src || "") : "",
      price,
      rating:      ratingM ? `${ratingM[1]} out of 5 stars` : "",
      reviewCount: reviewM ? `${reviewM[1]} reviews` : "",
      detailPath:  href ? href.split('?')[0] : null,
    };
  },

  // --- Compare page enrichment ---
  // Fetch the product page and prefer structured data (survives class rotation):
  //   1. JSON-LD schema.org Product   2. window.__PRELOADED_STATE__   3. DOM text.
  // Builds product.specTable from the state JSON's product-detail attributes when
  // present, else seeds a couple of comparable rows from JSON-LD.
  enrichProduct: async (product) => {
    const url = product.url && product.url.startsWith('http')
      ? product.url
      : `https://www.nykaa.com${product.url || ('/p/' + (product.asin || ''))}`;
    const response = await fetch(url, { credentials: 'include' });
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const parse = s => { try { return JSON.parse(s); } catch (_) { return null; } };

    // 1. JSON-LD Product (authoritative header data on the live page).
    let ld = null;
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      if (ld) return;
      const parsed = parse(s.textContent);
      if (!parsed) return;
      ld = (Array.isArray(parsed) ? parsed : [parsed]).find(o => o && o['@type'] === 'Product') || null;
    });
    if (ld) {
      if (ld.name) product.title = ld.name;
      const img = Array.isArray(ld.image) ? ld.image[0] : ld.image;
      if (img) product.image = img;
      const offers = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
      if (offers && offers.price != null) product.price = String(offers.price);
      const ar = ld.aggregateRating;
      if (ar) {
        if (ar.ratingValue != null) product.rating = `${ar.ratingValue} out of 5 stars`;
        const rc = ar.reviewCount != null ? ar.reviewCount : ar.ratingCount;
        if (rc != null) product.reviewCount = `${rc} reviews`;
      }
    }

    // 2. DOM/text fallbacks (also the only source in the saved page-refs).
    if (!product.title) {
      const h1 = doc.querySelector('h1');
      if (h1) product.title = h1.textContent.trim();
    }
    if (!product.image) {
      const og = doc.querySelector('meta[property="og:image"]');
      const im = og ? og.content : (doc.querySelector('img') || {}).src;
      if (im) product.image = im;
    }
    if (!product.price) {
      const line = Array.from(doc.querySelectorAll('span'))
        .map(s => s.textContent)
        .find(t => /Discounted price\s*₹/.test(t)) || "";
      const m = line.match(/Discounted price\s*₹([\d,]+)/) || line.match(/Regular price\s*₹([\d,]+)/);
      if (m) product.price = m[1].replace(/,/g, "") + ".00";
    }
    if (!product.rating) {
      const r = doc.querySelector('[aria-label*="out of 5 star"]');
      const m = r && r.getAttribute('aria-label').match(/([\d.]+)\s*out of 5/);
      if (m) product.rating = `${m[1]} out of 5 stars`;
    }

    // 3. Spec table. Nykaa keeps the "Product Details" attributes in the page state
    // (window.__PRELOADED_STATE__ / __NEXT_DATA__). Pull the JSON blob and read the
    // productDescription / details attribute list from it.
    const specTable = {};
    const stateM = html.match(/window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/)
                || html.match(/__NEXT_DATA__[^>]*>\s*({[\s\S]*?})\s*<\/script>/);
    const state = stateM ? parse(stateM[1]) : null;
    if (state) {
      // Search the state tree for a product node carrying detail attributes.
      const stack = [state];
      let guard = 0;
      while (stack.length && guard++ < 5000) {
        const node = stack.pop();
        if (!node || typeof node !== 'object') continue;
        // Nykaa detail attributes: array of { name/key, value } objects.
        const attrs = node.detailInfoList || node.productDetailsInfo || node.attributes;
        if (Array.isArray(attrs)) {
          attrs.forEach(a => {
            const k = a && (a.name || a.key || a.label);
            const v = a && (a.value || a.description);
            if (k && v && typeof k === 'string' && typeof v === 'string' && !specTable[k]) {
              specTable[k] = v;
            }
          });
        }
        for (const k in node) {
          const v = node[k];
          if (v && typeof v === 'object') stack.push(v);
        }
      }
    }
    // Fallback: seed comparable rows from JSON-LD so the table is never empty.
    if (!Object.keys(specTable).length && ld) {
      if (ld.brand) specTable['Brand'] = typeof ld.brand === 'string' ? ld.brand : ld.brand.name;
      if (ld.category) specTable['Category'] = ld.category;
      if (ld.sku) specTable['SKU'] = String(ld.sku);
      if (ld.gtin13) specTable['GTIN'] = String(ld.gtin13);
    }
    product.specTable = specTable;

    product.affiliateUrl = url;
    return product;
  },
};
