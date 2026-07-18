window.SITE_REGISTRY = window.SITE_REGISTRY || {};

window.SITE_REGISTRY["myntra.com"] = {
  site: "myntra",
  baseUrl: "https://www.myntra.com",
  // Product URLs: /<category>/<brand>/<slug>/<numericId>/buy
  productPattern: /\/\d+\/buy\b/,
  // Search / listing: /<query>?rawQuery=… and category pages both render product-base cards
  searchPattern: /\?|\/(men|women|kids|shoes|clothing|accessories|home)\b/,
  extractAsin: url => (url.match(/\/(\d+)\/buy\b/) || [])[1] || "",

  // Product page. Myntra's product image is lazy-loaded (react placeholders) so the
  // live-page scrape only grabs title/price/rating reliably; enrichProduct (below)
  // refills the spec table + confirms header fields from the fetched HTML on compare.
  // pdp-title = brand, pdp-name = product name; scrapeProduct only reads one title
  // selector so we point it at pdp-name and let enrichProduct build the full title.
  buttonAnchor: "",
  scrape: {
    title: "h1.pdp-name",
    priceWhole: "",       // "₹877" is a single node, not whole/fraction — handled in enrichProduct
    priceFraction: "",
    image: "",            // lazy-loaded on PDP; filled from listing card / enrichProduct
    rating: ".index-overallRating",
    reviewCount: ".index-ratingsCount",
    bullets: "",
  },

  // No Myntra affiliate program wired up — use the direct product URL.
  buildAffiliateUrl: id => `https://www.myntra.com/${id}/buy`,

  // --- Card (listing / search / category pages) ---
  // Cards are <li class="product-base" id="<numericId>"> wrapping an <a href=".../<id>/buy">.
  cardSelector: 'li.product-base[id]',

  extractCardId: cardEl => {
    // The <li> id is the numeric product id.
    if (cardEl.id && /^\d+$/.test(cardEl.id)) return cardEl.id;
    const a = cardEl.querySelector('a[href*="/buy"]');
    const m = a && a.getAttribute('href').match(/\/(\d+)\/buy\b/);
    return m ? m[1] : null;
  },

  scrapeCard: cardEl => {
    const linkEl   = cardEl.querySelector('a[href*="/buy"]');
    const imgEl    = cardEl.querySelector('img');
    const brandEl  = cardEl.querySelector('.product-brand');
    const nameEl   = cardEl.querySelector('.product-product');
    const priceEl  = cardEl.querySelector('.product-discountedPrice') ||
                     cardEl.querySelector('.product-price span');
    const ratingEl = cardEl.querySelector('.product-ratingsContainer span');
    const reviewEl = cardEl.querySelector('.product-ratingsCount');

    const brand = brandEl ? brandEl.textContent.trim() : "";
    const name  = nameEl  ? nameEl.textContent.trim()  : "";
    const href  = linkEl ? linkEl.getAttribute('href') : "";
    return {
      title:       [brand, name].filter(Boolean).join(' ') ||
                   (imgEl && imgEl.getAttribute('alt') ? imgEl.getAttribute('alt').trim() : ""),
      image:       imgEl ? imgEl.src : "",
      // "Rs. 877" → "877.00"
      price:       priceEl ? (priceEl.textContent.replace(/[^0-9]/g, '') + ".00") : "",
      rating:      ratingEl ? ratingEl.textContent.trim() + " out of 5 stars" : "",
      // product-ratingsCount holds a separator + count; keep the digits.
      reviewCount: reviewEl ? (reviewEl.textContent.replace(/[^0-9]/g, '') || "") : "",
      // Listing hrefs are relative (no leading slash): "formal-shoes/…/<id>/buy"
      detailPath:  href ? '/' + href.replace(/^\//, '').split('?')[0] : null,
    };
  },

  // --- Compare page enrichment ---
  // Fetches the product page and reads the stable pdp-*/index-* module classes for
  // header fields + the spec grid. Tries JSON-LD / embedded state first (real live
  // pages include them even though they survive class rotation better than hashed
  // classes); falls back to the rendered markup, which is what our page refs contain.
  enrichProduct: async (product) => {
    const url = product.url && product.url.startsWith('http')
      ? product.url
      : `https://www.myntra.com${(product.url || '').replace(/^\/?/, '/')}`;
    const response = await fetch(url, { credentials: 'include' });
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // 1) Preferred: JSON-LD Product (if present on the live page).
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
      const offer = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
      if (offer && offer.price != null) product.price = String(offer.price);
      const ar = ld.aggregateRating;
      if (ar) {
        if (ar.ratingValue != null) product.rating = `${ar.ratingValue} out of 5 stars`;
        const rc = ar.ratingCount != null ? ar.ratingCount : ar.reviewCount;
        if (rc != null) product.reviewCount = `${rc} ratings`;
      }
    }

    // 2) Rendered pdp-*/index-* markup (authoritative in our refs; also present live).
    const text = el => (el ? el.textContent.replace(/\s+/g, ' ').trim() : "");
    const brand = text(doc.querySelector('h1.pdp-title'));
    const name  = text(doc.querySelector('h1.pdp-name'));
    const fullTitle = [brand, name].filter(Boolean).join(' ');
    if (fullTitle && (!ld || !ld.name)) product.title = fullTitle;

    if (!product.price) {
      const priceEl = doc.querySelector('.pdp-price strong') || doc.querySelector('.pdp-price');
      const price = text(priceEl).replace(/[^0-9.]/g, '');
      if (price) product.price = price;
    }
    if (!product.rating) {
      const r = text(doc.querySelector('.index-overallRating')).split(/\s|\|/)[0];
      if (r && /^\d/.test(r)) product.rating = `${r} out of 5 stars`;
    }
    if (!product.reviewCount) {
      const rc = text(doc.querySelector('.index-ratingsCount')).replace(/[^0-9]/g, '');
      if (rc) product.reviewCount = `${rc} ratings`;
    }
    // Image is lazy-loaded on the PDP; keep whatever the card gave us, but try og:image.
    if (!product.image) {
      const og = (doc.querySelector('meta[property="og:image"]') || {}).content;
      if (og) product.image = og;
    }

    // Spec table: <div class="index-row"><div class="index-rowKey">K</div>
    //             <div class="index-rowValue">V</div></div>
    const specTable = {};
    doc.querySelectorAll('.index-row').forEach(row => {
      const k = text(row.querySelector('.index-rowKey'));
      const v = text(row.querySelector('.index-rowValue'));
      if (k && v && !specTable[k]) specTable[k] = v;
    });
    if (brand && !specTable['Brand']) specTable['Brand'] = brand;
    product.specTable = specTable;

    // No Myntra affiliate program — point the buy button at the product page.
    product.affiliateUrl = url;

    return product;
  },
};
