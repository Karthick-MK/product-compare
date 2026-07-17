window.SITE_REGISTRY = window.SITE_REGISTRY || {};

window.SITE_REGISTRY["flipkart.com"] = {
  site: "flipkart",
  baseUrl: "https://www.flipkart.com",
  productPattern: /\/p\/itm/,
  searchPattern: /\/search\b/,
  extractAsin: url => {
    const m = url.match(/[?&]pid=([A-Z0-9]+)/);
    if (m) return m[1];
    const itm = url.match(/\/p\/(itm[a-z0-9]+)/i);
    return itm ? itm[1] : "";
  },
  // Product page. Flipkart classes are hashed & rotate, so live-page scrape only
  // grabs the title (h1) + product id; enrichProduct (below) refills everything
  // from JSON-LD when the compare page opens.
  buttonAnchor: "",
  scrape: {
    title: "h1",
    priceWhole: "",
    priceFraction: "",
    image: "",
    rating: "",
    reviewCount: "",
    bullets: "",
  },

  // Flipkart affiliate — no tag yet; uses direct product URL
  buildAffiliateUrl: pid => `https://www.flipkart.com/product/p/itm?pid=${pid}`,

  // --- Card (listing / search pages) ---
  // data-tkid format on each card: "UUID.PID.TYPE"
  cardSelector: '[data-tkid]',

  extractCardId: cardEl => {
    // Skip section wrappers — only process innermost data-tkid elements
    if (cardEl.parentElement && cardEl.parentElement.closest('[data-tkid]')) return null;
    const tkid = cardEl.dataset.tkid;
    if (tkid) {
      const parts = tkid.split('.');
      // Require exactly "UUID.PID.TYPE" — skips wrappers with non-standard formats
      if (parts.length === 3 && /^[A-Z0-9]+$/.test(parts[1])) return parts[1];
    }
    const link = cardEl.querySelector('a[href*="/p/"]');
    if (link) {
      const m = link.getAttribute('href').match(/[?&]pid=([A-Z0-9]+)/);
      if (m) return m[1];
    }
    return null;
  },

  scrapeCard: cardEl => {
    // Class names may change; update here when Flipkart rotates them
    const linkEl   = cardEl.querySelector('a.GnxRXv') || cardEl.querySelector('a[href*="/p/"]');
    const titleEl  = cardEl.querySelector('a.pIpigb') || cardEl.querySelector('[title]');
    const imageEl  = cardEl.querySelector('img.UCc1lI') || cardEl.querySelector('img');
    const priceEl  = cardEl.querySelector('.hZ3P6w');
    const ratingEl = cardEl.querySelector('.MKiFS6');
    const reviewEl = cardEl.querySelector('.PvbNMB');
    return {
      title:       titleEl  ? (titleEl.getAttribute('title') || titleEl.textContent.trim()) : "",
      image:       imageEl  ? imageEl.src : "",
      price:       priceEl  ? priceEl.textContent.replace(/[₹,\s]/g, '') + ".00" : "",
      rating:      ratingEl ? ratingEl.textContent.trim() + " out of 5 stars" : "",
      reviewCount: reviewEl ? reviewEl.textContent.replace(/[()]/g, '').trim() : "",
      detailPath:  linkEl   ? linkEl.getAttribute('href').split('?')[0] : null,
    };
  },

  // --- Compare page enrichment ---
  // Fetches the product page and reads JSON-LD (schema.org — survives class
  // rotation) for the header fields, plus the spec grid for comparison rows.
  enrichProduct: async (product) => {
    const url = product.url && product.url.startsWith('http')
      ? product.url
      : `https://www.flipkart.com${product.url || ''}`;
    const response = await fetch(url, { credentials: 'include' });
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Authoritative header data from JSON-LD Product.
    let ld = null;
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      if (ld) return;
      try {
        const parsed = JSON.parse(s.textContent);
        ld = (Array.isArray(parsed) ? parsed : [parsed]).find(o => o && o['@type'] === 'Product') || null;
      } catch (_) {}
    });

    if (ld) {
      if (ld.name) product.title = ld.name;
      const img = Array.isArray(ld.image) ? ld.image[0] : ld.image;
      if (img) product.image = img;
      if (ld.offers && ld.offers.price != null) product.price = String(ld.offers.price);
      const ar = ld.aggregateRating;
      if (ar) {
        if (ar.ratingValue != null) product.rating = `${ar.ratingValue} out of 5 stars`;
        const rc = ar.ratingCount != null ? ar.ratingCount : ar.reviewCount;
        if (rc != null) product.reviewCount = `${rc} ratings`;
      }
    } else {
      const og = p => (doc.querySelector(`meta[property="og:${p}"]`) || {}).content;
      if (og('title')) product.title = og('title');
      if (og('image')) product.image = og('image');
    }

    // Full specification table lives in the page's hydration JSON — present in the
    // server response even though the spec grid itself is client-rendered. Each spec
    // is a { label_1: value(s), label_0: key } pair. Reading JSON (not CSS classes)
    // survives Flipkart's class rotation and returns the complete table.
    const specTable = {};
    const parse = s => { try { return JSON.parse(s); } catch (_) { return null; } };
    const specRe = /"label_1":\{.*?"value":\{"text":\[([^\]]*)\]\}\},"label_0":\{.*?"value":\{"text":("(?:[^"\\]|\\.)*")\}\}/g;
    let m;
    while ((m = specRe.exec(html)) !== null) {
      const key = parse(m[2]);
      const vals = (m[1].match(/"(?:[^"\\]|\\.)*"/g) || []).map(parse).filter(v => v != null);
      const val = vals.join(', ');
      if (key && val && !specTable[key]) specTable[key] = val;
    }
    // Fallback if the JSON schema changes: seed comparable fields from JSON-LD.
    if (!Object.keys(specTable).length && ld) {
      if (ld.brand && ld.brand.name) specTable['Brand'] = ld.brand.name;
      if (ld.category) specTable['Category'] = ld.category;
    }
    product.specTable = specTable;

    // No Flipkart affiliate program — point the buy button at the product page.
    product.affiliateUrl = url;

    return product;
  },
};
