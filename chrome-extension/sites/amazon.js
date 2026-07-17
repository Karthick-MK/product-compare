window.SITE_REGISTRY = window.SITE_REGISTRY || {};

const _amazon = {
  site: "amazon",
  baseUrl: "https://www.amazon.in",
  productPattern: /\/dp\//,
  searchPattern: /^\/s\b/,
  extractAsin: url => (url.match(/\/dp\/([A-Z0-9]{10})/) || [])[1] || "",
  // Comma-separated: tries each in order, skips hidden/collapsed accordion anchors
  buttonAnchor: "#addToCart_feature_div, #almAddToCart_feature_div",
  scrape: {
    title: "#productTitle",
    priceWhole: ".a-price-whole",
    priceFraction: ".a-price-fraction",
    image: "#landingImage",
    rating: ".a-icon-alt",
    reviewCount: "#acrCustomerReviewText",
    bullets: "#feature-bullets li .a-list-item",
  },

  // --- Card (listing / search pages) ---
  cardSelector: [
    '[data-component-type="s-search-result"][data-asin]',         // standard search results
    '[data-csa-c-item-type="asin"][data-asin]',                   // p13n widgets with data-asin
    '[data-csa-c-item-type="asin"][data-csa-c-item-id^="amzn1.asin."]', // buy-again / carousel (ASIN in item-id)
    '.s-card-container',                                           // standard listing cards
    '[class*="_cDEzb_productContainer_"]',                        // obfuscated carousel cards
  ].join(', '),

  extractCardId: cardEl => {
    let asin = cardEl.dataset.asin;
    if (!asin && cardEl.dataset.csaCItemId && cardEl.dataset.csaCItemId.startsWith('amzn1.asin.')) {
      const candidate = cardEl.dataset.csaCItemId.split('.').pop();
      if (/^[A-Z0-9]{10}$/.test(candidate)) asin = candidate;
    }
    if (!asin) {
      const dpLink = cardEl.querySelector('a[href*="/dp/"]');
      const m = dpLink && dpLink.getAttribute('href').match(/\/dp\/([A-Z0-9]{10})/);
      asin = m ? m[1] : null;
    }
    return asin || null;
  },

  scrapeCard: cardEl => {
    const detailPath = cardEl.dataset.detailPageUrl || null;

    // p13n cards expose price/rating directly as data-* attributes
    const dataPrice   = cardEl.dataset.price;
    const dataStars   = cardEl.dataset.reviewStarCount;
    const dataReviews = cardEl.dataset.reviewCount;

    const titleEl  = cardEl.querySelector("h2 span") ||
                     cardEl.querySelector("h2") ||
                     cardEl.querySelector("[data-click-el='title']") ||
                     cardEl.querySelector("span.a-truncate-cut");
    const imageEl  = cardEl.querySelector(".s-image") || cardEl.querySelector("img");
    const wholeEl  = cardEl.querySelector(".a-price-whole");
    const fracEl   = cardEl.querySelector(".a-price-fraction");
    const ratingEl = cardEl.querySelector(".a-icon-alt");

    return {
      title: titleEl ? titleEl.textContent.trim() : "",
      image: imageEl ? imageEl.src : "",
      price: dataPrice
        ? dataPrice + ".00"
        : wholeEl ? (wholeEl.textContent.replace(/\D/g, "") + "." + (fracEl ? fracEl.textContent.trim() : "00")) : "",
      rating: dataStars
        ? dataStars + " out of 5 stars"
        : ratingEl ? ratingEl.textContent.trim() : "",
      reviewCount: dataReviews || "",
      detailPath,
    };
  },
};

window.SITE_REGISTRY["amazon.in"]  = _amazon;
window.SITE_REGISTRY["amazon.com"] = { ..._amazon, baseUrl: "https://www.amazon.com" };
