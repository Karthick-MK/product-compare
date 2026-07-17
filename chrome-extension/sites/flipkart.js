window.SITE_REGISTRY = window.SITE_REGISTRY || {};

window.SITE_REGISTRY["flipkart.com"] = {
  site: "flipkart",
  baseUrl: "https://www.flipkart.com",
  productPattern: /\/p\/itm/,
  searchPattern: /\/search\b/,
  extractAsin: url => {
    const m = url.match(/[?&]pid=([A-Z0-9]+)/);
    return m ? m[1] : "";
  },
  // Product page — fill in buttonAnchor + scrape once product page HTML is confirmed
  buttonAnchor: "",
  scrape: {
    title: ".B_NuCI",
    priceWhole: "._30jeq3",
    priceFraction: "",
    image: "._396cs4 img",
    rating: "._3LWZlK",
    reviewCount: "span._2_R_DZ span",
    bullets: "._2418kt li",
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
};
