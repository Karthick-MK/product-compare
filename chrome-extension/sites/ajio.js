window.SITE_REGISTRY = window.SITE_REGISTRY || {};

window.SITE_REGISTRY["ajio.com"] = {
  site: "ajio",
  baseUrl: "https://www.ajio.com",
  // Detail URL: /{slug}/p/{numericId}_{colorvariant}
  productPattern: /\/p\/\d+/,
  // Listing / category / brand pages: /s/… /c/… /b/…
  searchPattern: /^\/(s|c|b)\//,
  // Product id = numeric base (stable across colour variants); the "_colour"
  // suffix identifies the variant but the base id is enough to dedup.
  extractAsin: url => (url.match(/\/p\/(\d+)/) || [])[1] || "",

  // AJIO is a client-rendered React app: the buy-box classes are hashed &
  // rotate, so there is no stable anchor. Live-page scrape grabs the title
  // (h1) + product id; enrichProduct refills everything from the page's
  // __PRELOADED_STATE__ / JSON-LD when the compare page opens.
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

  // No AJIO affiliate program — point the buy button at the product page.
  buildAffiliateUrl: id => `https://www.ajio.com/p/${id}`,

  // --- Card (listing / search / plp) ---
  // rilrtl-* classes are stable (framework-level, not hashed content classes).
  cardSelector: '.rilrtl-products-list__item, a.rilrtl-products-list__link',

  extractCardId: cardEl => {
    // Skip a link nested inside a list-item card (the item handles it)
    if (cardEl.matches('a.rilrtl-products-list__link') &&
        cardEl.parentElement && cardEl.parentElement.closest('.rilrtl-products-list__item')) {
      return null;
    }
    const link = cardEl.matches('a[href]')
      ? cardEl
      : cardEl.querySelector('a.rilrtl-products-list__link, a[href*="/p/"]');
    const href = link ? link.getAttribute('href') : '';
    const m = href && href.match(/\/p\/(\d+)/);
    return m ? m[1] : null;
  },

  scrapeCard: cardEl => {
    const link = cardEl.matches('a[href]')
      ? cardEl
      : cardEl.querySelector('a.rilrtl-products-list__link, a[href*="/p/"]');
    const href = link ? (link.getAttribute('href') || '') : '';

    const brandEl = cardEl.querySelector('.brand');
    const nameEl  = cardEl.querySelector('.nameCls');
    const brand = brandEl ? brandEl.textContent.trim() : '';
    const name  = nameEl  ? nameEl.textContent.trim()  : '';
    const title = [brand, name].filter(Boolean).join(' ');

    const imgEl   = cardEl.querySelector('img.rilrtl-lazy-img, img');
    const priceEl = cardEl.querySelector('.price strong, .price');
    const ratingEl = cardEl.querySelector('._3I65V'); // numeric rating badge; may rotate

    return {
      title,
      image:       imgEl   ? imgEl.src : "",
      // "₹3,150" -> "3150.00"
      price:       priceEl ? priceEl.textContent.replace(/[₹,\s]/g, '') + ".00" : "",
      rating:      ratingEl ? ratingEl.textContent.trim() + " out of 5 stars" : "",
      reviewCount: "",
      detailPath:  href ? href.split('?')[0] : null,
    };
  },

  // --- Compare page enrichment ---
  // AJIO ships the full product model in window.__PRELOADED_STATE__ (present in
  // the server HTML even though the page is client-rendered). Reading that JSON
  // (not CSS classes) survives class rotation and yields title / price / image /
  // rating and the complete featureData spec table. JSON-LD ProductGroup is the
  // fallback for header fields.
  enrichProduct: async (product) => {
    const url = product.url && product.url.startsWith('http')
      ? product.url
      : `https://www.ajio.com${product.url || ''}`;
    const response = await fetch(url, { credentials: 'include' });
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // 1) __PRELOADED_STATE__ — brace-match the JSON object after the assignment.
    const parseJson = s => { try { return JSON.parse(s); } catch (_) { return null; } };
    let pd = null;
    const marker = html.indexOf('window.__PRELOADED_STATE__');
    if (marker !== -1) {
      const start = html.indexOf('{', marker);
      if (start !== -1) {
        let depth = 0, i = start, inStr = false, esc = false, end = -1;
        for (; i < html.length; i++) {
          const c = html[i];
          if (inStr) {
            if (esc) esc = false;
            else if (c === '\\') esc = true;
            else if (c === '"') inStr = false;
          } else if (c === '"') inStr = true;
          else if (c === '{') depth++;
          else if (c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
        }
        if (end !== -1) {
          const state = parseJson(html.slice(start, end));
          pd = state && state.product && state.product.productDetails;
        }
      }
    }

    // 2) JSON-LD ProductGroup fallback (schema.org, survives class rotation).
    let ld = null;
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      if (ld) return;
      const parsed = parseJson(s.textContent);
      if (!parsed) return;
      ld = (Array.isArray(parsed) ? parsed : [parsed])
        .find(o => o && (o['@type'] === 'ProductGroup' || o['@type'] === 'Product')) || null;
    });

    // --- Header fields (PRELOADED_STATE preferred, JSON-LD fallback) ---
    if (pd) {
      const title = [pd.brandName, pd.name].filter(Boolean).join(' ');
      if (title) product.title = title;
      if (pd.price && pd.price.value != null) product.price = String(pd.price.value);
      if (Array.isArray(pd.images) && pd.images.length) {
        const primary = pd.images.find(im => im && im.imageType === 'PRIMARY') || pd.images[0];
        if (primary && primary.url) product.image = primary.url;
      }
      const ar = pd.ratingsResponse && pd.ratingsResponse.aggregateRating;
      if (ar) {
        if (ar.averageRating != null) product.rating = `${ar.averageRating} out of 5 stars`;
        if (ar.numUserRatings != null) product.reviewCount = `${ar.numUserRatings} ratings`;
      }
    } else if (ld) {
      if (ld.name) product.title = [ld.brand && ld.brand.name, ld.name].filter(Boolean).join(' ');
      const img = Array.isArray(ld.image) ? ld.image[0] : ld.image;
      if (img) product.image = img;
      if (ld.offers && ld.offers.price != null) product.price = String(ld.offers.price);
    } else {
      const og = p => (doc.querySelector(`meta[property="og:${p}"]`) || {}).content;
      if (og('title')) product.title = og('title');
      if (og('image')) product.image = og('image');
    }

    // --- Spec table from featureData: [{ name, featureValues:[{value}] }] ---
    const specTable = {};
    if (pd && Array.isArray(pd.featureData)) {
      pd.featureData.forEach(f => {
        if (!f || !f.name) return;
        const val = (f.featureValues || [])
          .map(v => v && v.value != null ? String(v.value) : '')
          .filter(Boolean).join(', ');
        if (val && !specTable[f.name]) specTable[f.name] = val;
      });
    }
    // Seed comparable fields even when featureData is missing / schema changed.
    if (pd) {
      if (!specTable['Brand'] && pd.brandName) specTable['Brand'] = pd.brandName;
      if (pd.fnlColorVariantData && pd.fnlColorVariantData.color) {
        specTable['Colour'] = pd.fnlColorVariantData.color;
      }
    } else if (ld) {
      if (ld.brand && ld.brand.name) specTable['Brand'] = ld.brand.name;
      if (ld.category) specTable['Category'] = ld.category;
    }
    product.specTable = specTable;

    // No AJIO affiliate program — buy button points at the product page.
    product.affiliateUrl = url;

    return product;
  },
};
