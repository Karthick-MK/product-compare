window.SITE_REGISTRY = window.SITE_REGISTRY || {};

// Meesho is a Next.js SPA. Product URLs look like
//   https://www.meesho.com/<slug>/p/<code>   (<code> is base36, e.g. "4a2b1c")
// The live server response ships a JSON-LD Product block and/or __NEXT_DATA__
// with the full catalog JSON, so enrichProduct prefers those (survives the
// hashed/rotating styled-components class names like "sc-dOfePm"). Every path
// has a DOM fallback because Meesho's class names are per-build hashes.
window.SITE_REGISTRY["meesho.com"] = {
  site: "meesho",
  baseUrl: "https://www.meesho.com",
  productPattern: /\/p\/[a-z0-9]+\/?$/i,
  searchPattern: /\/s\b|\/search\b/,
  extractAsin: url => {
    const m = url.match(/\/p\/([a-z0-9]+)/i);
    return m ? m[1] : "";
  },

  // Meesho's buy box is client-rendered with hashed class names and no stable
  // anchor id — use the floating pill.
  buttonAnchor: "",
  // Class names are per-build hashes; live-page scrape grabs only the h1 title,
  // enrichProduct refills the rest from JSON-LD / __NEXT_DATA__ on the compare page.
  scrape: {
    title: "h1",
    priceWhole: "",
    priceFraction: "",
    image: "",
    rating: "",
    reviewCount: "",
    bullets: "",
  },

  // No Meesho affiliate program — point the buy button at the product page.
  buildAffiliateUrl: code => `https://www.meesho.com/p/${code}`,

  // --- Card (listing / search / category / recommendation grids) ---
  // Grid cards are NewProductCardstyled__CardStyled wrappers, usually inside a
  // product <a href="/slug/p/code">. Match either the wrapper or the anchor.
  cardSelector: '[class*="NewProductCardstyled__CardStyled"], a[href*="/p/"]',

  extractCardId: cardEl => {
    // If this card sits inside a product anchor, let the anchor own it (dedup).
    if (cardEl.matches('[class*="NewProductCardstyled__CardStyled"]') &&
        cardEl.closest('a[href*="/p/"]')) return null;
    // Anchor card, or the wrapper's inner product link → base36 code from URL.
    const href = cardEl.matches('a[href]')
      ? cardEl.getAttribute('href')
      : (cardEl.querySelector('a[href*="/p/"]') || {}).getAttribute?.('href');
    if (href) {
      const m = href.match(/\/p\/([a-z0-9]+)/i);
      if (m) return m[1];
    }
    // Fallback: numeric catalog id embedded in the CDN image path
    // (images.meesho.com/images/products/<id>/...). Stable across builds.
    const img = cardEl.matches('img')
      ? cardEl
      : cardEl.querySelector('img[src*="/images/products/"]');
    const src = img && (img.getAttribute('src') || img.getAttribute('srcset') || '');
    const im = src && src.match(/\/images\/products\/(\d+)/);
    return im ? im[1] : null;
  },

  scrapeCard: cardEl => {
    // Normalise to the card wrapper (may have been matched via the anchor).
    const card = cardEl.matches('[class*="NewProductCardstyled__CardStyled"]')
      ? cardEl
      : (cardEl.querySelector('[class*="NewProductCardstyled__CardStyled"]') || cardEl);

    const titleEl = card.querySelector('[class*="ProductTitle"]');
    const imgEl   = card.querySelector('img[src*="/images/products/"]') || card.querySelector('img');
    // First ₹ heading is the selling price; a following ₹ paragraph is the struck MRP.
    const priceEl = Array.from(card.querySelectorAll('h5, h4, h3, p, span'))
      .find(el => /^\s*₹\s*[\d,]+/.test(el.textContent));
    const ratingEl = card.querySelector('[label]');

    const href = cardEl.matches('a[href]')
      ? cardEl.getAttribute('href')
      : (card.querySelector('a[href*="/p/"]') || {}).getAttribute?.('href');

    const alt = imgEl && imgEl.getAttribute('alt');
    return {
      title: titleEl ? titleEl.textContent.trim() : (alt && alt !== 'mallBadge' ? alt.trim() : ""),
      image: imgEl ? (imgEl.getAttribute('src') || "") : "",
      price: priceEl ? priceEl.textContent.replace(/[^\d]/g, '') + ".00" : "",
      rating: ratingEl ? ratingEl.getAttribute('label') + " out of 5 stars" : "",
      reviewCount: "",
      detailPath: href ? href.split('?')[0] : null,
    };
  },

  // --- Compare page enrichment ---
  // Fetches the product page and reads JSON-LD (schema.org) / __NEXT_DATA__ for
  // header fields, then builds the spec table from the "Product Details" block.
  enrichProduct: async (product) => {
    const url = product.url && product.url.startsWith('http')
      ? product.url
      : `https://www.meesho.com${product.url || ''}`;
    const response = await fetch(url, { credentials: 'include' });
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const parse = s => { try { return JSON.parse(s); } catch (_) { return null; } };

    // 1) Authoritative header from JSON-LD Product, if present.
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
      const offer = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
      if (offer && offer.price != null) product.price = String(offer.price);
      const ar = ld.aggregateRating;
      if (ar) {
        if (ar.ratingValue != null) product.rating = `${ar.ratingValue} out of 5 stars`;
        const rc = ar.reviewCount != null ? ar.reviewCount : ar.ratingCount;
        if (rc != null) product.reviewCount = `${rc} ratings`;
      }
    }

    // 2) __NEXT_DATA__ — richer catalog JSON (fills anything JSON-LD missed).
    const nextEl = doc.querySelector('#__NEXT_DATA__');
    const next = nextEl ? parse(nextEl.textContent) : null;
    const catalog = next && (() => {
      // Product blob lives somewhere under pageProps; probe common shapes.
      const pp = next.props && next.props.pageProps;
      if (!pp) return null;
      return pp.product || pp.productDetails || pp.catalog ||
             (pp.initialState && pp.initialState.product) || null;
    })();
    if (catalog) {
      if (!product.title && catalog.name) product.title = catalog.name;
      if (!product.image) {
        const im = catalog.images && (catalog.images[0] || catalog.images[0]?.url);
        if (im) product.image = typeof im === 'string' ? im : im.url;
      }
      if (!product.price && catalog.price != null) product.price = String(catalog.price);
    }

    // 3) og: fallback for title/image if still empty.
    const og = p => (doc.querySelector(`meta[property="og:${p}"]`) || {}).content;
    if (!product.title && og('title')) product.title = og('title');
    if (!product.image && og('image')) product.image = og('image');

    // 4) Spec table from the "Product Details" card: each spec is a
    //    <p class="pre">Key : Value</p> (the ':' separator is an &nbsp; ).
    //    DOM-based because these <p>s carry no stable class, only hashed ones.
    const specTable = {};
    const detailsHeader = Array.from(doc.querySelectorAll('h4, h5, h6'))
      .find(h => /product details/i.test(h.textContent));
    const detailsCard = detailsHeader && detailsHeader.parentElement;
    if (detailsCard) {
      detailsCard.querySelectorAll('p').forEach(p => {
        const text = p.textContent.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
        const idx = text.indexOf(':');
        if (idx > 0 && idx < 40) {
          const key = text.slice(0, idx).trim();
          const val = text.slice(idx + 1).trim();
          if (key && val && !specTable[key]) specTable[key] = val;
        }
      });
    }
    // Fallback: seed comparable fields from JSON-LD if the details card is absent.
    if (!Object.keys(specTable).length && ld) {
      if (ld.brand) specTable['Brand'] = ld.brand.name || ld.brand;
      if (ld.category) specTable['Category'] = ld.category;
    }
    product.specTable = specTable;

    product.affiliateUrl = url;
    return product;
  },
};
